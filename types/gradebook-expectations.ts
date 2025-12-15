/**
 * Gradebook Expectations Types
 *
 * Types for Head Teacher assessment expectation settings.
 * Allows configuring expected FA/SA/MID counts per Grade × Level.
 *
 * Structure:
 * - LT/IT: Per Grade × Level (E1, E2, E3)
 * - KCFS: Unified setting (all grades, all levels)
 */

// Re-export CourseType for convenience
export type CourseType = 'LT' | 'IT' | 'KCFS';

// Level types (E1=Advanced, E2=Intermediate, E3=Basic)
export type Level = 'E1' | 'E2' | 'E3';

/**
 * Gradebook Expectation record from database
 */
export interface GradebookExpectation {
  id: string;
  academic_year: string;
  term: number; // 1-4
  course_type: CourseType;
  grade: number | null; // 1-6 for LT/IT, null for KCFS
  level: Level | null; // E1/E2/E3 for LT/IT, null for KCFS
  expected_fa: number; // 0-8
  expected_sa: number; // 0-4
  expected_mid: boolean;
  expected_total: number; // Computed: fa + sa + (mid ? 1 : 0)
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Filter for querying expectations
 */
export interface ExpectationFilter {
  academic_year: string;
  term: number;
  course_type: CourseType;
  grade?: number | null; // Required for LT/IT, null for KCFS
  level?: Level | null; // Required for LT/IT, null for KCFS
}

/**
 * Data for creating/updating an expectation
 */
export interface ExpectationInput {
  academic_year: string;
  term: number;
  course_type: CourseType;
  grade: number | null;
  level: Level | null;
  expected_fa: number;
  expected_sa: number;
  expected_mid: boolean;
}

/**
 * Batch update input for LT/IT (multiple grade×level combinations)
 */
export interface ExpectationBatchInput {
  academic_year: string;
  term: number;
  course_type: CourseType;
  settings: Array<{
    grade: number;
    level: Level;
    expected_fa: number;
    expected_sa: number;
    expected_mid: boolean;
  }>;
}

/**
 * Default values for new expectations
 */
export const DEFAULT_EXPECTATION = {
  expected_fa: 8,
  expected_sa: 4,
  expected_mid: true,
  expected_total: 13, // 8 + 4 + 1
} as const;

/**
 * Valid ranges for FA/SA counts
 */
export const EXPECTATION_RANGES = {
  fa: { min: 0, max: 8 },
  sa: { min: 0, max: 4 },
} as const;

/**
 * All levels
 */
export const ALL_LEVELS: Level[] = ['E1', 'E2', 'E3'];

/**
 * Level display names
 */
export const LEVEL_NAMES: Record<Level, string> = {
  E1: 'Advanced',
  E2: 'Intermediate',
  E3: 'Basic',
};

/**
 * Level display names in Chinese
 */
export const LEVEL_NAMES_ZH: Record<Level, string> = {
  E1: '頂尖',
  E2: '中等',
  E3: '基礎',
};

/**
 * Calculate total expected assessments
 */
export function calculateExpectedTotal(
  fa: number,
  sa: number,
  mid: boolean
): number {
  return fa + sa + (mid ? 1 : 0);
}

/**
 * Extract level from class level string
 * Example: 'G3E2' → 'E2'
 */
export function extractLevel(classLevel: string | null): Level | null {
  if (!classLevel) return null;
  const match = classLevel.match(/E([1-3])$/);
  if (!match || !match[1]) return null;
  return `E${match[1]}` as Level;
}

/**
 * Parse grade band string to array of grades
 * Example: '3-4' → [3, 4], '1' → [1]
 */
export function parseGradeBand(gradeBand: string): number[] {
  if (gradeBand.includes('-')) {
    const parts = gradeBand.split('-').map(Number);
    const start = parts[0] ?? 1;
    const end = parts[1] ?? start;
    const grades: number[] = [];
    for (let i = start; i <= end; i++) {
      grades.push(i);
    }
    return grades;
  }
  return [Number(gradeBand)];
}

/**
 * Get number of settings required for a Head Teacher
 * @param courseType - LT, IT, or KCFS
 * @param gradeBand - Grade band string (e.g., '3-4', '1-2', '1-6')
 * @returns Number of settings (grade × level combinations)
 */
export function getRequiredSettingsCount(
  courseType: CourseType,
  gradeBand: string
): number {
  if (courseType === 'KCFS') {
    return 1; // Unified setting
  }
  const grades = parseGradeBand(gradeBand);
  return grades.length * 3; // grades × 3 levels (E1, E2, E3)
}

/**
 * Generate all grade×level combinations for a grade band
 */
export function generateGradeLevelCombinations(
  gradeBand: string
): Array<{ grade: number; level: Level }> {
  const grades = parseGradeBand(gradeBand);
  const combinations: Array<{ grade: number; level: Level }> = [];

  for (const grade of grades) {
    for (const level of ALL_LEVELS) {
      combinations.push({ grade, level });
    }
  }

  return combinations;
}
