/**
 * Courses API Layer
 * Purpose: Manage course assignments for classes
 * Architecture: One class can have three course types (LT/IT/KCFS) taught by different teachers
 *
 * Permission Model (2025-12-29):
 * - Admin: Full access to all courses
 * - Office Member: Read-only access to all courses
 * - Head: Read all courses, write only within grade band + track
 * - Teacher: Read/write only their own courses
 */

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import {
  getCurrentUser,
  requireAuth,
  requireRole,
  canAccessClass,
  canWrite,
  filterByRole,
  gradeInBand,
  type CurrentUser
} from './permissions'

type Course = Database['public']['Tables']['courses']['Row']
type CourseInsert = Database['public']['Tables']['courses']['Insert']
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type CourseUpdate = Database['public']['Tables']['courses']['Update']
type TeacherType = Database['public']['Enums']['teacher_type']

export interface CourseWithDetails extends Course {
  classes?: {
    id: string
    name: string
    grade: number
    track: 'local' | 'international'
  }
  users?: {
    id: string
    full_name: string
    email: string
    teacher_type: TeacherType
  } | null
}

/**
 * Get all courses for a class
 *
 * Permission: All authenticated users can read (RLS handles auth)
 * - Admin/Office: All courses visible
 * - Head: Only courses matching their track
 * - Teacher: All courses visible (they need to see class structure)
 */
export async function getCoursesByClass(classId: string): Promise<CourseWithDetails[]> {
  const supabase = createClient()

  // Get current user for filtering
  const user = await getCurrentUser()

  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      classes:class_id (
        id,
        name,
        grade,
        track
      ),
      users:teacher_id (
        id,
        full_name,
        email,
        teacher_type
      )
    `)
    .eq('class_id', classId)
    .order('course_type')

  if (error) {
    console.error('Error fetching courses by class:', error)
    throw new Error(error.message)
  }

  // Filter by role if user is head (only show their track)
  if (user?.role === 'head' && user.track) {
    return (data as CourseWithDetails[]).filter(c => c.course_type === user.track)
  }

  return data as CourseWithDetails[]
}

/**
 * Get all courses taught by a teacher
 */
export async function getCoursesByTeacher(teacherId: string): Promise<CourseWithDetails[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      classes:class_id (
        id,
        name,
        grade,
        track
      ),
      users:teacher_id (
        id,
        full_name,
        email,
        teacher_type
      )
    `)
    .eq('teacher_id', teacherId)
    .eq('is_active', true)
    .order('academic_year', { ascending: false })

  if (error) {
    console.error('Error fetching courses by teacher:', error)
    throw new Error(error.message)
  }

  return data as CourseWithDetails[]
}

/**
 * Assign a teacher to a course
 *
 * Permission: Admin only (course assignments are admin operations)
 */
export async function assignTeacherToCourse(
  courseId: string,
  teacherId: string
): Promise<Course> {
  // Only admin can assign teachers
  await requireRole(['admin'])

  const supabase = createClient()

  // First verify teacher type matches course type
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('course_type')
    .eq('id', courseId)
    .single()

  if (courseError) {
    throw new Error(`Course not found: ${courseError.message}`)
  }

  const { data: teacher, error: teacherError } = await supabase
    .from('users')
    .select('teacher_type')
    .eq('id', teacherId)
    .single()

  if (teacherError) {
    throw new Error(`Teacher not found: ${teacherError.message}`)
  }

  if (teacher.teacher_type !== course.course_type) {
    throw new Error(
      `Teacher type (${teacher.teacher_type}) does not match course type (${course.course_type})`
    )
  }

  // Update course with teacher assignment
  const { data, error } = await supabase
    .from('courses')
    .update({ teacher_id: teacherId })
    .eq('id', courseId)
    .select()
    .single()

  if (error) {
    console.error('Error assigning teacher to course:', error)
    throw new Error(error.message)
  }

  return data
}

/**
 * Unassign a teacher from a course
 *
 * Permission: Admin only
 */
export async function unassignTeacherFromCourse(courseId: string): Promise<Course> {
  // Only admin can unassign teachers
  await requireRole(['admin'])

  const supabase = createClient()

  const { data, error } = await supabase
    .from('courses')
    .update({ teacher_id: null })
    .eq('id', courseId)
    .select()
    .single()

  if (error) {
    console.error('Error unassigning teacher from course:', error)
    throw new Error(error.message)
  }

  return data
}

/**
 * Create courses for a new class (automatically creates LT, IT, KCFS courses)
 *
 * Permission: Admin only (class creation is admin operation)
 */
export async function createCoursesForClass(
  classId: string,
  academicYear: string
): Promise<Course[]> {
  // Only admin can create courses
  await requireRole(['admin'])

  const supabase = createClient()

  const courseTypes: TeacherType[] = ['LT', 'IT', 'KCFS']
  const coursesToCreate: CourseInsert[] = courseTypes.map(type => ({
    class_id: classId,
    course_type: type,
    teacher_id: null,
    academic_year: academicYear,
    is_active: true
  }))

  const { data, error } = await supabase
    .from('courses')
    .insert(coursesToCreate)
    .select()

  if (error) {
    console.error('Error creating courses for class:', error)
    throw new Error(error.message)
  }

  return data
}

/**
 * Get unassigned courses (courses without a teacher)
 *
 * Permission: Admin/Office/Head only (for assignment management)
 * - Head: Only sees courses in their grade band + track
 */
export async function getUnassignedCourses(
  academicYear?: string
): Promise<CourseWithDetails[]> {
  // Require elevated role
  const user = await requireRole(['admin', 'office_member', 'head'])

  const supabase = createClient()

  let query = supabase
    .from('courses')
    .select(`
      *,
      classes:class_id (
        id,
        name,
        grade,
        track
      )
    `)
    .is('teacher_id', null)
    .eq('is_active', true)

  if (academicYear) {
    query = query.eq('academic_year', academicYear)
  }

  const { data, error } = await query.order('course_type')

  if (error) {
    console.error('Error fetching unassigned courses:', error)
    throw new Error(error.message)
  }

  // Filter by role - handle nested grade field specially
  let result = data as CourseWithDetails[]

  if (user.role === 'head') {
    result = result.filter(course => {
      // Filter by grade band
      if (user.gradeBand) {
        const classData = course.classes as { grade: number } | undefined
        if (classData && !gradeInBand(classData.grade, user.gradeBand)) {
          return false
        }
      }
      // Filter by track
      if (user.track && course.course_type !== user.track) {
        return false
      }
      return true
    })
  }

  return result
}

/**
 * Get course statistics
 *
 * Permission: Admin/Office/Head only
 * - Head: Only sees stats for their grade band + track
 */
export async function getCourseStatistics(academicYear?: string) {
  // Require elevated role
  const user = await requireRole(['admin', 'office_member', 'head'])

  const supabase = createClient()

  let query = supabase
    .from('courses')
    .select(`
      course_type,
      teacher_id,
      classes:class_id (
        grade
      )
    `)

  if (academicYear) {
    query = query.eq('academic_year', academicYear)
  }

  const { data, error } = await query.eq('is_active', true)

  if (error) {
    console.error('Error fetching course statistics:', error)
    throw new Error(error.message)
  }

  // Filter by role for head teachers
  let filteredData = data
  if (user.role === 'head') {
    filteredData = data.filter(course => {
      // Filter by grade band
      if (user.gradeBand) {
        // Handle Supabase FK join type (could be array or object)
        const classData = (Array.isArray(course.classes) ? course.classes[0] : course.classes) as { grade: number } | null | undefined
        if (classData && !gradeInBand(classData.grade, user.gradeBand)) {
          return false
        }
      }
      // Filter by track
      if (user.track && course.course_type !== user.track) {
        return false
      }
      return true
    })
  }

  // Calculate statistics
  const stats = {
    total: filteredData.length,
    assigned: filteredData.filter(c => c.teacher_id !== null).length,
    unassigned: filteredData.filter(c => c.teacher_id === null).length,
    byType: {
      LT: {
        total: filteredData.filter(c => c.course_type === 'LT').length,
        assigned: filteredData.filter(c => c.course_type === 'LT' && c.teacher_id !== null).length
      },
      IT: {
        total: filteredData.filter(c => c.course_type === 'IT').length,
        assigned: filteredData.filter(c => c.course_type === 'IT' && c.teacher_id !== null).length
      },
      KCFS: {
        total: filteredData.filter(c => c.course_type === 'KCFS').length,
        assigned: filteredData.filter(c => c.course_type === 'KCFS' && c.teacher_id !== null).length
      }
    }
  }

  return stats
}

/**
 * Bulk assign teachers to courses
 *
 * Permission: Admin only
 */
export async function bulkAssignTeachers(
  assignments: Array<{ courseId: string; teacherId: string }>
): Promise<Course[]> {
  // Only admin can bulk assign
  await requireRole(['admin'])

  const supabase = createClient()

  // Validate all assignments first
  for (const assignment of assignments) {
    const { data: course } = await supabase
      .from('courses')
      .select('course_type')
      .eq('id', assignment.courseId)
      .single()

    const { data: teacher } = await supabase
      .from('users')
      .select('teacher_type')
      .eq('id', assignment.teacherId)
      .single()

    if (!course || !teacher) {
      throw new Error('Invalid course or teacher ID')
    }

    if (teacher.teacher_type !== course.course_type) {
      throw new Error(
        `Teacher type mismatch for course ${assignment.courseId}: ${teacher.teacher_type} vs ${course.course_type}`
      )
    }
  }

  // Perform all assignments
  const results: Course[] = []
  for (const assignment of assignments) {
    const { data, error } = await supabase
      .from('courses')
      .update({ teacher_id: assignment.teacherId })
      .eq('id', assignment.courseId)
      .select()
      .single()

    if (error) {
      console.error('Error in bulk assignment:', error)
      throw new Error(error.message)
    }

    results.push(data)
  }

  return results
}
