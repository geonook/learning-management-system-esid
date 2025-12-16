/**
 * KCFS Grade Calculation Functions
 *
 * KCFS uses a different scoring system than LT/IT:
 * - Score Range: 0-5 (0.5 increments)
 * - Formula: Term Grade = 50 + (Σ category_score × weight)
 * - Grade-specific categories and weights:
 *   - G1-2: 4 categories, weight 2.5
 *   - G3-4: 5 categories, weight 2.0
 *   - G5-6: 6 categories, weight 5/3
 *
 * Score Handling:
 * - 0-5 (including 0): Included in calculation
 * - null/blank: Excluded (not entered)
 * - Absent: Excluded (student absent)
 */

import {
  KCFSGradeRange,
  KCFSCategoryCode,
  KCFSScoreEntry,
  KCFSCalculationResult,
  KCFS_GRADE_CONFIG,
  KCFS_BASE_SCORE,
  KCFS_CATEGORY_NAMES,
} from '@/types/kcfs'

/**
 * Get KCFS grade range from grade number
 */
export function getKCFSGradeRange(grade: number): KCFSGradeRange {
  if (grade <= 2) return '1-2'
  if (grade <= 4) return '3-4'
  return '5-6'
}

/**
 * Get KCFS categories configuration for a specific grade
 */
export function getKCFSCategories(grade: number) {
  const range = getKCFSGradeRange(grade)
  return KCFS_GRADE_CONFIG[range]
}

/**
 * Validate if a KCFS score is valid
 * - Must be between 0 and 5
 * - Must be in 0.5 increments
 */
export function isValidKCFSScore(score: number | null): boolean {
  if (score === null) return true // null is valid (not entered)
  if (score < 0 || score > 5) return false
  // Check 0.5 increments
  return score % 0.5 === 0
}

/**
 * Check if a score entry should be included in calculation
 * - Returns false if null, absent, or undefined
 * - Returns true for any numeric value (including 0)
 */
export function shouldIncludeScore(entry: KCFSScoreEntry | null | undefined): boolean {
  if (!entry) return false
  if (entry.isAbsent) return false
  if (entry.value === null) return false
  return true
}

/**
 * Calculate KCFS term grade
 *
 * Formula: Term Grade = 50 + (Σ category_score × weight)
 *
 * @param scores - Record of category code to score entry
 * @param grade - Student grade (1-6)
 * @returns Term grade (50-100) or null if no valid scores
 */
export function calculateKCFSTermGrade(
  scores: Record<string, KCFSScoreEntry | null>,
  grade: number
): number | null {
  const config = getKCFSCategories(grade)
  const { categories, weight } = config

  let weightedSum = 0
  let validCount = 0

  for (const category of categories) {
    const entry = scores[category]

    // Skip if should not be included
    if (!shouldIncludeScore(entry)) {
      continue
    }

    // Add to weighted sum (entry.value is guaranteed to be non-null here)
    weightedSum += entry!.value! * weight
    validCount++
  }

  // No valid scores → return null
  if (validCount === 0) return null

  const termGrade = KCFS_BASE_SCORE + weightedSum
  return Number(termGrade.toFixed(1))
}

/**
 * Calculate KCFS grades with detailed breakdown
 *
 * @param scores - Record of category code to score entry
 * @param grade - Student grade (1-6)
 * @returns Full calculation result with category breakdown
 */
export function calculateKCFSGrades(
  scores: Record<string, KCFSScoreEntry | null>,
  grade: number
): KCFSCalculationResult {
  const config = getKCFSCategories(grade)
  const { categories, weight } = config

  let weightedSum = 0
  let validCount = 0

  const categoryScores = categories.map((code) => {
    const entry = scores[code]
    const isIncluded = shouldIncludeScore(entry)

    if (isIncluded && entry!.value !== null) {
      weightedSum += entry!.value * weight
      validCount++
    }

    return {
      code: code as KCFSCategoryCode,
      name: KCFS_CATEGORY_NAMES[code as KCFSCategoryCode],
      value: entry?.value ?? null,
      isAbsent: entry?.isAbsent ?? false,
      isIncluded,
    }
  })

  const termGrade = validCount > 0
    ? Number((KCFS_BASE_SCORE + weightedSum).toFixed(1))
    : null

  return {
    termGrade,
    categoryScores,
    validCategoriesCount: validCount,
    totalCategoriesCount: categories.length,
  }
}

/**
 * Convert KCFS score (0-5) to 100-point scale
 * Used for display purposes only
 *
 * Linear conversion: 50 + (score × 10)
 * - 0 → 50
 * - 3 → 80
 * - 4 → 90
 * - 5 → 100
 */
export function convertKCFSScoreTo100(score: number): number {
  return KCFS_BASE_SCORE + score * 10
}

/**
 * Get valid KCFS scores for a given grade
 * Returns only non-absent, non-null scores
 */
export function getValidKCFSScores(
  scores: Record<string, KCFSScoreEntry | null>,
  grade: number
): { code: KCFSCategoryCode; value: number }[] {
  const config = getKCFSCategories(grade)

  return config.categories
    .filter((code) => shouldIncludeScore(scores[code]))
    .map((code) => ({
      code: code as KCFSCategoryCode,
      value: scores[code]!.value!,
    }))
}

/**
 * Get all KCFS category codes for a specific grade
 */
export function getKCFSCategoryCodes(grade: number): KCFSCategoryCode[] {
  const config = getKCFSCategories(grade)
  return config.categories as KCFSCategoryCode[]
}

/**
 * Get the weight for a specific grade
 */
export function getKCFSWeight(grade: number): number {
  const config = getKCFSCategories(grade)
  return config.weight
}

/**
 * Get the expected category count for a specific grade
 */
export function getKCFSExpectedCount(grade: number): number {
  const config = getKCFSCategories(grade)
  return config.categories.length
}
