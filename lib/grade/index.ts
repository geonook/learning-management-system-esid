/**
 * Grade Calculation Library - Single Source of Truth
 *
 * This module exports all grade calculation functions and types.
 * Use these functions for ALL grade calculations across the application.
 *
 * Key Rules:
 * - Only numerical scores (no letter grades or 等第)
 * - Only count scores > 0 in calculations (LT/IT)
 * - KCFS uses 0-5 scale with different formula
 * - Consistent rounding to 2 decimal places
 * - Same logic used in frontend and backend
 */

// Export all calculation functions (LT/IT)
export {
  calcFormativeAvg,
  calcSummativeAvg,
  getFinalScore,
  calcSemesterGrade,
  calculateGrades,
  isValidScore,
  getValidScores
} from './calculations'

// Export KCFS calculation functions
export {
  getKCFSGradeRange,
  getKCFSCategories,
  isValidKCFSScore,
  shouldIncludeScore,
  calculateKCFSTermGrade,
  calculateKCFSGrades,
  convertKCFSScoreTo100,
  getValidKCFSScores,
  getKCFSCategoryCodes,
  getKCFSWeight,
  getKCFSExpectedCount
} from './kcfs-calculations'

// Export all types and schemas (LT/IT)
export {
  ASSESSMENT_CODES,
  FORMATIVE_CODES,
  SUMMATIVE_CODES,
  FINAL_CODES,
  AssessmentCodeSchema,
  ScoreSchema,
  ScoresMapSchema,
  GradeCalculationInputSchema
} from './types'

export type {
  AssessmentCode,
  ScoreValue,
  ScoresMap,
  GradeCalculationInput,
  GradeCalculationResult,
  AssessmentDisplayOverride
} from './types'

// Export display name utilities
export { resolveDisplayName } from './display-names'