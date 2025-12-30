/**
 * NWEA 2025 Growth Norm Parameters
 * Source: NWEA 2025 Technical Manual
 *
 * 這些參數用於計算 Conditional Growth Percentile (cGP)
 * 包含各年級、學期的 Mean、SD 和 test-retest correlation
 */

import type { GrowthNormParams } from './conditional-growth';
import type { Course } from './norms';

/**
 * Test-retest correlation 典型值
 * 資料來源：NWEA 2025 Technical Manual Section on Growth Norms
 */
export const TYPICAL_CORRELATIONS = {
  'fall-to-winter': 0.90,
  'winter-to-spring': 0.92,
  'fall-to-spring': 0.87,
  'fall-to-fall': 0.85,
  'spring-to-fall': 0.85,  // 跨學年
} as const;

// 不 export，避免與 norms.ts 的 GrowthPeriod 衝突
// 使用 norms.ts 的 GrowthPeriod 作為主要型別
type GrowthParamsPeriod = keyof typeof TYPICAL_CORRELATIONS;

/**
 * NWEA 2025 Growth Norm Parameters
 * 包含各年級、學期的完整成長參數
 */
export const GROWTH_NORM_PARAMS_2025: Record<
  string,  // academic year
  Record<
    number,  // grade
    Record<
      string,  // growth period
      Record<'reading' | 'languageUsage', GrowthNormParams>
    >
  >
> = {
  "2025-2026": {
    3: {
      "fall-to-winter": {
        reading: {
          startMean: 184.69, endMean: 189.89,
          startSD: 18.30, endSD: 18.13,
          correlation: TYPICAL_CORRELATIONS['fall-to-winter'],
        },
        languageUsage: {
          startMean: 184.42, endMean: 189.58,
          startSD: 17.37, endSD: 17.00,
          correlation: TYPICAL_CORRELATIONS['fall-to-winter'],
        },
      },
      "winter-to-spring": {
        reading: {
          startMean: 189.89, endMean: 193.79,
          startSD: 18.13, endSD: 18.15,
          correlation: TYPICAL_CORRELATIONS['winter-to-spring'],
        },
        languageUsage: {
          startMean: 189.58, endMean: 193.44,
          startSD: 17.00, endSD: 16.93,
          correlation: TYPICAL_CORRELATIONS['winter-to-spring'],
        },
      },
      "fall-to-spring": {
        reading: {
          startMean: 184.69, endMean: 193.79,
          startSD: 18.30, endSD: 18.15,
          correlation: TYPICAL_CORRELATIONS['fall-to-spring'],
        },
        languageUsage: {
          startMean: 184.42, endMean: 193.44,
          startSD: 17.37, endSD: 16.93,
          correlation: TYPICAL_CORRELATIONS['fall-to-spring'],
        },
      },
    },
    4: {
      "fall-to-winter": {
        reading: {
          startMean: 195.92, endMean: 199.45,
          startSD: 17.99, endSD: 17.76,
          correlation: TYPICAL_CORRELATIONS['fall-to-winter'],
        },
        languageUsage: {
          startMean: 194.69, endMean: 198.45,
          startSD: 16.81, endSD: 16.46,
          correlation: TYPICAL_CORRELATIONS['fall-to-winter'],
        },
      },
      "winter-to-spring": {
        reading: {
          startMean: 199.45, endMean: 202.09,
          startSD: 17.76, endSD: 17.74,
          correlation: TYPICAL_CORRELATIONS['winter-to-spring'],
        },
        languageUsage: {
          startMean: 198.45, endMean: 201.27,
          startSD: 16.46, endSD: 16.26,
          correlation: TYPICAL_CORRELATIONS['winter-to-spring'],
        },
      },
      "fall-to-spring": {
        reading: {
          startMean: 195.92, endMean: 202.09,
          startSD: 17.99, endSD: 17.74,
          correlation: TYPICAL_CORRELATIONS['fall-to-spring'],
        },
        languageUsage: {
          startMean: 194.69, endMean: 201.27,
          startSD: 16.81, endSD: 16.26,
          correlation: TYPICAL_CORRELATIONS['fall-to-spring'],
        },
      },
    },
    5: {
      "fall-to-winter": {
        reading: {
          startMean: 203.67, endMean: 206.36,
          startSD: 17.45, endSD: 17.21,
          correlation: TYPICAL_CORRELATIONS['fall-to-winter'],
        },
        languageUsage: {
          startMean: 201.87, endMean: 204.79,
          startSD: 16.09, endSD: 15.79,
          correlation: TYPICAL_CORRELATIONS['fall-to-winter'],
        },
      },
      "winter-to-spring": {
        reading: {
          startMean: 206.36, endMean: 208.37,
          startSD: 17.21, endSD: 17.15,
          correlation: TYPICAL_CORRELATIONS['winter-to-spring'],
        },
        languageUsage: {
          startMean: 204.79, endMean: 206.97,
          startSD: 15.79, endSD: 15.67,
          correlation: TYPICAL_CORRELATIONS['winter-to-spring'],
        },
      },
      "fall-to-spring": {
        reading: {
          startMean: 203.67, endMean: 208.37,
          startSD: 17.45, endSD: 17.15,
          correlation: TYPICAL_CORRELATIONS['fall-to-spring'],
        },
        languageUsage: {
          startMean: 201.87, endMean: 206.97,
          startSD: 16.09, endSD: 15.67,
          correlation: TYPICAL_CORRELATIONS['fall-to-spring'],
        },
      },
    },
    6: {
      "fall-to-winter": {
        reading: {
          startMean: 208.95, endMean: 210.72,
          startSD: 16.84, endSD: 16.70,
          correlation: TYPICAL_CORRELATIONS['fall-to-winter'],
        },
        languageUsage: {
          startMean: 206.49, endMean: 208.57,
          startSD: 15.67, endSD: 15.68,
          correlation: TYPICAL_CORRELATIONS['fall-to-winter'],
        },
      },
      "winter-to-spring": {
        reading: {
          startMean: 210.72, endMean: 212.04,
          startSD: 16.70, endSD: 16.67,
          correlation: TYPICAL_CORRELATIONS['winter-to-spring'],
        },
        languageUsage: {
          startMean: 208.57, endMean: 210.12,
          startSD: 15.68, endSD: 15.78,
          correlation: TYPICAL_CORRELATIONS['winter-to-spring'],
        },
      },
      "fall-to-spring": {
        reading: {
          startMean: 208.95, endMean: 212.04,
          startSD: 16.84, endSD: 16.67,
          correlation: TYPICAL_CORRELATIONS['fall-to-spring'],
        },
        languageUsage: {
          startMean: 206.49, endMean: 210.12,
          startSD: 15.67, endSD: 15.78,
          correlation: TYPICAL_CORRELATIONS['fall-to-spring'],
        },
      },
    },
  },
};

/**
 * 取得特定年級、學期、課程的成長參數
 *
 * @param academicYear - 學年 (如 "2025-2026")
 * @param grade - 年級 (3-6)
 * @param period - 成長期間 (如 "fall-to-spring")
 * @param course - 課程 ("Reading" | "Language Usage")
 * @returns 成長參數或 null
 */
export function getGrowthParams(
  academicYear: string,
  grade: number,
  period: string,
  course: Course
): GrowthNormParams | null {
  const yearData = GROWTH_NORM_PARAMS_2025[academicYear];
  if (!yearData) return null;

  const gradeData = yearData[grade];
  if (!gradeData) return null;

  const periodData = gradeData[period];
  if (!periodData) return null;

  const courseKey = course === 'Reading' ? 'reading' : 'languageUsage';
  return periodData[courseKey] || null;
}

/**
 * 檢查是否有可用的成長參數
 */
export function hasGrowthParams(
  academicYear: string,
  grade: number,
  period: string
): boolean {
  const yearData = GROWTH_NORM_PARAMS_2025[academicYear];
  if (!yearData) return false;

  const gradeData = yearData[grade];
  if (!gradeData) return false;

  return period in gradeData;
}

/**
 * 取得所有可用的成長期間
 */
export function getAvailableGrowthPeriods(
  academicYear: string,
  grade: number
): string[] {
  const yearData = GROWTH_NORM_PARAMS_2025[academicYear];
  if (!yearData) return [];

  const gradeData = yearData[grade];
  if (!gradeData) return [];

  return Object.keys(gradeData);
}
