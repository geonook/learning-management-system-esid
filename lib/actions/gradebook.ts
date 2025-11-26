"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type GradebookData = {
  students: {
    id: string;
    student_id: string;
    full_name: string;
    scores: Record<string, number | null>; // code -> score
  }[];
  assessmentCodes: string[];
};

/**
 * Fetch all students and their scores for a given class
 */
export async function getGradebookData(
  classId: string
): Promise<GradebookData> {
  const supabase = createClient();

  // 1. Get students in class
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, student_id, full_name")
    .eq("class_id", classId)
    .order("student_id");

  if (studentsError)
    throw new Error(`Failed to fetch students: ${studentsError.message}`);

  // 2. Get scores for these students
  const studentIds = students.map((s) => s.id);
  const { data: scores, error: scoresError } = await supabase
    .from("scores")
    .select("student_id, assessment_code, score")
    .in("student_id", studentIds);

  if (scoresError)
    throw new Error(`Failed to fetch scores: ${scoresError.message}`);

  // 3. Transform to GradebookData format
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

  return {
    students: studentsWithScores,
    assessmentCodes: [
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
    ],
  };
}

/**
 * Update a single score
 * Permission: Class Teacher OR Head Teacher of same grade
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

  // Get class details (teacher_id, grade)
  const { data: classData, error: classError } = await supabase
    .from("classes")
    .select("teacher_id, grade")
    .eq("id", classId)
    .single();

  if (classError || !classData) throw new Error("Class not found");

  const isClassTeacher = classData.teacher_id === user.id;
  const isGradeHead =
    currentUser.role === "head" && currentUser.grade === classData.grade;
  const isAdmin = currentUser.role === "admin";

  if (!isClassTeacher && !isGradeHead && !isAdmin) {
    throw new Error(
      "Permission denied: Only Class Teacher or Grade Head can edit grades."
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
