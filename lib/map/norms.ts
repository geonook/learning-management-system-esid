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

/**
 * MapTerm: NWEA MAP testing period (fall/winter/spring)
 * Note: This is distinct from ELA 'Term' (1/2/3/4) in types/academic-year.ts
 */
export type MapTerm = "fall" | "winter" | "spring";
export type Course = "Language Usage" | "Reading";

// For backward compatibility during migration
export type Term = MapTerm;

// NWEA 常模數據 (按學年 > 年級 > MAP 測驗期)
// 資料來源：NWEA 2025 Norms (116 million scores from 13.8 million students, Fall 2022 - Spring 2024)
// 注意：winter 資料目前未使用，故為 Partial
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
  // 2025-2026 學年使用 2025 NWEA Norms (更新版)
  "2025-2026": {
    3: {
      fall: { languageUsage: 184, reading: 185 },
      spring: { languageUsage: 193, reading: 194 },
    },
    4: {
      fall: { languageUsage: 195, reading: 196 },
      spring: { languageUsage: 201, reading: 202 },
    },
    5: {
      fall: { languageUsage: 202, reading: 204 },
      spring: { languageUsage: 207, reading: 208 },
    },
    6: {
      fall: { languageUsage: 206, reading: 209 },
      spring: { languageUsage: 210, reading: 212 },
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
