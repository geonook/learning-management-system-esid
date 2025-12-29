/**
 * Unified Permission Layer for LMS
 *
 * Architecture (4-Layer Security):
 * 1. Authentication (Supabase Auth) - Must be logged in
 * 2. RLS (Database Layer) - Coarse-grained: authenticated_read, admin_full_access
 * 3. Application Layer (This File) - Fine-grained: role-based filtering
 * 4. Frontend (AuthGuard) - Page access control
 *
 * IMPORTANT: This is the SINGLE SOURCE OF TRUTH for permission logic.
 * All API functions should use this module for permission checks.
 *
 * @module lib/api/permissions
 * @author Claude Code
 * @date 2025-12-29
 */

import { createClient } from '@/lib/supabase/client'

// ============================================================================
// Types
// ============================================================================

export type UserRole = 'admin' | 'head' | 'teacher' | 'office_member'
export type CourseType = 'LT' | 'IT' | 'KCFS'

/**
 * Current authenticated user with permissions
 * This is the canonical user type for permission checks
 */
export interface CurrentUser {
  id: string
  role: UserRole
  gradeBand: string | null  // "1", "2", "3-4", "5-6"
  track: CourseType | null  // Course type for head teachers
  teacherType: CourseType | null  // Course type for teachers
  fullName: string
}

/**
 * Permission check result with reason for debugging
 */
export interface PermissionResult {
  allowed: boolean
  reason: string
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get current authenticated user from Supabase Auth
 * This is the ONLY trusted source for user identity
 *
 * @returns CurrentUser or null if not authenticated
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createClient()

  // Get authenticated user from Supabase Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    console.log('[permissions] No authenticated user')
    return null
  }

  // Fetch user profile from database
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, role, grade_band, track, teacher_type, full_name, is_active')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    console.error('[permissions] Failed to fetch user profile:', profileError)
    return null
  }

  if (!profile.is_active) {
    console.log('[permissions] User is inactive:', user.id)
    return null
  }

  return {
    id: profile.id,
    role: profile.role as UserRole,
    gradeBand: profile.grade_band,
    track: profile.track as CourseType | null,
    teacherType: profile.teacher_type as CourseType | null,
    fullName: profile.full_name
  }
}

/**
 * Require authenticated user - throws if not authenticated
 * Use this at the start of protected API functions
 */
export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

/**
 * Require specific role(s) - throws if not authorized
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<CurrentUser> {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Access denied. Required roles: ${allowedRoles.join(', ')}`)
  }
  return user
}

// ============================================================================
// Grade Band Utilities
// ============================================================================

/**
 * Parse grade band string into array of grades
 * Examples: "1" -> [1], "3-4" -> [3,4], "5-6" -> [5,6], "1-6" -> [1,2,3,4,5,6]
 */
export function parseGradeBand(gradeBand: string): number[] {
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
 * Check if a grade is within a grade band
 */
export function gradeInBand(grade: number, gradeBand: string): boolean {
  const grades = parseGradeBand(gradeBand)
  return grades.includes(grade)
}

// ============================================================================
// Permission Check Functions
// ============================================================================

/**
 * Check if user can access data for a specific grade
 *
 * Rules:
 * - Admin: All grades
 * - Office Member: All grades (read-only)
 * - Head: Only their grade band
 * - Teacher: N/A (teachers access via course, not grade)
 */
export function canAccessGrade(user: CurrentUser, targetGrade: number): PermissionResult {
  switch (user.role) {
    case 'admin':
      return { allowed: true, reason: 'Admin has full access' }

    case 'office_member':
      return { allowed: true, reason: 'Office member has read access to all grades' }

    case 'head':
      if (!user.gradeBand) {
        return { allowed: false, reason: 'Head teacher has no grade band assigned' }
      }
      if (gradeInBand(targetGrade, user.gradeBand)) {
        return { allowed: true, reason: `Head teacher can access grade ${targetGrade} (in band ${user.gradeBand})` }
      }
      return { allowed: false, reason: `Head teacher cannot access grade ${targetGrade} (not in band ${user.gradeBand})` }

    case 'teacher':
      return { allowed: false, reason: 'Teachers should access data via course, not grade' }

    default:
      return { allowed: false, reason: 'Unknown role' }
  }
}

/**
 * Check if user can access data for a specific course type
 *
 * Rules:
 * - Admin: All course types
 * - Office Member: All course types (read-only)
 * - Head: Only their assigned track
 * - Teacher: Only their teacher_type
 */
export function canAccessCourseType(user: CurrentUser, targetType: CourseType): PermissionResult {
  switch (user.role) {
    case 'admin':
      return { allowed: true, reason: 'Admin has full access' }

    case 'office_member':
      return { allowed: true, reason: 'Office member has read access to all course types' }

    case 'head':
      if (!user.track) {
        return { allowed: false, reason: 'Head teacher has no track assigned' }
      }
      if (user.track === targetType) {
        return { allowed: true, reason: `Head teacher can access ${targetType}` }
      }
      return { allowed: false, reason: `Head teacher cannot access ${targetType} (assigned to ${user.track})` }

    case 'teacher':
      if (!user.teacherType) {
        return { allowed: false, reason: 'Teacher has no teacher_type assigned' }
      }
      if (user.teacherType === targetType) {
        return { allowed: true, reason: `Teacher can access ${targetType}` }
      }
      return { allowed: false, reason: `Teacher cannot access ${targetType} (teaches ${user.teacherType})` }

    default:
      return { allowed: false, reason: 'Unknown role' }
  }
}

/**
 * Check if user can write (create/update/delete) data
 *
 * Rules:
 * - Admin: Full write access
 * - Office Member: Read-only (no write)
 * - Head: Can write within their grade band + track
 * - Teacher: Can write for their own courses
 */
export function canWrite(user: CurrentUser): PermissionResult {
  switch (user.role) {
    case 'admin':
      return { allowed: true, reason: 'Admin has full write access' }

    case 'office_member':
      return { allowed: false, reason: 'Office member has read-only access' }

    case 'head':
      return { allowed: true, reason: 'Head teacher can write within their scope' }

    case 'teacher':
      return { allowed: true, reason: 'Teacher can write for their own courses' }

    default:
      return { allowed: false, reason: 'Unknown role' }
  }
}

/**
 * Check if user can access Browse pages
 *
 * Rules:
 * - Admin: Yes
 * - Office Member: Yes
 * - Head: Yes (filtered by grade band)
 * - Teacher: NO
 */
export function canAccessBrowse(user: CurrentUser): PermissionResult {
  switch (user.role) {
    case 'admin':
      return { allowed: true, reason: 'Admin can access browse' }

    case 'office_member':
      return { allowed: true, reason: 'Office member can access browse' }

    case 'head':
      return { allowed: true, reason: 'Head teacher can access browse (filtered)' }

    case 'teacher':
      return { allowed: false, reason: 'Teachers cannot access browse pages' }

    default:
      return { allowed: false, reason: 'Unknown role' }
  }
}

/**
 * Check if user can access Admin pages
 *
 * Rules:
 * - Admin: Yes
 * - All others: No
 */
export function canAccessAdmin(user: CurrentUser): PermissionResult {
  if (user.role === 'admin') {
    return { allowed: true, reason: 'Admin can access admin pages' }
  }
  return { allowed: false, reason: 'Only admin can access admin pages' }
}

// ============================================================================
// Data Filtering Functions
// ============================================================================

/**
 * Filter data array by user permissions
 *
 * @param data - Array of data to filter
 * @param user - Current user
 * @param options - Field names for filtering
 */
export function filterByRole<T>(
  data: T[],
  user: CurrentUser,
  options: {
    gradeField?: keyof T
    courseTypeField?: keyof T
    teacherIdField?: keyof T
  }
): T[] {
  const { gradeField, courseTypeField, teacherIdField } = options

  switch (user.role) {
    case 'admin':
    case 'office_member':
      // Full access - return all data
      return data

    case 'head':
      // Filter by grade band and course type
      return data.filter(item => {
        const record = item as Record<string, unknown>
        // Check grade if field specified
        if (gradeField && user.gradeBand) {
          const grade = record[gradeField as string] as number
          if (typeof grade === 'number' && !gradeInBand(grade, user.gradeBand)) {
            return false
          }
        }
        // Check course type if field specified
        if (courseTypeField && user.track) {
          const courseType = record[courseTypeField as string] as string
          if (courseType !== user.track) {
            return false
          }
        }
        return true
      })

    case 'teacher':
      // Filter by teacher ID
      if (!teacherIdField) {
        // If no teacher ID field, return empty (teachers need course-based access)
        console.warn('[permissions] Teacher filtering requested but no teacherIdField specified')
        return []
      }
      return data.filter(item => {
        const record = item as Record<string, unknown>
        return record[teacherIdField as string] === user.id
      })

    default:
      return []
  }
}

/**
 * Build Supabase query filters based on user permissions
 * Returns filter conditions that should be applied to queries
 */
export function getQueryFilters(user: CurrentUser): {
  gradeFilter?: { grades: number[] }
  courseTypeFilter?: { courseType: CourseType }
  teacherFilter?: { teacherId: string }
} {
  switch (user.role) {
    case 'admin':
    case 'office_member':
      // No additional filters
      return {}

    case 'head':
      const filters: ReturnType<typeof getQueryFilters> = {}
      if (user.gradeBand) {
        filters.gradeFilter = { grades: parseGradeBand(user.gradeBand) }
      }
      if (user.track) {
        filters.courseTypeFilter = { courseType: user.track }
      }
      return filters

    case 'teacher':
      return {
        teacherFilter: { teacherId: user.id }
      }

    default:
      return {}
  }
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate that user can access a specific course
 * Checks both grade and course type permissions
 */
export async function canAccessCourse(
  user: CurrentUser,
  courseId: string
): Promise<PermissionResult> {
  // Admin and office member have full read access
  if (user.role === 'admin') {
    return { allowed: true, reason: 'Admin has full access' }
  }
  if (user.role === 'office_member') {
    return { allowed: true, reason: 'Office member has read access' }
  }

  // Fetch course details
  const supabase = createClient()
  const { data: course, error } = await supabase
    .from('courses')
    .select(`
      id,
      course_type,
      teacher_id,
      classes:class_id (
        grade
      )
    `)
    .eq('id', courseId)
    .single()

  if (error || !course) {
    return { allowed: false, reason: 'Course not found' }
  }

  // Teacher: must be the assigned teacher
  if (user.role === 'teacher') {
    if (course.teacher_id === user.id) {
      return { allowed: true, reason: 'Teacher is assigned to this course' }
    }
    return { allowed: false, reason: 'Teacher is not assigned to this course' }
  }

  // Head: must match grade band and track
  if (user.role === 'head') {
    // Supabase returns object for single FK join, but TS may infer array
    const classData = (Array.isArray(course.classes) ? course.classes[0] : course.classes) as { grade: number } | null | undefined
    const grade = classData?.grade

    // Check grade band
    if (grade && user.gradeBand && !gradeInBand(grade, user.gradeBand)) {
      return { allowed: false, reason: `Course grade ${grade} not in head's band ${user.gradeBand}` }
    }

    // Check course type
    if (user.track && course.course_type !== user.track) {
      return { allowed: false, reason: `Course type ${course.course_type} doesn't match head's track ${user.track}` }
    }

    return { allowed: true, reason: 'Head teacher can access this course' }
  }

  return { allowed: false, reason: 'Unknown role' }
}

/**
 * Validate that user can access a specific class
 */
export async function canAccessClass(
  user: CurrentUser,
  classId: string
): Promise<PermissionResult> {
  // Admin and office member have full read access
  if (user.role === 'admin') {
    return { allowed: true, reason: 'Admin has full access' }
  }
  if (user.role === 'office_member') {
    return { allowed: true, reason: 'Office member has read access' }
  }

  // Fetch class details
  const supabase = createClient()
  const { data: classData, error } = await supabase
    .from('classes')
    .select('id, grade')
    .eq('id', classId)
    .single()

  if (error || !classData) {
    return { allowed: false, reason: 'Class not found' }
  }

  // Head: must match grade band
  if (user.role === 'head') {
    if (user.gradeBand && !gradeInBand(classData.grade, user.gradeBand)) {
      return { allowed: false, reason: `Class grade ${classData.grade} not in head's band ${user.gradeBand}` }
    }
    return { allowed: true, reason: 'Head teacher can access this class' }
  }

  // Teacher: must teach a course in this class
  if (user.role === 'teacher') {
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('class_id', classId)
      .eq('teacher_id', user.id)
      .limit(1)

    if (courses && courses.length > 0) {
      return { allowed: true, reason: 'Teacher teaches a course in this class' }
    }
    return { allowed: false, reason: 'Teacher does not teach in this class' }
  }

  return { allowed: false, reason: 'Unknown role' }
}

// ============================================================================
// Debug/Testing Helpers
// ============================================================================

/**
 * Get a summary of user's permissions (for debugging)
 */
export function getPermissionSummary(user: CurrentUser): string[] {
  const summary: string[] = []

  summary.push(`Role: ${user.role}`)

  switch (user.role) {
    case 'admin':
      summary.push('- Full access to all data')
      summary.push('- Can write to all tables')
      summary.push('- Can access admin pages')
      break

    case 'office_member':
      summary.push('- Read access to all data')
      summary.push('- Cannot write/modify data')
      summary.push('- Can access browse pages')
      break

    case 'head':
      summary.push(`- Grade band: ${user.gradeBand || 'None'}`)
      summary.push(`- Track: ${user.track || 'None'}`)
      if (user.gradeBand) {
        summary.push(`- Can access grades: ${parseGradeBand(user.gradeBand).join(', ')}`)
      }
      summary.push('- Can write within scope')
      summary.push('- Can access browse pages (filtered)')
      break

    case 'teacher':
      summary.push(`- Teacher type: ${user.teacherType || 'None'}`)
      summary.push('- Can only access own courses')
      summary.push('- Cannot access browse pages')
      break
  }

  return summary
}

/**
 * Log permission check result (for debugging)
 */
export function logPermission(
  action: string,
  user: CurrentUser,
  result: PermissionResult
): void {
  const status = result.allowed ? 'ALLOWED' : 'DENIED'
  console.log(`[permissions] ${action}: ${status} - ${result.reason} (user: ${user.fullName}, role: ${user.role})`)
}
