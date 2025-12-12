/**
 * Academic Year API Helper Functions
 *
 * Provides query helpers for academic year and term-based data retrieval.
 */

import { createClient } from '@/lib/supabase/client';
import type {
  Term,
  Semester,
  AcademicYear,
  AcademicTermFilter,
} from '@/types/academic-year';

// Re-export types and constants for convenience
export type { Term, Semester, AcademicYear, AcademicTermFilter };
export {
  TERM_TO_SEMESTER,
  TERM_NAMES,
  TERM_NAMES_SHORT,
  SEMESTER_NAMES,
  TERM_ASSESSMENT_CODES,
  ALL_TERMS,
  ALL_SEMESTERS,
  getSemesterFromTerm,
  getTermsForSemester,
  getTermName,
  getSemesterName,
  isTermInSemester,
  getAssessmentCodesForTerm,
  parseAcademicYear,
  formatAcademicYear,
  getCurrentAcademicYear,
  getCurrentTerm,
  getTermOptions,
} from '@/types/academic-year';

// ============================================================
// Student Score Queries
// ============================================================

/**
 * Get student scores filtered by academic year and/or term
 */
export async function getStudentScoresByTerm(
  studentId: string,
  filter: AcademicTermFilter
) {
  const supabase = createClient();

  let query = supabase
    .from('scores')
    .select(
      `
      *,
      exam:exams!inner(
        id,
        name,
        term,
        semester,
        exam_date,
        course:courses!inner(
          id,
          course_type,
          academic_year,
          class:classes(
            id,
            class_name,
            grade
          )
        )
      )
    `
    )
    .eq('student_id', studentId);

  if (filter.academicYear) {
    query = query.eq('exam.course.academic_year', filter.academicYear);
  }

  if (filter.term) {
    query = query.eq('exam.term', filter.term);
  }

  if (filter.semester) {
    query = query.eq('exam.semester', filter.semester);
  }

  const { data, error } = await query.order('exam.exam_date', {
    ascending: false,
  });

  if (error) {
    console.error('[getStudentScoresByTerm] Error:', error);
    throw error;
  }

  return data;
}

/**
 * Get all academic years a student has scores in
 */
export async function getStudentAcademicYears(
  studentId: string
): Promise<string[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('scores')
    .select(
      `
      exam:exams!inner(
        course:courses!inner(
          academic_year
        )
      )
    `
    )
    .eq('student_id', studentId);

  if (error) {
    console.error('[getStudentAcademicYears] Error:', error);
    throw error;
  }

  // Extract unique academic years
  const years = new Set<string>();
  data?.forEach((score) => {
    // Supabase returns exam as an object with nested course
    // Use unknown intermediate to satisfy TypeScript strict mode
    const exam = score.exam as unknown as { course: { academic_year: string } | null } | null;
    const year = exam?.course?.academic_year;
    if (year) years.add(year);
  });

  return Array.from(years).sort().reverse();
}

// ============================================================
// Class Student Queries
// ============================================================

/**
 * Get students enrolled in a class for a specific academic year
 */
export async function getClassStudentsByYear(
  classId: string,
  academicYear: string
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('student_courses')
    .select(
      `
      id,
      student:students(
        id,
        student_id,
        full_name,
        grade,
        level,
        is_active
      ),
      course:courses!inner(
        id,
        course_type,
        academic_year,
        class_id
      )
    `
    )
    .eq('course.class_id', classId)
    .eq('course.academic_year', academicYear);

  if (error) {
    console.error('[getClassStudentsByYear] Error:', error);
    throw error;
  }

  // Deduplicate students (they might be in multiple courses for the same class)
  const studentMap = new Map<
    string,
    {
      id: string;
      student_id: string;
      full_name: string;
      grade: number;
      level: string | null;
      is_active: boolean;
    }
  >();

  data?.forEach((record) => {
    // Supabase returns student as an object (single relation)
    // Use unknown intermediate to satisfy TypeScript strict mode
    const student = record.student as unknown as {
      id: string;
      student_id: string;
      full_name: string;
      grade: number;
      level: string | null;
      is_active: boolean;
    } | null;
    if (student && !studentMap.has(student.id)) {
      studentMap.set(student.id, student);
    }
  });

  return Array.from(studentMap.values());
}

// ============================================================
// Teacher Course Queries
// ============================================================

/**
 * Get courses assigned to a teacher for a specific academic year
 */
export async function getTeacherCoursesByYear(
  teacherId: string,
  academicYear: string
) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('courses')
    .select(
      `
      id,
      course_type,
      academic_year,
      class:classes(
        id,
        class_name,
        grade,
        level
      )
    `
    )
    .eq('teacher_id', teacherId)
    .eq('academic_year', academicYear)
    .order('class(grade)', { ascending: true });

  if (error) {
    console.error('[getTeacherCoursesByYear] Error:', error);
    throw error;
  }

  return data;
}

/**
 * Get all academic years a teacher has taught
 */
export async function getTeacherAcademicYears(
  teacherId: string
): Promise<string[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('courses')
    .select('academic_year')
    .eq('teacher_id', teacherId);

  if (error) {
    console.error('[getTeacherAcademicYears] Error:', error);
    throw error;
  }

  // Extract unique academic years
  const years = new Set<string>();
  data?.forEach((course) => {
    if (course.academic_year) years.add(course.academic_year);
  });

  return Array.from(years).sort().reverse();
}

// ============================================================
// Class Grade Queries
// ============================================================

/**
 * Get class grades for a specific term
 */
export async function getClassGradesByTerm(
  classId: string,
  courseType: 'LT' | 'IT' | 'KCFS',
  term: Term
) {
  const supabase = createClient();

  // First get the course for this class and course type
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('class_id', classId)
    .eq('course_type', courseType)
    .single();

  if (courseError) {
    console.error('[getClassGradesByTerm] Course error:', courseError);
    throw courseError;
  }

  if (!course) {
    return [];
  }

  // Then get scores for exams in this term
  const { data: scores, error: scoresError } = await supabase
    .from('scores')
    .select(
      `
      id,
      score,
      assessment_code,
      student:students(
        id,
        student_id,
        full_name
      ),
      exam:exams!inner(
        id,
        name,
        term,
        semester,
        course_id
      )
    `
    )
    .eq('exam.course_id', course.id)
    .eq('exam.term', term);

  if (scoresError) {
    console.error('[getClassGradesByTerm] Scores error:', scoresError);
    throw scoresError;
  }

  return scores;
}

/**
 * Get grade summary for a class by term
 */
export async function getClassGradeSummaryByTerm(
  classId: string,
  courseType: 'LT' | 'IT' | 'KCFS',
  filter: AcademicTermFilter
) {
  const supabase = createClient();

  // Get the course
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('class_id', classId)
    .eq('course_type', courseType)
    .maybeSingle();

  if (courseError) {
    console.error('[getClassGradeSummaryByTerm] Course error:', courseError);
    throw courseError;
  }

  if (!course) {
    return { studentCount: 0, examCount: 0, scoreCount: 0, averageScore: null };
  }

  // Build exams query with term/semester filter
  let examsQuery = supabase
    .from('exams')
    .select('id')
    .eq('course_id', course.id);

  if (filter.term) {
    examsQuery = examsQuery.eq('term', filter.term);
  }

  if (filter.semester) {
    examsQuery = examsQuery.eq('semester', filter.semester);
  }

  const { data: exams, error: examsError } = await examsQuery;

  if (examsError) {
    console.error('[getClassGradeSummaryByTerm] Exams error:', examsError);
    throw examsError;
  }

  const examIds = exams?.map((e) => e.id) || [];

  if (examIds.length === 0) {
    return { studentCount: 0, examCount: 0, scoreCount: 0, averageScore: null };
  }

  // Get score statistics
  const { data: scores, error: scoresError } = await supabase
    .from('scores')
    .select('score, student_id')
    .in('exam_id', examIds)
    .not('score', 'is', null);

  if (scoresError) {
    console.error('[getClassGradeSummaryByTerm] Scores error:', scoresError);
    throw scoresError;
  }

  const studentIds = new Set(scores?.map((s) => s.student_id) || []);
  const totalScore =
    scores?.reduce((sum, s) => sum + (Number(s.score) || 0), 0) || 0;
  const scoreCount = scores?.length || 0;

  return {
    studentCount: studentIds.size,
    examCount: examIds.length,
    scoreCount,
    averageScore: scoreCount > 0 ? totalScore / scoreCount : null,
  };
}

// ============================================================
// Exam Queries
// ============================================================

/**
 * Get exams for a course filtered by term
 */
export async function getExamsByTerm(courseId: string, term?: Term) {
  const supabase = createClient();

  let query = supabase
    .from('exams')
    .select('*')
    .eq('course_id', courseId)
    .order('exam_date', { ascending: true });

  if (term) {
    query = query.eq('term', term);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getExamsByTerm] Error:', error);
    throw error;
  }

  return data;
}

/**
 * Get available terms for a course (terms that have exams)
 */
export async function getAvailableTermsForCourse(
  courseId: string
): Promise<Term[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('exams')
    .select('term')
    .eq('course_id', courseId)
    .not('term', 'is', null);

  if (error) {
    console.error('[getAvailableTermsForCourse] Error:', error);
    throw error;
  }

  const terms = new Set<Term>();
  data?.forEach((exam) => {
    if (exam.term) terms.add(exam.term as Term);
  });

  return Array.from(terms).sort((a, b) => a - b);
}

// ============================================================
// Academic Year Utilities
// ============================================================

/**
 * Get all academic years in the system
 */
export async function getAllAcademicYears(): Promise<string[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('courses')
    .select('academic_year')
    .not('academic_year', 'is', null);

  if (error) {
    console.error('[getAllAcademicYears] Error:', error);
    throw error;
  }

  const years = new Set<string>();
  data?.forEach((course) => {
    if (course.academic_year) years.add(course.academic_year);
  });

  return Array.from(years).sort().reverse();
}
