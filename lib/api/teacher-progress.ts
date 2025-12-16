/**
 * Teacher Progress API
 * 計算教師的成績輸入進度（真實數據）
 *
 * Progress calculation now uses Head Teacher's Gradebook Expectations settings:
 * - Each Grade × Level × CourseType can have different expected assessment counts
 * - Default: FA=8, SA=4, MID=1 (Total=13)
 * - Example: G5 E2 IT might have FA=4, SA=2, MID=1 (Total=7)
 */

import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_EXPECTATION,
  extractLevel,
  type Level,
} from "@/types/gradebook-expectations";

export type CourseType = "LT" | "IT" | "KCFS";

export interface TeacherProgress {
  teacher_id: string;
  teacher_name: string;
  email: string;
  teacher_type: CourseType | null;
  course_count: number;
  assigned_classes: string[];
  scores_entered: number;
  scores_expected: number;
  completion_rate: number; // 0-100
  status: "completed" | "in_progress" | "needs_attention";
}

export interface TeacherProgressFilters {
  academic_year: string;
  term?: number;
  grade_band?: string;
  course_type?: CourseType;
}

export interface TeacherProgressStats {
  total_teachers: number;
  completed: number;
  in_progress: number;
  needs_attention: number;
}

// Note: DEFAULT_EXPECTATION.expected_total (13) is now imported from types/gradebook-expectations

/**
 * 解析 grade_band 為 grades 陣列
 * 例如："5-6" => [5, 6], "3-4" => [3, 4], "1" => [1]
 */
function parseGradeBand(gradeBand?: string): number[] {
  if (!gradeBand) return [1, 2, 3, 4, 5, 6]; // 預設全部年級

  if (gradeBand.includes("-")) {
    const parts = gradeBand.split("-").map(Number);
    const start = parts[0] ?? 1;
    const end = parts[1] ?? start;
    const grades: number[] = [];
    for (let i = start; i <= end; i++) {
      grades.push(i);
    }
    return grades;
  }

  return [Number(gradeBand)];
}

// calculateProgress function removed - now using inline calculation with dynamic expected_total

/**
 * 判定狀態
 */
function determineStatus(
  completionRate: number
): "completed" | "in_progress" | "needs_attention" {
  if (completionRate >= 90) return "completed";
  if (completionRate >= 50) return "in_progress";
  return "needs_attention";
}

/**
 * 取得教師進度數據
 */
export async function getTeachersProgress(
  filters: TeacherProgressFilters
): Promise<{ data: TeacherProgress[]; stats: TeacherProgressStats }> {
  const supabase = createClient();

  // 1. 解析 grade_band 為 grades 陣列
  const grades = parseGradeBand(filters.grade_band);

  // 2. 取得該年級的班級（包含 level 欄位用於 Expectations 查詢）
  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, name, grade, level")
    .in("grade", grades)
    .eq("is_active", true)
    .eq("academic_year", filters.academic_year);

  if (classesError) {
    console.error("[getTeachersProgress] Classes query error:", classesError);
    return { data: [], stats: { total_teachers: 0, completed: 0, in_progress: 0, needs_attention: 0 } };
  }

  const classIds = classes?.map((c) => c.id) || [];
  const classNameMap = new Map(classes?.map((c) => [c.id, c.name]) || []);
  // Map class_id → { grade, level } for expectations lookup
  const classInfoMap = new Map(
    classes?.map((c) => [
      c.id,
      { grade: c.grade, level: extractLevel(c.level) },
    ]) || []
  );

  if (classIds.length === 0) {
    return { data: [], stats: { total_teachers: 0, completed: 0, in_progress: 0, needs_attention: 0 } };
  }

  // 3. 取得 Gradebook Expectations 設定
  // Query expectations for all grades in the band and the course_type
  let expectationsQuery = supabase
    .from("gradebook_expectations")
    .select("grade, level, expected_total")
    .eq("academic_year", filters.academic_year)
    .in("grade", grades);

  if (filters.term) {
    expectationsQuery = expectationsQuery.eq("term", filters.term);
  }

  if (filters.course_type) {
    expectationsQuery = expectationsQuery.eq("course_type", filters.course_type);
  }

  const { data: expectations, error: expectationsError } = await expectationsQuery;

  if (expectationsError) {
    console.error("[getTeachersProgress] Expectations query error:", expectationsError);
  }

  // Build lookup map: "grade-level" → expected_total
  // Example: "5-E2" → 7, "5-E1" → 13
  const expectationsMap = new Map<string, number>();
  expectations?.forEach((exp) => {
    if (exp.grade !== null && exp.level !== null) {
      const key = `${exp.grade}-${exp.level}`;
      expectationsMap.set(key, exp.expected_total);
    }
  });

  console.log("[getTeachersProgress] Expectations loaded:", expectationsMap.size, "entries");

  // 4. 取得課程和教師
  let coursesQuery = supabase
    .from("courses")
    .select(
      `
      id,
      class_id,
      course_type,
      teacher_id,
      teacher:users!teacher_id(id, full_name, email, teacher_type)
    `
    )
    .in("class_id", classIds)
    .eq("is_active", true)
    .eq("academic_year", filters.academic_year)
    .not("teacher_id", "is", null);

  if (filters.course_type) {
    coursesQuery = coursesQuery.eq("course_type", filters.course_type);
  }

  const { data: courses, error: coursesError } = await coursesQuery.limit(1000);  // Override default limit

  if (coursesError) {
    console.error("[getTeachersProgress] Courses query error:", coursesError);
    return { data: [], stats: { total_teachers: 0, completed: 0, in_progress: 0, needs_attention: 0 } };
  }

  // 5. 並行查詢：學生數 + 考試（都只需要 courseIds）
  const courseIds = courses?.map((c) => c.id) || [];

  // 建立 exams 查詢
  let examsQuery = supabase
    .from("exams")
    .select("id, course_id, term")
    .in("course_id", courseIds);

  if (filters.term) {
    examsQuery = examsQuery.eq("term", filters.term);
  }

  // 並行執行 students 和 exams 查詢
  // 注意：student_courses 表目前是空的，所以改用 students 表透過 class_id 關聯
  const [studentsResult, examsResult] = await Promise.all([
    supabase
      .from("students")
      .select("class_id")
      .in("class_id", classIds)
      .eq("is_active", true)
      .limit(10000),  // Override default 1000 row limit
    examsQuery.limit(10000),  // Override default 1000 row limit
  ]);

  const { data: studentsData, error: studentCountError } = studentsResult;
  const { data: exams, error: examsError } = examsResult;

  if (studentCountError) {
    console.error("[getTeachersProgress] Student count error:", studentCountError);
  }
  if (examsError) {
    console.error("[getTeachersProgress] Exams query error:", examsError);
  }

  // 計算每個班級的學生數
  const classStudentCount = new Map<string, number>();
  studentsData?.forEach((s) => {
    const count = classStudentCount.get(s.class_id) || 0;
    classStudentCount.set(s.class_id, count + 1);
  });

  // 將班級學生數映射到課程（每個班級有 3 門課程共用學生數）
  const courseStudentCount = new Map<string, number>();
  courses?.forEach((c) => {
    const studentCount = classStudentCount.get(c.class_id) || 0;
    courseStudentCount.set(c.id, studentCount);
  });

  const examIds = exams?.map((e) => e.id) || [];
  const examToCourse = new Map(exams?.map((e) => [e.id, e.course_id]) || []);

  // 6. 取得成績
  let scoresData: { exam_id: string }[] = [];
  if (examIds.length > 0) {
    const { data: scores, error: scoresError } = await supabase
      .from("scores")
      .select("exam_id")
      .in("exam_id", examIds)
      .not("score", "is", null)
      .limit(10000);  // Override default 1000 row limit

    if (scoresError) {
      console.error("[getTeachersProgress] Scores query error:", scoresError);
    }
    scoresData = scores || [];
  }

  // 計算每個課程的成績數
  const courseScoreCount = new Map<string, number>();
  scoresData.forEach((s) => {
    const courseId = examToCourse.get(s.exam_id);
    if (courseId) {
      const count = courseScoreCount.get(courseId) || 0;
      courseScoreCount.set(courseId, count + 1);
    }
  });

  // 7. 按教師分組並計算進度（使用 Expectations 設定的 expected_total）
  const teacherMap = new Map<
    string,
    {
      teacher_id: string;
      teacher_name: string;
      email: string;
      teacher_type: CourseType | null;
      courses: { course_id: string; class_id: string; class_name: string }[];
      total_scores: number;
      total_expected: number; // 累計預期成績數（考慮每班不同的 expected_total）
    }
  >();

  /**
   * Helper function to get expected_total for a class based on its grade and level
   * Falls back to DEFAULT_EXPECTATION.expected_total (13) if no setting found
   */
  function getExpectedTotalForClass(classId: string): number {
    const classInfo = classInfoMap.get(classId);
    if (!classInfo || classInfo.grade === null) {
      return DEFAULT_EXPECTATION.expected_total;
    }

    // Build key: "grade-level" (e.g., "5-E2")
    const key = `${classInfo.grade}-${classInfo.level}`;
    const expectedTotal = expectationsMap.get(key);

    // Return the configured value or default
    return expectedTotal ?? DEFAULT_EXPECTATION.expected_total;
  }

  courses?.forEach((course) => {
    // Supabase FK relations can return array or single object
    const teacherData = course.teacher;
    const teacher = Array.isArray(teacherData) ? teacherData[0] : teacherData;
    if (!teacher) return;

    const typedTeacher = teacher as {
      id: string;
      full_name: string;
      email: string;
      teacher_type: string | null;
    };

    const existing = teacherMap.get(typedTeacher.id);
    const studentCount = courseStudentCount.get(course.id) || 0;
    const scoreCount = courseScoreCount.get(course.id) || 0;
    const className = classNameMap.get(course.class_id) || "";

    // Get the expected_total for this specific class based on grade/level
    const expectedTotalForClass = getExpectedTotalForClass(course.class_id);
    const expectedScoresForCourse = studentCount * expectedTotalForClass;

    if (existing) {
      existing.courses.push({
        course_id: course.id,
        class_id: course.class_id,
        class_name: className,
      });
      existing.total_scores += scoreCount;
      existing.total_expected += expectedScoresForCourse;
    } else {
      teacherMap.set(typedTeacher.id, {
        teacher_id: typedTeacher.id,
        teacher_name: typedTeacher.full_name,
        email: typedTeacher.email,
        teacher_type: typedTeacher.teacher_type as CourseType | null,
        courses: [
          {
            course_id: course.id,
            class_id: course.class_id,
            class_name: className,
          },
        ],
        total_scores: scoreCount,
        total_expected: expectedScoresForCourse,
      });
    }
  });

  // 8. 轉換為 TeacherProgress 格式（使用動態的 expected_total）
  const teacherProgressList: TeacherProgress[] = [];

  teacherMap.forEach((teacher) => {
    // Use the pre-calculated total_expected which considers each class's grade/level settings
    const scores_expected = teacher.total_expected;

    // Calculate completion rate using total_expected (which already accounts for different expectations)
    const completion_rate =
      scores_expected > 0
        ? Math.min(100, Math.round((teacher.total_scores / scores_expected) * 100))
        : 0;
    const status = determineStatus(completion_rate);

    // 取得唯一的班級名稱
    const uniqueClasses = [...new Set(teacher.courses.map((c) => c.class_name))];

    teacherProgressList.push({
      teacher_id: teacher.teacher_id,
      teacher_name: teacher.teacher_name,
      email: teacher.email,
      teacher_type: teacher.teacher_type,
      course_count: teacher.courses.length,
      assigned_classes: uniqueClasses,
      scores_entered: teacher.total_scores,
      scores_expected: scores_expected,
      completion_rate: completion_rate,
      status: status,
    });
  });

  // 按完成率排序（高到低）
  teacherProgressList.sort((a, b) => b.completion_rate - a.completion_rate);

  // 計算統計
  const stats: TeacherProgressStats = {
    total_teachers: teacherProgressList.length,
    completed: teacherProgressList.filter((t) => t.status === "completed").length,
    in_progress: teacherProgressList.filter((t) => t.status === "in_progress").length,
    needs_attention: teacherProgressList.filter((t) => t.status === "needs_attention").length,
  };

  return { data: teacherProgressList, stats };
}
