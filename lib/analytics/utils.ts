/**
 * Analytics Utility Functions
 * Helper functions for analytics calculations and data processing
 */

import { AnalyticsTimeRange } from './types'

/**
 * Create default time range for current semester
 */
export function getCurrentSemesterRange(): AnalyticsTimeRange {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  // Assume semester starts in August (month 7) or January (month 0)
  let startDate: Date
  let endDate: Date

  if (currentMonth >= 7) {
    // Fall semester
    startDate = new Date(currentYear, 7, 1) // August 1st
    endDate = new Date(currentYear + 1, 0, 31) // January 31st next year
  } else {
    // Spring semester  
    startDate = new Date(currentYear, 0, 1) // January 1st
    endDate = new Date(currentYear, 6, 31) // July 31st
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    period: 'semester'
  }
}

/**
 * Calculate basic statistics for an array of numbers
 */
export function calculateBasicStats(values: number[]) {
  if (values.length === 0) {
    return { mean: 0, median: 0, standardDeviation: 0, min: 0, max: 0, count: 0 }
  }

  const sorted = [...values].sort((a, b) => a - b)
  const count = values.length
  const mean = values.reduce((sum, val) => sum + val, 0) / count
  
  const median = count % 2 === 0 
    ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
    : sorted[Math.floor(count / 2)]
  
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count
  const standardDeviation = Math.sqrt(variance)

  return {
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    standardDeviation: Math.round(standardDeviation * 100) / 100,
    min: sorted[0],
    max: sorted[count - 1],
    count
  }
}

/**
 * Calculate grade averages from score data
 */
export function calculateGradeAverages(scores: Array<{ assessment_code: string; score: number }>) {
  const formativeScores = scores.filter(s => s.assessment_code.startsWith('FA')).map(s => s.score)
  const summativeScores = scores.filter(s => s.assessment_code.startsWith('SA')).map(s => s.score)
  const finalScores = scores.filter(s => s.assessment_code === 'FINAL').map(s => s.score)
  
  let formativeAvg: number | null = null
  let summativeAvg: number | null = null
  let semesterGrade: number | null = null
  
  if (formativeScores.length > 0) {
    formativeAvg = Math.round((formativeScores.reduce((a, b) => a + b, 0) / formativeScores.length) * 100) / 100
  }
  if (summativeScores.length > 0) {
    summativeAvg = Math.round((summativeScores.reduce((a, b) => a + b, 0) / summativeScores.length) * 100) / 100
  }
  if (formativeAvg && summativeAvg && finalScores.length > 0) {
    semesterGrade = Math.round(((formativeAvg * 0.15 + summativeAvg * 0.2 + finalScores[0] * 0.1) / 0.45) * 100) / 100
  }
  
  return { formativeAvg, summativeAvg, semesterGrade }
}

/**
 * Determine performance trend based on score progression
 */
export function calculateTrend(scores: number[]): 'improving' | 'declining' | 'stable' {
  if (scores.length < 3) return 'stable'
  
  const midpoint = Math.floor(scores.length / 2)
  const earlyScores = scores.slice(0, midpoint)
  const recentScores = scores.slice(midpoint)
  
  const earlyAvg = earlyScores.reduce((a, b) => a + b, 0) / earlyScores.length
  const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length
  
  const improvementRate = ((recentAvg - earlyAvg) / earlyAvg) * 100
  
  if (improvementRate > 5) return 'improving'
  if (improvementRate < -5) return 'declining'
  return 'stable'
}

/**
 * Assess risk level based on performance metrics
 */
export function assessRisk(averageScore: number, consistency: number, trend: string) {
  const riskFactors = []
  
  if (averageScore < 70) riskFactors.push('Low average performance')
  if (consistency > 15) riskFactors.push('Inconsistent performance')
  if (trend === 'declining') riskFactors.push('Declining trend')
  
  const atRisk = averageScore < 70 || consistency > 15
  const interventionNeeded = atRisk && riskFactors.length > 1
  
  return { atRisk, riskFactors, interventionNeeded }
}

/**
 * Format date to ISO string
 */
export function formatDateToISO(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Safe number conversion with fallback
 */
export function safeNumber(value: any, fallback: number = 0): number {
  const num = typeof value === 'number' ? value : parseFloat(value)
  return isNaN(num) ? fallback : num
}

/**
 * Safe string conversion with fallback
 */
export function safeString(value: any, fallback: string = ''): string {
  return value ? String(value) : fallback
}