/**
 * Academic Period Management Types
 * 學年週期管理類型定義
 *
 * This module defines types for the academic period lifecycle management system.
 * Supports hierarchical structure: Year > Semester > Term
 *
 * State Machine:
 * PREPARING -> ACTIVE -> CLOSING -> LOCKED -> ARCHIVED
 */

// ============================================================
// Core Types
// ============================================================

/**
 * Period type in the hierarchy
 * - year: Full academic year (e.g., 2025-2026)
 * - semester: Half year (Semester 1 = Fall, Semester 2 = Spring)
 * - term: Quarter (Term 1-2 = Semester 1, Term 3-4 = Semester 2)
 */
export type PeriodType = 'year' | 'semester' | 'term';

/**
 * Period status in the state machine
 * - preparing: New period being set up (Admin only)
 * - active: Current period, fully editable
 * - closing: Approaching deadline, editable with warnings
 * - locked: Finalized, read-only
 * - archived: Historical, compressed (future feature)
 */
export type PeriodStatus =
  | 'preparing'
  | 'active'
  | 'closing'
  | 'locked'
  | 'archived';

/**
 * Status history entry for audit trail
 */
export interface StatusHistoryEntry {
  from: PeriodStatus;
  to: PeriodStatus;
  at: string;         // ISO timestamp
  by: string | null;  // User ID who made the change
  reason?: string;    // Optional reason for the change
}

// ============================================================
// Database Types
// ============================================================

/**
 * Academic period record from database
 */
export interface AcademicPeriod {
  id: string;
  academicYear: string;       // '2025-2026'
  periodType: PeriodType;
  semester: number | null;    // 1 or 2
  term: number | null;        // 1, 2, 3, or 4

  // Status
  status: PeriodStatus;
  statusChangedAt: string | null;
  statusChangedBy: string | null;

  // Time configuration
  startDate: string | null;
  endDate: string | null;
  lockDeadline: string | null;
  warningDays: number;

  // Auto-lock
  autoLockEnabled: boolean;
  autoLockedAt: string | null;

  // History
  statusHistory: StatusHistoryEntry[];

  // Audit
  createdAt: string;
  updatedAt: string;
}

/**
 * Database row type (snake_case)
 */
export interface AcademicPeriodRow {
  id: string;
  academic_year: string;
  period_type: PeriodType;
  semester: number | null;
  term: number | null;
  status: PeriodStatus;
  status_changed_at: string | null;
  status_changed_by: string | null;
  start_date: string | null;
  end_date: string | null;
  lock_deadline: string | null;
  warning_days: number;
  auto_lock_enabled: boolean;
  auto_locked_at: string | null;
  status_history: StatusHistoryEntry[];
  created_at: string;
  updated_at: string;
}

// ============================================================
// UI Types
// ============================================================

/**
 * Period lock info for UI display
 * Simplified view of period status
 */
export interface PeriodLockInfo {
  isEditable: boolean;
  status: PeriodStatus;
  lockDeadline: string | null;
  daysUntilLock: number | null;  // null if no deadline
  lockedAt: string | null;
  lockedBy: string | null;
  message: string;               // Human-readable status message
}

/**
 * Period tree node for hierarchical display
 */
export interface PeriodTreeNode {
  period: AcademicPeriod;
  children: PeriodTreeNode[];
}

/**
 * Closing period info for dashboard warning
 */
export interface ClosingPeriodInfo {
  id: string;
  academicYear: string;
  term: number | null;
  semester: number | null;
  daysUntilLock: number;
  lockDeadline: string;
}

// ============================================================
// Input Types (for Server Actions)
// ============================================================

/**
 * Input for changing period status
 */
export interface ChangePeriodStatusInput {
  periodId: string;
  newStatus: PeriodStatus;
  reason?: string;
}

/**
 * Input for setting lock deadline
 */
export interface SetDeadlineInput {
  periodId: string;
  deadline: string;  // ISO timestamp
}

/**
 * Input for locking a specific term
 */
export interface LockTermInput {
  academicYear: string;
  term: number;
  reason?: string;
}

/**
 * Input for locking a semester
 */
export interface LockSemesterInput {
  academicYear: string;
  semester: number;
  reason?: string;
}

/**
 * Input for unlocking a period
 */
export interface UnlockPeriodInput {
  periodId: string;
  reason: string;  // Required for audit
}

// ============================================================
// Response Types
// ============================================================

/**
 * Standard action response
 */
export interface PeriodActionResult {
  success: boolean;
  error?: string;
  period?: AcademicPeriod;
}

// ============================================================
// Constants
// ============================================================

/**
 * Status display names
 */
export const PERIOD_STATUS_NAMES: Record<PeriodStatus, string> = {
  preparing: 'Preparing',
  active: 'Active',
  closing: 'Closing',
  locked: 'Locked',
  archived: 'Archived',
};

/**
 * Status colors for UI badges
 */
export const PERIOD_STATUS_COLORS: Record<PeriodStatus, string> = {
  preparing: 'bg-slate-100 text-slate-700',
  active: 'bg-green-100 text-green-700',
  closing: 'bg-amber-100 text-amber-700',
  locked: 'bg-red-100 text-red-700',
  archived: 'bg-gray-100 text-gray-500',
};

/**
 * Period type display names
 */
export const PERIOD_TYPE_NAMES: Record<PeriodType, string> = {
  year: 'Academic Year',
  semester: 'Semester',
  term: 'Term',
};

/**
 * Editable statuses (data can be modified)
 */
export const EDITABLE_STATUSES: PeriodStatus[] = ['active', 'closing'];

/**
 * Locked statuses (data is read-only)
 */
export const LOCKED_STATUSES: PeriodStatus[] = ['locked', 'archived'];

// ============================================================
// Helper Functions
// ============================================================

/**
 * Convert database row to AcademicPeriod
 */
export function toAcademicPeriod(row: AcademicPeriodRow): AcademicPeriod {
  return {
    id: row.id,
    academicYear: row.academic_year,
    periodType: row.period_type,
    semester: row.semester,
    term: row.term,
    status: row.status,
    statusChangedAt: row.status_changed_at,
    statusChangedBy: row.status_changed_by,
    startDate: row.start_date,
    endDate: row.end_date,
    lockDeadline: row.lock_deadline,
    warningDays: row.warning_days,
    autoLockEnabled: row.auto_lock_enabled,
    autoLockedAt: row.auto_locked_at,
    statusHistory: row.status_history || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Check if a status is editable
 */
export function isEditableStatus(status: PeriodStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

/**
 * Check if a status is locked
 */
export function isLockedStatus(status: PeriodStatus): boolean {
  return LOCKED_STATUSES.includes(status);
}

/**
 * Get display name for period
 */
export function getPeriodDisplayName(period: AcademicPeriod): string {
  if (period.periodType === 'year') {
    return `${period.academicYear} Academic Year`;
  }
  if (period.periodType === 'semester') {
    return `${period.academicYear} Semester ${period.semester}`;
  }
  // term
  return `${period.academicYear} Term ${period.term}`;
}

/**
 * Calculate days until lock deadline
 */
export function getDaysUntilLock(deadline: string | null): number | null {
  if (!deadline) return null;

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

/**
 * Get semester from term number
 */
export function getSemesterFromTerm(term: number): number {
  return term <= 2 ? 1 : 2;
}
