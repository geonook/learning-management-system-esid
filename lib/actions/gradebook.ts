"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Term } from "@/types/academic-year";
import { TERM_ASSESSMENT_CODES } from "@/types/academic-year";

export type CourseType = "LT" | "IT" | "KCFS";

export type TeacherInfo = {
  teacherName: string | null;
  teacherId: string | null;
};

export type GradebookData = {
  students: {
    id: string;
    student_id: string;
    full_name: string;
    scores: Record<string, number | null>; // code -> score
  }[];
  assessmentCodes: string[];
  availableCourseTypes: CourseType[];
  currentCourseType: CourseType | null;
  currentTerm: Term | null;
  teacherInfo: TeacherInfo | null;
};

/**
 * Get available course types for a class
 */
export async function getAvailableCourseTypes(
  classId: string
): Promise<CourseType[]> {
  const supabase = createClient();

  const { data: courses, error } = await supabase
    .from("courses")
    .select("course_type")
    .eq("class_id", classId)
    .eq("is_active", true);

  if (error) {
    console.error("Failed to fetch course types:", error.message);
    return [];
  }

  const courseTypes = [...new Set(courses.map((c) => c.course_type as CourseType))];
  // Sort in consistent order: LT, IT, KCFS
  const order: CourseType[] = ["LT", "IT", "KCFS"];
  return courseTypes.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/**
 * Fetch all students and their scores for a given class, course type, and term
 * @param classId - The class ID
 * @param courseType - Optional course type filter (LT/IT/KCFS)
 * @param term - Optional term filter (1-4). When specified, only shows assessments for that term.
 */
export async function getGradebookData(
  classId: string,
  courseType?: CourseType | null,
  term?: Term | null
): Promise<GradebookData> {
  const supabase = createClient();

  // 1. Get available course types for this class
  const availableCourseTypes = await getAvailableCourseTypes(classId);

  // Default to first available course type if not specified
  const selectedCourseType = courseType || availableCourseTypes[0] || null;

  // Default term: null means show all terms
  const selectedTerm = term ?? null;

  // 2. Get students in class
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, student_id, full_name")
    .eq("class_id", classId)
    .eq("is_active", true)
    .order("student_id");

  if (studentsError)
    throw new Error(`Failed to fetch students: ${studentsError.message}`);

  // 3. Get scores filtered by course type and term via exam -> course relationship
  const studentIds = students.map((s) => s.id);

  let scoresQuery = supabase
    .from("scores")
    .select(`
      student_id,
      assessment_code,
      score,
      exam:exams!inner(
        course_id,
        term,
        course:courses!inner(
          course_type
        )
      )
    `)
    .in("student_id", studentIds);

  // Filter by course type if specified
  if (selectedCourseType) {
    scoresQuery = scoresQuery.eq("exam.course.course_type", selectedCourseType);
  }

  // Filter by term if specified
  if (selectedTerm) {
    scoresQuery = scoresQuery.eq("exam.term", selectedTerm);
  }

  const { data: scores, error: scoresError } = await scoresQuery;

  if (scoresError) {
    console.error("Scores query error:", scoresError);
    throw new Error(`Failed to fetch scores: ${scoresError.message}`);
  }

  // 4. Transform to GradebookData format
  const studentsWithScores = students.map((student) => {
    const studentScores: Record<string, number | null> = {};
    scores
      ?.filter((s) => s.student_id === student.id)
      .forEach((s) => {
        studentScores[s.assessment_code] = s.score;
      });

    return {
      ...student,
      scores: studentScores,
    };
  });

  // 5. Get teacher info for the selected course type
  let teacherInfo: TeacherInfo | null = null;

  if (selectedCourseType) {
    const { data: course } = await supabase
      .from("courses")
      .select(`
        teacher_id,
        teacher:users(full_name)
      `)
      .eq("class_id", classId)
      .eq("course_type", selectedCourseType)
      .eq("is_active", true)
      .single();

    if (course) {
      // Handle the nested teacher object - Supabase returns object for single FK relation
      const teacher = course.teacher as unknown as { full_name: string } | null;
      teacherInfo = {
        teacherName: teacher?.full_name || null,
        teacherId: course.teacher_id,
      };
    }
  }

  // Determine assessment codes based on term
  // If term is specified, show only that term's assessment codes
  // Otherwise, show all assessment codes
  const assessmentCodes = selectedTerm
    ? TERM_ASSESSMENT_CODES[selectedTerm]
    : [
        // All assessment codes (Term 1/3: FA1-4, SA1-2, MID; Term 2/4: FA5-8, SA3-4, FINAL)
        "FA1",
        "FA2",
        "FA3",
        "FA4",
        "FA5",
        "FA6",
        "FA7",
        "FA8",
        "SA1",
        "SA2",
        "SA3",
        "SA4",
        "MID",
        "FINAL",
      ];

  return {
    students: studentsWithScores,
    assessmentCodes,
    availableCourseTypes,
    currentCourseType: selectedCourseType,
    currentTerm: selectedTerm,
    teacherInfo,
  };
}

/**
 * Update a single score
 * Permission: Course Teacher (via courses table) OR Head Teacher of same grade OR Admin
 * Note: Office Members with teaching assignments can also edit their own courses
 */
export async function updateScore(
  classId: string,
  studentId: string,
  assessmentCode: string,
  score: number | null
) {
  const supabase = createClient();

  // --- Permission Check ---
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Get user details (role, grade)
  const { data: currentUser, error: userError } = await supabase
    .from("users")
    .select("role, grade")
    .eq("id", user.id)
    .single();

  if (userError || !currentUser) throw new Error("User not found");

  // Get class details (grade)
  const { data: classData, error: classError } = await supabase
    .from("classes")
    .select("grade")
    .eq("id", classId)
    .single();

  if (classError || !classData) throw new Error("Class not found");

  // Check if user is a teacher for this class via courses table
  // This includes regular teachers AND office_members with teaching assignments
  const { data: courseAssignment } = await supabase
    .from("courses")
    .select("id")
    .eq("class_id", classId)
    .eq("teacher_id", user.id)
    .single();

  const isCourseTeacher = !!courseAssignment;
  const isGradeHead =
    currentUser.role === "head" && currentUser.grade === String(classData.grade);
  const isAdmin = currentUser.role === "admin";

  if (!isCourseTeacher && !isGradeHead && !isAdmin) {
    throw new Error(
      "Permission denied: Only Course Teacher or Grade Head can edit grades."
    );
  }
  // ------------------------

  // Upsert score
  // First, get exam_id (mocking or finding default exam for this code/class context)
  // For simplicity in this phase, we assume exam_id is not strictly enforced or we find a default one.
  // However, the schema requires exam_id. We might need to fetch or create an exam record.
  // Strategy: Find an exam for this class and assessment_code, or create one.

  // 1. Find existing exam for this assessment code in this class
  // Note: The schema links scores to exam_id. We need an exam record for "FA1 for Class X".
  let { data: exam } = await supabase
    .from("exams")
    .select("id")
    .eq("class_id", classId)
    .eq("name", assessmentCode) // Using code as name for now
    .single();

  // 2. If not exists, create it
  if (!exam) {
    const { data: newExam, error: createExamError } = await supabase
      .from("exams")
      .insert({
        name: assessmentCode,
        class_id: classId,
        created_by: user.id,
        exam_date: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (createExamError)
      throw new Error(
        `Failed to create exam record: ${createExamError.message}`
      );
    exam = newExam;
  }

  // 3. Upsert score
  // We need to handle the case where score already exists for (student_id, exam_id, assessment_code)
  // But `scores` table PK is `id`. We should check unique constraint or select first.

  const { data: existingScore } = await supabase
    .from("scores")
    .select("id")
    .eq("student_id", studentId)
    .eq("exam_id", exam.id)
    .eq("assessment_code", assessmentCode)
    .single();

  if (existingScore) {
    await supabase
      .from("scores")
      .update({
        score: score,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingScore.id);
  } else {
    await supabase.from("scores").insert({
      student_id: studentId,
      exam_id: exam.id,
      assessment_code: assessmentCode,
      score: score,
      entered_by: user.id,
    });
  }

  revalidatePath(`/gradebook`);
  return { success: true };
}
