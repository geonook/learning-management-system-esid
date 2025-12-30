/**
 * Statistical Utility Functions for MAP Analytics
 *
 * Provides Gaussian (normal distribution) functions for curve fitting
 * and R-squared calculations for goodness-of-fit assessment.
 */

/**
 * Calculate Gaussian (normal distribution) PDF value
 *
 * @param x - The x value to evaluate
 * @param mean - Mean of the distribution
 * @param stdDev - Standard deviation of the distribution
 * @returns The probability density at x
 */
export function gaussianPdf(x: number, mean: number, stdDev: number): number {
  if (stdDev <= 0) return 0;
  const coefficient = 1 / (stdDev * Math.sqrt(2 * Math.PI));
  const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
  return coefficient * Math.exp(exponent);
}

/**
 * Generate Gaussian curve data points for chart overlay
 *
 * @param mean - Mean of the distribution
 * @param stdDev - Standard deviation
 * @param minX - Minimum x value
 * @param maxX - Maximum x value
 * @param totalCount - Total number of data points (for scaling)
 * @param binWidth - Width of histogram bins
 * @param numPoints - Number of points to generate (default: 50)
 * @returns Array of {x, y} points for the Gaussian curve
 */
export function generateGaussianCurve(
  mean: number,
  stdDev: number,
  minX: number,
  maxX: number,
  totalCount: number,
  binWidth: number,
  numPoints: number = 50
): { x: number; y: number }[] {
  if (stdDev <= 0 || totalCount <= 0) return [];

  const points: { x: number; y: number }[] = [];
  const step = (maxX - minX) / numPoints;

  for (let x = minX; x <= maxX; x += step) {
    // Scale PDF to match histogram counts
    const pdf = gaussianPdf(x, mean, stdDev);
    const y = pdf * totalCount * binWidth;
    points.push({
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 100) / 100,
    });
  }

  return points;
}

/**
 * Calculate R-squared (coefficient of determination)
 * Compares observed histogram buckets to expected Gaussian values
 *
 * @param observed - Array of observed bucket data {midpoint, count}
 * @param mean - Mean for Gaussian calculation
 * @param stdDev - Standard deviation for Gaussian calculation
 * @param totalCount - Total number of data points
 * @param binWidth - Width of histogram bins
 * @returns R-squared value (0 to 1, higher is better fit)
 */
export function calculateRSquared(
  observed: { midpoint: number; count: number }[],
  mean: number,
  stdDev: number,
  totalCount: number,
  binWidth: number
): number {
  if (observed.length === 0 || stdDev <= 0 || totalCount <= 0) return 0;

  // Calculate mean of observed counts
  const observedMean =
    observed.reduce((sum, d) => sum + d.count, 0) / observed.length;

  let ssRes = 0; // Residual sum of squares
  let ssTot = 0; // Total sum of squares

  for (const bucket of observed) {
    const expected = gaussianPdf(bucket.midpoint, mean, stdDev) * totalCount * binWidth;
    ssRes += Math.pow(bucket.count - expected, 2);
    ssTot += Math.pow(bucket.count - observedMean, 2);
  }

  if (ssTot === 0) return 0;
  return Math.max(0, Math.min(1, 1 - ssRes / ssTot));
}

/**
 * R-squared interpretation result
 */
export interface RSquaredInterpretation {
  quality: "Excellent" | "Good" | "Fair" | "Poor";
  color: string;
  description: string;
}

/**
 * Interpret R-squared value into quality categories
 *
 * @param r2 - R-squared value (0 to 1)
 * @returns Interpretation object with quality, color, and description
 */
export function interpretRSquared(r2: number): RSquaredInterpretation {
  if (r2 >= 0.9) {
    return {
      quality: "Excellent",
      color: "#22c55e", // green-500
      description: "Very strong fit to normal distribution",
    };
  }
  if (r2 >= 0.7) {
    return {
      quality: "Good",
      color: "#3b82f6", // blue-500
      description: "Good fit to normal distribution",
    };
  }
  if (r2 >= 0.5) {
    return {
      quality: "Fair",
      color: "#f59e0b", // amber-500
      description: "Moderate fit, distribution may be skewed",
    };
  }
  return {
    quality: "Poor",
    color: "#ef4444", // red-500
    description: "Poor fit, distribution is likely non-normal",
  };
}

/**
 * Calculate standard deviation from an array of numbers
 *
 * @param values - Array of numeric values
 * @returns Standard deviation
 */
export function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Calculate mean from an array of numbers
 *
 * @param values - Array of numeric values
 * @returns Mean value
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
