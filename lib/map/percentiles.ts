/**
 * NWEA MAP RIT to Percentile Conversion
 *
 * 基於 NWEA 2025 Norms 資料，計算 RIT 分數對應的百分位數。
 *
 * 資料來源：
 * - NWEA 2025 MAP Growth Norms Technical Manual
 * - 基於 13.8 million students, Fall 2022 - Spring 2024
 *
 * 計算方法：
 * 使用 NWEA 常模的 50th percentile (mean) 和標準差 (SD) 進行正態分布計算。
 * SD 約為 15-18 RIT points，因年級和科目而異。
 */

import type { MapTerm, Course } from "./norms";

/**
 * 標準差數據 (按年級、MAP 測驗期、科目)
 * 來源：NWEA Norms 統計分析，SD 範圍約 15-18
 */
interface SDData {
  reading: number;
  languageUsage: number;
}

// NWEA 2025 Technical Manual 精確標準差值
// 使用小數點後兩位精確值
const SD_DATA: Record<number, Partial<Record<MapTerm, SDData>>> = {
  3: {
    fall: { reading: 18.30, languageUsage: 17.37 },
    winter: { reading: 18.13, languageUsage: 17.00 },
    spring: { reading: 18.15, languageUsage: 16.93 },
  },
  4: {
    fall: { reading: 17.99, languageUsage: 16.81 },
    winter: { reading: 17.76, languageUsage: 16.46 },
    spring: { reading: 17.74, languageUsage: 16.26 },
  },
  5: {
    fall: { reading: 17.45, languageUsage: 16.09 },
    winter: { reading: 17.21, languageUsage: 15.79 },
    spring: { reading: 17.15, languageUsage: 15.67 },
  },
  6: {
    fall: { reading: 16.84, languageUsage: 15.67 },
    winter: { reading: 16.70, languageUsage: 15.68 },
    spring: { reading: 16.67, languageUsage: 15.78 },
  },
};

// 50th percentile (mean) RIT scores - NWEA 2025 Technical Manual 精確值
const MEAN_RIT: Record<string, Record<number, Partial<Record<MapTerm, SDData>>>> = {
  "2024-2025": {
    3: {
      fall: { reading: 187, languageUsage: 188 },
      spring: { reading: 197, languageUsage: 198 },
    },
    4: {
      fall: { reading: 197, languageUsage: 197 },
      spring: { reading: 205, languageUsage: 205 },
    },
    5: {
      fall: { reading: 204, languageUsage: 204 },
      spring: { reading: 211, languageUsage: 210 },
    },
    6: {
      fall: { reading: 210, languageUsage: 208 },
      spring: { reading: 214, languageUsage: 212 },
    },
  },
  "2025-2026": {
    3: {
      fall: { reading: 184.69, languageUsage: 184.42 },
      winter: { reading: 189.89, languageUsage: 189.58 },
      spring: { reading: 193.79, languageUsage: 193.44 },
    },
    4: {
      fall: { reading: 195.92, languageUsage: 194.69 },
      winter: { reading: 199.45, languageUsage: 198.45 },
      spring: { reading: 202.09, languageUsage: 201.27 },
    },
    5: {
      fall: { reading: 203.67, languageUsage: 201.87 },
      winter: { reading: 206.36, languageUsage: 204.79 },
      spring: { reading: 208.37, languageUsage: 206.97 },
    },
    6: {
      fall: { reading: 208.95, languageUsage: 206.49 },
      winter: { reading: 210.72, languageUsage: 208.57 },
      spring: { reading: 212.04, languageUsage: 210.12 },
    },
  },
};

/**
 * 標準正態分布累積分布函數 (CDF)
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
  const absZ = Math.abs(z);

  const t = 1.0 / (1.0 + p * absZ);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ / 2);

  return 0.5 * (1.0 + sign * y);
}

/**
 * 計算 RIT 分數對應的 Percentile
 *
 * @param rit - RIT 分數
 * @param grade - 年級 (3-6)
 * @param mapTerm - MAP 測驗期 (fall/winter/spring)
 * @param course - 科目 (Reading/Language Usage)
 * @param academicYear - 學年 (預設 "2024-2025")
 * @returns Percentile (1-99)
 */
export function ritToPercentile(
  rit: number,
  grade: number,
  mapTerm: MapTerm,
  course: Course,
  academicYear: string = "2024-2025"
): number {
  // 取得常模數據
  const yearData = MEAN_RIT[academicYear] ?? MEAN_RIT["2024-2025"];
  if (!yearData) return 50; // 無資料時回傳中位數

  const gradeData = yearData[grade];
  if (!gradeData) return 50;

  const termData = gradeData[mapTerm];
  if (!termData) return 50;

  const sdData = SD_DATA[grade]?.[mapTerm];
  if (!sdData) return 50;

  // 取得 mean 和 SD
  const mean = course === "Reading" ? termData.reading : termData.languageUsage;
  const sd = course === "Reading" ? sdData.reading : sdData.languageUsage;

  // 計算 z-score
  const z = (rit - mean) / sd;

  // 使用 CDF 計算 percentile
  const percentile = Math.round(normalCDF(z) * 100);

  // 限制範圍 1-99
  return Math.max(1, Math.min(99, percentile));
}

/**
 * 計算 Percentile Range (低-中-高)
 * 考慮標準誤差 (Standard Error = ±3)
 *
 * @param rit - RIT 分數
 * @param grade - 年級 (3-6)
 * @param mapTerm - MAP 測驗期 (fall/winter/spring)
 * @param course - 科目 (Reading/Language Usage)
 * @param academicYear - 學年
 * @param stdError - 標準誤差 (預設 3)
 * @returns { low, mid, high } percentile range
 */
export function getPercentileRange(
  rit: number,
  grade: number,
  mapTerm: MapTerm,
  course: Course,
  academicYear: string = "2024-2025",
  stdError: number = 3
): { low: number; mid: number; high: number } {
  const low = ritToPercentile(rit - stdError, grade, mapTerm, course, academicYear);
  const mid = ritToPercentile(rit, grade, mapTerm, course, academicYear);
  const high = ritToPercentile(rit + stdError, grade, mapTerm, course, academicYear);

  return { low, mid, high };
}

/**
 * 格式化 Percentile Range 為顯示字串
 * 例如: "23-29-36"
 */
export function formatPercentileRange(range: { low: number; mid: number; high: number }): string {
  return `${range.low}-${range.mid}-${range.high}`;
}

/**
 * 根據 Percentile 判斷表現等級
 */
export function getPercentileLevel(percentile: number): "low" | "below_avg" | "avg" | "above_avg" | "high" {
  if (percentile < 21) return "low";
  if (percentile < 41) return "below_avg";
  if (percentile < 61) return "avg";
  if (percentile < 81) return "above_avg";
  return "high";
}

/**
 * 取得 Percentile 等級的顯示標籤
 */
export function getPercentileLevelLabel(level: ReturnType<typeof getPercentileLevel>): string {
  const labels: Record<typeof level, string> = {
    low: "Low",
    below_avg: "Below Average",
    avg: "Average",
    above_avg: "Above Average",
    high: "High",
  };
  return labels[level];
}
