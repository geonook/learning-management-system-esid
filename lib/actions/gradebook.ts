"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Term } from "@/types/academic-year";
import { TERM_ASSESSMENT_CODES } from "@/types/academic-year";
import { getKCFSCategoryCodes } from "@/lib/grade/kcfs-calculations";
import { isValidKCFSScore } from "@/lib/grade/kcfs-calculations";
import { assertPeriodEditable, getActiveTerm } from "@/lib/academic-period";

export type CourseType = "LT" | "IT" | "KCFS";

export type TeacherInfo = {
  teacherName: string | null;
  teacherId: string | null;
};

// Score entry with absent flag
export type ScoreEntry = {
  value: number | null;
  isAbsent: boolean;
};

export type GradebookData = {
  students: {
    id: string;
    student_id: string;
    full_name: string;
    scores: Record<string, number | null>; // code -> score
    absentFlags: Record<string, boolean>; // code -> isAbsent
  }[];
  assessmentCodes: string[];
  availableCourseTypes: CourseType[];
  currentCourseType: CourseType | null;
  currentTerm: Term | null;
  teacherInfo: TeacherInfo | null;
  classGrade?: number; // For KCFS category determination
  academicYear?: string; // For period lock check
};

/**
 * Get available course types for a class, filtered by user role
 * - Admin/Office Member: see all course types
 * - Head Teacher: only see courses matching their track
 * - Teacher: only see their own course type(s)
 */
export async function getAvailableCourseTypes(
  classId: string
): Promise<CourseType[]> {
  const supabase = createClient();

  // Get current user and their role/permissions
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRole: string | null = null;
  let userTrack: string | null = null;
  let userId: string | null = null;

  if (user) {
    userId = user.id;
    const { data: userData } = await supabase
      .from("users")
      .select("role, track")
      .eq("id", user.id)
      .single();

    if (userData) {
      userRole = userData.role;
      userTrack = userData.track;
    }
  }

  // Build query based on role
  let coursesQuery = supabase
    .from("courses")
    .select("course_type, teacher_id")
    .eq("class_id", classId)
    .eq("is_active", true);

  const { data: courses, error } = await coursesQuery;

  if (error) {
    console.error("Failed to fetch course types:", error.message);
    return [];
  }

  // Filter courses based on role
  let filteredCourses = courses;

  if (userRole === "teacher") {
    // Teacher: only see their own course(s)
    filteredCourses = courses.filter((c) => c.teacher_id === userId);
  } else if (userRole === "head" && userTrack) {
    // Head Teacher: only see courses matching their track
    filteredCourses = courses.filter((c) => c.course_type === userTrack);
  }
  // Admin and Office Member see all courses

  const courseTypes = [...new Set(filteredCourses.map((c) => c.course_type as CourseType))];
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

  // 2.5. Get class grade and academic year
  const { data: classData } = await supabase
    .from("classes")
    .select("grade, academic_year")
    .eq("id", classId)
    .single();

  const classGrade = classData?.grade ?? 1;
  const academicYear = classData?.academic_year ?? undefined;

  // 3. Get scores filtered by course type and term via exam -> course relationship
  const studentIds = students.map((s) => s.id);

  let scoresQuery = supabase
    .from("scores")
    .select(`
      student_id,
      assessment_code,
      score,
      is_absent,
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

  // 4. Transform to GradebookData format (now includes absentFlags)
  const studentsWithScores = students.map((student) => {
    const studentScores: Record<string, number | null> = {};
    const absentFlags: Record<string, boolean> = {};

    scores
      ?.filter((s) => s.student_id === student.id)
      .forEach((s) => {
        studentScores[s.assessment_code] = s.score;
        absentFlags[s.assessment_code] = s.is_absent ?? false;
      });

    return {
      ...student,
      scores: studentScores,
      absentFlags,
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

  // Determine assessment codes based on course type and term
  // KCFS uses grade-specific category codes
  // LT/IT uses term-based assessment codes
  let assessmentCodes: string[];

  if (selectedCourseType === "KCFS") {
    // KCFS: Use grade-specific category codes
    assessmentCodes = getKCFSCategoryCodes(classGrade);
  } else if (selectedTerm) {
    // LT/IT with term: Use term-specific codes
    assessmentCodes = TERM_ASSESSMENT_CODES[selectedTerm];
  } else {
    // LT/IT without term: Show all codes
    assessmentCodes = [
      "FA1", "FA2", "FA3", "FA4", "FA5", "FA6", "FA7", "FA8",
      "SA1", "SA2", "SA3", "SA4",
      "MID", "FINAL",
    ];
  }

  return {
    students: studentsWithScores,
    assessmentCodes,
    availableCourseTypes,
    currentCourseType: selectedCourseType,
    currentTerm: selectedTerm,
    teacherInfo,
    classGrade,
    academicYear,
  };
}

/**
 * Update a single score
 * Permission: Course Teacher (via courses table) OR Head Teacher of same grade OR Admin
 * Note: Office Members with teaching assignments can also edit their own courses
 *
 * @param classId - The class ID
 * @param studentId - The student ID
 * @param assessmentCode - The assessment code (FA1, COMM, etc.)
 * @param score - The score value (null to clear)
 * @param isAbsent - Whether the student is absent (optional, defaults to false)
 * @param courseType - The course type (optional, for validation)
 * @param term - The term number (1-4) for period lock validation
 */
export async function updateScore(
  classId: string,
  studentId: string,
  assessmentCode: string,
  score: number | null,
  isAbsent: boolean = false,
  courseType?: CourseType,
  term?: number
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

  // --- Period Lock Check ---
  // Get class academic year from courses
  const { data: classInfo } = await supabase
    .from("classes")
    .select("academic_year")
    .eq("id", classId)
    .single();

  // Period lock validation using frontend term or active term from Period Management
  // This applies to all course types (LT/IT/KCFS)
  if (classInfo?.academic_year) {
    // If term is provided by frontend, use it; otherwise get active term from Period Management
    let termToCheck = term;
    if (!termToCheck) {
      termToCheck = await getActiveTerm(classInfo.academic_year) ?? undefined;
    }

    // Only check if we have a term to validate
    if (termToCheck) {
      try {
        await assertPeriodEditable({
          academicYear: classInfo.academic_year,
          term: termToCheck,
        });
      } catch (error) {
        // Re-throw with a user-friendly message
        throw new Error(
          error instanceof Error ? error.message : "此時間段已鎖定，無法編輯成績"
        );
      }
    }
  }
  // ------------------------

  // --- Score Validation ---
  // If absent, score should be null
  if (isAbsent && score !== null) {
    throw new Error("Score must be null when marking as absent");
  }

  // Validate score based on course type
  if (score !== null && !isAbsent) {
    if (courseType === "KCFS") {
      // KCFS: 0-5 range, 0.5 increments
      if (!isValidKCFSScore(score)) {
        throw new Error("KCFS scores must be between 0 and 5, in 0.5 increments");
      }
    } else {
      // LT/IT: 0-100 range
      if (score < 0 || score > 100) {
        throw new Error("Scores must be between 0 and 100");
      }
    }
  }
  // ------------------------

  // Upsert score
  // First, get exam_id for this assessment code and course.
  // The schema requires exam_id with course_id (NOT class_id).
  // Strategy: Find the course for this class, course type, and academic year, then find/create exam.

  // 1. Get the course_id for this class, course type, and academic year
  // Note: classInfo.academic_year was already fetched for period lock check
  const effectiveCourseType = courseType || "LT";

  // Build course query with academic_year filter
  let courseQuery = supabase
    .from("courses")
    .select("id")
    .eq("class_id", classId)
    .eq("course_type", effectiveCourseType)
    .eq("is_active", true);

  // Add academic_year filter if available (prevents duplicate course issues)
  if (classInfo?.academic_year) {
    courseQuery = courseQuery.eq("academic_year", classInfo.academic_year);
  }

  const { data: course, error: courseError } = await courseQuery.single();

  if (courseError || !course) {
    throw new Error(`Course not found for class ${classId} and type ${effectiveCourseType}`);
  }

  // 2. Find existing exam for this assessment code, course, and term
  // Note: exams table has UNIQUE constraint on (course_id, name), so we need to include term in the name
  // or filter by term if it exists
  let examQuery = supabase
    .from("exams")
    .select("id")
    .eq("course_id", course.id)
    .eq("name", assessmentCode);

  // Only filter by term if provided (supports "all" view where term is null)
  if (term) {
    examQuery = examQuery.eq("term", term);
  }

  let { data: exam } = await examQuery.single();

  // 3. If not exists, create it with term
  if (!exam) {
    const { data: newExam, error: createExamError } = await supabase
      .from("exams")
      .insert({
        name: assessmentCode,
        course_id: course.id,
        created_by: user.id,
        exam_date: new Date().toISOString(),
        term: term || null, // Include term for proper filtering
      })
      .select("id")
      .single();

    if (createExamError)
      throw new Error(
        `Failed to create exam record: ${createExamError.message}`
      );
    exam = newExam;
  }

  // 3. Upsert score (now includes is_absent)
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
    const { error: updateError } = await supabase
      .from("scores")
      .update({
        score: isAbsent ? null : score,
        is_absent: isAbsent,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
        course_id: course.id,
      })
      .eq("id", existingScore.id);

    if (updateError) {
      console.error("Score update error:", updateError);
      throw new Error(`Failed to update score: ${updateError.message}`);
    }
  } else {
    const { error: insertError } = await supabase.from("scores").insert({
      student_id: studentId,
      exam_id: exam.id,
      assessment_code: assessmentCode,
      score: isAbsent ? null : score,
      is_absent: isAbsent,
      entered_by: user.id,
      course_id: course.id,
    });

    if (insertError) {
      console.error("Score insert error:", insertError);
      throw new Error(`Failed to insert score: ${insertError.message}`);
    }
  }

  revalidatePath(`/gradebook`);
  return { success: true };
}
