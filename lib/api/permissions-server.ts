/**
 * Server-side Permission Layer for LMS
 *
 * For use in Server Actions and API Routes that use server-side Supabase client.
 * This is separate from permissions.ts which uses browser client.
 *
 * @module lib/api/permissions-server
 */

import { createClient } from '@/lib/supabase/server'

export type UserRole = 'admin' | 'head' | 'teacher' | 'office_member'

export interface ServerCurrentUser {
  id: string
  role: UserRole
  gradeBand: string | null
  track: string | null
  teacherType: string | null
  fullName: string
}

/**
 * Get current authenticated user from server-side Supabase client
 */
export async function getServerCurrentUser(): Promise<ServerCurrentUser | null> {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, role, grade_band, track, teacher_type, full_name, is_active')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !profile.is_active) {
    return null
  }

  return {
    id: profile.id,
    role: profile.role as UserRole,
    gradeBand: profile.grade_band,
    track: profile.track,
    teacherType: profile.teacher_type,
    fullName: profile.full_name
  }
}

/**
 * Require authenticated user on server side
 */
export async function requireServerAuth(): Promise<ServerCurrentUser> {
  const user = await getServerCurrentUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

/**
 * Require specific role(s) on server side
 */
export async function requireServerRole(allowedRoles: UserRole[]): Promise<ServerCurrentUser> {
  const user = await requireServerAuth()
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Access denied. Required roles: ${allowedRoles.join(', ')}`)
  }
  return user
}
