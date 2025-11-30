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
  track: 'local' | 'international'
  level?: 'E1' | 'E2' | 'E3' | null
  student_count: number
  is_active: boolean
  academic_year: string
}

// Course-based functions

// Get courses for the current teacher
export async function getTeacherCourses() {
  // Get current user to check teacher permissions
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('Authentication required')
  }

  // Get user profile to determine role and permissions
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, role, teacher_type')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('User profile not found')
  }

  let coursesQuery = supabase
    .from('courses')
    .select(`
      id,
      course_type,
      class_id,
      teacher_id,
      academic_year,
      is_active,
      classes!inner(
        id,
        name,
        grade,
        track,
        level
      )
    `)
    .eq('is_active', true)

  // Apply role-based filtering
  if (profile.role === 'teacher') {
    // Teachers can only see their own courses
    coursesQuery = coursesQuery.eq('teacher_id', profile.id)
  } else if (profile.role === 'head') {
    // Head teachers can see courses for their grade and track (this would need additional logic)
    // For now, show all courses
  }
  // Admin can see all courses

  const { data: coursesData, error } = await coursesQuery.order('course_type', { ascending: true })

  if (error) {
    console.error('Error fetching teacher courses:', error)
    throw new Error(`Failed to fetch teacher courses: ${error.message}`)
  }

  // Get student counts for each course
  const coursesWithCounts = await Promise.all(
    (coursesData || []).map(async (course) => {
      const { count: studentCount } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', course.class_id)
        .eq('is_active', true)

      // Generate course name from course_type
      const courseNameMap: Record<string, string> = {
        'LT': 'LT English Language Arts (ELA)',
        'IT': 'IT English Language Arts (ELA)',
        'KCFS': 'KCFS'
      }

      return {
        id: course.id,
        course_type: course.course_type,
        course_name: courseNameMap[course.course_type] || course.course_type,
        class_id: course.class_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
        class_name: (course.classes as any)?.name || 'Unknown Class',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        grade: (course.classes as any)?.grade || 1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        track: (course.classes as any)?.track || 'local',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        level: (course.classes as any)?.level,
        student_count: studentCount || 0,
        is_active: course.is_active,
        academic_year: course.academic_year
      } as TeacherCourse
    })
  )

  return coursesWithCounts
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
    .from('student_courses')
    .select(`
      student_id,
      course_id,
      enrolled_at,
      is_active
    `)
    .eq('course_id', courseId)
    .eq('is_active', true)
    .order('enrolled_at')

  if (error) {
    console.error('Error fetching course students:', error)
    throw new Error(`Failed to fetch course students: ${error.message}`)
  }

  // Get scores for all students in this course
  const studentIds = data.map(s => s.student_id)
  if (studentIds.length === 0) {
    return data.map(student => ({ ...student, scores: [] }))
  }

  // Get exams for this course to then get scores
  const { data: examsData } = await supabase
    .from('exams')
    .select('id')
    .eq('class_id', courseId) // Assuming courseId maps to a class
  
  const examIds = examsData?.map(e => e.id) || []
  
  const { data: scoresData, error: scoresError } = await supabase
    .from('scores')
    .select('*')
    .in('exam_id', examIds)
    .in('student_id', studentIds)
    .order('assessment_code')

  if (scoresError) {
    console.error('Error fetching scores for course students:', scoresError)
    throw new Error(`Failed to fetch scores: ${scoresError.message}`)
  }

  // Group scores by student
  const scoresByStudent = (scoresData || []).reduce((acc, score) => {
    if (!acc[score.student_id]) {
      acc[score.student_id] = []
    }
    acc[score.student_id]!.push(score)
    return acc
  }, {} as Record<string, Score[]>)

  return data.map(student => ({
    ...student,
    scores: scoresByStudent[student.student_id] || []
  }))
}

// Update score with course_id (simplified for direct course access)
export async function upsertScoreWithCourse(scoreData: { 
  student_id: string
  course_id: string 
  assessment_code: string
  score: number
  entered_by: string
  entered_at: string
}) {
  // First, find or create a default exam for this course
  let examId = null
  const defaultExamName = `${scoreData.assessment_code} Assessment`
  
  const { data: existingExam } = await supabase
    .from('exams')
    .select('id')
    .eq('course_id', scoreData.course_id)
    .eq('name', defaultExamName)
    .single()
  
  if (existingExam) {
    examId = existingExam.id
  } else {
    // Create a default exam
    const { data: newExam, error: examError } = await supabase
      .from('exams')
      .insert({
        name: defaultExamName,
        class_id: scoreData.course_id, // Using course_id as class_id for now
        exam_date: new Date().toISOString().split('T')[0],
        is_published: true,
        created_by: scoreData.entered_by
      })
      .select('id')
      .single()
    
    if (examError) {
      console.error('Error creating default exam:', examError)
      throw new Error(`Failed to create exam: ${examError.message}`)
    }
    
    examId = newExam.id
  }

  const { data, error } = await supabase
    .from('scores')
    .upsert(
      {
        student_id: scoreData.student_id,
        exam_id: examId,
        assessment_code: scoreData.assessment_code,
        score: scoreData.score,
        entered_by: scoreData.entered_by,
        entered_at: scoreData.entered_at,
        updated_at: new Date().toISOString(),
        updated_by: scoreData.entered_by
      },
      {
        onConflict: 'student_id,exam_id,assessment_code'
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
  const scoresMap: Record<string, number | null> = {}
  data.forEach(score => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scoresMap[score.assessment_code] = score.score
  })

  const gradeCalculationInput = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scores: scoresMap as any, // Type assertion for grade calculation
    studentId,
    classId: '', // We don't have classId in this context
    examId
  }

  return calculateGrades(gradeCalculationInput)
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