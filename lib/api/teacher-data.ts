/**
 * Teacher-focused API functions using safe database views
 * Implements application-level permission filtering to avoid RLS recursion
 */

import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/database'

// Define view types based on our database views
export type TeacherClassView = {
  class_id: string
  class_name: string
  grade: number
  track: 'local' | 'international'
  academic_year: string
  class_active: boolean
  teacher_id: string | null
  teacher_name: string | null
  teacher_email: string | null
  teacher_type: 'LT' | 'IT' | 'KCFS' | null
  student_count: number
}

export type TeacherStudentView = {
  student_id: string
  student_number: string
  student_name: string
  student_grade: number
  student_track: 'local' | 'international'
  student_active: boolean
  student_created_at: string
  student_updated_at: string
  class_id: string | null
  class_name: string | null
  academic_year: string | null
  teacher_id: string | null
  teacher_name: string | null
  teacher_email: string | null
  teacher_type: 'LT' | 'IT' | 'KCFS' | null
}

export type ClassScoreView = {
  student_id: string
  student_number: string
  student_name: string
  class_id: string | null
  class_name: string | null
  teacher_id: string | null
  exam_id: string | null
  exam_name: string | null
  exam_date: string | null
  assessment_code: string | null
  score: number | null
  entered_at: string | null
  entered_by: string | null
  grade: number
  track: 'local' | 'international'
  academic_year: string | null
}

export type StudentPerformanceView = {
  student_id: string
  student_number: string
  student_name: string
  grade: number
  track: 'local' | 'international'
  class_id: string | null
  class_name: string | null
  teacher_id: string | null
  academic_year: string | null
  formative_count: number
  summative_count: number
  final_count: number
  formative_avg: number | null
  summative_avg: number | null
  final_score: number | null
  semester_grade: number | null
}

// User role and permissions type
export type UserPermissions = {
  userId: string
  role: 'admin' | 'head' | 'teacher'
  grade?: number | null
  track?: 'local' | 'international' | null
  teacher_type?: 'LT' | 'IT' | 'KCFS' | null
  full_name?: string
}

/**
 * Get current user's permissions
 * This avoids RLS issues by querying users table directly
 */
export async function getCurrentUserPermissions(): Promise<UserPermissions | null> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, role, grade, track, teacher_type, full_name')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching user permissions:', error)
    return null
  }

  return {
    userId: data.id,
    role: data.role,
    grade: data.grade,
    track: data.track,
    teacher_type: data.teacher_type,
    full_name: data.full_name
  }
}

/**
 * Get classes accessible to current user using view
 * Applies permission filtering at application level
 */
export async function getAccessibleClasses(): Promise<TeacherClassView[]> {
  const permissions = await getCurrentUserPermissions()
  if (!permissions) {
    throw new Error('User not authenticated')
  }

  let query = supabase.from('teacher_classes_view').select('*')

  // Apply permission-based filtering
  switch (permissions.role) {
    case 'admin':
      // Admin can see all classes - no additional filtering
      break
    
    case 'head':
      // Head teacher can see classes in their grade/track
      if (permissions.grade && permissions.track) {
        query = query
          .eq('grade', permissions.grade)
          .eq('track', permissions.track)
      } else {
        // Head teacher without grade/track can't see any classes
        return []
      }
      break
    
    case 'teacher':
      // Teachers can only see their own classes
      query = query.eq('teacher_id', permissions.userId)
      break
  }

  const { data, error } = await query.order('grade').order('class_name')

  if (error) {
    console.error('Error fetching accessible classes:', error)
    throw new Error(`Failed to fetch classes: ${error.message}`)
  }

  return data as TeacherClassView[]
}

/**
 * Get students accessible to current user using view
 * Applies permission filtering at application level
 */
export async function getAccessibleStudents(): Promise<TeacherStudentView[]> {
  const permissions = await getCurrentUserPermissions()
  if (!permissions) {
    throw new Error('User not authenticated')
  }

  let query = supabase.from('teacher_students_view').select('*')

  // Apply permission-based filtering
  switch (permissions.role) {
    case 'admin':
      // Admin can see all students - no additional filtering
      break
    
    case 'head':
      // Head teacher can see students in their grade/track
      if (permissions.grade && permissions.track) {
        query = query
          .eq('student_grade', permissions.grade)
          .eq('student_track', permissions.track)
      } else {
        return []
      }
      break
    
    case 'teacher':
      // Teachers can only see students in their classes
      query = query.eq('teacher_id', permissions.userId)
      break
  }

  const { data, error } = await query
    .order('student_grade')
    .order('class_name')
    .order('student_name')

  if (error) {
    console.error('Error fetching accessible students:', error)
    throw new Error(`Failed to fetch students: ${error.message}`)
  }

  return data as TeacherStudentView[]
}

/**
 * Get students in a specific class (with permission check)
 */
export async function getStudentsByClass(classId: string): Promise<TeacherStudentView[]> {
  const permissions = await getCurrentUserPermissions()
  if (!permissions) {
    throw new Error('User not authenticated')
  }

  let query = supabase
    .from('teacher_students_view')
    .select('*')
    .eq('class_id', classId)

  // Apply permission-based filtering
  switch (permissions.role) {
    case 'admin':
      // Admin can see students in any class
      break
    
    case 'head':
      // Head teacher can see students in classes within their grade/track
      if (permissions.grade && permissions.track) {
        query = query
          .eq('student_grade', permissions.grade)
          .eq('student_track', permissions.track)
      } else {
        return []
      }
      break
    
    case 'teacher':
      // Teachers can only see students in their own classes
      query = query.eq('teacher_id', permissions.userId)
      break
  }

  const { data, error } = await query.order('student_name')

  if (error) {
    console.error('Error fetching students by class:', error)
    throw new Error(`Failed to fetch students: ${error.message}`)
  }

  return data as TeacherStudentView[]
}

/**
 * Get student performance data with permission filtering
 */
export async function getAccessibleStudentPerformance(): Promise<StudentPerformanceView[]> {
  const permissions = await getCurrentUserPermissions()
  if (!permissions) {
    throw new Error('User not authenticated')
  }

  let query = supabase.from('student_performance_view').select('*')

  // Apply permission-based filtering
  switch (permissions.role) {
    case 'admin':
      // Admin can see all student performance
      break
    
    case 'head':
      // Head teacher can see performance in their grade/track
      if (permissions.grade && permissions.track) {
        query = query
          .eq('grade', permissions.grade)
          .eq('track', permissions.track)
      } else {
        return []
      }
      break
    
    case 'teacher':
      // Teachers can only see performance of their students
      query = query.eq('teacher_id', permissions.userId)
      break
  }

  const { data, error } = await query
    .order('grade')
    .order('class_name')
    .order('student_name')

  if (error) {
    console.error('Error fetching student performance:', error)
    throw new Error(`Failed to fetch student performance: ${error.message}`)
  }

  return data as StudentPerformanceView[]
}

/**
 * Get class scores with permission filtering
 */
export async function getAccessibleClassScores(classId?: string): Promise<ClassScoreView[]> {
  const permissions = await getCurrentUserPermissions()
  if (!permissions) {
    throw new Error('User not authenticated')
  }

  let query = supabase.from('class_scores_view').select('*')

  if (classId) {
    query = query.eq('class_id', classId)
  }

  // Apply permission-based filtering
  switch (permissions.role) {
    case 'admin':
      // Admin can see all scores
      break
    
    case 'head':
      // Head teacher can see scores in their grade/track
      if (permissions.grade && permissions.track) {
        query = query
          .eq('grade', permissions.grade)
          .eq('track', permissions.track)
      } else {
        return []
      }
      break
    
    case 'teacher':
      // Teachers can only see scores of their students
      query = query.eq('teacher_id', permissions.userId)
      break
  }

  const { data, error } = await query
    .order('exam_date', { ascending: false })
    .order('student_name')

  if (error) {
    console.error('Error fetching class scores:', error)
    throw new Error(`Failed to fetch class scores: ${error.message}`)
  }

  return data as ClassScoreView[]
}

/**
 * Check if user has permission to access a specific class
 */
export async function canAccessClass(classId: string): Promise<boolean> {
  const permissions = await getCurrentUserPermissions()
  if (!permissions) {
    return false
  }

  if (permissions.role === 'admin') {
    return true
  }

  const accessibleClasses = await getAccessibleClasses()
  return accessibleClasses.some(c => c.class_id === classId)
}

/**
 * Check if user has permission to access a specific student
 */
export async function canAccessStudent(studentId: string): Promise<boolean> {
  const permissions = await getCurrentUserPermissions()
  if (!permissions) {
    return false
  }

  if (permissions.role === 'admin') {
    return true
  }

  const accessibleStudents = await getAccessibleStudents()
  return accessibleStudents.some(s => s.student_id === studentId)
}