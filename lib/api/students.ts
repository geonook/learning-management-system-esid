/**
 * Student Management API for Primary School LMS
 * Enhanced with course management functionality
 * Supports class assignments and LT/IT/KCFS course allocations
 *
 * Permission Model (2025-12-29):
 * - Admin: Full access to all students
 * - Office Member: Read-only access to all students
 * - Head: Read all students in grade band, write only within scope
 * - Teacher: Read/write only students in their courses
 */

import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import {
  getCurrentUser,
  requireAuth,
  requireRole,
  gradeInBand,
  type CurrentUser
} from './permissions'

export type Student = Database['public']['Tables']['students']['Row']
export type StudentInsert = Database['public']['Tables']['students']['Insert']
export type StudentUpdate = Database['public']['Tables']['students']['Update']
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type Course = Database['public']['Tables']['courses']['Row']

// Extended student type with class and course information
export type StudentWithClass = Student & {
  classes?: {
    id: string
    name: string
    grade: number
    track: 'LT' | 'IT' | 'KCFS' | null  // ✅ Updated: classes.track is now course_type ENUM (nullable)
    academic_year: string
  }
}

// Extended student type with full course enrollment data
export type StudentWithCourses = Student & {
  classes?: {
    id: string
    name: string
    grade: number
    track: 'LT' | 'IT' | 'KCFS' | null  // ✅ Updated: classes.track is now course_type ENUM (nullable)
    academic_year: string
    courses?: Array<{
      id: string
      course_type: 'LT' | 'IT' | 'KCFS'
      teacher_id: string
      teacher?: {
        id: string
        full_name: string
        email: string
        teacher_type: 'LT' | 'IT' | 'KCFS'
      }
    }>
  }
}

/**
 * Get all students
 *
 * Permission: Admin/Office/Head only (Teachers use course-based queries)
 * - Head: Only students in their grade band
 */
export async function getStudents() {
  const user = await requireRole(['admin', 'office_member', 'head'])

  const supabase = createClient()

  let query = supabase
    .from('students')
    .select('*')
    .eq('is_active', true)

  // Head teacher: filter by grade band
  if (user.role === 'head' && user.gradeBand) {
    const grades = parseGradeBandToArray(user.gradeBand)
    query = query.in('grade', grades)
  }

  const { data, error } = await query
    .order('grade')
    .order('full_name')

  if (error) {
    console.error('Error fetching students:', error)
    throw new Error(`Failed to fetch students: ${error.message}`)
  }

  return data as Student[]
}

// Helper to parse grade band
function parseGradeBandToArray(gradeBand: string): number[] {
  if (gradeBand.includes('-')) {
    const [start, end] = gradeBand.split('-').map(Number)
    if (start === undefined || end === undefined || isNaN(start) || isNaN(end)) {
      return []
    }
    const grades: number[] = []
    for (let i = start; i <= end; i++) {
      grades.push(i)
    }
    return grades
  }
  const grade = Number(gradeBand)
  return isNaN(grade) ? [] : [grade]
}

/**
 * Get students by class
 *
 * Permission: All authenticated users can read (for gradebook/roster views)
 * RLS handles basic auth, this is a convenience query
 */
export async function getStudentsByClass(classId: string) {
  // Require authentication
  await requireAuth()

  const supabase = createClient()

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('class_id', classId)
    .eq('is_active', true)
    .order('full_name')

  if (error) {
    console.error('Error fetching students by class:', error)
    throw new Error(`Failed to fetch students: ${error.message}`)
  }

  return data as Student[]
}

// Get students by grade and track (simplified)
export async function getStudentsByGradeTrack(
  grade: number,
  track: 'local' | 'international'
) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('grade', grade)
    .eq('track', track)
    .eq('is_active', true)
    .order('full_name')

  if (error) {
    console.error('Error fetching students by grade/track:', error)
    throw new Error(`Failed to fetch students: ${error.message}`)
  }

  return data as Student[]
}

// Get single student by ID (simplified)
export async function getStudent(id: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching student:', error)
    throw new Error(`Failed to fetch student: ${error.message}`)
  }

  return data as Student
}

// Get student by student ID (external ID) - simplified
export async function getStudentByStudentId(studentId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('student_id', studentId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Student not found
    }
    console.error('Error fetching student by student ID:', error)
    throw new Error(`Failed to fetch student: ${error.message}`)
  }

  return data as Student
}

/**
 * Create new student
 *
 * Permission: Admin only
 */
export async function createStudent(studentData: StudentInsert) {
  // Only admin can create students
  await requireRole(['admin'])

  // Check if student_id already exists
  const existing = await getStudentByStudentId(studentData.student_id)
  if (existing) {
    throw new Error(`Student with ID ${studentData.student_id} already exists`)
  }

  const supabase = createClient()

  const { data, error } = await supabase
    .from('students')
    .insert(studentData)
    .select('*')
    .single()

  if (error) {
    console.error('Error creating student:', error)
    throw new Error(`Failed to create student: ${error.message}`)
  }

  return data as Student
}

/**
 * Bulk create students
 *
 * Permission: Admin only
 */
export async function createStudentsBulk(studentsData: StudentInsert[]) {
  // Only admin can bulk create
  await requireRole(['admin'])

  const supabase = createClient()

  const { data, error } = await supabase
    .from('students')
    .insert(studentsData)
    .select('*')

  if (error) {
    console.error('Error creating students in bulk:', error)
    throw new Error(`Failed to create students: ${error.message}`)
  }

  return data as Student[]
}

/**
 * Update student
 *
 * Permission: Admin only (student data updates are admin operations)
 */
export async function updateStudent(id: string, updates: StudentUpdate) {
  // Only admin can update students
  await requireRole(['admin'])

  const supabase = createClient()

  const { data, error } = await supabase
    .from('students')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('Error updating student:', error)
    throw new Error(`Failed to update student: ${error.message}`)
  }

  return data as Student
}

/**
 * Assign student to class
 *
 * Permission: Admin only
 */
export async function assignStudentToClass(studentId: string, classId: string) {
  // Only admin can assign students
  await requireRole(['admin'])

  const supabase = createClient()

  const { data, error } = await supabase
    .from('students')
    .update({
      class_id: classId,
      updated_at: new Date().toISOString()
    })
    .eq('id', studentId)
    .select('*')
    .single()

  if (error) {
    console.error('Error assigning student to class:', error)
    throw new Error(`Failed to assign student to class: ${error.message}`)
  }

  return data as Student
}

/**
 * Remove student from class
 *
 * Permission: Admin only
 */
export async function removeStudentFromClass(studentId: string) {
  // Only admin can remove students
  await requireRole(['admin'])

  const supabase = createClient()

  const { data, error } = await supabase
    .from('students')
    .update({
      class_id: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', studentId)
    .select('*')
    .single()

  if (error) {
    console.error('Error removing student from class:', error)
    throw new Error(`Failed to remove student from class: ${error.message}`)
  }

  return data as Student
}

/**
 * Soft delete student (mark as inactive)
 *
 * Permission: Admin only
 */
export async function deleteStudent(id: string) {
  // Only admin can delete students
  await requireRole(['admin'])

  const supabase = createClient()

  const { error } = await supabase
    .from('students')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Error deleting student:', error)
    throw new Error(`Failed to delete student: ${error.message}`)
  }

  return true
}

// Extended student type with class name for browse page
// Note: 'level' field exists in actual database but missing from types/database.ts
export type StudentWithClassName = Student & {
  level?: string | null  // e.g., "G1E1", "G4E2", "G6E3"
  class_name?: string | null
}

// Pagination result type
export interface PaginatedStudents {
  students: StudentWithClassName[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Get students with pagination and filters for Browse page
export async function getStudentsWithPagination(options?: {
  page?: number
  pageSize?: number
  grade?: number
  level?: string  // e.g., "E1", "E2", "E3" (extracted from level field like "G1E1")
  search?: string
}): Promise<PaginatedStudents> {
  const supabase = createClient()
  const page = options?.page || 1
  const pageSize = options?.pageSize || 50
  const offset = (page - 1) * pageSize

  // Build query for students with class name
  let query = supabase
    .from('students')
    .select(`
      *,
      classes:class_id (
        name
      )
    `, { count: 'exact' })
    .eq('is_active', true)
    .order('grade')
    .order('full_name')
    .range(offset, offset + pageSize - 1)

  // Apply grade filter
  if (options?.grade) {
    query = query.eq('grade', options.grade)
  }

  // Apply level filter (search in level field for E1, E2, E3)
  if (options?.level) {
    query = query.ilike('level', `%${options.level}`)
  }

  // Apply search filter (name or student_id)
  if (options?.search) {
    query = query.or(`full_name.ilike.%${options.search}%,student_id.ilike.%${options.search}%`)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching students with pagination:', error)
    throw new Error(`Failed to fetch students: ${error.message}`)
  }

  // Map class name from nested object
  const students: StudentWithClassName[] = (data || []).map((student) => ({
    ...student,
    class_name: (student.classes as { name: string } | null)?.name || null,
    classes: undefined  // Remove nested object
  }))

  const total = count || 0
  const totalPages = Math.ceil(total / pageSize)

  return {
    students,
    total,
    page,
    pageSize,
    totalPages
  }
}

// Get level statistics for stats display
export async function getLevelStatistics(): Promise<{
  total: number
  e1: number
  e2: number
  e3: number
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('students')
    .select('level')
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching level statistics:', error)
    throw new Error(`Failed to fetch level statistics: ${error.message}`)
  }

  const stats = {
    total: data.length,
    e1: 0,
    e2: 0,
    e3: 0
  }

  data.forEach(student => {
    if (student.level?.includes('E1')) stats.e1++
    else if (student.level?.includes('E2')) stats.e2++
    else if (student.level?.includes('E3')) stats.e3++
  })

  return stats
}

// Get student statistics
export async function getStudentStatistics() {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('students')
    .select('grade, track, class_id')
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching student statistics:', error)
    throw new Error(`Failed to fetch student statistics: ${error.message}`)
  }

  const stats = {
    total: data.length,
    byGrade: {} as Record<number, number>,
    byTrack: {
      local: 0,
      international: 0
    },
    unassigned: 0
  }

  data.forEach(student => {
    stats.byGrade[student.grade] = (stats.byGrade[student.grade] || 0) + 1
    if (student.track === 'local' || student.track === 'international') {
      stats.byTrack[student.track as 'local' | 'international'] += 1
    }
    if (!student.class_id) {
      stats.unassigned += 1
    }
  })

  return stats
}

/**
 * Promote students to next grade (for new academic year)
 *
 * Permission: Admin only (dangerous bulk operation)
 *
 * This function:
 * 1. Gets all students in the fromGrade
 * 2. Cleans up their student_courses records (removes course enrollments)
 * 3. Updates their grade and clears class_id
 *
 * Note: For primary school (G1-G6), students graduating from G6 should not be promoted.
 */
export async function promoteStudents(fromGrade: number, toGrade: number) {
  // Only admin can promote students
  await requireRole(['admin'])

  // Don't promote Grade 6 students (primary school graduation)
  if (fromGrade === 6) {
    throw new Error('Grade 6 students cannot be promoted (primary school graduation)')
  }

  // Don't promote Grade 12 students (legacy check for secondary school)
  if (fromGrade === 12) {
    throw new Error('Grade 12 students cannot be promoted')
  }

  const supabase = createClient()

  // Step 1: Get all student IDs that will be promoted
  const { data: studentsToPromote, error: fetchError } = await supabase
    .from('students')
    .select('id')
    .eq('grade', fromGrade)
    .eq('is_active', true)

  if (fetchError) {
    console.error('Error fetching students to promote:', fetchError)
    throw new Error(`Failed to fetch students: ${fetchError.message}`)
  }

  const studentIds = studentsToPromote?.map(s => s.id) || []

  if (studentIds.length === 0) {
    console.log(`No students found in grade ${fromGrade} to promote`)
    return 0
  }

  // Step 2: Clean up student_courses records
  // This removes the students from their current course enrollments
  const { error: cleanupError } = await supabase
    .from('student_courses')
    .delete()
    .in('student_id', studentIds)

  if (cleanupError) {
    console.error('Error cleaning up student_courses:', cleanupError)
    // Don't throw here - continue with promotion even if cleanup fails
    // The records will become orphaned but won't cause functional issues
    console.warn('Warning: student_courses cleanup failed, continuing with promotion')
  }

  // Step 3: Update student grades and clear class assignments
  const { data, error } = await supabase
    .from('students')
    .update({
      grade: toGrade,
      class_id: null, // Remove from current class
      updated_at: new Date().toISOString()
    })
    .eq('grade', fromGrade)
    .eq('is_active', true)
    .select()

  if (error) {
    console.error('Error promoting students:', error)
    throw new Error(`Failed to promote students: ${error.message}`)
  }

  console.log(`Successfully promoted ${data.length} students from G${fromGrade} to G${toGrade}`)
  return data.length
}

// ======================================
// COURSE MANAGEMENT FUNCTIONS
// ======================================

/**
 * Get students with their course enrollment details
 */
export async function getStudentsWithCourses(
  grade?: number,
  track?: 'local' | 'international',
  classId?: string
): Promise<StudentWithCourses[]> {
  const supabase = createClient()

  try {
    let query = supabase
      .from('students')
      .select(`
        *,
        classes!inner(
          id,
          name,
          grade,
          track,
          academic_year,
          courses(
            id,
            course_type,
            teacher_id,
            users!courses_teacher_id_fkey(
              id,
              full_name,
              email,
              teacher_type
            )
          )
        )
      `)
      .eq('is_active', true)
      .eq('classes.is_active', true)
      .order('grade')
      .order('full_name')

    // Apply filters
    if (classId) {
      query = query.eq('class_id', classId)
    } else if (grade && track) {
      query = query.eq('grade', grade).eq('track', track)
    } else if (grade) {
      query = query.eq('grade', grade)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching students with courses:', error)
      throw new Error(`Failed to fetch students with courses: ${error.message}`)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((student: any) => ({
      ...student,
      classes: student.classes ? {
        ...student.classes,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        courses: student.classes.courses?.map((course: any) => ({
          ...course,
          teacher: course.users
        }))
      } : undefined
    })) as StudentWithCourses[]
  } catch (error) {
    console.error('Exception in getStudentsWithCourses:', error)
    throw new Error('Failed to fetch students with courses')
  }
}

/**
 * Get course assignment summary for Head Teacher dashboard
 */
export async function getCourseAssignmentSummary(
  grade: number,
  track: 'local' | 'international'
): Promise<{
  totalStudents: number
  classSummary: Array<{
    classId: string
    className: string
    studentCount: number
    courses: Array<{
      courseType: 'LT' | 'IT' | 'KCFS'
      teacherId: string
      teacherName: string
      studentCount: number
    }>
  }>
}> {
  const supabase = createClient()

  try {
    // Get classes for the grade and track
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select(`
        id,
        name,
        grade,
        track,
        courses(
          id,
          course_type,
          teacher_id,
          users!courses_teacher_id_fkey(
            id,
            full_name
          )
        )
      `)
      .eq('grade', grade)
      .eq('track', track)
      .eq('is_active', true)
      .order('name')

    if (classesError) {
      throw classesError
    }

    const classSummary = []
    let totalStudents = 0

    for (const cls of classes || []) {
      // Get student count for this class
      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact' })
        .eq('class_id', cls.id)
        .eq('is_active', true)

      totalStudents += studentCount || 0

      // Map courses
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const courses = (cls.courses || []).map((course: any) => ({
        courseType: course.course_type,
        teacherId: course.teacher_id,
        teacherName: course.users?.full_name || 'Unassigned',
        studentCount: studentCount || 0 // All students in class take all courses
      }))

      classSummary.push({
        classId: cls.id,
        className: cls.name,
        studentCount: studentCount || 0,
        courses
      })
    }

    return {
      totalStudents,
      classSummary
    }
  } catch (error) {
    console.error('Exception in getCourseAssignmentSummary:', error)
    throw new Error('Failed to fetch course assignment summary')
  }
}

/**
 * Bulk assign students to a class (course enrollment is automatic)
 */
export async function bulkAssignStudentsToClass(
  studentIds: string[],
  classId: string
): Promise<Student[]> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const supabase = createClient()

  try {
    const supabase = createClient()
  
  const { data, error } = await supabase
      .from('students')
      .update({
        class_id: classId,
        updated_at: new Date().toISOString()
      })
      .in('id', studentIds)
      .select('*')

    if (error) {
      console.error('Error bulk assigning students to class:', error)
      throw new Error(`Failed to assign students to class: ${error.message}`)
    }

    return data as Student[]
  } catch (error) {
    console.error('Exception in bulkAssignStudentsToClass:', error)
    throw new Error('Failed to bulk assign students to class')
  }
}

/**
 * Remove students from class (removes from all courses in class)
 */
export async function bulkRemoveStudentsFromClass(
  studentIds: string[]
): Promise<Student[]> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const supabase = createClient()

  try {
    const supabase = createClient()
  
  const { data, error } = await supabase
      .from('students')
      .update({
        class_id: null,
        updated_at: new Date().toISOString()
      })
      .in('id', studentIds)
      .select('*')

    if (error) {
      console.error('Error bulk removing students from class:', error)
      throw new Error(`Failed to remove students from class: ${error.message}`)
    }

    return data as Student[]
  } catch (error) {
    console.error('Exception in bulkRemoveStudentsFromClass:', error)
    throw new Error('Failed to bulk remove students from class')
  }
}

/**
 * Get unassigned students by grade and track
 */
export async function getUnassignedStudents(
  grade: number,
  track: 'local' | 'international'
): Promise<Student[]> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const supabase = createClient()

  try {
    const supabase = createClient()
  
  const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('grade', grade)
      .eq('track', track)
      .is('class_id', null)
      .eq('is_active', true)
      .order('full_name')

    if (error) {
      console.error('Error fetching unassigned students:', error)
      throw new Error(`Failed to fetch unassigned students: ${error.message}`)
    }

    return data as Student[]
  } catch (error) {
    console.error('Exception in getUnassignedStudents:', error)
    throw new Error('Failed to fetch unassigned students')
  }
}

/**
 * Get course enrollment statistics for admin dashboard
 */
export async function getCourseEnrollmentStats(): Promise<{
  totalStudents: number
  byGrade: Record<number, {
    total: number
    assigned: number
    unassigned: number
  }>
  byCourseType: Record<'LT' | 'IT' | 'KCFS', number>
}> {
  const supabase = createClient()

  try {
    // Get all active students
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('grade, track, class_id')
      .eq('is_active', true)

    if (studentsError) {
      throw studentsError
    }

    // Get course enrollments (via class assignments)
    const { data: courseEnrollments, error: coursesError } = await supabase
      .from('students')
      .select(`
        grade,
        classes!inner(
          courses(
            course_type
          )
        )
      `)
      .eq('is_active', true)
      .not('class_id', 'is', null)

    if (coursesError) {
      throw coursesError
    }

    const stats = {
      totalStudents: students.length,
      byGrade: {} as Record<number, { total: number; assigned: number; unassigned: number }>,
      byCourseType: { LT: 0, IT: 0, KCFS: 0 } as Record<'LT' | 'IT' | 'KCFS', number>
    }

    // Calculate grade statistics
    students.forEach(student => {
      if (!stats.byGrade[student.grade]) {
        stats.byGrade[student.grade] = { total: 0, assigned: 0, unassigned: 0 }
      }
      const gradeStats = stats.byGrade[student.grade]!
      gradeStats.total++
      if (student.class_id) {
        gradeStats.assigned++
      } else {
        gradeStats.unassigned++
      }
    })

    // Calculate course type enrollments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    courseEnrollments.forEach((enrollment: any) => {
      if (enrollment.classes?.courses) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        enrollment.classes.courses.forEach((course: any) => {
          stats.byCourseType[course.course_type as 'LT' | 'IT' | 'KCFS']++
        })
      }
    })

    return stats
  } catch (error) {
    console.error('Exception in getCourseEnrollmentStats:', error)
    throw new Error('Failed to fetch course enrollment statistics')
  }
}