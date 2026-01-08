/**
 * iSchool Export API
 * Functions for exporting LMS grades to iSchool system
 */

import { createClient } from '@/lib/supabase/client'
import type { Term } from '@/types/academic-year'
import type {
  ISchoolExportRow,
  ISchoolComment,
  UpsertISchoolCommentInput,
  ISchoolExportField,
} from '@/types/ischool'
import { getISchoolTermConfig, termRequiresComments } from '@/types/ischool'

/**
 * Get iSchool export data for a class
 * Fetches students with their FA/SA averages and exam scores for the specified term
 */
export async function getISchoolExportData(
  classId: string,
  academicYear: string,
  term: Term
): Promise<ISchoolExportRow[]> {
  const supabase = createClient()
  const config = getISchoolTermConfig(term)

  // 1. Get LT course for this class
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, teacher_id')
    .eq('class_id', classId)
    .eq('course_type', 'LT')
    .eq('is_active', true)
    .single()

  if (courseError || !course) {
    console.error('Failed to find LT course:', courseError?.message)
    return []
  }

  const courseId = course.id

  // 2. Get students in class, ordered by student_id (學號)
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, student_id, full_name, chinese_name, seat_no')
    .eq('class_id', classId)
    .eq('is_active', true)
    .order('student_id', { ascending: true })

  if (studentsError || !students) {
    console.error('Failed to fetch students:', studentsError?.message)
    return []
  }

  const studentIds = students.map(s => s.id)

  // 3. Get scores for the term
  const { data: scores, error: scoresError } = await supabase
    .from('scores')
    .select(`
      student_id,
      assessment_code,
      score,
      exam:exams!inner(
        course_id,
        term
      )
    `)
    .in('student_id', studentIds)
    .eq('exam.course_id', courseId)
    .eq('exam.term', term)

  if (scoresError) {
    console.error('Failed to fetch scores:', scoresError.message)
    return []
  }

  // 4. Get iSchool comments (only for Term 2/4)
  let comments: ISchoolComment[] = []
  if (termRequiresComments(term)) {
    const { data: commentData } = await supabase
      .from('ischool_comments')
      .select('*')
      .eq('course_id', courseId)
      .eq('academic_year', academicYear)
      .eq('term', term)

    comments = commentData || []
  }

  // 5. Build export data
  const exportData: ISchoolExportRow[] = students.map(student => {
    // Get student's scores
    const studentScores = scores?.filter(s => s.student_id === student.id) || []

    // Calculate FA average
    const faScores = studentScores
      .filter(s => config.faRange.includes(s.assessment_code))
      .map(s => s.score)
      .filter((s): s is number => s !== null && s > 0)

    const formativeAvg = faScores.length > 0
      ? Math.round((faScores.reduce((a, b) => a + b, 0) / faScores.length) * 100) / 100
      : null

    // Calculate SA average
    const saScores = studentScores
      .filter(s => config.saRange.includes(s.assessment_code))
      .map(s => s.score)
      .filter((s): s is number => s !== null && s > 0)

    const summativeAvg = saScores.length > 0
      ? Math.round((saScores.reduce((a, b) => a + b, 0) / saScores.length) * 100) / 100
      : null

    // Get exam score (MID or FINAL)
    const examScoreEntry = studentScores.find(s => s.assessment_code === config.examCode)
    const examScore = examScoreEntry?.score && examScoreEntry.score > 0
      ? examScoreEntry.score
      : null

    // Get teacher comment
    const comment = comments.find(c => c.student_id === student.id)

    return {
      studentId: student.id,
      studentNumber: student.student_id,
      studentName: student.full_name,
      chineseName: student.chinese_name,
      seatNo: student.seat_no,
      formativeAvg,
      summativeAvg,
      examScore,
      teacherComment: comment?.comment || null,
    }
  })

  return exportData
}

/**
 * Get iSchool comments for a course/term
 */
export async function getISchoolComments(
  courseId: string,
  academicYear: string,
  term: 2 | 4
): Promise<ISchoolComment[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('ischool_comments')
    .select('*')
    .eq('course_id', courseId)
    .eq('academic_year', academicYear)
    .eq('term', term)

  if (error) {
    console.error('Failed to fetch iSchool comments:', error.message)
    return []
  }

  return data || []
}

/**
 * Upsert (create or update) an iSchool comment
 */
export async function upsertISchoolComment(
  input: UpsertISchoolCommentInput
): Promise<ISchoolComment | null> {
  const supabase = createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('User not authenticated')
    return null
  }

  const { data, error } = await supabase
    .from('ischool_comments')
    .upsert({
      student_id: input.studentId,
      course_id: input.courseId,
      teacher_id: user.id,
      academic_year: input.academicYear,
      term: input.term,
      comment: input.comment,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'student_id,course_id,academic_year,term',
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to upsert iSchool comment:', error.message)
    return null
  }

  return data
}

/**
 * Delete an iSchool comment
 */
export async function deleteISchoolComment(commentId: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from('ischool_comments')
    .delete()
    .eq('id', commentId)

  if (error) {
    console.error('Failed to delete iSchool comment:', error.message)
    return false
  }

  return true
}

/**
 * Generate export text for iSchool
 * @param data - Export rows
 * @param field - Which field(s) to export
 * @param term - Current term (affects which fields are available)
 * @returns Tab-separated or newline-separated text ready for paste
 */
export function generateExportText(
  data: ISchoolExportRow[],
  field: ISchoolExportField,
  term: Term
): string {
  const config = getISchoolTermConfig(term)

  const formatValue = (value: number | string | null): string => {
    if (value === null || value === undefined || value === '') return '-'
    return String(value)
  }

  const lines = data.map(row => {
    switch (field) {
      case 'formative':
        return formatValue(row.formativeAvg)
      case 'summative':
        return formatValue(row.summativeAvg)
      case 'exam':
        return formatValue(row.examScore)
      case 'comment':
        if (!config.hasComments) return '-'
        // Remove newlines from comments for single-line paste
        const commentText = row.teacherComment?.replace(/[\r\n]+/g, ' ') ?? null
        return formatValue(commentText)
      case 'all':
        const values = [
          formatValue(row.formativeAvg),
          formatValue(row.summativeAvg),
          formatValue(row.examScore),
        ]
        if (config.hasComments) {
          const allCommentText = row.teacherComment?.replace(/[\r\n]+/g, ' ') ?? null
          values.push(formatValue(allCommentText))
        }
        return values.join('\t')
      default:
        return ''
    }
  })

  return lines.join('\n')
}

/**
 * Get LT course ID for a class
 */
export async function getLTCourseId(classId: string): Promise<string | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('courses')
    .select('id')
    .eq('class_id', classId)
    .eq('course_type', 'LT')
    .eq('is_active', true)
    .single()

  if (error || !data) {
    console.error('Failed to get LT course ID:', error?.message)
    return null
  }

  return data.id
}
