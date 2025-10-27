/**
 * Student Management API for Primary School LMS
 * Enhanced with course management functionality
 * Supports class assignments and LT/IT/KCFS course allocations
 */

import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'

export type Student = Database['public']['Tables']['students']['Row']
export type StudentInsert = Database['public']['Tables']['students']['Insert']
export type StudentUpdate = Database['public']['Tables']['students']['Update']
type Course = Database['public']['Tables']['courses']['Row']

// Extended student type with class and course information
export type StudentWithClass = Student & {
  classes?: {
    id: string
    name: string
    grade: number
    track: 'local' | 'international'
    academic_year: string
  }
}

// Extended student type with full course enrollment data
export type StudentWithCourses = Student & {
  classes?: {
    id: string
    name: string
    grade: number
    track: 'local' | 'international'
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

// Get all students (simplified version)
export async function getStudents() {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('is_active', true)
    .order('grade')
    .order('full_name')

  if (error) {
    console.error('Error fetching students:', error)
    throw new Error(`Failed to fetch students: ${error.message}`)
  }

  return data as Student[]
}

// Get students by class (simplified)
export async function getStudentsByClass(classId: string) {
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

// Create new student (simplified)
export async function createStudent(studentData: StudentInsert) {
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

// Bulk create students (simplified)
export async function createStudentsBulk(studentsData: StudentInsert[]) {
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

// Update student (simplified)
export async function updateStudent(id: string, updates: StudentUpdate) {
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

// Assign student to class (simplified)
export async function assignStudentToClass(studentId: string, classId: string) {
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

// Remove student from class (simplified)
export async function removeStudentFromClass(studentId: string) {
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

// Soft delete student (mark as inactive)
export async function deleteStudent(id: string) {
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

// Promote students to next grade (for new academic year)
export async function promoteStudents(fromGrade: number, toGrade: number) {
  // Don't promote Grade 12 students
  if (fromGrade === 12) {
    throw new Error('Grade 12 students cannot be promoted')
  }

  const supabase = createClient()
  
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

    return data.map((student: any) => ({
      ...student,
      classes: student.classes ? {
        ...student.classes,
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
    courseEnrollments.forEach((enrollment: any) => {
      if (enrollment.classes?.courses) {
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