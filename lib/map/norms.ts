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

export type Term = "fall" | "spring";
export type Course = "Language Usage" | "Reading";

// NWEA 常模數據 (按學年 > 年級 > 學期)
const MAP_NORMS: Record<string, Record<number, Record<Term, NormData>>> = {
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
  },
  // 2025-2026 使用與 2024-2025 相同的常模（NWEA 通常每隔幾年更新一次）
  "2025-2026": {
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
      spring: { languageUsage: 213, reading: 215 },
    },
  },
};

/**
 * 取得特定學年、年級、學期、課程的國家常模
 */
export function getNorm(
  academicYear: string,
  grade: number,
  term: Term,
  course: Course
): number | null {
  const yearNorms = MAP_NORMS[academicYear];
  if (!yearNorms) return null;

  const gradeNorms = yearNorms[grade];
  if (!gradeNorms) return null;

  const termNorms = gradeNorms[term];
  if (!termNorms) return null;

  return course === "Language Usage"
    ? termNorms.languageUsage
    : termNorms.reading;
}

/**
 * 取得特定學年、年級、學期的常模資料
 */
export function getNormData(
  academicYear: string,
  grade: number,
  term: Term
): NormData | null {
  const yearNorms = MAP_NORMS[academicYear];
  if (!yearNorms) return null;

  const gradeNorms = yearNorms[grade];
  if (!gradeNorms) return null;

  return gradeNorms[term] || null;
}

/**
 * 計算常模的平均值 (Language Usage + Reading) / 2
 */
export function getNormAverage(
  academicYear: string,
  grade: number,
  term: Term
): number | null {
  const normData = getNormData(academicYear, grade, term);
  if (!normData) return null;

  return (normData.languageUsage + normData.reading) / 2;
}

/**
 * 取得預期成長值 (Spring - Fall)
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
): Record<number, Record<Term, NormData>> | null {
  return MAP_NORMS[academicYear] || null;
}

/**
 * 解析 term_tested 字串 (如 "Fall 2024-2025") 為 term 和 academicYear
 */
export function parseTermTested(
  termTested: string
): { term: Term; academicYear: string } | null {
  const match = termTested.match(/(Fall|Spring)\s+(\d{4}-\d{4})/);
  if (!match) return null;

  const season = match[1];
  const academicYear = match[2];
  if (!season || !academicYear) return null;

  const term: Term = season.toLowerCase() as Term;

  return { term, academicYear };
}

/**
 * 格式化 term 和 academicYear 為 term_tested 字串
 */
export function formatTermTested(term: Term, academicYear: string): string {
  const season = term === "fall" ? "Fall" : "Spring";
  return `${season} ${academicYear}`;
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

  // 同學年，Fall 在 Spring 之前
  if (parsedA.term === parsedB.term) return 0;
  return parsedA.term === "fall" ? -1 : 1;
}
