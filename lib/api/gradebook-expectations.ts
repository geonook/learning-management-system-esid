/**
 * Gradebook Expectations API
 *
 * CRUD operations for Head Teacher assessment expectation settings.
 * Allows configuring expected FA/SA/MID counts per Grade × Level.
 *
 * Structure:
 * - LT/IT: Per Grade × Level (E1, E2, E3)
 * - KCFS: Unified setting (all grades, all levels)
 */

import { createClient } from "@/lib/supabase/client";
import { assertPeriodEditableClient } from "@/hooks/usePeriodLock";
import type {
  GradebookExpectation,
  ExpectationFilter,
  ExpectationInput,
  ExpectationBatchInput,
  CourseType,
  Level,
} from "@/types/gradebook-expectations";
import {
  DEFAULT_EXPECTATION,
  // calculateExpectedTotal - available for future use
} from "@/types/gradebook-expectations";

// ============================================
// Query Functions
// ============================================

/**
 * Get all expectations matching the filter
 * Used for displaying settings in the UI
 */
export async function getExpectations(
  filter: ExpectationFilter
): Promise<GradebookExpectation[]> {
  const supabase = createClient();

  let query = supabase
    .from("gradebook_expectations")
    .select("*")
    .eq("academic_year", filter.academic_year)
    .eq("term", filter.term)
    .eq("course_type", filter.course_type);

  // For LT/IT: filter by grade and level if provided
  if (filter.course_type !== "KCFS") {
    if (filter.grade !== undefined && filter.grade !== null) {
      query = query.eq("grade", filter.grade);
    }
    if (filter.level !== undefined && filter.level !== null) {
      query = query.eq("level", filter.level);
    }
  } else {
    // For KCFS: always filter by NULL grade/level
    query = query.is("grade", null).is("level", null);
  }

  const { data, error } = await query.order("grade").order("level");

  if (error) {
    console.error("[getExpectations] Error:", error);
    throw new Error(`Failed to fetch expectations: ${error.message}`);
  }

  return data as GradebookExpectation[];
}

/**
 * Get a single expectation for a specific grade/level/course_type
 * Used for progress calculation in Browse Gradebook
 */
export async function getExpectation(
  filter: ExpectationFilter
): Promise<GradebookExpectation | null> {
  const supabase = createClient();

  let query = supabase
    .from("gradebook_expectations")
    .select("*")
    .eq("academic_year", filter.academic_year)
    .eq("term", filter.term)
    .eq("course_type", filter.course_type);

  if (filter.course_type === "KCFS") {
    // KCFS: unified setting (grade = NULL, level = NULL)
    query = query.is("grade", null).is("level", null);
  } else {
    // LT/IT: specific grade + level
    if (filter.grade !== undefined && filter.grade !== null) {
      query = query.eq("grade", filter.grade);
    }
    if (filter.level !== undefined && filter.level !== null) {
      query = query.eq("level", filter.level);
    }
  }

  const { data, error } = await query.single();

  if (error) {
    // No record found is not an error, just return null
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("[getExpectation] Error:", error);
    throw new Error(`Failed to fetch expectation: ${error.message}`);
  }

  return data as GradebookExpectation;
}

/**
 * Get expected total for progress calculation
 * Returns default (13) if no setting found
 */
export async function getExpectedTotal(
  academicYear: string,
  term: number,
  courseType: CourseType,
  grade: number | null,
  level: Level | null
): Promise<number> {
  const expectation = await getExpectation({
    academic_year: academicYear,
    term,
    course_type: courseType,
    grade: courseType === "KCFS" ? null : grade,
    level: courseType === "KCFS" ? null : level,
  });

  return expectation?.expected_total ?? DEFAULT_EXPECTATION.expected_total;
}

// ============================================
// Mutation Functions
// ============================================

/**
 * Create or update a single expectation
 */
export async function upsertExpectation(
  input: ExpectationInput
): Promise<GradebookExpectation> {
  // Period lock check
  await assertPeriodEditableClient({
    academicYear: input.academic_year,
    term: input.term,
  });

  const supabase = createClient();

  // Validate course_type constraints
  if (input.course_type === "KCFS") {
    if (input.grade !== null || input.level !== null) {
      throw new Error("KCFS expectations must have null grade and level");
    }
  } else {
    if (input.grade === null || input.level === null) {
      throw new Error("LT/IT expectations must have grade and level");
    }
  }

  const { data, error } = await supabase
    .from("gradebook_expectations")
    .upsert(
      {
        academic_year: input.academic_year,
        term: input.term,
        course_type: input.course_type,
        grade: input.grade,
        level: input.level,
        expected_fa: input.expected_fa,
        expected_sa: input.expected_sa,
        expected_mid: input.expected_mid,
      },
      {
        onConflict: "academic_year,term,course_type,grade,level",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("[upsertExpectation] Error:", error);
    throw new Error(`Failed to save expectation: ${error.message}`);
  }

  return data as GradebookExpectation;
}

/**
 * Batch upsert expectations for LT/IT (multiple grade×level combinations)
 */
export async function batchUpsertExpectations(
  input: ExpectationBatchInput
): Promise<GradebookExpectation[]> {
  // Period lock check
  await assertPeriodEditableClient({
    academicYear: input.academic_year,
    term: input.term,
  });

  const supabase = createClient();

  // Validate course_type - KCFS should not use batch update
  if (input.course_type === "KCFS") {
    throw new Error("KCFS should use single upsert, not batch");
  }

  const records = input.settings.map((setting) => ({
    academic_year: input.academic_year,
    term: input.term,
    course_type: input.course_type,
    grade: setting.grade,
    level: setting.level,
    expected_fa: setting.expected_fa,
    expected_sa: setting.expected_sa,
    expected_mid: setting.expected_mid,
  }));

  const { data, error } = await supabase
    .from("gradebook_expectations")
    .upsert(records, {
      onConflict: "academic_year,term,course_type,grade,level",
    })
    .select();

  if (error) {
    console.error("[batchUpsertExpectations] Error:", error);
    throw new Error(`Failed to save expectations: ${error.message}`);
  }

  return data as GradebookExpectation[];
}

/**
 * Reset expectations to default values
 * For LT/IT: resets all grade×level combinations in the filter
 * For KCFS: resets the single unified setting
 */
export async function resetToDefault(
  filter: Omit<ExpectationFilter, "grade" | "level">,
  grades?: number[],
  levels?: Level[]
): Promise<GradebookExpectation[]> {
  // Period lock check
  await assertPeriodEditableClient({
    academicYear: filter.academic_year,
    term: filter.term,
  });

  const supabase = createClient();

  if (filter.course_type === "KCFS") {
    // KCFS: single unified setting
    const { data, error } = await supabase
      .from("gradebook_expectations")
      .upsert(
        {
          academic_year: filter.academic_year,
          term: filter.term,
          course_type: filter.course_type,
          grade: null,
          level: null,
          expected_fa: DEFAULT_EXPECTATION.expected_fa,
          expected_sa: DEFAULT_EXPECTATION.expected_sa,
          expected_mid: DEFAULT_EXPECTATION.expected_mid,
        },
        {
          onConflict: "academic_year,term,course_type,grade,level",
        }
      )
      .select();

    if (error) {
      console.error("[resetToDefault] Error:", error);
      throw new Error(`Failed to reset expectation: ${error.message}`);
    }

    return data as GradebookExpectation[];
  }

  // LT/IT: reset all grade×level combinations
  if (!grades || grades.length === 0 || !levels || levels.length === 0) {
    throw new Error("Grades and levels are required for LT/IT reset");
  }

  const records = grades.flatMap((grade) =>
    levels.map((level) => ({
      academic_year: filter.academic_year,
      term: filter.term,
      course_type: filter.course_type,
      grade,
      level,
      expected_fa: DEFAULT_EXPECTATION.expected_fa,
      expected_sa: DEFAULT_EXPECTATION.expected_sa,
      expected_mid: DEFAULT_EXPECTATION.expected_mid,
    }))
  );

  const { data, error } = await supabase
    .from("gradebook_expectations")
    .upsert(records, {
      onConflict: "academic_year,term,course_type,grade,level",
    })
    .select();

  if (error) {
    console.error("[resetToDefault] Error:", error);
    throw new Error(`Failed to reset expectations: ${error.message}`);
  }

  return data as GradebookExpectation[];
}

/**
 * Delete expectations (admin only)
 */
export async function deleteExpectations(
  filter: ExpectationFilter
): Promise<void> {
  // Period lock check
  await assertPeriodEditableClient({
    academicYear: filter.academic_year,
    term: filter.term,
  });

  const supabase = createClient();

  let query = supabase
    .from("gradebook_expectations")
    .delete()
    .eq("academic_year", filter.academic_year)
    .eq("term", filter.term)
    .eq("course_type", filter.course_type);

  if (filter.course_type === "KCFS") {
    query = query.is("grade", null).is("level", null);
  } else {
    if (filter.grade !== undefined && filter.grade !== null) {
      query = query.eq("grade", filter.grade);
    }
    if (filter.level !== undefined && filter.level !== null) {
      query = query.eq("level", filter.level);
    }
  }

  const { error } = await query;

  if (error) {
    console.error("[deleteExpectations] Error:", error);
    throw new Error(`Failed to delete expectations: ${error.message}`);
  }
}

// ============================================
// Helper Functions for UI
// ============================================

/**
 * Get expectations with defaults for missing grade×level combinations
 * Used for UI to show all possible settings with current or default values
 */
export async function getExpectationsWithDefaults(
  academicYear: string,
  term: number,
  courseType: CourseType,
  grades: number[],
  levels: Level[]
): Promise<
  Array<{
    grade: number | null;
    level: Level | null;
    expected_fa: number;
    expected_sa: number;
    expected_mid: boolean;
    expected_total: number;
    isDefault: boolean;
  }>
> {
  // Fetch existing expectations
  const existing = await getExpectations({
    academic_year: academicYear,
    term,
    course_type: courseType,
  });

  if (courseType === "KCFS") {
    // KCFS: single unified setting
    const found = existing[0];
    return [
      {
        grade: null,
        level: null,
        expected_fa: found?.expected_fa ?? DEFAULT_EXPECTATION.expected_fa,
        expected_sa: found?.expected_sa ?? DEFAULT_EXPECTATION.expected_sa,
        expected_mid: found?.expected_mid ?? DEFAULT_EXPECTATION.expected_mid,
        expected_total:
          found?.expected_total ?? DEFAULT_EXPECTATION.expected_total,
        isDefault: !found,
      },
    ];
  }

  // LT/IT: map all grade×level combinations
  const existingMap = new Map<string, GradebookExpectation>();
  existing.forEach((exp) => {
    const key = `${exp.grade}-${exp.level}`;
    existingMap.set(key, exp);
  });

  return grades.flatMap((grade) =>
    levels.map((level) => {
      const key = `${grade}-${level}`;
      const found = existingMap.get(key);
      return {
        grade,
        level,
        expected_fa: found?.expected_fa ?? DEFAULT_EXPECTATION.expected_fa,
        expected_sa: found?.expected_sa ?? DEFAULT_EXPECTATION.expected_sa,
        expected_mid: found?.expected_mid ?? DEFAULT_EXPECTATION.expected_mid,
        expected_total:
          found?.expected_total ?? DEFAULT_EXPECTATION.expected_total,
        isDefault: !found,
      };
    })
  );
}

/**
 * Check if user has permission to manage expectations for a course type
 * (This is enforced by RLS, but useful for UI display)
 */
export async function canManageExpectations(
  courseType: CourseType
): Promise<boolean> {
  const supabase = createClient();

  // Try to read existing or would-be records
  // RLS will block if user doesn't have permission
  try {
    const { error } = await supabase
      .from("gradebook_expectations")
      .select("id")
      .eq("course_type", courseType)
      .limit(1);

    // If no error, user can at least read (and likely write)
    return !error;
  } catch {
    return false;
  }
}
