/**
 * Teacher Progress API
 * 計算教師的成績輸入進度（真實數據）
 */

import { createClient } from "@/lib/supabase/client";

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

// 預設評量項目數
const DEFAULT_ASSESSMENT_ITEMS = 13; // FA1-8 + SA1-4 + MID

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

/**
 * 計算進度百分比
 */
function calculateProgress(
  scoresEntered: number,
  studentCount: number,
  expectedItems: number = DEFAULT_ASSESSMENT_ITEMS
): number {
  const totalExpected = studentCount * expectedItems;
  if (totalExpected === 0) return 0;
  return Math.min(100, Math.round((scoresEntered / totalExpected) * 100));
}

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

  // 2. 取得該年級的班級
  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, name, grade")
    .in("grade", grades)
    .eq("is_active", true)
    .eq("academic_year", filters.academic_year);

  if (classesError) {
    console.error("[getTeachersProgress] Classes query error:", classesError);
    return { data: [], stats: { total_teachers: 0, completed: 0, in_progress: 0, needs_attention: 0 } };
  }

  const classIds = classes?.map((c) => c.id) || [];
  const classNameMap = new Map(classes?.map((c) => [c.id, c.name]) || []);

  if (classIds.length === 0) {
    return { data: [], stats: { total_teachers: 0, completed: 0, in_progress: 0, needs_attention: 0 } };
  }

  // 3. 取得課程和教師
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

  const { data: courses, error: coursesError } = await coursesQuery;

  if (coursesError) {
    console.error("[getTeachersProgress] Courses query error:", coursesError);
    return { data: [], stats: { total_teachers: 0, completed: 0, in_progress: 0, needs_attention: 0 } };
  }

  // 4. 並行查詢：學生數 + 考試（都只需要 courseIds）
  const courseIds = courses?.map((c) => c.id) || [];

  // 建立 exams 查詢
  let examsQuery = supabase
    .from("exams")
    .select("id, course_id, term")
    .in("course_id", courseIds);

  if (filters.term) {
    examsQuery = examsQuery.eq("term", filters.term);
  }

  // 並行執行 student_courses 和 exams 查詢
  const [studentCountsResult, examsResult] = await Promise.all([
    supabase
      .from("student_courses")
      .select("course_id")
      .in("course_id", courseIds),
    examsQuery,
  ]);

  const { data: studentCounts, error: studentCountError } = studentCountsResult;
  const { data: exams, error: examsError } = examsResult;

  if (studentCountError) {
    console.error("[getTeachersProgress] Student count error:", studentCountError);
  }
  if (examsError) {
    console.error("[getTeachersProgress] Exams query error:", examsError);
  }

  // 計算每個課程的學生數
  const courseStudentCount = new Map<string, number>();
  studentCounts?.forEach((sc) => {
    const count = courseStudentCount.get(sc.course_id) || 0;
    courseStudentCount.set(sc.course_id, count + 1);
  });

  const examIds = exams?.map((e) => e.id) || [];
  const examToCourse = new Map(exams?.map((e) => [e.id, e.course_id]) || []);

  // 5. 取得成績
  let scoresData: { exam_id: string }[] = [];
  if (examIds.length > 0) {
    const { data: scores, error: scoresError } = await supabase
      .from("scores")
      .select("exam_id")
      .in("exam_id", examIds)
      .not("score", "is", null);

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

  // 6. 按教師分組並計算進度
  const teacherMap = new Map<
    string,
    {
      teacher_id: string;
      teacher_name: string;
      email: string;
      teacher_type: CourseType | null;
      courses: { course_id: string; class_id: string; class_name: string }[];
      total_students: number;
      total_scores: number;
    }
  >();

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

    if (existing) {
      existing.courses.push({
        course_id: course.id,
        class_id: course.class_id,
        class_name: className,
      });
      existing.total_students += studentCount;
      existing.total_scores += scoreCount;
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
        total_students: studentCount,
        total_scores: scoreCount,
      });
    }
  });

  // 7. 轉換為 TeacherProgress 格式
  const teacherProgressList: TeacherProgress[] = [];

  teacherMap.forEach((teacher) => {
    const scores_expected = teacher.total_students * DEFAULT_ASSESSMENT_ITEMS;
    const completion_rate = calculateProgress(
      teacher.total_scores,
      teacher.total_students
    );
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
