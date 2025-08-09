/**
 * Grade Calculation Library - Single Source of Truth
 * 
 * This module exports all grade calculation functions and types.
 * Use these functions for ALL grade calculations across the application.
 * 
 * Key Rules:
 * - Only numerical scores (no letter grades or 等第)
 * - Only count scores > 0 in calculations
 * - Consistent rounding to 2 decimal places
 * - Same logic used in frontend and backend
 */

// Export all calculation functions
export {
  calcFormativeAvg,
  calcSummativeAvg,
  getFinalScore,
  calcSemesterGrade,
  calculateGrades,
  isValidScore,
  getValidScores
} from './calculations'

// Export all types and schemas
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