/**
 * Grade Calculation Functions - Single Source of Truth
 * 
 * Rules:
 * - Only count scores > 0
 * - If all scores are 0 or null, return null
 * - Semester grade rounded to 2 decimal places
 * - Formula: (Formative × 0.15 + Summative × 0.2 + Final × 0.1) ÷ 0.45
 */

import {
  ScoresMap,
  ScoreValue,
  GradeCalculationInput,
  GradeCalculationResult,
  FORMATIVE_CODES,
  SUMMATIVE_CODES,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  FINAL_CODES
} from './types'

/**
 * Calculate formative assessment average (FA1-FA8)
 * Only includes scores > 0
 */
export function calcFormativeAvg(scores: ScoresMap): number | null {
  const formativeScores = FORMATIVE_CODES
    .map(code => scores[code])
    .filter((score): score is number => score !== null && score > 0)
  
  if (formativeScores.length === 0) {
    return null
  }
  
  const sum = formativeScores.reduce((acc, score) => acc + score, 0)
  return Number((sum / formativeScores.length).toFixed(2))
}

/**
 * Calculate summative assessment average (SA1-SA4)
 * Only includes scores > 0
 */
export function calcSummativeAvg(scores: ScoresMap): number | null {
  const summativeScores = SUMMATIVE_CODES
    .map(code => scores[code])
    .filter((score): score is number => score !== null && score > 0)
  
  if (summativeScores.length === 0) {
    return null
  }
  
  const sum = summativeScores.reduce((acc, score) => acc + score, 0)
  return Number((sum / summativeScores.length).toFixed(2))
}

/**
 * Get final exam score
 * Returns null if score is null or 0
 */
export function getFinalScore(scores: ScoresMap): number | null {
  const finalScore = scores.FINAL
  return (finalScore !== null && finalScore > 0) ? finalScore : null
}

/**
 * Calculate semester grade using weighted formula
 * Formula: (Formative × 0.15 + Summative × 0.2 + Final × 0.1) ÷ 0.45
 * Returns null if insufficient data
 */
export function calcSemesterGrade(scores: ScoresMap): number | null {
  const formativeAvg = calcFormativeAvg(scores)
  const summativeAvg = calcSummativeAvg(scores)
  const finalScore = getFinalScore(scores)
  
  // Need at least one component to calculate semester grade
  if (!formativeAvg && !summativeAvg && !finalScore) {
    return null
  }
  
  let weightedSum = 0
  let totalWeight = 0
  
  // Add formative component if available
  if (formativeAvg !== null) {
    weightedSum += formativeAvg * 0.15
    totalWeight += 0.15
  }
  
  // Add summative component if available
  if (summativeAvg !== null) {
    weightedSum += summativeAvg * 0.2
    totalWeight += 0.2
  }
  
  // Add final component if available
  if (finalScore !== null) {
    weightedSum += finalScore * 0.1
    totalWeight += 0.1
  }
  
  // Calculate final grade (normalize by actual total weight, not 0.45)
  const semesterGrade = weightedSum / totalWeight
  return Number(semesterGrade.toFixed(2))
}

/**
 * Complete grade calculation with metadata
 * Returns all calculated values plus usage statistics
 */
export function calculateGrades(input: GradeCalculationInput): GradeCalculationResult {
  const { scores } = input
  
  const formativeAvg = calcFormativeAvg(scores)
  const summativeAvg = calcSummativeAvg(scores)
  const semesterGrade = calcSemesterGrade(scores)
  
  // Calculate usage statistics
  const formativeScoresUsed = FORMATIVE_CODES
    .filter(code => scores[code] !== null && scores[code]! > 0).length
  
  const summativeScoresUsed = SUMMATIVE_CODES
    .filter(code => scores[code] !== null && scores[code]! > 0).length
  
  const finalScoreUsed = scores.FINAL !== null && scores.FINAL > 0
  
  const totalScoresUsed = formativeScoresUsed + summativeScoresUsed + (finalScoreUsed ? 1 : 0)
  
  return {
    formativeAvg,
    summativeAvg,
    semesterGrade,
    totalScoresUsed,
    formativeScoresUsed,
    summativeScoresUsed,
    finalScoreUsed
  }
}

/**
 * Utility function to validate if a score is valid (not null and > 0)
 */
export function isValidScore(score: ScoreValue): score is number {
  return score !== null && score > 0
}

/**
 * Get all valid scores from a ScoresMap
 */
export function getValidScores(scores: ScoresMap): { code: string, score: number }[] {
  return Object.entries(scores)
    .filter(([, score]) => isValidScore(score))
    .map(([code, score]) => ({ code, score: score! }))
}