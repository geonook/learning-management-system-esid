/**
 * ⚠️ LEGACY WARNING: This file uses track-based filtering
 * For course-based teacher queries in grade entry, use course APIs from /lib/api/scores.ts
 * This API is maintained for general user management features only
 */

import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/database'

export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type UserRole = 'admin' | 'head' | 'teacher' | 'student'
export type TeacherType = 'LT' | 'IT' | 'KCFS'
export type TrackType = 'local' | 'international'

// Get all users
export async function getUsers() {
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

// Get users by role
export async function getUsersByRole(role: UserRole) {
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

// Get teachers by type
export async function getTeachersByType(teacherType: TeacherType) {
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

// Get heads by grade and track
export async function getHeadsByGradeTrack(grade: number, track: TrackType) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'head')
    .eq('grade', grade)
    .eq('track', track)
    .eq('is_active', true)
    .order('full_name')

  if (error) {
    console.error('Error fetching heads by grade/track:', error)
    throw new Error(`Failed to fetch heads: ${error.message}`)
  }

  return data
}

// Get single user by ID
export async function getUser(id: string) {
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

// Get user by email
export async function getUserByEmail(email: string) {
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

// Create new user (this would normally be handled by Supabase Auth)
export async function createUser(userData: UserInsert) {
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

// Update user
export async function updateUser(id: string, updates: UserUpdate) {
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

// Soft delete user (mark as inactive)
export async function deleteUser(id: string) {
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

// Get user statistics
export async function getUserStatistics() {
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

// Check if user has permission for specific grade/track
export async function checkUserPermission(
  userId: string,
  requiredGrade?: number,
  requiredTrack?: TrackType
): Promise<boolean> {
  const user = await getUser(userId)
  
  // Admin has all permissions
  if (user.role === 'admin') {
    return true
  }
  
  // Head teachers can only access their assigned grade and track
  if (user.role === 'head') {
    if (requiredGrade && user.grade !== requiredGrade) {
      return false
    }
    if (requiredTrack && user.track !== requiredTrack) {
      return false
    }
    return true
  }
  
  // Teachers have limited permissions (to be refined based on class assignments)
  if (user.role === 'teacher') {
    // For now, allow teachers to access based on their teacher_type
    // This should be refined to check actual class assignments
    return true
  }
  
  return false
}

// Extended teacher type with course assignments for browse page
export type TeacherWithCourses = User & {
  course_count: number
  assigned_classes: string[]  // Class names
}

// Get teachers with their course assignments for Browse page
export async function getTeachersWithCourses(options?: {
  teacherType?: TeacherType
  search?: string
}): Promise<TeacherWithCourses[]> {
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
  const { data: courses, error: courseError } = await supabase
    .from('courses')
    .select(`
      teacher_id,
      classes:class_id (
        name
      )
    `)
    .in('teacher_id', teacherIds)
    .eq('is_active', true)

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

// Get teacher type statistics
export async function getTeacherTypeStatistics(): Promise<{
  total: number
  lt: number
  it: number
  kcfs: number
  head: number
}> {
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

// Get available teachers for class assignment
export async function getAvailableTeachers(grade?: number, track?: TrackType) {
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