"use server";

/**
 * Academic Period Management Server Actions
 * 學年週期管理 Server Actions
 *
 * All actions are Admin-only unless specified otherwise.
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  AcademicPeriod,
  AcademicPeriodRow,
  PeriodStatus,
  ChangePeriodStatusInput,
  SetDeadlineInput,
  LockTermInput,
  LockSemesterInput,
  UnlockPeriodInput,
  PeriodActionResult,
  StatusHistoryEntry,
} from "@/types/academic-period";
import { toAcademicPeriod, getSemesterFromTerm } from "@/types/academic-period";
import {
  updatePeriodStatus,
  updatePeriodDeadline,
  updateAutoLockEnabled,
  getPeriodById,
  getAcademicYearPeriods,
  getClosingPeriods,
  getPeriodsPastDeadline,
  getPeriodsApproachingDeadline,
} from "@/lib/academic-period";

// ============================================================
// Permission Check
// ============================================================

/**
 * Verify current user is admin
 * @throws Error if not admin
 */
async function assertAdmin(): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not logged in");
  }

  const { data: userData, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !userData) {
    throw new Error("Unable to verify user");
  }

  if (userData.role !== "admin") {
    throw new Error("Permission denied: Admin only");
  }

  return user.id;
}

// ============================================================
// Status Change Actions
// ============================================================

/**
 * Change period status (Admin only)
 */
export async function changePeriodStatus(
  input: ChangePeriodStatusInput
): Promise<PeriodActionResult> {
  try {
    const userId = await assertAdmin();

    const result = await updatePeriodStatus(input.periodId, input.newStatus, userId);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath("/admin/periods");
    revalidatePath("/dashboard");

    const period = await getPeriodById(input.periodId);
    return { success: true, period: period || undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation failed";
    return { success: false, error: message };
  }
}

/**
 * Lock a specific term
 */
export async function lockTerm(
  input: LockTermInput
): Promise<PeriodActionResult> {
  try {
    const userId = await assertAdmin();
    const supabase = await createClient();

    const semester = getSemesterFromTerm(input.term);

    // Find the term period
    const { data: period, error } = await supabase
      .from("academic_periods")
      .select("*")
      .eq("academic_year", input.academicYear)
      .eq("period_type", "term")
      .eq("term", input.term)
      .single();

    if (error || !period) {
      // Create the period if it doesn't exist
      const { data: newPeriod, error: createError } = await supabase
        .from("academic_periods")
        .insert({
          academic_year: input.academicYear,
          period_type: "term",
          semester,
          term: input.term,
          status: "locked",
          status_changed_by: userId,
          status_changed_at: new Date().toISOString(),
          status_history: [
            {
              from: "active",
              to: "locked",
              at: new Date().toISOString(),
              by: userId,
              reason: input.reason,
            },
          ],
        })
        .select()
        .single();

      if (createError) {
        return { success: false, error: createError.message };
      }

      revalidatePath("/admin/periods");
      revalidatePath("/dashboard");
      return {
        success: true,
        period: toAcademicPeriod(newPeriod as AcademicPeriodRow),
      };
    }

    // Update existing period
    const result = await updatePeriodStatus(period.id, "locked", userId);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath("/admin/periods");
    revalidatePath("/dashboard");

    const updatedPeriod = await getPeriodById(period.id);
    return { success: true, period: updatedPeriod || undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation failed";
    return { success: false, error: message };
  }
}

/**
 * Lock a semester (locks all terms in that semester)
 */
export async function lockSemester(
  input: LockSemesterInput
): Promise<PeriodActionResult> {
  try {
    const userId = await assertAdmin();
    const supabase = await createClient();

    // Find the semester period
    const { data: period, error } = await supabase
      .from("academic_periods")
      .select("*")
      .eq("academic_year", input.academicYear)
      .eq("period_type", "semester")
      .eq("semester", input.semester)
      .single();

    if (error || !period) {
      // Create the period if it doesn't exist
      const { data: newPeriod, error: createError } = await supabase
        .from("academic_periods")
        .insert({
          academic_year: input.academicYear,
          period_type: "semester",
          semester: input.semester,
          status: "locked",
          status_changed_by: userId,
          status_changed_at: new Date().toISOString(),
          status_history: [
            {
              from: "active",
              to: "locked",
              at: new Date().toISOString(),
              by: userId,
              reason: input.reason,
            },
          ],
        })
        .select()
        .single();

      if (createError) {
        return { success: false, error: createError.message };
      }

      revalidatePath("/admin/periods");
      revalidatePath("/dashboard");
      return {
        success: true,
        period: toAcademicPeriod(newPeriod as AcademicPeriodRow),
      };
    }

    // Update existing period
    const result = await updatePeriodStatus(period.id, "locked", userId);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath("/admin/periods");
    revalidatePath("/dashboard");

    const updatedPeriod = await getPeriodById(period.id);
    return { success: true, period: updatedPeriod || undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation failed";
    return { success: false, error: message };
  }
}

/**
 * Lock an entire academic year
 */
export async function lockYear(
  academicYear: string,
  reason?: string
): Promise<PeriodActionResult> {
  try {
    const userId = await assertAdmin();
    const supabase = await createClient();

    // Find the year period
    const { data: period, error } = await supabase
      .from("academic_periods")
      .select("*")
      .eq("academic_year", academicYear)
      .eq("period_type", "year")
      .single();

    if (error || !period) {
      // Create the period if it doesn't exist
      const { data: newPeriod, error: createError } = await supabase
        .from("academic_periods")
        .insert({
          academic_year: academicYear,
          period_type: "year",
          status: "locked",
          status_changed_by: userId,
          status_changed_at: new Date().toISOString(),
          status_history: [
            {
              from: "active",
              to: "locked",
              at: new Date().toISOString(),
              by: userId,
              reason,
            },
          ],
        })
        .select()
        .single();

      if (createError) {
        return { success: false, error: createError.message };
      }

      revalidatePath("/admin/periods");
      revalidatePath("/dashboard");
      return {
        success: true,
        period: toAcademicPeriod(newPeriod as AcademicPeriodRow),
      };
    }

    // Update existing period
    const result = await updatePeriodStatus(period.id, "locked", userId);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath("/admin/periods");
    revalidatePath("/dashboard");

    const updatedPeriod = await getPeriodById(period.id);
    return { success: true, period: updatedPeriod || undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation failed";
    return { success: false, error: message };
  }
}

/**
 * Unlock a period (requires reason)
 */
export async function unlockPeriod(
  input: UnlockPeriodInput
): Promise<PeriodActionResult> {
  try {
    const userId = await assertAdmin();

    if (!input.reason || input.reason.trim().length === 0) {
      return { success: false, error: "Unlock reason is required" };
    }

    const result = await updatePeriodStatus(input.periodId, "active", userId);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath("/admin/periods");
    revalidatePath("/dashboard");

    const period = await getPeriodById(input.periodId);
    return { success: true, period: period || undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation failed";
    return { success: false, error: message };
  }
}

// ============================================================
// Deadline Management
// ============================================================

/**
 * Set lock deadline for a period
 */
export async function setLockDeadline(
  input: SetDeadlineInput
): Promise<PeriodActionResult> {
  try {
    await assertAdmin();

    const result = await updatePeriodDeadline(input.periodId, input.deadline);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath("/admin/periods");

    const period = await getPeriodById(input.periodId);
    return { success: true, period: period || undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation failed";
    return { success: false, error: message };
  }
}

/**
 * Clear lock deadline for a period
 */
export async function clearLockDeadline(
  periodId: string
): Promise<PeriodActionResult> {
  try {
    await assertAdmin();

    const result = await updatePeriodDeadline(periodId, null);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath("/admin/periods");

    const period = await getPeriodById(periodId);
    return { success: true, period: period || undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation failed";
    return { success: false, error: message };
  }
}

/**
 * Toggle auto-lock for a period
 */
export async function toggleAutoLock(
  periodId: string,
  enabled: boolean
): Promise<PeriodActionResult> {
  try {
    await assertAdmin();

    const result = await updateAutoLockEnabled(periodId, enabled);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath("/admin/periods");

    const period = await getPeriodById(periodId);
    return { success: true, period: period || undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation failed";
    return { success: false, error: message };
  }
}

// ============================================================
// Query Actions (for client components)
// ============================================================

/**
 * Get all periods for an academic year
 */
export async function fetchAcademicYearPeriods(
  academicYear: string
): Promise<AcademicPeriod[]> {
  return getAcademicYearPeriods(academicYear);
}

/**
 * Get all closing periods (for dashboard warning)
 */
export async function fetchClosingPeriods() {
  return getClosingPeriods();
}

/**
 * Get period status history
 */
export async function fetchPeriodStatusHistory(
  periodId: string
): Promise<StatusHistoryEntry[]> {
  const period = await getPeriodById(periodId);
  return period?.statusHistory || [];
}

// ============================================================
// Auto-Lock Processing (called by cron)
// ============================================================

/**
 * Process auto-lock for periods past deadline
 * Called by cron job
 */
export async function processAutoLocks(): Promise<{
  processed: number;
  locked: string[];
  errors: string[];
}> {
  const result = {
    processed: 0,
    locked: [] as string[],
    errors: [] as string[],
  };

  try {
    // Get periods past deadline
    const periodsPastDeadline = await getPeriodsPastDeadline();

    for (const period of periodsPastDeadline) {
      result.processed++;

      try {
        const supabase = await createClient();

        const { error } = await supabase
          .from("academic_periods")
          .update({
            status: "locked",
            auto_locked_at: new Date().toISOString(),
            status_changed_at: new Date().toISOString(),
          })
          .eq("id", period.id);

        if (error) {
          result.errors.push(`${period.id}: ${error.message}`);
        } else {
          result.locked.push(period.id);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        result.errors.push(`${period.id}: ${msg}`);
      }
    }

    // Update periods approaching deadline to 'closing' status
    const periodsApproaching = await getPeriodsApproachingDeadline();

    for (const period of periodsApproaching) {
      if (period.status === "active") {
        try {
          const supabase = await createClient();

          await supabase
            .from("academic_periods")
            .update({
              status: "closing",
              status_changed_at: new Date().toISOString(),
            })
            .eq("id", period.id);
        } catch (e) {
          // Log but don't fail the whole process
          console.error(`Failed to update closing status for ${period.id}:`, e);
        }
      }
    }

    return result;
  } catch (error) {
    console.error("Auto-lock processing failed:", error);
    return result;
  }
}

// ============================================================
// Period Creation (for new academic years)
// ============================================================

/**
 * Create periods for a new academic year
 */
export async function createAcademicYearPeriods(
  academicYear: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await assertAdmin();
    const supabase = await createClient();

    // Create year period
    await supabase.from("academic_periods").upsert(
      {
        academic_year: academicYear,
        period_type: "year",
        status: "preparing",
      },
      { onConflict: "academic_year,period_type,semester,term" }
    );

    // Create semester periods
    for (const semester of [1, 2]) {
      await supabase.from("academic_periods").upsert(
        {
          academic_year: academicYear,
          period_type: "semester",
          semester,
          status: "preparing",
        },
        { onConflict: "academic_year,period_type,semester,term" }
      );
    }

    // Create term periods
    for (const term of [1, 2, 3, 4]) {
      const semester = getSemesterFromTerm(term);
      await supabase.from("academic_periods").upsert(
        {
          academic_year: academicYear,
          period_type: "term",
          semester,
          term,
          status: "preparing",
        },
        { onConflict: "academic_year,period_type,semester,term" }
      );
    }

    revalidatePath("/admin/periods");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Operation failed";
    return { success: false, error: message };
  }
}
