/**
 * Academic Period Management Module
 * 學年週期管理核心模組
 *
 * This module provides functions for:
 * 1. Checking period editability (used by mutations)
 * 2. Querying period status
 * 3. Getting periods for UI display
 *
 * Hierarchy Logic:
 * - Year locked → All Semesters and Terms are locked
 * - Semester locked → All Terms in that semester are locked
 * - Term locked → Only that Term is locked
 */

import { createClient } from '@/lib/supabase/server';
import type {
  AcademicPeriod,
  AcademicPeriodRow,
  PeriodLockInfo,
  PeriodStatus,
  ClosingPeriodInfo,
} from '@/types/academic-period';
import {
  toAcademicPeriod,
  getDaysUntilLock,
  PERIOD_STATUS_NAMES,
  isEditableStatus,
} from '@/types/academic-period';

// ============================================================
// Period Editability Check
// ============================================================

/**
 * Check if a period is editable
 * This is the main function used by mutations to enforce locking
 *
 * @param academicYear - The academic year (e.g., '2025-2026')
 * @param term - The term number (1-4)
 * @returns Promise<PeriodLockInfo>
 */
export async function getPeriodLockInfo(params: {
  academicYear: string;
  term?: number;
  semester?: number;
}): Promise<PeriodLockInfo> {
  const { academicYear, term, semester } = params;
  const supabase = await createClient();

  // Default response (editable)
  const defaultInfo: PeriodLockInfo = {
    isEditable: true,
    status: 'active',
    lockDeadline: null,
    daysUntilLock: null,
    lockedAt: null,
    lockedBy: null,
    message: '可以編輯',
  };

  // If no term specified, check semester or year level
  if (!term && !semester) {
    // Check year level only
    const { data: yearPeriod } = await supabase
      .from('academic_periods')
      .select('*')
      .eq('academic_year', academicYear)
      .eq('period_type', 'year')
      .single();

    if (yearPeriod) {
      const period = toAcademicPeriod(yearPeriod as AcademicPeriodRow);
      return buildLockInfo(period);
    }

    return defaultInfo;
  }

  // Determine which semester to check
  const targetSemester = semester || (term ? (term <= 2 ? 1 : 2) : null);

  // Check hierarchy: Year -> Semester -> Term
  const { data: periods } = await supabase
    .from('academic_periods')
    .select('*')
    .eq('academic_year', academicYear)
    .order('period_type', { ascending: true }); // year, semester, term

  if (!periods || periods.length === 0) {
    return defaultInfo;
  }

  const periodMap = new Map<string, AcademicPeriod>();
  for (const row of periods) {
    const p = toAcademicPeriod(row as AcademicPeriodRow);
    const key = `${p.periodType}-${p.semester || ''}-${p.term || ''}`;
    periodMap.set(key, p);
  }

  // Check Year level
  const yearPeriod = periodMap.get('year--');
  if (yearPeriod && !isEditableStatus(yearPeriod.status)) {
    return buildLockInfo(yearPeriod, '學年');
  }

  // Check Semester level
  if (targetSemester) {
    const semesterPeriod = periodMap.get(`semester-${targetSemester}-`);
    if (semesterPeriod && !isEditableStatus(semesterPeriod.status)) {
      return buildLockInfo(semesterPeriod, '學期');
    }
  }

  // Check Term level
  if (term) {
    const termPeriod = periodMap.get(`term-${targetSemester}-${term}`);
    if (termPeriod) {
      return buildLockInfo(termPeriod);
    }
  }

  return defaultInfo;
}

/**
 * Build PeriodLockInfo from AcademicPeriod
 */
function buildLockInfo(
  period: AcademicPeriod,
  levelName?: string
): PeriodLockInfo {
  const isEditable = isEditableStatus(period.status);
  const daysUntil = getDaysUntilLock(period.lockDeadline);

  let message = PERIOD_STATUS_NAMES[period.status];
  if (levelName && !isEditable) {
    message = `${levelName}${message}`;
  }
  if (period.status === 'closing' && daysUntil !== null) {
    message = `${daysUntil} 天後截止`;
  }

  return {
    isEditable,
    status: period.status,
    lockDeadline: period.lockDeadline,
    daysUntilLock: daysUntil,
    lockedAt: period.statusChangedAt,
    lockedBy: period.statusChangedBy,
    message,
  };
}

/**
 * Assert that a period is editable
 * Throws an error if not editable - use in mutations
 *
 * @param academicYear - The academic year
 * @param term - The term number
 * @throws Error if period is not editable
 */
export async function assertPeriodEditable(params: {
  academicYear: string;
  term: number;
}): Promise<void> {
  const lockInfo = await getPeriodLockInfo(params);

  if (!lockInfo.isEditable) {
    const termName = `Term ${params.term}`;
    throw new Error(
      `無法編輯: ${params.academicYear} ${termName} ${lockInfo.message}`
    );
  }
}

// ============================================================
// Period Queries
// ============================================================

/**
 * Get all periods for an academic year
 *
 * @param academicYear - The academic year
 * @returns Promise<AcademicPeriod[]>
 */
export async function getAcademicYearPeriods(
  academicYear: string
): Promise<AcademicPeriod[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('academic_periods')
    .select('*')
    .eq('academic_year', academicYear)
    .order('period_type', { ascending: true })
    .order('semester', { ascending: true, nullsFirst: true })
    .order('term', { ascending: true, nullsFirst: true });

  if (error) {
    console.error('Failed to fetch academic year periods:', error);
    return [];
  }

  return (data || []).map((row) => toAcademicPeriod(row as AcademicPeriodRow));
}

/**
 * Get all academic years with their periods
 *
 * @returns Promise<Map<string, AcademicPeriod[]>>
 */
export async function getAllAcademicYearPeriods(): Promise<
  Map<string, AcademicPeriod[]>
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('academic_periods')
    .select('*')
    .order('academic_year', { ascending: false })
    .order('period_type', { ascending: true })
    .order('semester', { ascending: true, nullsFirst: true })
    .order('term', { ascending: true, nullsFirst: true });

  if (error) {
    console.error('Failed to fetch all periods:', error);
    return new Map();
  }

  const result = new Map<string, AcademicPeriod[]>();
  for (const row of data || []) {
    const period = toAcademicPeriod(row as AcademicPeriodRow);
    const existing = result.get(period.academicYear) || [];
    existing.push(period);
    result.set(period.academicYear, existing);
  }

  return result;
}

/**
 * Get a specific period by ID
 */
export async function getPeriodById(
  periodId: string
): Promise<AcademicPeriod | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('academic_periods')
    .select('*')
    .eq('id', periodId)
    .single();

  if (error || !data) {
    return null;
  }

  return toAcademicPeriod(data as AcademicPeriodRow);
}

/**
 * Get periods that are in 'closing' status (for dashboard warning)
 *
 * @returns Promise<ClosingPeriodInfo[]>
 */
export async function getClosingPeriods(): Promise<ClosingPeriodInfo[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('academic_periods')
    .select('*')
    .eq('status', 'closing')
    .not('lock_deadline', 'is', null)
    .order('lock_deadline', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data
    .map((row) => {
      const period = toAcademicPeriod(row as AcademicPeriodRow);
      const daysUntil = getDaysUntilLock(period.lockDeadline);

      if (daysUntil === null || period.lockDeadline === null) {
        return null;
      }

      return {
        id: period.id,
        academicYear: period.academicYear,
        term: period.term,
        semester: period.semester,
        daysUntilLock: daysUntil,
        lockDeadline: period.lockDeadline,
      };
    })
    .filter((p): p is ClosingPeriodInfo => p !== null);
}

/**
 * Get periods approaching deadline (within warning days)
 * Used for auto-updating status to 'closing'
 */
export async function getPeriodsApproachingDeadline(): Promise<
  AcademicPeriod[]
> {
  const supabase = await createClient();

  // Get periods where:
  // - status is 'active'
  // - auto_lock_enabled is true
  // - lock_deadline is within warning_days
  const { data, error } = await supabase
    .from('academic_periods')
    .select('*')
    .eq('status', 'active')
    .eq('auto_lock_enabled', true)
    .not('lock_deadline', 'is', null);

  if (error || !data) {
    return [];
  }

  const now = new Date();

  return data
    .map((row) => toAcademicPeriod(row as AcademicPeriodRow))
    .filter((period) => {
      if (!period.lockDeadline) return false;

      const deadline = new Date(period.lockDeadline);
      const warningDate = new Date(deadline);
      warningDate.setDate(warningDate.getDate() - period.warningDays);

      return now >= warningDate && now < deadline;
    });
}

/**
 * Get periods past deadline (need auto-lock)
 */
export async function getPeriodsPastDeadline(): Promise<AcademicPeriod[]> {
  const supabase = await createClient();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('academic_periods')
    .select('*')
    .eq('auto_lock_enabled', true)
    .in('status', ['active', 'closing'])
    .lt('lock_deadline', now);

  if (error || !data) {
    return [];
  }

  return data.map((row) => toAcademicPeriod(row as AcademicPeriodRow));
}

// ============================================================
// Period Status Updates (Internal - called by Server Actions)
// ============================================================

/**
 * Update period status (internal use)
 * Server actions should use this for actual updates
 */
export async function updatePeriodStatus(
  periodId: string,
  newStatus: PeriodStatus,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('academic_periods')
    .update({
      status: newStatus,
      status_changed_by: userId,
      // Note: status_changed_at is set by trigger
    })
    .eq('id', periodId);

  if (error) {
    console.error('Failed to update period status:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update period deadline
 */
export async function updatePeriodDeadline(
  periodId: string,
  deadline: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('academic_periods')
    .update({
      lock_deadline: deadline,
    })
    .eq('id', periodId);

  if (error) {
    console.error('Failed to update period deadline:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Toggle auto-lock for a period
 */
export async function updateAutoLockEnabled(
  periodId: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('academic_periods')
    .update({
      auto_lock_enabled: enabled,
    })
    .eq('id', periodId);

  if (error) {
    console.error('Failed to toggle auto-lock:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
