/**
 * NWEA National Norms Data
 *
 * NWEA 提供國家常模資料，用於比較學校表現與全國平均。
 * 常模資料每學年更新。
 */

export interface NormData {
  languageUsage: number;
  reading: number;
}

export interface NormDataWithStdDev {
  languageUsage: number;
  languageUsageStdDev: number;
  reading: number;
  readingStdDev: number;
}

export interface GrowthNormData {
  languageUsage: number;
  languageUsageStdDev: number;
  reading: number;
  readingStdDev: number;
}

/**
 * MapTerm: NWEA MAP testing period (fall/winter/spring)
 * Note: This is distinct from ELA 'Term' (1/2/3/4) in types/academic-year.ts
 */
export type MapTerm = "fall" | "winter" | "spring";
export type Course = "Language Usage" | "Reading";

// For backward compatibility during migration
export type Term = MapTerm;

// NWEA 常模數據 (按學年 > 年級 > MAP 測驗期)
// 資料來源：NWEA 2025 Technical Manual (116 million scores from 13.8 million students, Fall 2022 - Spring 2024)
// 使用 Technical Manual 精確值（小數點後兩位）
const MAP_NORMS: Record<string, Record<number, Partial<Record<MapTerm, NormData>>>> = {
  // 2024-2025 學年使用舊版常模
  "2024-2025": {
    3: {
      fall: { languageUsage: 188, reading: 187 },
      spring: { languageUsage: 198, reading: 197 },
    },
    4: {
      fall: { languageUsage: 197, reading: 197 },
      spring: { languageUsage: 205, reading: 205 },
    },
    5: {
      fall: { languageUsage: 204, reading: 204 },
      spring: { languageUsage: 210, reading: 211 },
    },
    6: {
      fall: { languageUsage: 208, reading: 210 },
      spring: { languageUsage: 212, reading: 214 },
    },
  },
  // 2025-2026 學年使用 2025 NWEA Technical Manual 精確值
  "2025-2026": {
    3: {
      fall: { languageUsage: 184.42, reading: 184.69 },
      winter: { languageUsage: 189.58, reading: 189.89 },
      spring: { languageUsage: 193.44, reading: 193.79 },
    },
    4: {
      fall: { languageUsage: 194.69, reading: 195.92 },
      winter: { languageUsage: 198.45, reading: 199.45 },
      spring: { languageUsage: 201.27, reading: 202.09 },
    },
    5: {
      fall: { languageUsage: 201.87, reading: 203.67 },
      winter: { languageUsage: 204.79, reading: 206.36 },
      spring: { languageUsage: 206.97, reading: 208.37 },
    },
    6: {
      fall: { languageUsage: 206.49, reading: 208.95 },
      winter: { languageUsage: 208.57, reading: 210.72 },
      spring: { languageUsage: 210.12, reading: 212.04 },
    },
  },
};

/**
 * NWEA 2025 Student Achievement Norms with Standard Deviation
 * 資料來源：NWEA 2025 Technical Manual (官方文件)
 * 使用精確值（小數點後兩位）
 */
const MAP_NORMS_WITH_STDDEV: Record<
  string,
  Record<number, Partial<Record<MapTerm, NormDataWithStdDev>>>
> = {
  "2025-2026": {
    3: {
      fall: { languageUsage: 184.42, languageUsageStdDev: 17.37, reading: 184.69, readingStdDev: 18.30 },
      winter: { languageUsage: 189.58, languageUsageStdDev: 17.00, reading: 189.89, readingStdDev: 18.13 },
      spring: { languageUsage: 193.44, languageUsageStdDev: 16.93, reading: 193.79, readingStdDev: 18.15 },
    },
    4: {
      fall: { languageUsage: 194.69, languageUsageStdDev: 16.81, reading: 195.92, readingStdDev: 17.99 },
      winter: { languageUsage: 198.45, languageUsageStdDev: 16.46, reading: 199.45, readingStdDev: 17.76 },
      spring: { languageUsage: 201.27, languageUsageStdDev: 16.26, reading: 202.09, readingStdDev: 17.74 },
    },
    5: {
      fall: { languageUsage: 201.87, languageUsageStdDev: 16.09, reading: 203.67, readingStdDev: 17.45 },
      winter: { languageUsage: 204.79, languageUsageStdDev: 15.79, reading: 206.36, readingStdDev: 17.21 },
      spring: { languageUsage: 206.97, languageUsageStdDev: 15.67, reading: 208.37, readingStdDev: 17.15 },
    },
    6: {
      fall: { languageUsage: 206.49, languageUsageStdDev: 15.67, reading: 208.95, readingStdDev: 16.84 },
      winter: { languageUsage: 208.57, languageUsageStdDev: 15.68, reading: 210.72, readingStdDev: 16.70 },
      spring: { languageUsage: 210.12, languageUsageStdDev: 15.78, reading: 212.04, readingStdDev: 16.67 },
    },
  },
};

/**
 * NWEA 2025 Student Growth Norms
 * 資料來源：NWEA 2025 Norms Quick Reference + Technical Manual (官方文件)
 * 提供 Fall-to-Winter, Winter-to-Spring, Fall-to-Spring, Fall-to-Fall 四種成長期間
 * Fall-to-Fall 代表跨學年成長 (如 G3 Fall → G4 Fall)
 */
type GrowthPeriod = "fall-to-winter" | "winter-to-spring" | "fall-to-spring" | "fall-to-fall";

const MAP_GROWTH_NORMS: Record<
  string,
  Record<number, Partial<Record<GrowthPeriod, GrowthNormData>>>
> = {
  // 2024-2025 學年使用 2020 Norms（同 MAP_NORMS 的 2024-2025 值）
  // 這些是近似值，用於計算 Growth Index
  "2024-2025": {
    3: {
      "fall-to-winter": { languageUsage: 5, languageUsageStdDev: 8, reading: 5, readingStdDev: 9 },
      "winter-to-spring": { languageUsage: 5, languageUsageStdDev: 8, reading: 5, readingStdDev: 9 },
      "fall-to-spring": { languageUsage: 10, languageUsageStdDev: 9, reading: 10, readingStdDev: 9 },
      "fall-to-fall": { languageUsage: 9, languageUsageStdDev: 9, reading: 9, readingStdDev: 10 },
    },
    4: {
      "fall-to-winter": { languageUsage: 4, languageUsageStdDev: 8, reading: 4, readingStdDev: 8 },
      "winter-to-spring": { languageUsage: 4, languageUsageStdDev: 8, reading: 4, readingStdDev: 8 },
      "fall-to-spring": { languageUsage: 8, languageUsageStdDev: 8, reading: 8, readingStdDev: 9 },
      "fall-to-fall": { languageUsage: 6, languageUsageStdDev: 8, reading: 5, readingStdDev: 9 },
    },
    5: {
      "fall-to-winter": { languageUsage: 3, languageUsageStdDev: 8, reading: 4, readingStdDev: 8 },
      "winter-to-spring": { languageUsage: 3, languageUsageStdDev: 7, reading: 3, readingStdDev: 8 },
      "fall-to-spring": { languageUsage: 6, languageUsageStdDev: 8, reading: 7, readingStdDev: 9 },
      "fall-to-fall": { languageUsage: 4, languageUsageStdDev: 8, reading: 4, readingStdDev: 9 },
    },
    6: {
      "fall-to-winter": { languageUsage: 2, languageUsageStdDev: 8, reading: 2, readingStdDev: 8 },
      "winter-to-spring": { languageUsage: 2, languageUsageStdDev: 8, reading: 2, readingStdDev: 8 },
      "fall-to-spring": { languageUsage: 4, languageUsageStdDev: 8, reading: 4, readingStdDev: 8 },
      "fall-to-fall": { languageUsage: 3, languageUsageStdDev: 8, reading: 3, readingStdDev: 9 },
    },
  },
  "2025-2026": {
    3: {
      "fall-to-winter": { languageUsage: 5, languageUsageStdDev: 8, reading: 5, readingStdDev: 9 },
      "winter-to-spring": { languageUsage: 4, languageUsageStdDev: 8, reading: 4, readingStdDev: 9 },
      "fall-to-spring": { languageUsage: 9, languageUsageStdDev: 9, reading: 9, readingStdDev: 9 },
      // Fall-to-Fall: G3 Fall → G4 Fall (跨學年成長)
      // 資料來源：NWEA 2025 Technical Manual Table C.3 & C.5
      "fall-to-fall": { languageUsage: 10.46, languageUsageStdDev: 9.18, reading: 11.20, readingStdDev: 9.69 },
    },
    4: {
      "fall-to-winter": { languageUsage: 4, languageUsageStdDev: 8, reading: 4, readingStdDev: 8 },
      "winter-to-spring": { languageUsage: 3, languageUsageStdDev: 8, reading: 3, readingStdDev: 8 },
      "fall-to-spring": { languageUsage: 7, languageUsageStdDev: 8, reading: 6, readingStdDev: 9 },
      // Fall-to-Fall: G4 Fall → G5 Fall
      "fall-to-fall": { languageUsage: 7.62, languageUsageStdDev: 8.39, reading: 7.68, readingStdDev: 9.11 },
    },
    5: {
      "fall-to-winter": { languageUsage: 3, languageUsageStdDev: 8, reading: 3, readingStdDev: 8 },
      "winter-to-spring": { languageUsage: 2, languageUsageStdDev: 7, reading: 2, readingStdDev: 8 },
      "fall-to-spring": { languageUsage: 5, languageUsageStdDev: 8, reading: 5, readingStdDev: 9 },
      // Fall-to-Fall: G5 Fall → G6 Fall
      "fall-to-fall": { languageUsage: 5.34, languageUsageStdDev: 8.25, reading: 5.75, readingStdDev: 8.96 },
    },
    6: {
      "fall-to-winter": { languageUsage: 2, languageUsageStdDev: 8, reading: 2, readingStdDev: 8 },
      "winter-to-spring": { languageUsage: 2, languageUsageStdDev: 8, reading: 1, readingStdDev: 8 },
      "fall-to-spring": { languageUsage: 4, languageUsageStdDev: 8, reading: 3, readingStdDev: 8 },
      // Fall-to-Fall: G6 Fall → G7 Fall
      "fall-to-fall": { languageUsage: 3.99, languageUsageStdDev: 8.42, reading: 3.86, readingStdDev: 8.85 },
    },
  },
};

/**
 * 取得特定學年、年級、MAP 測驗期、課程的國家常模
 */
export function getNorm(
  academicYear: string,
  grade: number,
  mapTerm: MapTerm,
  course: Course
): number | null {
  const yearNorms = MAP_NORMS[academicYear];
  if (!yearNorms) return null;

  const gradeNorms = yearNorms[grade];
  if (!gradeNorms) return null;

  const termNorms = gradeNorms[mapTerm];
  if (!termNorms) return null;

  return course === "Language Usage"
    ? termNorms.languageUsage
    : termNorms.reading;
}

/**
 * 取得特定學年、年級、MAP 測驗期的常模資料
 */
export function getNormData(
  academicYear: string,
  grade: number,
  mapTerm: MapTerm
): NormData | null {
  const yearNorms = MAP_NORMS[academicYear];
  if (!yearNorms) return null;

  const gradeNorms = yearNorms[grade];
  if (!gradeNorms) return null;

  return gradeNorms[mapTerm] || null;
}

/**
 * 計算常模的平均值 (Language Usage + Reading) / 2
 */
export function getNormAverage(
  academicYear: string,
  grade: number,
  mapTerm: MapTerm
): number | null {
  const normData = getNormData(academicYear, grade, mapTerm);
  if (!normData) return null;

  return (normData.languageUsage + normData.reading) / 2;
}

/**
 * 取得預期成長值 (Spring - Fall) - 學年內成長
 */
export function getExpectedGrowth(
  academicYear: string,
  grade: number,
  course: Course
): number | null {
  const fallNorm = getNorm(academicYear, grade, "fall", course);
  const springNorm = getNorm(academicYear, grade, "spring", course);

  if (fallNorm === null || springNorm === null) return null;

  return springNorm - fallNorm;
}

/**
 * 取得跨學年預期成長值 (Year 2 Fall - Year 1 Fall)
 *
 * 例如：G4 Fall 2024-2025 → G5 Fall 2025-2026
 * 預期成長 = G5 Fall Norm - G4 Fall Norm
 *
 * @param fromAcademicYear - 起始學年 (如 "2024-2025")
 * @param toAcademicYear - 結束學年 (如 "2025-2026")
 * @param fromGrade - 起始年級 (如 4)
 * @param toGrade - 結束年級 (如 5)
 * @param course - 課程
 */
export function getExpectedYearOverYearGrowth(
  fromAcademicYear: string,
  toAcademicYear: string,
  fromGrade: number,
  toGrade: number,
  course: Course
): number | null {
  const fromFallNorm = getNorm(fromAcademicYear, fromGrade, "fall", course);
  const toFallNorm = getNorm(toAcademicYear, toGrade, "fall", course);

  if (fromFallNorm === null || toFallNorm === null) return null;

  return toFallNorm - fromFallNorm;
}

/**
 * 取得所有可用的學年
 */
export function getAvailableAcademicYears(): string[] {
  return Object.keys(MAP_NORMS).sort().reverse();
}

/**
 * 取得特定學年的所有年級常模
 */
export function getYearNorms(
  academicYear: string
): Record<number, Partial<Record<MapTerm, NormData>>> | null {
  return MAP_NORMS[academicYear] || null;
}

/**
 * 解析 term_tested 字串 (如 "Fall 2024-2025") 為 mapTerm 和 academicYear
 */
export function parseTermTested(
  termTested: string
): { mapTerm: MapTerm; academicYear: string } | null {
  const match = termTested.match(/(Fall|Winter|Spring)\s+(\d{4}-\d{4})/i);
  if (!match) return null;

  const season = match[1];
  const academicYear = match[2];
  if (!season || !academicYear) return null;

  const mapTerm: MapTerm = season.toLowerCase() as MapTerm;

  return { mapTerm, academicYear };
}

/**
 * 格式化 mapTerm 和 academicYear 為 term_tested 字串
 */
export function formatTermTested(mapTerm: MapTerm, academicYear: string): string {
  const seasonMap: Record<MapTerm, string> = {
    fall: "Fall",
    winter: "Winter",
    spring: "Spring",
  };
  return `${seasonMap[mapTerm]} ${academicYear}`;
}

/**
 * 比較兩個 term_tested 的順序
 * 回傳負數表示 a 在 b 之前，正數表示 a 在 b 之後
 */
export function compareTermTested(a: string, b: string): number {
  const parsedA = parseTermTested(a);
  const parsedB = parseTermTested(b);

  if (!parsedA || !parsedB) return 0;

  // 比較學年
  if (parsedA.academicYear !== parsedB.academicYear) {
    return parsedA.academicYear.localeCompare(parsedB.academicYear);
  }

  // 同學年，按 fall -> winter -> spring 順序排列
  const order: Record<MapTerm, number> = { fall: 0, winter: 1, spring: 2 };
  return order[parsedA.mapTerm] - order[parsedB.mapTerm];
}

// ============================================================
// NWEA 2025 Norms with Standard Deviation Functions
// ============================================================

/**
 * 取得特定學年、年級、MAP 測驗期的常模資料（含標準差）
 */
export function getNormDataWithStdDev(
  academicYear: string,
  grade: number,
  mapTerm: MapTerm
): NormDataWithStdDev | null {
  const yearNorms = MAP_NORMS_WITH_STDDEV[academicYear];
  if (!yearNorms) return null;

  const gradeNorms = yearNorms[grade];
  if (!gradeNorms) return null;

  return gradeNorms[mapTerm] || null;
}

/**
 * 取得特定學年、年級、MAP 測驗期、課程的標準差
 */
export function getNormStdDev(
  academicYear: string,
  grade: number,
  mapTerm: MapTerm,
  course: Course
): number | null {
  const data = getNormDataWithStdDev(academicYear, grade, mapTerm);
  if (!data) return null;

  return course === "Language Usage" ? data.languageUsageStdDev : data.readingStdDev;
}

/**
 * 取得 NWEA 2025 成長常模
 *
 * @param academicYear - 學年 (如 "2025-2026")
 * @param grade - 年級 (3-6)
 * @param period - 成長期間 ("fall-to-winter" | "winter-to-spring" | "fall-to-spring")
 */
export function getGrowthNorm(
  academicYear: string,
  grade: number,
  period: GrowthPeriod
): GrowthNormData | null {
  const yearNorms = MAP_GROWTH_NORMS[academicYear];
  if (!yearNorms) return null;

  const gradeNorms = yearNorms[grade];
  if (!gradeNorms) return null;

  return gradeNorms[period] || null;
}

/**
 * 取得特定課程的成長常模
 */
export function getGrowthNormByCourse(
  academicYear: string,
  grade: number,
  period: GrowthPeriod,
  course: Course
): { mean: number; stdDev: number } | null {
  const data = getGrowthNorm(academicYear, grade, period);
  if (!data) return null;

  if (course === "Language Usage") {
    return { mean: data.languageUsage, stdDev: data.languageUsageStdDev };
  } else {
    return { mean: data.reading, stdDev: data.readingStdDev };
  }
}

/**
 * 輔助函數：將兩個 mapTerm 轉換為成長期間
 *
 * @param fromTerm - 起始測驗期
 * @param toTerm - 結束測驗期
 * @param isCrossYear - 是否跨學年 (用於 fall-to-fall 判斷)
 */
export function mapTermsToGrowthPeriod(
  fromTerm: MapTerm,
  toTerm: MapTerm,
  isCrossYear: boolean = false
): GrowthPeriod | null {
  if (fromTerm === "fall" && toTerm === "winter") return "fall-to-winter";
  if (fromTerm === "winter" && toTerm === "spring") return "winter-to-spring";
  if (fromTerm === "fall" && toTerm === "spring") return "fall-to-spring";
  // Fall-to-Fall: 跨學年成長 (如 G3 Fall 2024-25 → G4 Fall 2025-26)
  if (fromTerm === "fall" && toTerm === "fall" && isCrossYear) return "fall-to-fall";
  return null;
}

// Export GrowthPeriod type
export type { GrowthPeriod };
