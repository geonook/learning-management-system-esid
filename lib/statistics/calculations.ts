/**
 * Statistics Calculation Functions
 *
 * Pure functions for computing statistical measures.
 * All calculations follow the specification:
 * - Only numerical scores are included
 * - Real 0 scores are included (student took exam but got 0)
 * - null, 'X', '-', 'N/A', '缺考', 'absent' are excluded
 */

import type { PerformanceLevel } from '@/types/statistics';

// ============================================================
// Value Validation
// ============================================================

/**
 * Check if a value should be included in calculations
 * Real 0 scores are included, but null/marker values are excluded
 */
export function isValidScore(value: unknown): value is number {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const excluded = ['X', '-', 'N/A', '缺考', 'absent', ''];
    if (excluded.includes(value.trim())) return false;
    const parsed = parseFloat(value);
    return !isNaN(parsed);
  }
  if (typeof value === 'number') {
    return !isNaN(value);
  }
  return false;
}

/**
 * Convert a value to a number, returning null if invalid
 */
export function toNumber(value: unknown): number | null {
  if (!isValidScore(value)) return null;
  if (typeof value === 'number') return value;
  return parseFloat(value as string);
}

/**
 * Filter and convert an array of values to valid numbers
 */
export function filterValidScores(values: unknown[]): number[] {
  return values
    .map(toNumber)
    .filter((v): v is number => v !== null);
}

// ============================================================
// Basic Statistical Measures
// ============================================================

/**
 * Calculate the average (mean) of an array of numbers
 * Returns null if no valid values
 */
export function calculateAverage(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return roundTo(sum / values.length, 2);
}

/**
 * Calculate the maximum value
 * Returns null if no valid values
 */
export function calculateMax(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.max(...values);
}

/**
 * Calculate the minimum value
 * Returns null if no valid values
 */
export function calculateMin(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.min(...values);
}

/**
 * Calculate the standard deviation (population)
 * Returns null if fewer than 2 values
 */
export function calculateStdDev(values: number[]): number | null {
  if (values.length < 2) return null;

  const mean = calculateAverage(values);
  if (mean === null) return null;

  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;

  return roundTo(Math.sqrt(avgSquaredDiff), 2);
}

/**
 * Calculate the median value
 * Returns null if no valid values
 */
export function calculateMedian(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    const left = sorted[mid - 1];
    const right = sorted[mid];
    if (left !== undefined && right !== undefined) {
      return roundTo((left + right) / 2, 2);
    }
    return null;
  }
  return sorted[mid] ?? null;
}

// ============================================================
// Rate Calculations
// ============================================================

/**
 * Calculate pass rate (scores >= 60)
 * Returns percentage (0-100) or null if no valid values
 */
export function calculatePassRate(values: number[]): number | null {
  if (values.length === 0) return null;

  const passCount = values.filter(v => v >= 60).length;
  return roundTo((passCount / values.length) * 100, 2);
}

/**
 * Calculate excellent rate (scores >= 90)
 * Returns percentage (0-100) or null if no valid values
 */
export function calculateExcellentRate(values: number[]): number | null {
  if (values.length === 0) return null;

  const excellentCount = values.filter(v => v >= 90).length;
  return roundTo((excellentCount / values.length) * 100, 2);
}

/**
 * Calculate rate for scores meeting a custom threshold
 * Returns percentage (0-100) or null if no valid values
 */
export function calculateThresholdRate(values: number[], threshold: number): number | null {
  if (values.length === 0) return null;

  const meetingThreshold = values.filter(v => v >= threshold).length;
  return roundTo((meetingThreshold / values.length) * 100, 2);
}

// ============================================================
// Performance Level
// ============================================================

/**
 * Determine performance level based on score
 */
export function getPerformanceLevel(score: number | null): PerformanceLevel {
  if (score === null) return 'needs_improvement';
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 70) return 'average';
  if (score >= 60) return 'pass';
  return 'needs_improvement';
}

/**
 * Get performance emoji for a score
 */
export function getPerformanceEmoji(score: number | null): string {
  const level = getPerformanceLevel(score);
  const emojiMap: Record<PerformanceLevel, string> = {
    excellent: '🌟',
    good: '🟢',
    average: '🟡',
    pass: '🟠',
    needs_improvement: '🔴',
  };
  return emojiMap[level];
}

/**
 * Get performance label for a score
 */
export function getPerformanceLabel(score: number | null): string {
  const level = getPerformanceLevel(score);
  const labelMap: Record<PerformanceLevel, string> = {
    excellent: 'Excellent',
    good: 'Good',
    average: 'Average',
    pass: 'Pass',
    needs_improvement: 'Needs Improvement',
  };
  return labelMap[level];
}

// ============================================================
// Grade Calculations
// ============================================================

/**
 * Calculate Formative Average (FA1-FA8)
 * Only includes valid scores (not null, not markers)
 */
export function calculateFormativeAverage(
  fa1: unknown, fa2: unknown, fa3: unknown, fa4: unknown,
  fa5: unknown, fa6: unknown, fa7: unknown, fa8: unknown
): number | null {
  const scores = filterValidScores([fa1, fa2, fa3, fa4, fa5, fa6, fa7, fa8]);
  return calculateAverage(scores);
}

/**
 * Calculate Summative Average (SA1-SA4)
 * Only includes valid scores (not null, not markers)
 */
export function calculateSummativeAverage(
  sa1: unknown, sa2: unknown, sa3: unknown, sa4: unknown
): number | null {
  const scores = filterValidScores([sa1, sa2, sa3, sa4]);
  return calculateAverage(scores);
}

/**
 * Calculate Term Grade
 * Formula: (FA_avg × 0.15 + SA_avg × 0.20 + Midterm × 0.10) ÷ 0.45
 * Note: Currently only Midterm, no Final
 *
 * Only calculates if at least one category has valid scores
 */
export function calculateTermGrade(
  faAvg: number | null,
  saAvg: number | null,
  midterm: number | null
): number | null {
  let weightedSum = 0;
  let totalWeight = 0;

  if (faAvg !== null) {
    weightedSum += faAvg * 0.15;
    totalWeight += 0.15;
  }

  if (saAvg !== null) {
    weightedSum += saAvg * 0.20;
    totalWeight += 0.20;
  }

  if (midterm !== null) {
    weightedSum += midterm * 0.10;
    totalWeight += 0.10;
  }

  if (totalWeight === 0) return null;

  return roundTo(weightedSum / totalWeight, 2);
}

// ============================================================
// Comparison Calculations
// ============================================================

/**
 * Calculate difference from average
 * Returns positive number if above average, negative if below
 */
export function calculateVsAverage(value: number | null, average: number | null): number | null {
  if (value === null || average === null) return null;
  return roundTo(value - average, 2);
}

/**
 * Format vs average for display
 * e.g., +1.13, -0.51
 */
export function formatVsAverage(value: number | null): string {
  if (value === null) return '-';
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}`;
}

// ============================================================
// Ranking Calculations
// ============================================================

/**
 * Generate rank label
 * e.g., "#1 in G1E1"
 */
export function generateRankLabel(rank: number, gradeLevel: string): string {
  return `#${rank} in ${gradeLevel}`;
}

/**
 * Sort and rank items by a numeric field (descending)
 * Returns items with rank added
 */
export function rankByField<T extends Record<string, unknown>>(
  items: T[],
  field: keyof T
): (T & { rank: number })[] {
  const sorted = [...items].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];
    if (aVal === null && bVal === null) return 0;
    if (aVal === null) return 1;
    if (bVal === null) return -1;
    return (bVal as number) - (aVal as number);
  });

  return sorted.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

// ============================================================
// Aggregation Helpers
// ============================================================

/**
 * Calculate all statistics for an array of scores
 */
export function calculateAllStatistics(values: number[]): {
  count: number;
  average: number | null;
  max: number | null;
  min: number | null;
  std_dev: number | null;
  median: number | null;
  pass_rate: number | null;
  excellent_rate: number | null;
} {
  return {
    count: values.length,
    average: calculateAverage(values),
    max: calculateMax(values),
    min: calculateMin(values),
    std_dev: calculateStdDev(values),
    median: calculateMedian(values),
    pass_rate: calculatePassRate(values),
    excellent_rate: calculateExcellentRate(values),
  };
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Round a number to specified decimal places
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Format a number as percentage string
 * e.g., 85.5 -> "85.50%"
 */
export function formatPercentage(value: number | null): string {
  if (value === null) return '-';
  return `${value.toFixed(2)}%`;
}

/**
 * Format a number with fixed decimal places
 * e.g., 85.5 -> "85.50"
 */
export function formatNumber(value: number | null, decimals: number = 2): string {
  if (value === null) return '-';
  return value.toFixed(decimals);
}

/**
 * Group an array by a key
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const groupKey = String(item[key]);
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
