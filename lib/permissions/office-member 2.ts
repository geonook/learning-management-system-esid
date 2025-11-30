/**
 * Office Member Permission System
 * Application-layer permission checks for office_member role
 *
 * @version 1.0.0
 * @date 2025-11-19
 *
 * Background:
 * Migration 017 (RLS policies for office_member) was rolled back due to recursion issues.
 * This module provides application-layer permission checks as a safer alternative.
 *
 * Permission Model:
 * - office_member has READ-ONLY access to all grades and tracks
 * - Cannot create, update, or delete any data
 * - Cannot access user management or system settings
 */

import { getUserProfile, UserRole } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'

/**
 * Check if current user is office_member or admin
 * @returns true if user has office_member or admin role
 */
export async function isOfficeMemberOrAdmin(): Promise<boolean> {
  const profile = await getUserProfile()
  if (!profile) return false
  return profile.role === 'office_member' || profile.role === 'admin'
}

/**
 * Check if current user has read-only access to all data
 * office_member can view all classes, courses, students, exams, and scores
 * @returns true if user has office_member or admin role
 */
export async function hasReadOnlyAccess(): Promise<boolean> {
  return isOfficeMemberOrAdmin()
}

/**
 * Check if current user can modify data (create, update, delete)
 * office_member CANNOT modify any data
 * @returns true if user is NOT office_member (but is admin, head, or teacher)
 */
export async function canModifyData(): Promise<boolean> {
  const profile = await getUserProfile()
  if (!profile) return false

  // office_member cannot modify data
  if (profile.role === 'office_member') return false

  // admin, head, teacher can modify data
  return ['admin', 'head', 'teacher'].includes(profile.role)
}

/**
 * Check if current user can access specific resource
 * @param resourceType - Type of resource (class, course, student, exam, score)
 * @param resourceId - ID of the resource
 * @returns true if user has permission to access
 */
export async function canAccessResource(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resourceType: 'class' | 'course' | 'student' | 'exam' | 'score',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resourceId: string
): Promise<boolean> {
  const profile = await getUserProfile()
  if (!profile) return false

  // Admin can access everything
  if (profile.role === 'admin') return true

  // office_member can read everything
  if (profile.role === 'office_member') return true

  // For other roles, use existing RLS policies
  // This function is primarily for office_member read access
  return true // RLS policies will handle granular checks
}

/**
 * Validate office_member permissions for API routes
 * Throws error if user tries to modify data without permission
 * @param operation - Operation type (read, create, update, delete)
 */
export async function validateOfficeMemberPermission(
  operation: 'read' | 'create' | 'update' | 'delete'
): Promise<void> {
  const profile = await getUserProfile()

  if (!profile) {
    throw new Error('Unauthorized: No user profile found')
  }

  // Read operations: office_member, admin, head, teacher allowed
  if (operation === 'read') {
    const allowedRoles: UserRole[] = ['admin', 'office_member', 'head', 'teacher']
    if (!allowedRoles.includes(profile.role)) {
      throw new Error('Forbidden: Insufficient permissions for read operation')
    }
    return
  }

  // Create/Update/Delete operations: office_member NOT allowed
  if (['create', 'update', 'delete'].includes(operation)) {
    if (profile.role === 'office_member') {
      throw new Error('Forbidden: office_member role has read-only access')
    }

    const allowedRoles: UserRole[] = ['admin', 'head', 'teacher']
    if (!allowedRoles.includes(profile.role)) {
      throw new Error('Forbidden: Insufficient permissions for write operation')
    }
    return
  }
}

/**
 * Get filtered query based on user role
 * For office_member: no filtering (can see all data)
 * For other roles: apply role-based filtering
 *
 * @returns Supabase client with appropriate filtering
 */
export async function getFilteredQuery() {
  const supabase = createClient()
  const profile = await getUserProfile()

  if (!profile) {
    throw new Error('Unauthorized: No user profile found')
  }

  // Return client - RLS policies will handle filtering for non-office_member roles
  // office_member bypasses RLS for read operations (application-layer check)
  return { supabase, profile }
}

/**
 * Office member feature flags
 * Determine what UI features should be visible to office_member
 */
export interface OfficeMemberFeatures {
  canViewClasses: boolean
  canViewCourses: boolean
  canViewStudents: boolean
  canViewExams: boolean
  canViewScores: boolean
  canViewReports: boolean
  canCreateClass: boolean
  canEditClass: boolean
  canDeleteClass: boolean
  canCreateCourse: boolean
  canEditCourse: boolean
  canDeleteCourse: boolean
  canCreateStudent: boolean
  canEditStudent: boolean
  canDeleteStudent: boolean
  canCreateExam: boolean
  canEditExam: boolean
  canDeleteExam: boolean
  canEnterScores: boolean
  canEditScores: boolean
  canDeleteScores: boolean
}

/**
 * Get feature flags for office_member role
 * @returns Feature flags object
 */
export async function getOfficeMemberFeatures(): Promise<OfficeMemberFeatures> {
  const profile = await getUserProfile()

  if (!profile) {
    // No user - all features disabled
    return {
      canViewClasses: false,
      canViewCourses: false,
      canViewStudents: false,
      canViewExams: false,
      canViewScores: false,
      canViewReports: false,
      canCreateClass: false,
      canEditClass: false,
      canDeleteClass: false,
      canCreateCourse: false,
      canEditCourse: false,
      canDeleteCourse: false,
      canCreateStudent: false,
      canEditStudent: false,
      canDeleteStudent: false,
      canCreateExam: false,
      canEditExam: false,
      canDeleteExam: false,
      canEnterScores: false,
      canEditScores: false,
      canDeleteScores: false,
    }
  }

  // Admin has all permissions
  if (profile.role === 'admin') {
    return {
      canViewClasses: true,
      canViewCourses: true,
      canViewStudents: true,
      canViewExams: true,
      canViewScores: true,
      canViewReports: true,
      canCreateClass: true,
      canEditClass: true,
      canDeleteClass: true,
      canCreateCourse: true,
      canEditCourse: true,
      canDeleteCourse: true,
      canCreateStudent: true,
      canEditStudent: true,
      canDeleteStudent: true,
      canCreateExam: true,
      canEditExam: true,
      canDeleteExam: true,
      canEnterScores: true,
      canEditScores: true,
      canDeleteScores: true,
    }
  }

  // office_member: read-only access to all data
  if (profile.role === 'office_member') {
    return {
      canViewClasses: true,
      canViewCourses: true,
      canViewStudents: true,
      canViewExams: true,
      canViewScores: true,
      canViewReports: true,
      canCreateClass: false,
      canEditClass: false,
      canDeleteClass: false,
      canCreateCourse: false,
      canEditCourse: false,
      canDeleteCourse: false,
      canCreateStudent: false,
      canEditStudent: false,
      canDeleteStudent: false,
      canCreateExam: false,
      canEditExam: false,
      canDeleteExam: false,
      canEnterScores: false,
      canEditScores: false,
      canDeleteScores: false,
    }
  }

  // head and teacher: use existing permission logic
  // This is primarily for office_member, so return default for other roles
  return {
    canViewClasses: true,
    canViewCourses: true,
    canViewStudents: true,
    canViewExams: true,
    canViewScores: true,
    canViewReports: true,
    canCreateClass: true,
    canEditClass: true,
    canDeleteClass: true,
    canCreateCourse: true,
    canEditCourse: true,
    canDeleteCourse: true,
    canCreateStudent: true,
    canEditStudent: true,
    canDeleteStudent: true,
    canCreateExam: true,
    canEditExam: true,
    canDeleteExam: true,
    canEnterScores: true,
    canEditScores: true,
    canDeleteScores: true,
  }
}
