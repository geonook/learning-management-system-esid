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
    message: "載入中...",
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
        message: "可以編輯",
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
          message: "可以編輯",
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
        setLockInfo(buildLockInfo(yearPeriod, "學年"));
        setIsLoading(false);
        return;
      }

      // Semester level
      if (targetSemester) {
        const semesterPeriod = periodMap.get(`semester-${targetSemester}-`);
        if (semesterPeriod && !isEditableStatus(semesterPeriod.status)) {
          setLockInfo(buildLockInfo(semesterPeriod, "學期"));
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
        message: "可以編輯",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "無法取得鎖定狀態";
      setError(message);
      // On error, default to editable to not block users
      setLockInfo({
        isEditable: true,
        status: "active",
        lockDeadline: null,
        daysUntilLock: null,
        lockedAt: null,
        lockedBy: null,
        message: "可以編輯",
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
