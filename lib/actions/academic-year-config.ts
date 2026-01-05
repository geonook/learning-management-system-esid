"use server"

/**
 * Academic Year Configuration Server Actions
 *
 * Admin-only actions for managing academic year date configuration.
 * These actions update the academic_periods table and clear the cache.
 */

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// ============================================================
// Types
// ============================================================

export interface UpdateYearDatesInput {
  academicYear: string
  startDate: string      // YYYY-MM-DD format
  endDate: string        // YYYY-MM-DD format
  fallStartDate: string  // YYYY-MM-DD format
  fallEndDate: string    // YYYY-MM-DD format
  springStartDate: string // YYYY-MM-DD format
  springEndDate: string  // YYYY-MM-DD format
}

export interface ActionResult {
  success: boolean
  error?: string
}

// ============================================================
// Validation Helpers
// ============================================================

function isValidDateString(dateStr: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateStr)) return false

  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}

function validateDates(input: UpdateYearDatesInput): string | null {
  // Check all dates are valid
  const dateFields: (keyof UpdateYearDatesInput)[] = [
    'startDate',
    'endDate',
    'fallStartDate',
    'fallEndDate',
    'springStartDate',
    'springEndDate',
  ]

  for (const field of dateFields) {
    if (!isValidDateString(input[field])) {
      return `Invalid date format for ${field}. Expected YYYY-MM-DD.`
    }
  }

  // Check logical date ordering
  if (input.startDate >= input.endDate) {
    return 'Academic year end date must be after start date.'
  }

  if (input.fallStartDate >= input.fallEndDate) {
    return 'Fall semester end date must be after start date.'
  }

  if (input.springStartDate >= input.springEndDate) {
    return 'Spring semester end date must be after start date.'
  }

  // Check that semesters are within academic year
  if (input.fallStartDate < input.startDate || input.fallEndDate > input.endDate) {
    return 'Fall semester dates must be within academic year range.'
  }

  if (input.springStartDate < input.startDate || input.springEndDate > input.endDate) {
    return 'Spring semester dates must be within academic year range.'
  }

  // Check that Fall comes before Spring
  if (input.fallEndDate >= input.springStartDate) {
    return 'Fall semester must end before Spring semester starts.'
  }

  return null
}

// ============================================================
// Server Actions
// ============================================================

/**
 * Update academic year date configuration
 *
 * Admin-only action that updates all date fields for a year-type
 * academic period. Validates date logic and clears the cache.
 */
export async function updateAcademicYearDates(
  input: UpdateYearDatesInput
): Promise<ActionResult> {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    // Verify admin role
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (userError || userData?.role !== "admin") {
      return { success: false, error: "Admin access required" }
    }

    // Validate dates
    const validationError = validateDates(input)
    if (validationError) {
      return { success: false, error: validationError }
    }

    // Check that the academic year period exists
    const { data: existingPeriod, error: checkError } = await supabase
      .from("academic_periods")
      .select("id")
      .eq("academic_year", input.academicYear)
      .eq("period_type", "year")
      .single()

    if (checkError || !existingPeriod) {
      return {
        success: false,
        error: `Academic year ${input.academicYear} not found.`,
      }
    }

    // Update the period
    const { error: updateError } = await supabase
      .from("academic_periods")
      .update({
        start_date: input.startDate,
        end_date: input.endDate,
        fall_start_date: input.fallStartDate,
        fall_end_date: input.fallEndDate,
        spring_start_date: input.springStartDate,
        spring_end_date: input.springEndDate,
      })
      .eq("academic_year", input.academicYear)
      .eq("period_type", "year")

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Revalidate admin pages
    revalidatePath("/admin/periods")
    revalidatePath("/dashboard")

    return { success: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Operation failed"
    return { success: false, error: message }
  }
}

/**
 * Get academic year dates for editing
 *
 * Returns the current date configuration for a specific academic year.
 * Admin-only action for populating the edit form.
 */
export async function getAcademicYearDates(
  academicYear: string
): Promise<{
  success: boolean
  data?: UpdateYearDatesInput
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    // Verify admin role
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (userError || userData?.role !== "admin") {
      return { success: false, error: "Admin access required" }
    }

    // Get the period data
    const { data, error } = await supabase
      .from("academic_periods")
      .select(
        "academic_year, start_date, end_date, fall_start_date, fall_end_date, spring_start_date, spring_end_date"
      )
      .eq("academic_year", academicYear)
      .eq("period_type", "year")
      .single()

    if (error || !data) {
      return {
        success: false,
        error: `Academic year ${academicYear} not found.`,
      }
    }

    return {
      success: true,
      data: {
        academicYear: data.academic_year,
        startDate: data.start_date || "",
        endDate: data.end_date || "",
        fallStartDate: data.fall_start_date || "",
        fallEndDate: data.fall_end_date || "",
        springStartDate: data.spring_start_date || "",
        springEndDate: data.spring_end_date || "",
      },
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Operation failed"
    return { success: false, error: message }
  }
}
