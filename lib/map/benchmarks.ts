/**
 * MAP Benchmark Classification Logic
 *
 * Benchmark 分類是基於 Average（兩科平均）來判斷，不是分別看 Language Usage 和 Reading。
 * Average = (Language Usage RIT + Reading RIT) / 2
 *
 * 分類基於 Spring 學期的 Average 成績
 * G6 無 Benchmark 分類（學生畢業）
 */

export interface BenchmarkThreshold {
  e1Threshold: number; // Average >= e1 → E1
  e2Threshold: number; // e2 <= Average < e1 → E2, else E3
}

// 閾值適用於 Average (兩科平均)
const BENCHMARKS: Record<number, BenchmarkThreshold> = {
  3: { e1Threshold: 206, e2Threshold: 183 },
  4: { e1Threshold: 213, e2Threshold: 191 },
  5: { e1Threshold: 218, e2Threshold: 194 },
};

export type BenchmarkLevel = "E1" | "E2" | "E3";

/**
 * 計算兩科平均
 */
export function calculateMapAverage(
  languageUsage: number,
  reading: number
): number {
  return (languageUsage + reading) / 2;
}

/**
 * 基於平均分數分類 Benchmark
 * @param grade - 年級 (3, 4, 5)
 * @param average - 已計算好的兩科平均
 * @returns 'E1' | 'E2' | 'E3' | null (G6 或無效年級回傳 null)
 */
export function classifyBenchmark(
  grade: number,
  average: number
): BenchmarkLevel | null {
  const thresholds = BENCHMARKS[grade];
  if (!thresholds) return null;

  if (average >= thresholds.e1Threshold) return "E1";
  if (average >= thresholds.e2Threshold) return "E2";
  return "E3";
}

/**
 * 取得 Benchmark 閾值 (用於顯示)
 */
export function getBenchmarkThresholds(
  grade: number
): BenchmarkThreshold | null {
  return BENCHMARKS[grade] || null;
}

/**
 * 取得 Benchmark 標籤（含閾值）用於圖表顯示
 */
export function getBenchmarkLabels(grade: number): Record<BenchmarkLevel, string> | null {
  const thresholds = BENCHMARKS[grade];
  if (!thresholds) return null;

  return {
    E1: `E1 (≥${thresholds.e1Threshold})`,
    E2: `E2 (${thresholds.e2Threshold}-${thresholds.e1Threshold - 1})`,
    E3: `E3 (<${thresholds.e2Threshold})`,
  };
}

/**
 * 取得所有支援 Benchmark 的年級
 */
export function getSupportedGrades(): number[] {
  return Object.keys(BENCHMARKS).map(Number);
}

/**
 * 檢查年級是否支援 Benchmark 分類
 */
export function isBenchmarkSupported(grade: number): boolean {
  return grade in BENCHMARKS;
}

// Benchmark 顏色配置
export const BENCHMARK_COLORS: Record<BenchmarkLevel, string> = {
  E1: "#22c55e", // green-500
  E2: "#f97316", // orange-500 (統一與 ENGLISH_LEVEL_COLORS 一致)
  E3: "#ef4444", // red-500
};
