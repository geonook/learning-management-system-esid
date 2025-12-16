/**
 * Score-based color utilities
 *
 * Provides consistent color styling for scores across different course types.
 * - LT/IT: 0-100 scale (term grade)
 * - KCFS: 0-5 scale (raw scores) or 50-100 scale (term grade)
 */

export type CourseType = "LT" | "IT" | "KCFS";

/**
 * Color classes for score-based styling
 */
export const SCORE_COLORS = {
  excellent: "text-green-600 dark:text-green-400 font-medium",
  good: "text-blue-600 dark:text-blue-400",
  average: "text-amber-600 dark:text-amber-400",
  fail: "text-red-600 dark:text-red-400",
  none: "text-text-tertiary",
} as const;

/**
 * Get color class for a term grade score (50-100 scale for all course types)
 *
 * Term grades are always on 0-100 scale:
 * - LT/IT: (FA_avg × 0.15 + SA_avg × 0.20 + MID × 0.10) ÷ 0.45
 * - KCFS: 50 + (Σ category_score × weight)
 *
 * @param score - Term grade (0-100 scale)
 * @returns Tailwind color class string
 */
export function getTermGradeColorClass(score: number | null): string {
  if (score === null) return SCORE_COLORS.none;
  if (score >= 90) return SCORE_COLORS.excellent;
  if (score >= 80) return SCORE_COLORS.good;
  if (score >= 60) return SCORE_COLORS.average;
  return SCORE_COLORS.fail;
}

/**
 * Get color class for a raw KCFS score (0-5 scale)
 *
 * KCFS raw scores use 0-5 scale:
 * - 4.5+ = Excellent
 * - 4.0+ = Good
 * - 3.0+ = Pass (corresponds to 80 pts)
 * - <3.0 = Below standard
 *
 * @param score - KCFS raw score (0-5 scale)
 * @returns Tailwind color class string
 */
export function getKCFSRawScoreColorClass(score: number | null): string {
  if (score === null) return SCORE_COLORS.none;
  if (score >= 4.5) return SCORE_COLORS.excellent;
  if (score >= 4) return SCORE_COLORS.good;
  if (score >= 3) return SCORE_COLORS.average;
  return SCORE_COLORS.fail;
}

/**
 * Get color class for a score based on course type
 *
 * This function determines the appropriate color based on the course type
 * and score scale:
 *
 * For LT/IT (0-100 scale term grades):
 * - >=90: Excellent (green)
 * - >=80: Good (blue)
 * - >=60: Pass (amber)
 * - <60: Fail (red)
 *
 * For KCFS raw scores (0-5 scale):
 * - >=4.5: Excellent (green)
 * - >=4: Good (blue)
 * - >=3: Pass (amber)
 * - <3: Below standard (red)
 *
 * @param score - The score value
 * @param courseType - Course type ("LT", "IT", or "KCFS")
 * @param isRawKCFSScore - If true, treat as 0-5 scale KCFS raw score; if false, treat as term grade
 * @returns Tailwind color class string
 */
export function getScoreColorClass(
  score: number | null,
  courseType?: CourseType,
  isRawKCFSScore: boolean = false
): string {
  if (score === null) return SCORE_COLORS.none;

  // KCFS raw scores use 0-5 scale
  if (courseType === "KCFS" && isRawKCFSScore) {
    return getKCFSRawScoreColorClass(score);
  }

  // All term grades (including KCFS) use 0-100 scale
  return getTermGradeColorClass(score);
}

/**
 * Determine if a score is on the KCFS raw scale (0-5) based on its value
 *
 * Heuristic: If max value in dataset is <= 5, it's likely KCFS raw scores
 * This is useful when course type is unknown but we need to infer the scale
 *
 * @param score - The score to check
 * @returns true if the score appears to be on 0-5 scale
 */
export function isLikelyKCFSRawScore(score: number): boolean {
  return score >= 0 && score <= 5;
}
