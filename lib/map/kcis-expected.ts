/**
 * KCIS School-specific Expected RIT Values
 *
 * Based on Colab analysis of KCIS historical MAP data.
 * Used for displaying KCIS Expected (E2) progress curve on School Tab charts.
 *
 * E3 (lower bound) and E1 (upper bound) define the benchmark thresholds.
 * Mean = (E1 + E3) / 2 (E2 midpoint)
 * StdDev = (E1 - E3) / 2
 */

export interface KcisExpectedValue {
  /** E3 threshold (lower bound) */
  e3: number;
  /** E1 threshold (upper bound) */
  e1: number;
  /** E2 midpoint (mean) */
  mean: number;
  /** Standard deviation */
  stdDev: number;
}

/**
 * KCIS Expected RIT values by grade
 * Source: Colab notebook kcis_RITbenchmarks
 */
export const KCIS_EXPECTED: Record<number, KcisExpectedValue> = {
  3: { e3: 174, e1: 196, mean: 185, stdDev: 11 },
  4: { e3: 183, e1: 206, mean: 194.5, stdDev: 11.5 },
  5: { e3: 191, e1: 213, mean: 202, stdDev: 11 },
  6: { e3: 194, e1: 218, mean: 206, stdDev: 12 },
} as const;

/**
 * Get KCIS expected values for a specific grade
 */
export function getKcisExpected(grade: number): KcisExpectedValue | null {
  return KCIS_EXPECTED[grade] ?? null;
}

/**
 * Get all supported grades for KCIS Expected
 */
export function getKcisSupportedGrades(): number[] {
  return Object.keys(KCIS_EXPECTED).map(Number);
}

/**
 * Generate chart data points for KCIS Expected line
 * Returns data with mean, upperBand (mean + stdDev), lowerBand (mean - stdDev)
 */
export function getKcisExpectedChartData(): {
  grade: string;
  gradeNum: number;
  expected: number;
  upperBand: number;
  lowerBand: number;
}[] {
  return Object.entries(KCIS_EXPECTED).map(([grade, values]) => ({
    grade: `G${grade}`,
    gradeNum: Number(grade),
    expected: values.mean,
    upperBand: values.mean + values.stdDev,
    lowerBand: values.mean - values.stdDev,
  }));
}
