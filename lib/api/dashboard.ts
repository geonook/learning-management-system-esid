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
import { parseGradeBand } from "@/lib/utils/gradeband";
import { DEFAULT_EXPECTATION } from "@/types/gradebook-expectations";

// Default assessment items count from Expectations system
// FA1-8 (8) + SA1-4 (4) + MID (1) = 13
const DEFAULT_ASSESSMENT_ITEMS = DEFAULT_EXPECTATION.expected_total;

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
            course_type,
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
      // Parse grade band to get grades (use unified parseGradeBand function)
      const grades = parseGradeBand(gradeBand);
      query = query.in("exams.courses.classes.grade", grades);
      // Filter by course type for head teachers
      if (courseType) {
        query = query.eq("exams.courses.course_type", courseType);
      }
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

    // IMPORTANT: Override Supabase default 1000 row limit
    // Score distribution needs all scores in the grade band
    const { data: scores, error } = await query.limit(10000);

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
      // Parse grade band to get grades (use unified parseGradeBand function)
      const grades = parseGradeBand(gradeBand);
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
 * OPTIMIZED: Batch queries instead of loop pattern (5-10x speedup)
 */
export async function getRecentAlerts(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userRole: "admin" | "office_member" | "head" | "teacher" | "student",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userId?: string
): Promise<RecentAlert[]> {
  const alerts: RecentAlert[] = [];

  try {
    const supabase = createClient();

    // ========================================
    // BATCH QUERY 1: Get recent exams with class info
    // ========================================
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
      .limit(10);  // Fetch more to ensure we have enough after filtering

    if (!recentExams || recentExams.length === 0) {
      return [
        {
          id: "alert-general-1",
          message: "All assessments up to date",
          when: "1 hour ago",
        },
      ];
    }

    // Extract unique class IDs and exam IDs
    const classIds = new Set<string>();
    const examIds: string[] = [];

    const examClassMap = new Map<string, { examId: string; examName: string; className: string; classId: string }>();

    recentExams.forEach((exam) => {
      const courseData = exam.courses as unknown as {
        class_id: string;
        classes: { id: string; name: string; grade: number; track: string | null };
      };
      const classId = courseData.classes.id;
      classIds.add(classId);
      examIds.push(exam.id);
      examClassMap.set(exam.id, {
        examId: exam.id,
        examName: exam.name,
        className: courseData.classes.name,
        classId,
      });
    });

    // ========================================
    // BATCH QUERY 2: Get student counts for all classes at once
    // ========================================
    const { data: allStudents } = await supabase
      .from("students")
      .select("class_id")
      .in("class_id", Array.from(classIds))
      .eq("is_active", true);

    // Group student counts by class_id
    const studentCountByClass = new Map<string, number>();
    (allStudents || []).forEach((s) => {
      const count = studentCountByClass.get(s.class_id) || 0;
      studentCountByClass.set(s.class_id, count + 1);
    });

    // ========================================
    // BATCH QUERY 3: Get score counts for all exams at once
    // ========================================
    const { data: allScores } = await supabase
      .from("scores")
      .select("exam_id")
      .in("exam_id", examIds);

    // Group score counts by exam_id
    const scoreCountByExam = new Map<string, number>();
    (allScores || []).forEach((s) => {
      const count = scoreCountByExam.get(s.exam_id) || 0;
      scoreCountByExam.set(s.exam_id, count + 1);
    });

    // ========================================
    // BUILD ALERTS from batch data (no more queries)
    // ========================================
    recentExams.forEach((exam) => {
      const examInfo = examClassMap.get(exam.id);
      if (!examInfo) return;

      const totalStudents = studentCountByClass.get(examInfo.classId) || 0;
      const submittedScores = scoreCountByExam.get(exam.id) || 0;

      if (totalStudents > 0) {
        const completionRate = (submittedScores / totalStudents) * 100;

        if (completionRate < 70) {
          alerts.push({
            id: `alert-${exam.id}`,
            message: `Low completion rate (${Math.round(
              completionRate
            )}%) for ${examInfo.examName} in ${examInfo.className}`,
            when: "1 day ago",
          });
        }
      }
    });

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
 * OPTIMIZED: Batch queries instead of N+1 pattern (5-10x speedup)
 */
export async function getOverdueTable(): Promise<OverdueTableRow[]> {
  const supabase = createClient();

  try {
    const today = new Date().toISOString().split("T")[0];

    // ========================================
    // BATCH QUERY 1: Get overdue exams with their class info
    // ========================================
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

    if (error || !exams || exams.length === 0) {
      console.error("Error fetching overdue exams:", error);
      return [];
    }

    // Extract unique class IDs and exam IDs
    const classIds = new Set<string>();
    const examIds: string[] = [];
    const examClassMap = new Map<string, {
      examId: string;
      examName: string;
      examDate: string;
      classId: string;
      className: string;
      grade: number;
      track: string | null;
    }>();

    exams.forEach((exam) => {
      const courseData = exam.courses as unknown as {
        class_id: string;
        classes: { id: string; name: string; grade: number; track: string | null };
      };
      const classId = courseData.classes.id;
      classIds.add(classId);
      examIds.push(exam.id);
      examClassMap.set(exam.id, {
        examId: exam.id,
        examName: exam.name,
        examDate: exam.exam_date,
        classId,
        className: courseData.classes.name,
        grade: courseData.classes.grade,
        track: courseData.classes.track,
      });
    });

    // ========================================
    // BATCH QUERY 2: Get student counts for all classes at once
    // ========================================
    const { data: allStudents } = await supabase
      .from("students")
      .select("class_id")
      .in("class_id", Array.from(classIds))
      .eq("is_active", true);

    // Group student counts by class_id
    const studentCountByClass = new Map<string, number>();
    (allStudents || []).forEach((s) => {
      const count = studentCountByClass.get(s.class_id) || 0;
      studentCountByClass.set(s.class_id, count + 1);
    });

    // ========================================
    // BATCH QUERY 3: Get score counts for all exams at once
    // ========================================
    const { data: allScores } = await supabase
      .from("scores")
      .select("exam_id")
      .in("exam_id", examIds);

    // Group score counts by exam_id
    const scoreCountByExam = new Map<string, number>();
    (allScores || []).forEach((s) => {
      const count = scoreCountByExam.get(s.exam_id) || 0;
      scoreCountByExam.set(s.exam_id, count + 1);
    });

    // ========================================
    // BUILD OVERDUE DATA from batch data (no more queries)
    // ========================================
    const overdueData: OverdueTableRow[] = exams.map((exam) => {
      const examInfo = examClassMap.get(exam.id)!;
      const totalStudents = studentCountByClass.get(examInfo.classId) || 0;
      const studentsWithScores = scoreCountByExam.get(exam.id) || 0;

      const coverage =
        totalStudents > 0
          ? Math.round((studentsWithScores / totalStudents) * 100)
          : 0;

      const missing = totalStudents - studentsWithScores;

      // Calculate days overdue
      const examDate = new Date(examInfo.examDate);
      const diffTime = Date.now() - examDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      return {
        examId: examInfo.examId,
        examName: examInfo.examName,
        grade: examInfo.grade,
        className: examInfo.className,
        track: examInfo.track as "local" | "international" | null,
        coverage,
        missing,
        dueIn: `${diffDays} days ago`,
        examDate: examInfo.examDate,
      };
    });

    return overdueData;
  } catch (error) {
    console.error("Exception in getOverdueTable:", error);
    return [];
  }
}

/**
 * Get class performance overview for Admin dashboard
 * OPTIMIZED: Batch queries instead of N+1 pattern (10-20x speedup for 84 classes)
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

    if (classesError || !classes || classes.length === 0) {
      console.error("Error fetching classes:", classesError);
      return [];
    }

    const classIds = classes.map((c) => c.id);

    // ========================================
    // BATCH QUERY 1: Get all students in all classes at once
    // ========================================
    const { data: allStudents } = await supabase
      .from("students")
      .select("id, class_id")
      .in("class_id", classIds)
      .eq("is_active", true);

    // Group students by class_id
    const studentCountByClass = new Map<string, number>();
    (allStudents || []).forEach((s) => {
      const count = studentCountByClass.get(s.class_id) || 0;
      studentCountByClass.set(s.class_id, count + 1);
    });

    // ========================================
    // BATCH QUERY 2: Get all courses for all classes to build course->class mapping
    // ========================================
    const { data: allCourses } = await supabase
      .from("courses")
      .select("id, class_id")
      .in("class_id", classIds)
      .eq("is_active", true);

    const courseIdsByClass = new Map<string, string[]>();
    const courseIdToClassId = new Map<string, string>();

    classIds.forEach((id) => courseIdsByClass.set(id, []));

    (allCourses || []).forEach((course) => {
      const courseIds = courseIdsByClass.get(course.class_id);
      if (courseIds) {
        courseIds.push(course.id);
      }
      courseIdToClassId.set(course.id, course.class_id);
    });

    const allCourseIds = Array.from(courseIdsByClass.values()).flat();

    // ========================================
    // BATCH QUERY 3: Get all recent scores for all classes at once
    // IMPORTANT: Override Supabase default 1000 row limit
    // ========================================
    let allScores: Array<{ score: number | null; exam: { course_id: string } }> = [];

    if (allCourseIds.length > 0) {
      const { data: scoresData } = await supabase
        .from("scores")
        .select(
          `
          score,
          exam:exams!inner(
            course_id
          )
        `
        )
        .in("exams.course_id", allCourseIds)
        .gte(
          "entered_at",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        ) // Last 30 days
        .not("score", "is", null)
        .limit(10000);

      allScores = (scoresData || []).map((s) => ({
        score: s.score,
        exam: s.exam as unknown as { course_id: string },
      }));
    }

    // Group scores by class_id
    const scoresByClass = new Map<string, number[]>();
    classIds.forEach((id) => scoresByClass.set(id, []));

    allScores.forEach((s) => {
      const classId = courseIdToClassId.get(s.exam.course_id);
      if (classId && s.score && s.score > 0) {
        const classScores = scoresByClass.get(classId);
        if (classScores) {
          classScores.push(s.score);
        }
      }
    });

    // ========================================
    // BUILD PERFORMANCE DATA from batch data (no more queries)
    // ========================================
    const performanceData: ClassPerformanceRow[] = [];

    classes.forEach((cls) => {
      const studentCount = studentCountByClass.get(cls.id) || 0;
      const validScores = scoresByClass.get(cls.id) || [];

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
          studentCount,
        });
      }
    });

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
  progressRate: number;       // 成績輸入進度百分比
  scoresEntered: number;      // 已輸入成績數
  expectedScores: number;     // 預期成績數 (學生數 × 13)
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
  progressRate: number;       // 成績輸入進度百分比
  lastActivity: string;
}

/**
 * Get Head Teacher KPIs for their specific grade band and course type
 * @param gradeBand - Grade band string: "1", "2", "3-4", "5-6", "1-2", "1-6"
 * @param courseType - Course type: "LT", "IT", "KCFS"
 * @param academicYear - Academic year string: "2025-2026", "2026-2027"
 */
export async function getHeadTeacherKpis(
  gradeBand: string,
  courseType: "LT" | "IT" | "KCFS",
  academicYear: string = "2025-2026"
): Promise<HeadTeacherKpis> {
  const supabase = createClient();

  try {
    // Parse grade band to get grade numbers (use unified parseGradeBand function)
    const grades = parseGradeBand(gradeBand);

    // Get classes in these grades for the specified academic year
    const { data: classes, error: classesError } = await supabase
      .from("classes")
      .select("id, name")
      .in("grade", grades)
      .eq("is_active", true)
      .eq("academic_year", academicYear);

    if (classesError) {
      console.error("Error fetching head teacher classes:", classesError);
      return {
        totalClasses: 0,
        averageScore: 0,
        progressRate: 0,
        scoresEntered: 0,
        expectedScores: 0,
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
        progressRate: 0,
        scoresEntered: 0,
        expectedScores: 0,
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

    // Get teachers count (unique teachers teaching in these classes for this course type)
    const { data: courses } = await supabase
      .from("courses")
      .select("teacher_id")
      .in("class_id", classIds)
      .eq("is_active", true)
      .eq("academic_year", academicYear)
      .eq("course_type", courseType);  // Filter by course type

    const uniqueTeachers = new Set((courses || []).map((c) => c.teacher_id).filter(Boolean));
    const teachersCount = uniqueTeachers.size;

    // Get course IDs for this course type
    const { data: coursesForScores } = await supabase
      .from("courses")
      .select("id")
      .in("class_id", classIds)
      .eq("is_active", true)
      .eq("academic_year", academicYear)
      .eq("course_type", courseType);  // Filter by course type

    const courseIds = (coursesForScores || []).map((c) => c.id);

    if (courseIds.length === 0) {
      return {
        totalClasses,
        averageScore: 0,
        progressRate: 0,
        scoresEntered: 0,
        expectedScores: (studentsCount || 0) * DEFAULT_ASSESSMENT_ITEMS,
        activeIssues: null,
        studentsCount: studentsCount || 0,
        teachersCount,
      };
    }

    // Get recent scores for average calculation (filtered by course type via course IDs)
    // IMPORTANT: Override Supabase default 1000 row limit
    const { data: scores } = await supabase
      .from("scores")
      .select(
        `
        score,
        student_id,
        exams!inner(
          course_id
        )
      `
      )
      .in("exams.course_id", courseIds)  // Filter by courses of this type
      .gte(
        "entered_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      ) // Last 30 days
      .not("score", "is", null)
      .limit(10000);  // Override default 1000 row limit

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

    // Calculate progress rate (scores entered / expected)
    // 13 評量項目 = FA1-8 (8) + SA1-4 (4) + MID (1)
    const scoresEntered = (scores || []).length;
    const expectedScores = (studentsCount || 0) * DEFAULT_ASSESSMENT_ITEMS;
    const progressRate = expectedScores > 0
      ? Math.round((scoresEntered / expectedScores) * 100)
      : 0;

    // activeIssues 需要問題追蹤系統實作，暫時返回 null

    return {
      totalClasses,
      averageScore,
      progressRate,
      scoresEntered,
      expectedScores,
      activeIssues: null, // 待問題追蹤系統實作
      studentsCount: studentsCount || 0,
      teachersCount,
    };
  } catch (error) {
    console.error("Exception in getHeadTeacherKpis:", error);
    return {
      totalClasses: 0,
      averageScore: 0,
      progressRate: 0,
      scoresEntered: 0,
      expectedScores: 0,
      activeIssues: null,
      studentsCount: 0,
      teachersCount: 0,
    };
  }
}

/**
 * Get grade class summary for Head Teacher overview
 * OPTIMIZED: Batch queries instead of N+1 pattern (5-7x speedup)
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

    if (classesError || !classes || classes.length === 0) {
      console.error("Error fetching classes:", classesError);
      return [];
    }

    const classIds = classes.map((c) => c.id);

    // ========================================
    // BATCH QUERY 1: Get all students in all classes at once
    // ========================================
    const { data: allStudents } = await supabase
      .from("students")
      .select("id, class_id")
      .in("class_id", classIds)
      .eq("is_active", true);

    // Group students by class_id
    const studentCountByClass = new Map<string, number>();
    (allStudents || []).forEach((s) => {
      const count = studentCountByClass.get(s.class_id) || 0;
      studentCountByClass.set(s.class_id, count + 1);
    });

    // ========================================
    // BATCH QUERY 2: Get all courses with teachers for all classes at once
    // ========================================
    const { data: allCourses } = await supabase
      .from("courses")
      .select(
        `
        id,
        class_id,
        course_type,
        users!courses_teacher_id_fkey(
          full_name
        )
      `
      )
      .in("class_id", classIds)
      .eq("is_active", true);

    // Group teachers by class_id and course_type
    const teachersByClass = new Map<string, { lt: string | null; it: string | null; kcfs: string | null }>();
    classIds.forEach((id) => teachersByClass.set(id, { lt: null, it: null, kcfs: null }));

    const courseIdsByClass = new Map<string, string[]>();
    classIds.forEach((id) => courseIdsByClass.set(id, []));

    (allCourses || []).forEach((course) => {
      const userData = course.users as unknown as { full_name: string } | null;
      const teacherName = userData?.full_name || "Unassigned";
      const teachers = teachersByClass.get(course.class_id);

      if (teachers) {
        switch (course.course_type) {
          case "LT":
            teachers.lt = teacherName;
            break;
          case "IT":
            teachers.it = teacherName;
            break;
          case "KCFS":
            teachers.kcfs = teacherName;
            break;
        }
      }

      // Collect course IDs for score query
      const courseIds = courseIdsByClass.get(course.class_id);
      if (courseIds) {
        courseIds.push(course.id);
      }
    });

    // ========================================
    // BATCH QUERY 3: Get all scores for all classes at once
    // Using course_id to link scores → exams → courses → classes
    // ========================================
    const allCourseIds = Array.from(courseIdsByClass.values()).flat();

    let allScores: Array<{
      score: number | null;
      student_id: string;
      entered_at: string;
      exam: { course_id: string };
    }> = [];

    if (allCourseIds.length > 0) {
      // IMPORTANT: Override Supabase default 1000 row limit
      const { data: scoresData } = await supabase
        .from("scores")
        .select(
          `
          score,
          student_id,
          entered_at,
          exam:exams!inner(
            course_id
          )
        `
        )
        .in("exams.course_id", allCourseIds)
        .gte(
          "entered_at",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        ) // Last 30 days
        .not("score", "is", null)
        .limit(10000);

      allScores = (scoresData || []).map((s) => ({
        score: s.score,
        student_id: s.student_id,
        entered_at: s.entered_at,
        exam: s.exam as unknown as { course_id: string },
      }));
    }

    // Group scores by class_id (via course_id mapping)
    const courseIdToClassId = new Map<string, string>();
    courseIdsByClass.forEach((courseIds, classId) => {
      courseIds.forEach((courseId) => courseIdToClassId.set(courseId, classId));
    });

    const scoresByClass = new Map<string, typeof allScores>();
    classIds.forEach((id) => scoresByClass.set(id, []));

    allScores.forEach((score) => {
      const classId = courseIdToClassId.get(score.exam.course_id);
      if (classId) {
        const classScores = scoresByClass.get(classId);
        if (classScores) {
          classScores.push(score);
        }
      }
    });

    // ========================================
    // BUILD SUMMARY from batch data (no more queries)
    // ========================================
    const classSummary: GradeClassSummary[] = classes.map((cls) => {
      const studentCount = studentCountByClass.get(cls.id) || 0;
      const teachers = teachersByClass.get(cls.id) || { lt: null, it: null, kcfs: null };
      const scores = scoresByClass.get(cls.id) || [];

      const validScores = scores
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

      // Calculate progress rate (scores entered / expected)
      // 13 評量項目 = FA1-8 (8) + SA1-4 (4) + MID (1)
      const scoresEntered = scores.length;
      const expectedScores = studentCount * DEFAULT_ASSESSMENT_ITEMS;
      const progressRate =
        expectedScores > 0
          ? Math.round((scoresEntered / expectedScores) * 100)
          : 0;

      // Get last activity date
      const lastActivityDate =
        scores.length > 0
          ? Math.max(...scores.map((s) => new Date(s.entered_at).getTime()))
          : 0;

      const lastActivity =
        lastActivityDate > 0
          ? new Date(lastActivityDate).toLocaleDateString()
          : "No activity";

      return {
        className: cls.name,
        track: cls.track as "local" | "international",
        studentCount,
        ltTeacher: teachers.lt,
        itTeacher: teachers.it,
        kcfsTeacher: teachers.kcfs,
        avgScore,
        progressRate,
        lastActivity,
      };
    });

    return classSummary;
  } catch (error) {
    console.error("Exception in getGradeClassSummary:", error);
    return [];
  }
}
