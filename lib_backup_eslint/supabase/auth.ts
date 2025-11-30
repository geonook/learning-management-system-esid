import { createClient } from './server'
import { User } from '@supabase/supabase-js'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Database } from '@/types/database'

export type UserRole = 'admin' | 'office_member' | 'head' | 'teacher' | 'student'
export type TeacherType = 'LT' | 'IT' | 'KCFS'
export type TrackType = 'local' | 'international'

export type UserProfile = {
  id: string
  email: string
  full_name: string
  role: UserRole
  teacher_type: TeacherType | null
  grade: number | null
  track: TrackType | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// Get current user session
export async function getUser(): Promise<User | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

// Get current user profile with role information
export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

// Check if user has required role
export async function hasRole(requiredRoles: UserRole[]): Promise<boolean> {
  const profile = await getUserProfile()
  if (!profile) return false
  return requiredRoles.includes(profile.role)
}

// Check if user can access specific grade/track
export async function canAccessGradeTrack(
  grade: number,
  track: TrackType
): Promise<boolean> {
  const profile = await getUserProfile()
  if (!profile) return false

  // Admin can access everything
  if (profile.role === 'admin') return true

  // Office member can view all grades and tracks (read-only)
  // RLS policies enforce read-only access
  if (profile.role === 'office_member') return true

  // Head can access their grade and track
  if (profile.role === 'head') {
    return profile.grade === grade && profile.track === track
  }

  // Teachers can access their assigned classes
  // Access control is enforced by RLS policies at database level
  if (profile.role === 'teacher') {
    return true // RLS policies handle granular permission checks
  }

  return false
}

// Sign out user
export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
}