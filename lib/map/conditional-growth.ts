/**
 * Conditional Growth Percentile (cGP) Calculation
 * 基於 NWEA 2025 Technical Manual
 *
 * 重要概念：成長百分位數是基於起始 RIT 的「條件分佈」
 * - 高起始分數的學生預期成長較低（回歸到平均效應）
 * - 使用 marginal growth 會對高分者不公平，對低分者過度樂觀
 *
 * 數學模型：
 * Observed Growth = y₂ - y₁
 * Expected Growth (conditional) = μ_Δ + β × (y₁ - μ₁)
 * Growth Percentile = Φ((Observed - Expected) / σ_conditional) × 100
 */

export interface GrowthNormParams {
  startMean: number;      // μ₁ - 起始 RIT 平均值
  endMean: number;        // μ₂ - 結束 RIT 平均值
  startSD: number;        // σ₁ - 起始 RIT 標準差
  endSD: number;          // σ₂ - 結束 RIT 標準差
  correlation: number;    // ρ - test-retest correlation
}

/**
 * 計算條件成長百分位數
 *
 * @param startRit - 起始 RIT 分數
 * @param endRit - 結束 RIT 分數
 * @param params - 成長常模參數
 * @returns 成長百分位數 (1-99)
 *
 * @example
 * ```typescript
 * const params: GrowthNormParams = {
 *   startMean: 195.92,  // G4 Reading Fall mean
 *   endMean: 202.09,    // G4 Reading Spring mean
 *   startSD: 17.99,
 *   endSD: 17.74,
 *   correlation: 0.87
 * };
 *
 * // 學生從 210 → 215 (5 點成長)
 * // 因為起始分數高於平均 14 點，條件預期成長較低
 * const percentile = calculateConditionalGrowthPercentile(210, 215, params);
 * // ~55th percentile (略高於該起點的平均成長)
 * ```
 */
export function calculateConditionalGrowthPercentile(
  startRit: number,
  endRit: number,
  params: GrowthNormParams
): number {
  const { startMean, endMean, startSD, endSD, correlation } = params;

  // Marginal growth statistics
  const marginalGrowthMean = endMean - startMean;
  const marginalGrowthSD = Math.sqrt(
    startSD ** 2 + endSD ** 2 - 2 * correlation * startSD * endSD
  );

  // Covariance between start score and growth
  // Cov(Y₁, Δ) = Cov(Y₁, Y₂ - Y₁) = ρσ₁σ₂ - σ₁²
  const covStartGrowth = correlation * startSD * endSD - startSD ** 2;

  // Regression coefficient: β = Cov(Y₁, Δ) / Var(Y₁)
  const beta = covStartGrowth / (startSD ** 2);

  // Conditional expectation: E[Δ | Y₁ = y₁] = μ_Δ + β(y₁ - μ₁)
  const conditionalMean = marginalGrowthMean + beta * (startRit - startMean);

  // Conditional variance: Var(Δ | Y₁) = σ_Δ² × (1 - R²)
  const r2 = (covStartGrowth ** 2) / (startSD ** 2 * marginalGrowthSD ** 2);
  const conditionalSD = marginalGrowthSD * Math.sqrt(1 - r2);

  // Observed growth
  const observedGrowth = endRit - startRit;

  // Z-score
  const z = (observedGrowth - conditionalMean) / conditionalSD;

  // Convert to percentile using standard normal CDF
  const percentile = normalCDF(z) * 100;

  return Math.max(1, Math.min(99, Math.round(percentile)));
}

/**
 * 計算條件預期成長值
 *
 * @param startRit - 起始 RIT 分數
 * @param params - 成長常模參數
 * @returns 基於起始分數的條件預期成長
 */
export function calculateConditionalExpectedGrowth(
  startRit: number,
  params: GrowthNormParams
): number {
  const { startMean, endMean, startSD, endSD, correlation } = params;

  // Marginal growth mean
  const marginalGrowthMean = endMean - startMean;

  // Covariance between start score and growth
  const covStartGrowth = correlation * startSD * endSD - startSD ** 2;

  // Regression coefficient
  const beta = covStartGrowth / (startSD ** 2);

  // Conditional expectation
  return marginalGrowthMean + beta * (startRit - startMean);
}

/**
 * 取得成長百分位數的等級標籤
 */
export function getGrowthPercentileLevel(percentile: number): {
  level: 'low' | 'lowAvg' | 'avg' | 'highAvg' | 'high';
  label: string;
  color: string;
} {
  if (percentile < 21) {
    return { level: 'low', label: 'Low', color: '#ef4444' };
  } else if (percentile < 41) {
    return { level: 'lowAvg', label: 'Low-Average', color: '#f59e0b' };
  } else if (percentile < 61) {
    return { level: 'avg', label: 'Average', color: '#3b82f6' };
  } else if (percentile < 81) {
    return { level: 'highAvg', label: 'High-Average', color: '#10b981' };
  } else {
    return { level: 'high', label: 'High', color: '#22c55e' };
  }
}

/**
 * Standard Normal CDF 計算
 * 使用 Abramowitz and Stegun 近似法
 */
function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * y);
}
