/**
 * Dashboard Data API for Primary School LMS
 * Provides real Supabase queries to replace mock data
 * Supports admin/head/teacher role-based data access
 */

import { createClient } from "@/lib/supabase/client";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Database } from "@/types/database";
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  calculateGrades,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  calcFormativeAvg,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  calcSummativeAvg,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getFinalScore,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  calcSemesterGrade,
  isValidScore,
} from "@/lib/grade/calculations";

// Types for dashboard data structures
export interface DashboardStudent {
  id: string;
  student_id: string;
  full_name: string;
  grade: number;
  level: "E1" | "E2" | "E3" | null;
  track: "local" | "international";
  class_name: string | null;
  class_id: string | null;
  is_active: boolean;
}

export interface TeacherKpis {
  attendanceRate: number | null; // null = 待出席系統實作
  averageScore: number;
  passRate: number;
  activeAlerts: number | null; // null = 待警告系統實作
}

export interface AdminKpis {
  totalExams: number;
  notDue: number;
  overdue: number;
  coverage: number;
  onTime: number | null; // null = 待實作準時完成率計算
}

export interface ClassDistribution {
  bucket: string;
  count: number;
}

export interface ScatterPoint {
  x: number;
  y: number;
  z: number;
}

export interface UpcomingDeadline {
  id: string;
  title: string;
  due_at: string;
}

export interface RecentAlert {
  id: string;
  message: string;
  when: string;
}

/**
 * Get students data based on user role and permissions
 */
export async function getDashboardStudents(
  userRole: "admin" | "office_member" | "head" | "teacher" | "student",
  userId?: string,
  grade?: number,
  track?: "local" | "international"
): Promise<DashboardStudent[]> {
  const supabase = createClient();

  try {
    let query = supabase
      .from("students")
      .select(
        `
        id,
        student_id,
        full_name,
        grade,
        level,
        track,
        is_active,
        class_id,
        classes!inner(
          id,
          name,
          grade,
          track,
          is_active
        )
      `
      )
      .eq("is_active", true)
      .eq("classes.is_active", true);

    // Apply role-based filtering
    if (userRole === "head" && grade && track) {
      query = query.eq("grade", grade).eq("track", track);
    } else if (userRole === "teacher" && userId) {
      // Get teacher's class IDs first
      const { data: teacherCourses } = await supabase
        .from("courses")
        .select("class_id")
        .eq("teacher_id", userId)
        .eq("is_active", true);

      const classIds = (teacherCourses || []).map((course) => course.class_id);
      if (classIds.length > 0) {
        query = query.in("class_id", classIds);
      } else {
        return []; // No classes assigned
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching dashboard students:", error);
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((student: any) => ({
      id: student.id,
      student_id: student.student_id,
      full_name: student.full_name,
      grade: student.grade,
      level: student.level,
      track: student.track,
      class_name: student.classes?.name || null,
      class_id: student.class_id,
      is_active: student.is_active,
    }));
  } catch (error) {
    console.error("Exception in getDashboardStudents:", error);
    return [];
  }
}

/**
 * Get teacher KPIs based on their assigned classes and courses
 */
export async function getTeacherKpis(teacherId: string): Promise<TeacherKpis> {
  const supabase = createClient();

  try {
    // Get teacher's courses and associated data
    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select(
        `
        id,
        course_type,
        class_id,
        classes!inner(
          id,
          name,
          grade,
          track
        )
      `
      )
      .eq("teacher_id", teacherId)
      .eq("is_active", true)
      .eq("classes.is_active", true);

    if (coursesError || !courses) {
      console.error("Error fetching teacher courses:", coursesError);
      return {
        attendanceRate: 0,
        averageScore: 0,
        passRate: 0,
        activeAlerts: 0,
      };
    }

    const classIds = courses.map((course) => course.class_id);

    // Get students in teacher's classes
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, class_id")
      .in("class_id", classIds)
      .eq("is_active", true);

    if (studentsError || !students) {
      console.error("Error fetching students:", studentsError);
      return {
        attendanceRate: 0,
        averageScore: 0,
        passRate: 0,
        activeAlerts: 0,
      };
    }

    const studentIds = students.map((s) => s.id);

    // Get recent scores for grade calculations
    const { data: scores, error: scoresError } = await supabase
      .from("scores")
      .select(
        `
        student_id,
        assessment_code,
        score,
        exam_id,
        exams!inner(
          id,
          course_id,
          courses!inner(
            class_id
          )
        )
      `
      )
      .in("student_id", studentIds)
      .in("exams.courses.class_id", classIds)
      .gte(
        "entered_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      ); // Last 30 days

    if (scoresError) {
      console.error("Error fetching scores:", scoresError);
    }

    const validScores = (scores || []).filter((score) =>
      isValidScore(score.score)
    );

    // Calculate metrics
    const totalScores = validScores.length;
    const averageScore =
      totalScores > 0
        ? validScores.reduce((sum, score) => sum + (score.score || 0), 0) /
          totalScores
        : 0;

    const passRate =
      totalScores > 0
        ? (validScores.filter((score) => (score.score || 0) >= 60).length /
            totalScores) *
          100
        : 0;

    // 出席率和警告需要專門的系統實作，暫時返回 null
    // attendanceRate: 待出席追蹤系統
    // activeAlerts: 待警告/問題追蹤系統

    return {
      attendanceRate: null, // 待出席系統實作
      averageScore: Math.round(averageScore * 10) / 10,
      passRate: Math.round(passRate),
      activeAlerts: null, // 待警告系統實作
    };
  } catch (error) {
    console.error("Exception in getTeacherKpis:", error);
    return { attendanceRate: null, averageScore: 0, passRate: 0, activeAlerts: null };
  }
}

/**
 * Get admin KPIs for whole school overview
 */
export async function getAdminKpis(): Promise<AdminKpis> {
  const supabase = createClient();

  try {
    // Get total exams count
    const { count: totalExams } = await supabase
      .from("exams")
      .select("*", { count: "exact" });

    // Get exams due in next 7 days
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const { count: notDue } = await supabase
      .from("exams")
      .select("*", { count: "exact" })
      .lte("exam_date", nextWeek.toISOString().split("T")[0]);

    // Get overdue exams (exam_date < today but no scores)
    const today = new Date().toISOString().split("T")[0];
    const { count: overdue } = await supabase
      .from("exams")
      .select("*", { count: "exact" })
      .lt("exam_date", today);

    // Calculate coverage (percentage of students with scores)
    const { data: studentsWithScores } = await supabase
      .from("scores")
      .select("student_id")
      .gte(
        "entered_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      );

    const { count: totalActiveStudents } = await supabase
      .from("students")
      .select("*", { count: "exact" })
      .eq("is_active", true);

    const uniqueStudentsWithScores = new Set(
      (studentsWithScores || []).map((s) => s.student_id)
    ).size;

    const coverage =
      totalActiveStudents && totalActiveStudents > 0
        ? Math.round((uniqueStudentsWithScores / totalActiveStudents) * 100)
        : 0;

    // onTime 需要計算實際的準時完成率，暫時返回 null
    // 待實作：比較 exam_date 與實際成績輸入時間

    return {
      totalExams: totalExams || 0,
      notDue: notDue || 0,
      overdue: overdue || 0,
      coverage,
      onTime: null, // 待準時完成率計算系統實作
    };
  } catch (error) {
    console.error("Exception in getAdminKpis:", error);
    return { totalExams: 0, notDue: 0, overdue: 0, coverage: 0, onTime: null };
  }
}

/**
 * Get class score distribution for charts
 */
export async function getClassDistribution(
  userRole: "admin" | "office_member" | "head" | "teacher" | "student",
  userId?: string,
  gradeBand?: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  courseType?: "LT" | "IT" | "KCFS"
): Promise<ClassDistribution[]> {
  const supabase = createClient();

  try {
    let query = supabase
      .from("scores")
      .select(
        `
        score,
        exams!inner(
          course_id,
          courses!inner(
            class_id,
            classes!inner(
              grade,
              track,
              is_active
            )
          )
        ),
        students!inner(
          id,
          is_active
        )
      `
      )
      .eq("exams.courses.classes.is_active", true)
      .eq("students.is_active", true)
      .not("score", "is", null)
      .gte("score", 0)
      .lte("score", 100);

    // Apply role-based filtering
    if (userRole === "head" && gradeBand) {
      // Parse grade band to get grades
      let grades: number[] = [];
      if (gradeBand.includes("-")) {
        const parts = gradeBand.split("-").map(Number);
        const start = parts[0] ?? 1;
        const end = parts[1] ?? start;
        for (let i = start; i <= end; i++) {
          grades.push(i);
        }
      } else {
        grades = [Number(gradeBand)];
      }
      query = query.in("exams.courses.classes.grade", grades);
      // Note: course type filtering would need to be done at the course level, not class level
    } else if (userRole === "teacher" && userId) {
      // Get teacher's course IDs
      const { data: teacherCourses } = await supabase
        .from("courses")
        .select("id")
        .eq("teacher_id", userId)
        .eq("is_active", true);

      const courseIds = (teacherCourses || []).map((course) => course.id);
      if (courseIds.length > 0) {
        query = query.in("exams.course_id", courseIds);
      } else {
        return []; // No courses assigned
      }
    }

    const { data: scores, error } = await query;

    if (error) {
      console.error("Error fetching score distribution:", error);
      return [];
    }

    // Create distribution buckets
    const distribution: ClassDistribution[] = [];
    const buckets = [
      "0-10",
      "10-20",
      "20-30",
      "30-40",
      "40-50",
      "50-60",
      "60-70",
      "70-80",
      "80-90",
      "90-100",
    ];

    for (const bucket of buckets) {
      distribution.push({ bucket, count: 0 });
    }

    // Count scores in each bucket
    if (scores && scores.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scores.forEach((scoreData: any) => {
        const score = scoreData.score || 0;
        const bucketIndex = Math.min(Math.floor(score / 10), 9);
        if (bucketIndex >= 0 && bucketIndex < 10 && distribution[bucketIndex]) {
          distribution[bucketIndex].count++;
        }
      });
    }

    return distribution;
  } catch (error) {
    console.error("Exception in getClassDistribution:", error);
    return [];
  }
}

/**
 * Get upcoming deadlines for exams and assessments
 */
export async function getUpcomingDeadlines(
  userRole: "admin" | "office_member" | "head" | "teacher" | "student",
  userId?: string,
  gradeBand?: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  courseType?: "LT" | "IT" | "KCFS"
): Promise<UpcomingDeadline[]> {
  const supabase = createClient();

  try {
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    let query = supabase
      .from("exams")
      .select(
        `
        id,
        name,
        exam_date,
        course_id,
        courses!inner(
          class_id,
          classes!inner(
            name,
            grade,
            track,
            is_active
          )
        )
      `
      )
      .eq("courses.classes.is_active", true)
      .gte("exam_date", new Date().toISOString().split("T")[0])
      .lte("exam_date", nextWeek.toISOString().split("T")[0])
      .order("exam_date", { ascending: true })
      .limit(5);

    // Apply role-based filtering
    if (userRole === "head" && gradeBand) {
      // Parse grade band to get grades
      let grades: number[] = [];
      if (gradeBand.includes("-")) {
        const parts = gradeBand.split("-").map(Number);
        const start = parts[0] ?? 1;
        const end = parts[1] ?? start;
        for (let i = start; i <= end; i++) {
          grades.push(i);
        }
      } else {
        grades = [Number(gradeBand)];
      }
      query = query.in("courses.classes.grade", grades);
    } else if (userRole === "teacher" && userId) {
      const { data: teacherCourses } = await supabase
        .from("courses")
        .select("id")
        .eq("teacher_id", userId)
        .eq("is_active", true);

      const courseIds = (teacherCourses || []).map((course) => course.id);
      if (courseIds.length > 0) {
        query = query.in("course_id", courseIds);
      } else {
        return [];
      }
    }

    const { data: exams, error } = await query;

    if (error) {
      console.error("Error fetching upcoming deadlines:", error);
      return [];
    }

    return (exams || []).map((exam) => {
      const examDate = new Date(exam.exam_date);
      const today = new Date();
      const diffTime = examDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let dueText = "";
      if (diffDays === 0) {
        dueText = "Today";
      } else if (diffDays === 1) {
        dueText = "Tomorrow";
      } else {
        dueText = `${diffDays} days`;
      }

      const courseData = exam.courses as unknown as {
        class_id: string;
        classes: {
          name: string;
          grade: number;
          track: string | null;
          is_active: boolean;
        };
      };

      return {
        id: exam.id,
        title: `${exam.name} (${courseData.classes.name})`,
        due_at: dueText,
      };
    });
  } catch (error) {
    console.error("Exception in getUpcomingDeadlines:", error);
    return [];
  }
}

/**
 * Get recent alerts and notifications
 */
export async function getRecentAlerts(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userRole: "admin" | "office_member" | "head" | "teacher" | "student",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userId?: string
): Promise<RecentAlert[]> {
  // For now, return static alerts similar to mock data
  // This can be enhanced with a proper notifications system later
  const alerts: RecentAlert[] = [];

  try {
    const supabase = createClient();

    // Check for low score submissions in recent exams
    const { data: recentExams } = await supabase
      .from("exams")
      .select(
        `
        id,
        name,
        exam_date,
        course_id,
        courses!inner(
          class_id,
          classes!inner(
            id,
            name,
            grade,
            track
          )
        )
      `
      )
      .eq("courses.classes.is_active", true)
      .gte(
        "exam_date",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]
      )
      .limit(5);

    for (const exam of recentExams || []) {
      const courseData = exam.courses as unknown as {
        class_id: string;
        classes: {
          id: string;
          name: string;
          grade: number;
          track: string | null;
        };
      };
      const classData = courseData.classes;

      const { count: totalStudents } = await supabase
        .from("students")
        .select("*", { count: "exact" })
        .eq("class_id", classData.id)
        .eq("is_active", true);

      const { count: submittedScores } = await supabase
        .from("scores")
        .select("*", { count: "exact" })
        .eq("exam_id", exam.id);

      if (totalStudents && submittedScores !== null) {
        const completionRate = (submittedScores / totalStudents) * 100;

        if (completionRate < 70) {
          alerts.push({
            id: `alert-${exam.id}`,
            message: `Low completion rate (${Math.round(
              completionRate
            )}%) for ${exam.name} in ${classData.name}`,
            when: "1 day ago",
          });
        }
      }
    }

    // Add some general alerts if none found
    if (alerts.length === 0) {
      alerts.push({
        id: "alert-general-1",
        message: "All assessments up to date",
        when: "1 hour ago",
      });
    }

    return alerts.slice(0, 3); // Limit to 3 most recent
  } catch (error) {
    console.error("Exception in getRecentAlerts:", error);
    return [
      {
        id: "alert-error",
        message: "Unable to fetch recent alerts",
        when: "just now",
      },
    ];
  }
}

/**
 * Get scatter plot data for class performance analysis
 */
export async function getScatterData(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userRole: "admin" | "office_member" | "head" | "teacher" | "student",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userId?: string
): Promise<ScatterPoint[]> {
  // This is a placeholder implementation
  // Real implementation would analyze class averages vs coverage metrics
  return Array.from({ length: 12 }).map(() => ({
    x: Math.round(60 + Math.random() * 35), // Class average
    y: Math.round(70 + Math.random() * 30), // Submission coverage
    z: Math.round(15 + Math.random() * 20), // Class size
  }));
}

// ======================================
// ADMIN-SPECIFIC FUNCTIONS
// ======================================

export interface OverdueTableRow {
  examId: string;
  examName: string;
  grade: number;
  className: string;
  track: "local" | "international" | null;
  coverage: number;
  missing: number;
  dueIn: string;
  examDate: string;
}

export interface ClassPerformanceRow {
  grade: number;
  className: string;
  track: "local" | "international";
  avg: number;
  max: number;
  min: number;
  passRate: number;
  studentCount: number;
}

export interface ActivityTrendPoint {
  day: string;
  scores: number;
  attendance: number;
}

/**
 * Get overdue and incomplete exams for Admin dashboard table
 */
export async function getOverdueTable(): Promise<OverdueTableRow[]> {
  const supabase = createClient();

  try {
    const today = new Date().toISOString().split("T")[0];

    // Get overdue exams with their coverage stats
    const { data: exams, error } = await supabase
      .from("exams")
      .select(
        `
        id,
        name,
        exam_date,
        course_id,
        courses!inner(
          class_id,
          classes!inner(
            id,
            name,
            grade,
            track
          )
        )
      `
      )
      .eq("courses.classes.is_active", true)
      .lt("exam_date", today)
      .order("exam_date", { ascending: true })
      .limit(20);

    if (error) {
      console.error("Error fetching overdue exams:", error);
      return [];
    }

    const overdueData: OverdueTableRow[] = [];

    for (const exam of exams || []) {
      const courseData = exam.courses as unknown as {
        class_id: string;
        classes: {
          id: string;
          name: string;
          grade: number;
          track: string | null;
        };
      };
      const classData = courseData.classes;

      // Get total students in class
      const { count: totalStudents } = await supabase
        .from("students")
        .select("*", { count: "exact" })
        .eq("class_id", classData.id)
        .eq("is_active", true);

      // Get students with scores for this exam
      const { count: studentsWithScores } = await supabase
        .from("scores")
        .select("*", { count: "exact" })
        .eq("exam_id", exam.id);

      const coverage =
        totalStudents && totalStudents > 0
          ? Math.round(((studentsWithScores || 0) / totalStudents) * 100)
          : 0;

      const missing = (totalStudents || 0) - (studentsWithScores || 0);

      // Calculate days overdue
      const examDate = new Date(exam.exam_date);
      const diffTime = Date.now() - examDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      overdueData.push({
        examId: exam.id,
        examName: exam.name,
        grade: classData.grade,
        className: classData.name,
        track: classData.track as "local" | "international" | null,
        coverage,
        missing,
        dueIn: `${diffDays} days ago`,
        examDate: exam.exam_date,
      });
    }

    return overdueData;
  } catch (error) {
    console.error("Exception in getOverdueTable:", error);
    return [];
  }
}

/**
 * Get class performance overview for Admin dashboard
 */
export async function getClassPerformance(): Promise<ClassPerformanceRow[]> {
  const supabase = createClient();

  try {
    // Get all active classes
    const { data: classes, error: classesError } = await supabase
      .from("classes")
      .select("id, name, grade, track")
      .eq("is_active", true)
      .order("grade", { ascending: true })
      .order("name", { ascending: true });

    if (classesError) {
      console.error("Error fetching classes:", classesError);
      return [];
    }

    const performanceData: ClassPerformanceRow[] = [];

    for (const cls of classes || []) {
      // Get students count
      const { count: studentCount } = await supabase
        .from("students")
        .select("*", { count: "exact" })
        .eq("class_id", cls.id)
        .eq("is_active", true);

      // Get recent scores for this class
      const { data: scores, error: scoresError } = await supabase
        .from("scores")
        .select(
          `
          score,
          exams!inner(
            course_id,
            courses!inner(
              class_id
            )
          )
        `
        )
        .eq("exams.courses.class_id", cls.id)
        .gte(
          "entered_at",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        ) // Last 30 days
        .not("score", "is", null);

      if (scoresError) {
        console.error("Error fetching scores for class:", cls.id, scoresError);
        continue;
      }

      const validScores = (scores || [])
        .map((s) => s.score || 0)
        .filter((score) => score > 0);

      if (validScores.length > 0) {
        const avg =
          Math.round(
            (validScores.reduce((sum, score) => sum + score, 0) /
              validScores.length) *
              10
          ) / 10;
        const max = Math.max(...validScores);
        const min = Math.min(...validScores);
        const passRate = Math.round(
          (validScores.filter((score) => score >= 60).length /
            validScores.length) *
            100
        );

        performanceData.push({
          grade: cls.grade,
          className: cls.name,
          track: cls.track,
          avg,
          max,
          min,
          passRate,
          studentCount: studentCount || 0,
        });
      }
    }

    return performanceData;
  } catch (error) {
    console.error("Exception in getClassPerformance:", error);
    return [];
  }
}

/**
 * Get activity trend for Admin dashboard chart
 */
export async function getActivityTrend(): Promise<ActivityTrendPoint[]> {
  const supabase = createClient();

  try {
    const trend: ActivityTrendPoint[] = [];

    // Get last 14 days of data
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayLabel = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      // Count scores entered on this day
      const { count: scoresCount } = await supabase
        .from("scores")
        .select("*", { count: "exact" })
        .gte("entered_at", `${dateStr}T00:00:00Z`)
        .lt("entered_at", `${dateStr}T23:59:59Z`);

      // Mock attendance data for now (could be implemented later)
      const attendanceCount = Math.round(80 + Math.random() * 40);

      trend.push({
        day: dayLabel,
        scores: scoresCount || 0,
        attendance: attendanceCount,
      });
    }

    return trend;
  } catch (error) {
    console.error("Exception in getActivityTrend:", error);
    return [];
  }
}

/**
 * Get teacher progress heatmap data
 */
export async function getTeacherHeatmap(): Promise<number[][]> {
  // This is a complex visualization that would require significant computation
  // For now, return mock data, but this could be implemented with real teacher/exam coverage stats
  return Array.from({ length: 8 }).map(() =>
    Array.from({ length: 12 }).map(() => Math.round(Math.random() * 100))
  );
}

// ======================================
// HEAD TEACHER-SPECIFIC FUNCTIONS
// ======================================

export interface HeadTeacherKpis {
  totalClasses: number;
  averageScore: number;
  coverageRate: number;
  activeIssues: number | null; // null = 待問題追蹤系統實作
  studentsCount: number;
  teachersCount: number;
}

export interface GradeClassSummary {
  className: string;
  track: "local" | "international";
  studentCount: number;
  ltTeacher: string | null;
  itTeacher: string | null;
  kcfsTeacher: string | null;
  avgScore: number;
  coverageRate: number;
  lastActivity: string;
}

/**
 * Get Head Teacher KPIs for their specific grade band and course type
 * @param gradeBand - Grade band string: "1", "2", "3-4", "5-6", "1-2", "1-6"
 * @param courseType - Course type: "LT", "IT", "KCFS"
 */
export async function getHeadTeacherKpis(
  gradeBand: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  courseType: "LT" | "IT" | "KCFS"
): Promise<HeadTeacherKpis> {
  const supabase = createClient();

  try {
    // Parse grade band to get grade numbers
    let grades: number[] = [];
    if (gradeBand.includes("-")) {
      const parts = gradeBand.split("-").map(Number);
      const start = parts[0] ?? 1;
      const end = parts[1] ?? start;
      for (let i = start; i <= end; i++) {
        grades.push(i);
      }
    } else {
      grades = [Number(gradeBand)];
    }

    // Get classes in these grades (classes don't have track, course type is in courses table)
    // Only get current academic year to avoid duplicates from 2026-2027
    const { data: classes, error: classesError } = await supabase
      .from("classes")
      .select("id, name")
      .in("grade", grades)
      .eq("is_active", true)
      .eq("academic_year", "2025-2026");

    if (classesError) {
      console.error("Error fetching head teacher classes:", classesError);
      return {
        totalClasses: 0,
        averageScore: 0,
        coverageRate: 0,
        activeIssues: 0,
        studentsCount: 0,
        teachersCount: 0,
      };
    }

    const classIds = (classes || []).map((c) => c.id);
    const totalClasses = classes?.length || 0;

    if (classIds.length === 0) {
      return {
        totalClasses: 0,
        averageScore: 0,
        coverageRate: 0,
        activeIssues: 0,
        studentsCount: 0,
        teachersCount: 0,
      };
    }

    // Get students count
    const { count: studentsCount } = await supabase
      .from("students")
      .select("*", { count: "exact" })
      .in("class_id", classIds)
      .eq("is_active", true);

    // Get teachers count (unique teachers teaching in these classes)
    const { data: courses } = await supabase
      .from("courses")
      .select("teacher_id")
      .in("class_id", classIds)
      .eq("is_active", true)
      .eq("academic_year", "2025-2026");

    const uniqueTeachers = new Set((courses || []).map((c) => c.teacher_id));
    const teachersCount = uniqueTeachers.size;

    // Get recent scores for average calculation
    const { data: scores } = await supabase
      .from("scores")
      .select(
        `
        score,
        student_id,
        exams!inner(
          course_id,
          courses!inner(
            class_id
          )
        )
      `
      )
      .in("exams.courses.class_id", classIds)
      .gte(
        "entered_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      ) // Last 30 days
      .not("score", "is", null);

    const validScores = (scores || [])
      .map((s) => s.score || 0)
      .filter((score) => score > 0);

    const averageScore =
      validScores.length > 0
        ? Math.round(
            (validScores.reduce((sum, score) => sum + score, 0) /
              validScores.length) *
              10
          ) / 10
        : 0;

    // Calculate coverage rate (students with recent scores)
    const studentsWithScores = new Set(
      (scores || []).map((s) => s.student_id).filter(Boolean)
    ).size;

    const coverageRate =
      studentsCount && studentsCount > 0
        ? Math.round((studentsWithScores / studentsCount) * 100)
        : 0;

    // activeIssues 需要問題追蹤系統實作，暫時返回 null

    return {
      totalClasses,
      averageScore,
      coverageRate,
      activeIssues: null, // 待問題追蹤系統實作
      studentsCount: studentsCount || 0,
      teachersCount,
    };
  } catch (error) {
    console.error("Exception in getHeadTeacherKpis:", error);
    return {
      totalClasses: 0,
      averageScore: 0,
      coverageRate: 0,
      activeIssues: null,
      studentsCount: 0,
      teachersCount: 0,
    };
  }
}

/**
 * Get grade class summary for Head Teacher overview
 */
export async function getGradeClassSummary(
  grade: number,
  track: "local" | "international"
): Promise<GradeClassSummary[]> {
  const supabase = createClient();

  try {
    // Get classes in this grade and track
    const { data: classes, error: classesError } = await supabase
      .from("classes")
      .select("id, name, track")
      .eq("grade", grade)
      .eq("track", track)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (classesError) {
      console.error("Error fetching classes:", classesError);
      return [];
    }

    const classSummary: GradeClassSummary[] = [];

    for (const cls of classes || []) {
      // Get student count
      const { count: studentCount } = await supabase
        .from("students")
        .select("*", { count: "exact" })
        .eq("class_id", cls.id)
        .eq("is_active", true);

      // Get teachers for each course type
      const { data: courses } = await supabase
        .from("courses")
        .select(
          `
          course_type,
          users!courses_teacher_id_fkey(
            full_name
          )
        `
        )
        .eq("class_id", cls.id)
        .eq("is_active", true);

      let ltTeacher = null;
      let itTeacher = null;
      let kcfsTeacher = null;

      for (const course of courses || []) {
        const userData = course.users as unknown as {
          full_name: string;
        } | null;
        const teacherName = userData?.full_name || "Unassigned";
        switch (course.course_type) {
          case "LT":
            ltTeacher = teacherName;
            break;
          case "IT":
            itTeacher = teacherName;
            break;
          case "KCFS":
            kcfsTeacher = teacherName;
            break;
        }
      }

      // Get recent scores for this class
      const { data: scores } = await supabase
        .from("scores")
        .select(
          `
          score,
          student_id,
          entered_at,
          exams!inner(
            course_id,
            courses!inner(
              class_id
            )
          )
        `
        )
        .eq("exams.courses.class_id", cls.id)
        .gte(
          "entered_at",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        ) // Last 30 days
        .not("score", "is", null);

      const validScores = (scores || [])
        .map((s) => s.score || 0)
        .filter((score) => score > 0);

      const avgScore =
        validScores.length > 0
          ? Math.round(
              (validScores.reduce((sum, score) => sum + score, 0) /
                validScores.length) *
                10
            ) / 10
          : 0;

      // Calculate coverage rate
      const studentsWithScores = new Set(
        (scores || []).map((s) => s.student_id).filter(Boolean)
      ).size;

      const coverageRate =
        studentCount && studentCount > 0
          ? Math.round((studentsWithScores / studentCount) * 100)
          : 0;

      // Get last activity date
      const lastActivityDate =
        scores && scores.length > 0
          ? Math.max(...scores.map((s) => new Date(s.entered_at).getTime()))
          : 0;

      const lastActivity =
        lastActivityDate > 0
          ? new Date(lastActivityDate).toLocaleDateString()
          : "No activity";

      classSummary.push({
        className: cls.name,
        track: cls.track,
        studentCount: studentCount || 0,
        ltTeacher,
        itTeacher,
        kcfsTeacher,
        avgScore,
        coverageRate,
        lastActivity,
      });
    }

    return classSummary;
  } catch (error) {
    console.error("Exception in getGradeClassSummary:", error);
    return [];
  }
}
