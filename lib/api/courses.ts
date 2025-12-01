/**
 * Courses API Layer
 * Purpose: Manage course assignments for classes
 * Architecture: One class can have three course types (LT/IT/KCFS) taught by different teachers
 */

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'

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
 */
export async function getCoursesByClass(classId: string): Promise<CourseWithDetails[]> {
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
    .eq('class_id', classId)
    .order('course_type')

  if (error) {
    console.error('Error fetching courses by class:', error)
    throw new Error(error.message)
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
 */
export async function assignTeacherToCourse(
  courseId: string,
  teacherId: string
): Promise<Course> {
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
 */
export async function unassignTeacherFromCourse(courseId: string): Promise<Course> {
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
 */
export async function createCoursesForClass(
  classId: string,
  academicYear: string
): Promise<Course[]> {
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
 */
export async function getUnassignedCourses(
  academicYear?: string
): Promise<CourseWithDetails[]> {
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

  return data as CourseWithDetails[]
}

/**
 * Get course statistics
 */
export async function getCourseStatistics(academicYear?: string) {
  const supabase = createClient()

  let query = supabase
    .from('courses')
    .select('course_type, teacher_id')

  if (academicYear) {
    query = query.eq('academic_year', academicYear)
  }

  const { data, error } = await query.eq('is_active', true)

  if (error) {
    console.error('Error fetching course statistics:', error)
    throw new Error(error.message)
  }

  // Calculate statistics
  const stats = {
    total: data.length,
    assigned: data.filter(c => c.teacher_id !== null).length,
    unassigned: data.filter(c => c.teacher_id === null).length,
    byType: {
      LT: {
        total: data.filter(c => c.course_type === 'LT').length,
        assigned: data.filter(c => c.course_type === 'LT' && c.teacher_id !== null).length
      },
      IT: {
        total: data.filter(c => c.course_type === 'IT').length,
        assigned: data.filter(c => c.course_type === 'IT' && c.teacher_id !== null).length
      },
      KCFS: {
        total: data.filter(c => c.course_type === 'KCFS').length,
        assigned: data.filter(c => c.course_type === 'KCFS' && c.teacher_id !== null).length
      }
    }
  }

  return stats
}

/**
 * Bulk assign teachers to courses
 */
export async function bulkAssignTeachers(
  assignments: Array<{ courseId: string; teacherId: string }>
): Promise<Course[]> {
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
