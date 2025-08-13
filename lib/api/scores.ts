import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { calculateGrades } from '@/lib/grade/calculations'

export type Score = Database['public']['Tables']['scores']['Row']
export type ScoreInsert = Database['public']['Tables']['scores']['Insert']
export type ScoreUpdate = Database['public']['Tables']['scores']['Update']

export type Exam = Database['public']['Tables']['exams']['Row']
export type ExamInsert = Database['public']['Tables']['exams']['Insert']
export type ExamUpdate = Database['public']['Tables']['exams']['Update']

// Extended types with relationships
export type ScoreWithDetails = Score & {
  student: {
    id: string
    student_id: string
    full_name: string
  }
  exam: {
    id: string
    name: string
    class_id: string
  }
  course?: {
    id: string
    course_type: 'LT' | 'IT' | 'KCFS'
    course_name: string
    class_id: string
  }
  assessment_code_info: {
    code: string
    category: 'formative' | 'summative' | 'final'
    sequence_order: number
  }
}

export type ExamWithClass = Exam & {
  class: {
    id: string
    name: string
    grade: number
    track: 'local' | 'international'
  }
}

// Course-related types
export type Course = Database['public']['Tables']['courses']['Row']
export type CourseWithClass = Course & {
  class: {
    id: string
    name: string
    grade: number
    track: 'local' | 'international'
  }
}

// Teacher course enrollment with student count
export type TeacherCourse = {
  id: string
  course_type: 'LT' | 'IT' | 'KCFS'
  course_name: string
  class_id: string
  class_name: string
  grade: number
  student_count: number
  is_active: boolean
}

// Course-based functions

// Get courses for the current teacher
export async function getTeacherCourses() {
  const { data, error } = await supabase
    .from('course_details')
    .select('*')
    .eq('is_active', true)
    .order('grade')
    .order('class_name')
    .order('course_type')

  if (error) {
    console.error('Error fetching teacher courses:', error)
    throw new Error(`Failed to fetch teacher courses: ${error.message}`)
  }

  return data.map(course => ({
    id: course.id,
    course_type: course.course_type as 'LT' | 'IT' | 'KCFS',
    course_name: course.course_name,
    class_id: course.class_id,
    class_name: course.class_name,
    grade: course.grade,
    student_count: course.student_count,
    is_active: course.is_active
  } as TeacherCourse))
}

// Get scores for a specific course
export async function getScoresByCourse(courseId: string) {
  const { data, error } = await supabase
    .from('scores')
    .select(`
      *,
      student:students(
        id,
        student_id,
        full_name
      ),
      exam:exams(
        id,
        name,
        class_id
      )
    `)
    .eq('course_id', courseId)
    .order('student.full_name')
    .order('assessment_code')

  if (error) {
    console.error('Error fetching scores by course:', error)
    throw new Error(`Failed to fetch scores: ${error.message}`)
  }

  return data as ScoreWithDetails[]
}

// Get all students enrolled in a course with their scores
export async function getCourseStudentsWithScores(courseId: string) {
  const { data, error } = await supabase
    .from('student_course_enrollments')
    .select(`
      student_id,
      student_name,
      external_student_id,
      course_id,
      course_type,
      class_name,
      grade,
      enrollment_active
    `)
    .eq('course_id', courseId)
    .eq('enrollment_active', true)
    .order('student_name')

  if (error) {
    console.error('Error fetching course students:', error)
    throw new Error(`Failed to fetch course students: ${error.message}`)
  }

  // Get scores for all students in this course
  const studentIds = data.map(s => s.student_id)
  if (studentIds.length === 0) {
    return data.map(student => ({ ...student, scores: [] }))
  }

  const { data: scoresData, error: scoresError } = await supabase
    .from('scores')
    .select('*')
    .eq('course_id', courseId)
    .in('student_id', studentIds)
    .order('assessment_code')

  if (scoresError) {
    console.error('Error fetching scores for course students:', scoresError)
    throw new Error(`Failed to fetch scores: ${scoresError.message}`)
  }

  // Group scores by student
  const scoresByStudent = scoresData.reduce((acc, score) => {
    if (!acc[score.student_id]) {
      acc[score.student_id] = []
    }
    acc[score.student_id].push(score)
    return acc
  }, {} as Record<string, Score[]>)

  return data.map(student => ({
    ...student,
    scores: scoresByStudent[student.student_id] || []
  }))
}

// Update score with course_id
export async function upsertScoreWithCourse(scoreData: ScoreInsert & { course_id: string }) {
  const { data, error } = await supabase
    .from('scores')
    .upsert(
      {
        ...scoreData,
        updated_at: new Date().toISOString(),
        updated_by: scoreData.entered_by
      },
      {
        onConflict: 'student_id,course_id,assessment_code'
      }
    )
    .select('*')
    .single()

  if (error) {
    console.error('Error upserting score with course:', error)
    throw new Error(`Failed to save score: ${error.message}`)
  }

  return data as Score
}

// Bulk upsert scores with course_id
export async function upsertScoresBulkWithCourse(scoresData: (ScoreInsert & { course_id: string })[]) {
  const scoresWithTimestamp = scoresData.map(score => ({
    ...score,
    updated_at: new Date().toISOString(),
    updated_by: score.entered_by
  }))

  const { data, error } = await supabase
    .from('scores')
    .upsert(
      scoresWithTimestamp,
      {
        onConflict: 'student_id,course_id,assessment_code'
      }
    )
    .select('*')

  if (error) {
    console.error('Error bulk upserting scores with course:', error)
    throw new Error(`Failed to save scores: ${error.message}`)
  }

  return data as Score[]
}

// Legacy Score-related functions (maintained for compatibility)

// Get scores for a specific exam (simplified)
export async function getScoresByExam(examId: string) {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('exam_id', examId)
    .order('assessment_code')

  if (error) {
    console.error('Error fetching scores by exam:', error)
    throw new Error(`Failed to fetch scores: ${error.message}`)
  }

  return data as Score[]
}

// Get scores for a specific student (simplified)
export async function getScoresByStudent(studentId: string) {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('student_id', studentId)
    .order('entered_at', { ascending: false })

  if (error) {
    console.error('Error fetching scores by student:', error)
    throw new Error(`Failed to fetch scores: ${error.message}`)
  }

  return data as Score[]
}

// Get all scores for a class (simplified - via exam_id lookup needed)
export async function getScoresByClass(classId: string) {
  // First get exam IDs for this class
  const { data: exams } = await supabase
    .from('exams')
    .select('id')
    .eq('class_id', classId)
  
  if (!exams || exams.length === 0) {
    return []
  }

  const examIds = exams.map(exam => exam.id)
  
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .in('exam_id', examIds)
    .order('entered_at', { ascending: false })

  if (error) {
    console.error('Error fetching scores by class:', error)
    throw new Error(`Failed to fetch scores: ${error.message}`)
  }

  return data as Score[]
}

// Create or update a single score (simplified)
export async function upsertScore(scoreData: ScoreInsert) {
  const { data, error } = await supabase
    .from('scores')
    .upsert(
      {
        ...scoreData,
        updated_at: new Date().toISOString(),
        updated_by: scoreData.entered_by // Use entered_by as updated_by for upserts
      },
      {
        onConflict: 'student_id,exam_id,assessment_code'
      }
    )
    .select('*')
    .single()

  if (error) {
    console.error('Error upserting score:', error)
    throw new Error(`Failed to save score: ${error.message}`)
  }

  return data as Score
}

// Bulk upsert scores (simplified)
export async function upsertScoresBulk(scoresData: ScoreInsert[]) {
  const scoresWithTimestamp = scoresData.map(score => ({
    ...score,
    updated_at: new Date().toISOString(),
    updated_by: score.entered_by
  }))

  const { data, error } = await supabase
    .from('scores')
    .upsert(
      scoresWithTimestamp,
      {
        onConflict: 'student_id,exam_id,assessment_code'
      }
    )
    .select('*')

  if (error) {
    console.error('Error bulk upserting scores:', error)
    throw new Error(`Failed to save scores: ${error.message}`)
  }

  return data as Score[]
}

// Delete a score
export async function deleteScore(id: string) {
  const { error } = await supabase
    .from('scores')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting score:', error)
    throw new Error(`Failed to delete score: ${error.message}`)
  }

  return true
}

// Get calculated grades for a student
export async function getStudentGrades(studentId: string, examId?: string) {
  let query = supabase
    .from('scores')
    .select('assessment_code, score')
    .eq('student_id', studentId)
    .not('score', 'is', null)

  if (examId) {
    query = query.eq('exam_id', examId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching student grades:', error)
    throw new Error(`Failed to fetch student grades: ${error.message}`)
  }

  // Convert to grade calculation format
  const gradeData: Record<string, number> = {}
  data.forEach(score => {
    gradeData[score.assessment_code] = score.score!
  })

  return calculateGrades(gradeData)
}

// Exam-related functions

// Get all exams (simplified version)
export async function getExams() {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .order('exam_date', { ascending: false })

  if (error) {
    console.error('Error fetching exams:', error)
    throw new Error(`Failed to fetch exams: ${error.message}`)
  }

  return data as Exam[]
}

// Get exams by class (simplified)
export async function getExamsByClass(classId: string) {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('class_id', classId)
    .order('exam_date', { ascending: false })

  if (error) {
    console.error('Error fetching exams by class:', error)
    throw new Error(`Failed to fetch exams: ${error.message}`)
  }

  return data as Exam[]
}

// Get single exam (simplified)
export async function getExam(id: string) {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching exam:', error)
    throw new Error(`Failed to fetch exam: ${error.message}`)
  }

  return data as Exam
}

// Create exam (simplified)
export async function createExam(examData: ExamInsert) {
  const { data, error } = await supabase
    .from('exams')
    .insert(examData)
    .select('*')
    .single()

  if (error) {
    console.error('Error creating exam:', error)
    throw new Error(`Failed to create exam: ${error.message}`)
  }

  return data as Exam
}

// Update exam (simplified)
export async function updateExam(id: string, updates: ExamUpdate) {
  const { data, error } = await supabase
    .from('exams')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('Error updating exam:', error)
    throw new Error(`Failed to update exam: ${error.message}`)
  }

  return data as Exam
}

// Delete exam (and all associated scores)
export async function deleteExam(id: string) {
  const { error } = await supabase
    .from('exams')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting exam:', error)
    throw new Error(`Failed to delete exam: ${error.message}`)
  }

  return true
}

// Publish/unpublish exam
export async function toggleExamPublished(id: string, isPublished: boolean) {
  return updateExam(id, { is_published: isPublished })
}

// Get assessment codes
export async function getAssessmentCodes() {
  const { data, error } = await supabase
    .from('assessment_codes')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('sequence_order')

  if (error) {
    console.error('Error fetching assessment codes:', error)
    throw new Error(`Failed to fetch assessment codes: ${error.message}`)
  }

  return data
}