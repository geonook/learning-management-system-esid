/**
 * User Management API for Primary School LMS
 *
 * Permission Model (2025-12-29):
 * - Admin: Full access to all users
 * - Office Member: Read-only access to teachers/heads
 * - Head: Read teachers in their track
 * - Teacher: Read own profile only
 *
 * ⚠️ LEGACY WARNING: This file uses track-based filtering
 * For course-based teacher queries in grade entry, use course APIs from /lib/api/scores.ts
 * This API is maintained for general user management features only
 */

import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import {
  getCurrentUser,
  requireAuth,
  requireRole,
  type CurrentUser
} from './permissions'

export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type UserRole = 'admin' | 'head' | 'teacher' | 'student'
export type TeacherType = 'LT' | 'IT' | 'KCFS'
export type TrackType = 'local' | 'international'

/**
 * Get all users
 *
 * Permission: Admin only (user list contains sensitive info)
 */
export async function getUsers() {
  // Only admin can see all users
  await requireRole(['admin'])

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true)
    .order('role')
    .order('full_name')

  if (error) {
    console.error('Error fetching users:', error)
    throw new Error(`Failed to fetch users: ${error.message}`)
  }

  return data
}

/**
 * Get users by role
 *
 * Permission: Admin/Office only
 */
export async function getUsersByRole(role: UserRole) {
  // Only admin/office can query by role
  await requireRole(['admin', 'office_member'])

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', role)
    .eq('is_active', true)
    .order('full_name')

  if (error) {
    console.error('Error fetching users by role:', error)
    throw new Error(`Failed to fetch users: ${error.message}`)
  }

  return data
}

/**
 * Get teachers by type
 *
 * Permission: Admin/Office/Head only
 * - Head: Only teachers matching their track
 */
export async function getTeachersByType(teacherType: TeacherType) {
  const user = await requireRole(['admin', 'office_member', 'head'])

  // Head can only query their own track
  if (user.role === 'head' && user.track !== teacherType) {
    return []
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'teacher')
    .eq('teacher_type', teacherType)
    .eq('is_active', true)
    .order('full_name')

  if (error) {
    console.error('Error fetching teachers by type:', error)
    throw new Error(`Failed to fetch teachers: ${error.message}`)
  }

  return data
}

/**
 * Get head teacher by grade band and course type (new grade band system)
 *
 * Permission: All authenticated users
 */
export async function getHeadByGradeBand(gradeBand: string, courseType: TeacherType) {
  await requireAuth()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'head')
    .eq('grade_band', gradeBand)
    .eq('track', courseType)
    .eq('is_active', true)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Head not found
    }
    console.error('Error fetching head by grade band:', error)
    throw new Error(`Failed to fetch head: ${error.message}`)
  }

  return data
}

/**
 * Get single user by ID
 *
 * Permission: All authenticated users (profile viewing)
 */
export async function getUser(id: string) {
  await requireAuth()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching user:', error)
    throw new Error(`Failed to fetch user: ${error.message}`)
  }

  return data
}

/**
 * Get user by email
 *
 * Permission: Admin only (email lookup is sensitive)
 */
export async function getUserByEmail(email: string) {
  await requireRole(['admin'])

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // User not found
    }
    console.error('Error fetching user by email:', error)
    throw new Error(`Failed to fetch user: ${error.message}`)
  }

  return data
}

/**
 * Create new user
 *
 * Permission: Admin only (user creation is admin operation)
 * Note: This would normally be handled by Supabase Auth
 */
export async function createUser(userData: UserInsert) {
  // Only admin can create users
  await requireRole(['admin'])

  // Check if email already exists
  const existing = await getUserByEmail(userData.email)
  if (existing) {
    throw new Error(`User with email ${userData.email} already exists`)
  }

  const { data, error } = await supabase
    .from('users')
    .insert(userData)
    .select()
    .single()

  if (error) {
    console.error('Error creating user:', error)
    throw new Error(`Failed to create user: ${error.message}`)
  }

  return data
}

/**
 * Update user
 *
 * Permission: Admin only
 */
export async function updateUser(id: string, updates: UserUpdate) {
  // Only admin can update users
  await requireRole(['admin'])

  const { data, error } = await supabase
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating user:', error)
    throw new Error(`Failed to update user: ${error.message}`)
  }

  return data
}

/**
 * Soft delete user (mark as inactive)
 *
 * Permission: Admin only
 */
export async function deleteUser(id: string) {
  // Only admin can delete users
  await requireRole(['admin'])

  const { error } = await supabase
    .from('users')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Error deleting user:', error)
    throw new Error(`Failed to delete user: ${error.message}`)
  }

  return true
}

/**
 * Get user statistics
 *
 * Permission: Admin/Office only (aggregate statistics)
 */
export async function getUserStatistics() {
  await requireRole(['admin', 'office_member'])

  const { data, error } = await supabase
    .from('users')
    .select('role, teacher_type')
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching user statistics:', error)
    throw new Error(`Failed to fetch user statistics: ${error.message}`)
  }

  const stats = {
    total: data.length,
    byRole: {
      admin: 0,
      head: 0,
      teacher: 0,
      student: 0
    },
    byTeacherType: {
      LT: 0,
      IT: 0,
      KCFS: 0
    }
  }

  data.forEach(user => {
    stats.byRole[user.role as keyof typeof stats.byRole] += 1
    if (user.teacher_type === 'LT' || user.teacher_type === 'IT' || user.teacher_type === 'KCFS') {
      stats.byTeacherType[user.teacher_type as 'LT' | 'IT' | 'KCFS'] += 1
    }
  })

  return stats
}

// Helper function to check if a grade falls within a grade band
function gradeInBand(grade: number, gradeBand: string): boolean {
  if (gradeBand.includes('-')) {
    const parts = gradeBand.split('-').map(Number)
    const start = parts[0] ?? 1
    const end = parts[1] ?? start
    return grade >= start && grade <= end
  }
  return grade === parseInt(gradeBand)
}

// Check if user has permission for specific grade and course type (new grade band system)
export async function checkUserPermissionByGradeBand(
  userId: string,
  requiredGrade?: number,
  requiredCourseType?: TeacherType
): Promise<boolean> {
  const user = await getUser(userId) as User & { grade_band?: string | null }

  // Admin has all permissions
  if (user.role === 'admin') {
    return true
  }

  // Office member has read-only access to all
  if (user.role === 'office_member') {
    return true
  }

  // Head teachers can only access their assigned grade band and course type
  if (user.role === 'head') {
    if (requiredGrade && user.grade_band) {
      if (!gradeInBand(requiredGrade, user.grade_band)) {
        return false
      }
    }
    if (requiredCourseType && user.track !== requiredCourseType) {
      return false
    }
    return true
  }

  // Teachers have limited permissions (to be refined based on class assignments)
  if (user.role === 'teacher') {
    // For now, allow teachers to access based on their teacher_type
    if (requiredCourseType && user.teacher_type !== requiredCourseType) {
      return false
    }
    return true
  }

  return false
}

// Extended teacher type with course assignments for browse page
export type TeacherWithCourses = User & {
  course_count: number
  assigned_classes: string[]  // Class names
}

/**
 * Get teachers with their course assignments for Browse page
 *
 * Permission: Admin/Office/Head only
 */
export async function getTeachersWithCourses(options?: {
  teacherType?: TeacherType
  search?: string
  academicYear?: string
}): Promise<TeacherWithCourses[]> {
  await requireRole(['admin', 'office_member', 'head'])

  // Build query for teachers (role = 'teacher' or 'head')
  let query = supabase
    .from('users')
    .select('*')
    .in('role', ['teacher', 'head'])
    .eq('is_active', true)
    .order('full_name')

  // Apply teacher type filter
  if (options?.teacherType) {
    query = query.eq('teacher_type', options.teacherType)
  }

  // Apply search filter
  if (options?.search) {
    query = query.or(`full_name.ilike.%${options.search}%,email.ilike.%${options.search}%`)
  }

  const { data: teachers, error: teacherError } = await query

  if (teacherError) {
    console.error('Error fetching teachers:', teacherError)
    throw new Error(`Failed to fetch teachers: ${teacherError.message}`)
  }

  if (!teachers || teachers.length === 0) {
    return []
  }

  // Get course assignments for all teachers
  const teacherIds = teachers.map(t => t.id)
  let coursesQuery = supabase
    .from('courses')
    .select(`
      teacher_id,
      classes:class_id (
        name
      )
    `)
    .in('teacher_id', teacherIds)
    .eq('is_active', true)

  // Apply academic year filter if provided
  if (options?.academicYear) {
    coursesQuery = coursesQuery.eq('academic_year', options.academicYear)
  }

  const { data: courses, error: courseError } = await coursesQuery

  if (courseError) {
    console.error('Error fetching courses:', courseError)
  }

  // Create course count and class name map by teacher_id
  const courseCountMap: Record<string, number> = {}
  const classNamesMap: Record<string, Set<string>> = {}

  courses?.forEach(course => {
    if (course.teacher_id) {
      courseCountMap[course.teacher_id] = (courseCountMap[course.teacher_id] || 0) + 1
      if (!classNamesMap[course.teacher_id]) {
        classNamesMap[course.teacher_id] = new Set()
      }
      // Handle the joined classes data - Supabase returns object for single FK join
      const classesData = course.classes
      let className: string | undefined
      if (classesData && typeof classesData === 'object' && !Array.isArray(classesData)) {
        className = (classesData as { name: string }).name
      }
      if (className) {
        const teacherSet = classNamesMap[course.teacher_id]
        if (teacherSet) {
          teacherSet.add(className)
        }
      }
    }
  })

  // Combine all data
  const result: TeacherWithCourses[] = teachers.map(teacher => {
    const teacherClasses = classNamesMap[teacher.id]
    return {
      ...teacher,
      course_count: courseCountMap[teacher.id] || 0,
      assigned_classes: teacherClasses ? Array.from(teacherClasses).sort() : []
    }
  })

  return result
}

/**
 * Get teacher type statistics
 *
 * Permission: Admin/Office only
 */
export async function getTeacherTypeStatistics(): Promise<{
  total: number
  lt: number
  it: number
  kcfs: number
  head: number
}> {
  await requireRole(['admin', 'office_member'])

  const { data, error } = await supabase
    .from('users')
    .select('role, teacher_type')
    .in('role', ['teacher', 'head'])
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching teacher statistics:', error)
    throw new Error(`Failed to fetch teacher statistics: ${error.message}`)
  }

  const stats = {
    total: data.length,
    lt: 0,
    it: 0,
    kcfs: 0,
    head: 0
  }

  data.forEach(user => {
    if (user.role === 'head') {
      stats.head++
    } else if (user.teacher_type === 'LT') {
      stats.lt++
    } else if (user.teacher_type === 'IT') {
      stats.it++
    } else if (user.teacher_type === 'KCFS') {
      stats.kcfs++
    }
  })

  return stats
}

/**
 * Get available teachers for class assignment
 *
 * Permission: Admin only (for assigning teachers to courses)
 */
export async function getAvailableTeachers(grade?: number, track?: TrackType) {
  await requireRole(['admin'])

  let query = supabase
    .from('users')
    .select('*')
    .eq('role', 'teacher')
    .eq('is_active', true)

  // Filter by teacher type based on track if provided
  if (track) {
    const teacherType = track === 'local' ? 'LT' : 'IT'
    query = query.eq('teacher_type', teacherType)
  }

  const { data, error } = await query.order('full_name')

  if (error) {
    console.error('Error fetching available teachers:', error)
    throw new Error(`Failed to fetch available teachers: ${error.message}`)
  }

  return data
}