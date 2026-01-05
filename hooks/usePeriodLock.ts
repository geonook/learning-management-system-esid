"use client";

/**
 * usePeriodLock Hook
 *
 * Client-side hook for checking academic period lock status.
 * Used by UI components to show lock status and disable editing.
 */

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  PeriodLockInfo,
  PeriodStatus,
  AcademicPeriodRow,
} from "@/types/academic-period";
import {
  toAcademicPeriod,
  getDaysUntilLock,
  PERIOD_STATUS_NAMES,
  isEditableStatus,
} from "@/types/academic-period";

interface UsePeriodLockParams {
  academicYear: string;
  term?: number;
  semester?: number;
}

interface UsePeriodLockResult {
  lockInfo: PeriodLockInfo;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to check period lock status
 */
export function usePeriodLock(
  params: UsePeriodLockParams
): UsePeriodLockResult {
  const { academicYear, term, semester } = params;

  const [lockInfo, setLockInfo] = useState<PeriodLockInfo>({
    isEditable: true,
    status: "active",
    lockDeadline: null,
    daysUntilLock: null,
    lockedAt: null,
    lockedBy: null,
    message: "Loading...",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLockStatus = useCallback(async () => {
    if (!academicYear) {
      setLockInfo({
        isEditable: true,
        status: "active",
        lockDeadline: null,
        daysUntilLock: null,
        lockedAt: null,
        lockedBy: null,
        message: "Editable",
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Determine target semester
      const targetSemester = semester || (term ? (term <= 2 ? 1 : 2) : null);

      // Fetch all periods for this academic year
      const { data: periods, error: fetchError } = await supabase
        .from("academic_periods")
        .select("*")
        .eq("academic_year", academicYear);

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (!periods || periods.length === 0) {
        // No period records = editable by default
        setLockInfo({
          isEditable: true,
          status: "active",
          lockDeadline: null,
          daysUntilLock: null,
          lockedAt: null,
          lockedBy: null,
          message: "Editable",
        });
        setIsLoading(false);
        return;
      }

      // Build period map
      const periodMap = new Map<string, ReturnType<typeof toAcademicPeriod>>();
      for (const row of periods) {
        const p = toAcademicPeriod(row as AcademicPeriodRow);
        const key = `${p.periodType}-${p.semester || ""}-${p.term || ""}`;
        periodMap.set(key, p);
      }

      // Check hierarchy: Year -> Semester -> Term
      // Year level
      const yearPeriod = periodMap.get("year--");
      if (yearPeriod && !isEditableStatus(yearPeriod.status)) {
        setLockInfo(buildLockInfo(yearPeriod, "Year"));
        setIsLoading(false);
        return;
      }

      // Semester level
      if (targetSemester) {
        const semesterPeriod = periodMap.get(`semester-${targetSemester}-`);
        if (semesterPeriod && !isEditableStatus(semesterPeriod.status)) {
          setLockInfo(buildLockInfo(semesterPeriod, "Semester"));
          setIsLoading(false);
          return;
        }
      }

      // Term level
      if (term) {
        const termPeriod = periodMap.get(`term-${targetSemester}-${term}`);
        if (termPeriod) {
          setLockInfo(buildLockInfo(termPeriod));
          setIsLoading(false);
          return;
        }
      }

      // Default: editable
      setLockInfo({
        isEditable: true,
        status: "active",
        lockDeadline: null,
        daysUntilLock: null,
        lockedAt: null,
        lockedBy: null,
        message: "Editable",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load lock status";
      setError(message);
      // On error, default to editable to not block users
      setLockInfo({
        isEditable: true,
        status: "active",
        lockDeadline: null,
        daysUntilLock: null,
        lockedAt: null,
        lockedBy: null,
        message: "Editable",
      });
    } finally {
      setIsLoading(false);
    }
  }, [academicYear, term, semester]);

  useEffect(() => {
    fetchLockStatus();
  }, [fetchLockStatus]);

  return {
    lockInfo,
    isLoading,
    error,
    refetch: fetchLockStatus,
  };
}

/**
 * Build PeriodLockInfo from period data
 */
function buildLockInfo(
  period: ReturnType<typeof toAcademicPeriod>,
  levelName?: string
): PeriodLockInfo {
  const isEditable = isEditableStatus(period.status);
  const daysUntil = getDaysUntilLock(period.lockDeadline);

  let message = PERIOD_STATUS_NAMES[period.status];
  if (levelName && !isEditable) {
    message = `${levelName}${message}`;
  }
  if (period.status === "closing" && daysUntil !== null) {
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
 * Hook to get all closing periods (for dashboard warning)
 */
export function useClosingPeriods() {
  const [closingPeriods, setClosingPeriods] = useState<
    Array<{
      id: string;
      academicYear: string;
      term: number | null;
      semester: number | null;
      daysUntilLock: number;
      lockDeadline: string;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchClosingPeriods() {
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from("academic_periods")
          .select("*")
          .eq("status", "closing")
          .not("lock_deadline", "is", null)
          .order("lock_deadline", { ascending: true });

        if (error || !data) {
          setClosingPeriods([]);
          return;
        }

        const result = data
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
          .filter(
            (p): p is NonNullable<typeof p> => p !== null
          );

        setClosingPeriods(result);
      } catch {
        setClosingPeriods([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchClosingPeriods();
  }, []);

  return { closingPeriods, isLoading };
}

// ============================================================
// Client-side Period Lock Check (for client-side API functions)
// ============================================================

/**
 * Get period lock info (client-side, non-hook version)
 * Use this in client-side API functions
 */
export async function getPeriodLockInfoClient(params: {
  academicYear: string;
  term?: number;
  semester?: number;
}): Promise<PeriodLockInfo> {
  const { academicYear, term, semester } = params;
  const supabase = createClient();

  const defaultInfo: PeriodLockInfo = {
    isEditable: true,
    status: "active",
    lockDeadline: null,
    daysUntilLock: null,
    lockedAt: null,
    lockedBy: null,
    message: "Editable",
  };

  if (!academicYear) {
    return defaultInfo;
  }

  try {
    const targetSemester = semester || (term ? (term <= 2 ? 1 : 2) : null);

    const { data: periods, error } = await supabase
      .from("academic_periods")
      .select("*")
      .eq("academic_year", academicYear);

    if (error || !periods || periods.length === 0) {
      return defaultInfo;
    }

    const periodMap = new Map<string, ReturnType<typeof toAcademicPeriod>>();
    for (const row of periods) {
      const p = toAcademicPeriod(row as AcademicPeriodRow);
      const key = `${p.periodType}-${p.semester || ""}-${p.term || ""}`;
      periodMap.set(key, p);
    }

    // Check hierarchy: Year -> Semester -> Term
    const yearPeriod = periodMap.get("year--");
    if (yearPeriod && !isEditableStatus(yearPeriod.status)) {
      return buildLockInfo(yearPeriod, "Year");
    }

    if (targetSemester) {
      const semesterPeriod = periodMap.get(`semester-${targetSemester}-`);
      if (semesterPeriod && !isEditableStatus(semesterPeriod.status)) {
        return buildLockInfo(semesterPeriod, "Semester");
      }
    }

    if (term) {
      const termPeriod = periodMap.get(`term-${targetSemester}-${term}`);
      if (termPeriod) {
        return buildLockInfo(termPeriod);
      }
    }

    return defaultInfo;
  } catch {
    return defaultInfo;
  }
}

/**
 * Assert that a period is editable (client-side version)
 * Throws an error if not editable - use in client-side mutation functions
 */
export async function assertPeriodEditableClient(params: {
  academicYear: string;
  term: number;
}): Promise<void> {
  const lockInfo = await getPeriodLockInfoClient(params);

  if (!lockInfo.isEditable) {
    const termName = `Term ${params.term}`;
    throw new Error(
      `Cannot edit: ${params.academicYear} ${termName} is ${lockInfo.message}`
    );
  }
}

/**
 * Get term number from date
 * Used for attendance and communications
 */
export function getTermFromDate(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const month = d.getMonth() + 1; // 1-12

  // Fall Semester (Sep-Jan)
  if (month >= 9 || month <= 1) {
    // Term 1 = Sep-Nov (Fall Midterm)
    // Term 2 = Dec-Jan (Fall Final)
    return month >= 9 && month <= 11 ? 1 : 2;
  }

  // Spring Semester (Feb-Jun)
  // Term 3 = Feb-Apr (Spring Midterm)
  // Term 4 = May-Jun (Spring Final)
  return month <= 4 ? 3 : 4;
}

/**
 * Get academic year from date
 * Academic year runs from Aug to Jul
 * e.g., Aug 2025 - Jul 2026 = "2025-2026"
 *
 * Note: This is a synchronous fallback. For production use,
 * prefer getAcademicYearForDate() from lib/api/academic-year-config.ts
 * which reads from database configuration.
 */
export function getAcademicYearFromDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12

  // Aug-Dec = current year is start year
  // Jan-Jul = previous year is start year
  const startYear = month >= 8 ? year : year - 1;
  const endYear = startYear + 1;

  return `${startYear}-${endYear}`;
}
