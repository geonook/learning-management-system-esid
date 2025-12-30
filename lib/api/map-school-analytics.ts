/**
 * MAP School Analytics API
 *
 * 提供跨年級的 MAP 統計分析功能，用於 School Tab
 * 資料來源：map_assessments 表
 *
 * Permission Model:
 * - All authenticated users can read school analytics
 */

import { createClient } from "@/lib/supabase/client";
import { requireAuth } from "./permissions";
import {
  getNorm,
  getNormAverage,
  parseTermTested,
  compareTermTested,
  type MapTerm,
  type Course,
} from "@/lib/map/norms";

// ============================================================
// Types
// ============================================================

export interface CrossGradeStats {
  grade: number;
  course: Course | "Average";
  termTested: string;
  academicYear: string;
  mapTerm: MapTerm;
  studentCount: number;
  meanRit: number;
  stdDev: number;
  norm: number | null;
  vsNorm: number | null;
}

export interface SchoolOverviewData {
  termTested: string;
  academicYear: string;
  mapTerm: MapTerm;
  grades: CrossGradeStats[];
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * 計算標準差
 */
function calculateStdDev(scores: number[]): number {
  if (scores.length === 0) return 0;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const squaredDiffs = scores.map((score) => Math.pow(score - mean, 2));
  const avgSquaredDiff =
    squaredDiffs.reduce((a, b) => a + b, 0) / scores.length;
  return Math.sqrt(avgSquaredDiff);
}

// ============================================================
// Cross-Grade Analytics API
// ============================================================

/**
 * 取得跨年級統計資料（G3-G6）
 *
 * Permission: All authenticated users
 */
export async function getCrossGradeStats(params: {
  termTested?: string;
  course?: Course | "Average";
}): Promise<SchoolOverviewData | null> {
  await requireAuth();
  const supabase = createClient();

  // 決定要使用的 term
  let targetTerm = params.termTested;
  if (!targetTerm) {
    // 找最近的 term
    const { data: termsData } = await supabase
      .from("map_assessments")
      .select("term_tested")
      .order("term_tested", { ascending: false })
      .limit(1);

    targetTerm = termsData?.[0]?.term_tested;
  }

  if (!targetTerm) return null;

  // 解析 term
  const parsed = parseTermTested(targetTerm);
  if (!parsed) return null;

  // 查詢該學期的所有 G3-G6 資料
  const { data, error } = await supabase
    .from("map_assessments")
    .select(
      `
      grade,
      course,
      rit_score,
      student_id,
      students:student_id (
        is_active
      )
    `
    )
    .eq("term_tested", targetTerm)
    .in("grade", [3, 4, 5, 6])
    .not("student_id", "is", null);

  if (error) {
    console.error("Error fetching cross-grade stats:", error);
    return null;
  }

  if (!data || data.length === 0) return null;

  // 過濾已停用的學生
  const activeData = data.filter((d) => {
    const student = d.students as unknown as { is_active: boolean } | null;
    return student?.is_active === true;
  });

  // 分組計算統計
  interface GradeGroup {
    languageUsage: number[];
    reading: number[];
  }
  const gradeGroups = new Map<number, GradeGroup>();

  for (const row of activeData) {
    let group = gradeGroups.get(row.grade);
    if (!group) {
      group = { languageUsage: [], reading: [] };
      gradeGroups.set(row.grade, group);
    }

    if (row.course === "Language Usage") {
      group.languageUsage.push(row.rit_score);
    } else if (row.course === "Reading") {
      group.reading.push(row.rit_score);
    }
  }

  // 構建結果
  const grades: CrossGradeStats[] = [];
  const coursesToProcess: (Course | "Average")[] = params.course
    ? [params.course]
    : ["Language Usage", "Reading", "Average"];

  for (const grade of [3, 4, 5, 6]) {
    const group = gradeGroups.get(grade);
    if (!group) continue;

    for (const course of coursesToProcess) {
      let scores: number[];
      let norm: number | null;

      if (course === "Average") {
        // 計算平均：取兩科都有的學生
        const minLen = Math.min(
          group.languageUsage.length,
          group.reading.length
        );
        scores = [];
        for (let i = 0; i < minLen; i++) {
          const lu = group.languageUsage[i];
          const rd = group.reading[i];
          if (lu !== undefined && rd !== undefined) {
            scores.push((lu + rd) / 2);
          }
        }
        norm = getNormAverage(parsed.academicYear, grade, parsed.mapTerm);
      } else if (course === "Language Usage") {
        scores = group.languageUsage;
        norm = getNorm(
          parsed.academicYear,
          grade,
          parsed.mapTerm,
          "Language Usage"
        );
      } else {
        scores = group.reading;
        norm = getNorm(parsed.academicYear, grade, parsed.mapTerm, "Reading");
      }

      if (scores.length === 0) continue;

      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      const stdDev = calculateStdDev(scores);

      grades.push({
        grade,
        course,
        termTested: targetTerm,
        academicYear: parsed.academicYear,
        mapTerm: parsed.mapTerm,
        studentCount: scores.length,
        meanRit: Math.round(mean * 10) / 10,
        stdDev: Math.round(stdDev * 10) / 10,
        norm,
        vsNorm: norm !== null ? Math.round((mean - norm) * 10) / 10 : null,
      });
    }
  }

  return {
    termTested: targetTerm,
    academicYear: parsed.academicYear,
    mapTerm: parsed.mapTerm,
    grades: grades.sort((a, b) => {
      if (a.grade !== b.grade) return a.grade - b.grade;
      return a.course.localeCompare(b.course);
    }),
  };
}

/**
 * 取得所有可用的學期（用於下拉選單）
 */
export async function getAvailableSchoolTerms(): Promise<string[]> {
  await requireAuth();
  const supabase = createClient();

  const { data, error } = await supabase
    .from("map_assessments")
    .select("term_tested")
    .order("term_tested", { ascending: false });

  if (error) {
    console.error("Error fetching available terms:", error);
    return [];
  }

  // 取得唯一值並按時間排序（從新到舊）
  const terms = [...new Set(data?.map((d) => d.term_tested) || [])];
  return terms.sort(compareTermTested).reverse();
}

// ============================================================
// Growth Distribution API
// ============================================================

export interface GrowthDistributionBucket {
  range: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
  isNegative: boolean;
}

export interface SchoolGrowthDistributionData {
  fromTerm: string;
  toTerm: string;
  totalStudents: number;
  negativeGrowthCount: number;
  negativeGrowthPercentage: number;
  meanGrowth: number;
  stdDev: number;
  distribution: GrowthDistributionBucket[];
}

/**
 * 取得全校 Fall-to-Fall 成長分佈
 *
 * 根據 termTested 參數決定成長期間：
 * - 如果 termTested 是 Fall term，則使用該 term 作為 toTerm，前一個 Fall 作為 fromTerm
 * - 如果未指定或不是 Fall term，則使用最近的兩個 Fall terms
 *
 * Permission: All authenticated users
 */
export async function getSchoolGrowthDistribution(params?: {
  termTested?: string;
}): Promise<SchoolGrowthDistributionData | null> {
  await requireAuth();
  const supabase = createClient();

  // 動態查找可用的 Fall terms (Fall-to-Fall 成長)
  const { data: termsData } = await supabase
    .from("map_assessments")
    .select("term_tested")
    .like("term_tested", "Fall %")
    .in("grade", [3, 4, 5, 6]);

  if (!termsData || termsData.length === 0) return null;

  // 取得唯一的 Fall terms 並排序（由舊到新）
  const fallTerms = [...new Set(termsData.map((d) => d.term_tested))].sort(
    compareTermTested
  );
  if (fallTerms.length < 2) return null; // 需要至少兩個 Fall terms

  // 決定 fromTerm 和 toTerm
  let fromTerm: string;
  let toTerm: string;

  // 檢查 termTested 是否為 Fall term
  const selectedTerm = params?.termTested;
  if (selectedTerm && selectedTerm.startsWith("Fall ")) {
    // 找到 selectedTerm 在 fallTerms 中的位置
    const selectedIndex = fallTerms.indexOf(selectedTerm);
    if (selectedIndex > 0) {
      // 使用選擇的 term 作為 toTerm，前一個作為 fromTerm
      toTerm = selectedTerm;
      fromTerm = fallTerms[selectedIndex - 1];
    } else {
      // selectedTerm 是最早的 Fall 或不存在，使用最近的兩個
      fromTerm = fallTerms[fallTerms.length - 2];
      toTerm = fallTerms[fallTerms.length - 1];
    }
  } else {
    // 未指定或不是 Fall term，使用最近的兩個 Fall terms
    fromTerm = fallTerms[fallTerms.length - 2];
    toTerm = fallTerms[fallTerms.length - 1];
  }

  if (!fromTerm || !toTerm) return null;

  // 查詢兩個學期的資料
  const { data, error } = await supabase
    .from("map_assessments")
    .select(
      `
      student_number,
      term_tested,
      course,
      rit_score,
      grade,
      student_id,
      students:student_id (
        is_active
      )
    `
    )
    .in("term_tested", [fromTerm, toTerm])
    .in("grade", [3, 4, 5, 6])
    .not("student_id", "is", null);

  if (error) {
    console.error("Error fetching growth distribution:", error);
    return null;
  }

  if (!data || data.length === 0) return null;

  // 過濾已停用的學生
  const activeData = data.filter((d) => {
    const student = d.students as unknown as { is_active: boolean } | null;
    return student?.is_active === true;
  });

  // 按學生分組計算成長
  interface StudentGrowth {
    fromLU: number | null;
    toLU: number | null;
    fromRD: number | null;
    toRD: number | null;
  }
  const studentMap = new Map<string, StudentGrowth>();

  for (const row of activeData) {
    let student = studentMap.get(row.student_number);
    if (!student) {
      student = { fromLU: null, toLU: null, fromRD: null, toRD: null };
      studentMap.set(row.student_number, student);
    }

    const isFrom = row.term_tested === fromTerm;
    if (row.course === "Language Usage") {
      if (isFrom) student.fromLU = row.rit_score;
      else student.toLU = row.rit_score;
    } else if (row.course === "Reading") {
      if (isFrom) student.fromRD = row.rit_score;
      else student.toRD = row.rit_score;
    }
  }

  // 計算每個學生的平均成長 (兩科平均)
  const growths: number[] = [];
  for (const s of studentMap.values()) {
    const growthValues: number[] = [];
    if (s.fromLU !== null && s.toLU !== null) {
      growthValues.push(s.toLU - s.fromLU);
    }
    if (s.fromRD !== null && s.toRD !== null) {
      growthValues.push(s.toRD - s.fromRD);
    }
    if (growthValues.length > 0) {
      const avgGrowth =
        growthValues.reduce((a, b) => a + b, 0) / growthValues.length;
      growths.push(avgGrowth);
    }
  }

  if (growths.length === 0) return null;

  // 計算分佈 buckets
  const buckets: GrowthDistributionBucket[] = [
    {
      range: "< -5",
      min: -Infinity,
      max: -5,
      count: 0,
      percentage: 0,
      isNegative: true,
    },
    {
      range: "-5 to 0",
      min: -5,
      max: 0,
      count: 0,
      percentage: 0,
      isNegative: true,
    },
    {
      range: "0 to 5",
      min: 0,
      max: 5,
      count: 0,
      percentage: 0,
      isNegative: false,
    },
    {
      range: "5 to 10",
      min: 5,
      max: 10,
      count: 0,
      percentage: 0,
      isNegative: false,
    },
    {
      range: "10 to 15",
      min: 10,
      max: 15,
      count: 0,
      percentage: 0,
      isNegative: false,
    },
    {
      range: "> 15",
      min: 15,
      max: Infinity,
      count: 0,
      percentage: 0,
      isNegative: false,
    },
  ];

  for (const g of growths) {
    for (const bucket of buckets) {
      if (g >= bucket.min && g < bucket.max) {
        bucket.count++;
        break;
      }
    }
  }

  // 計算百分比
  const total = growths.length;
  for (const bucket of buckets) {
    bucket.percentage = Math.round((bucket.count / total) * 1000) / 10;
  }

  // 計算負成長統計
  const negativeCount = growths.filter((g) => g < 0).length;
  const meanGrowth = growths.reduce((a, b) => a + b, 0) / growths.length;
  const growthStdDev = calculateStdDev(growths);

  return {
    fromTerm,
    toTerm,
    totalStudents: total,
    negativeGrowthCount: negativeCount,
    negativeGrowthPercentage: Math.round((negativeCount / total) * 1000) / 10,
    meanGrowth: Math.round(meanGrowth * 10) / 10,
    stdDev: Math.round(growthStdDev * 10) / 10,
    distribution: buckets,
  };
}

// ============================================================
// RIT-Growth Scatter/Heatmap API
// ============================================================

export interface RitGrowthDataPoint {
  startRit: number;
  growth: number;
  grade: number;
}

export interface RitGrowthScatterData {
  fromTerm: string;
  toTerm: string;
  points: RitGrowthDataPoint[];
  stats: {
    minRit: number;
    maxRit: number;
    minGrowth: number;
    maxGrowth: number;
    correlation: number; // R value
  };
}

/**
 * 計算皮爾森相關係數
 */
function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * (y[i] ?? 0), 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * 取得 RIT-Growth 散佈圖資料
 *
 * Permission: All authenticated users
 */
// ============================================================
// RIT-Grade Heatmap API
// ============================================================

export interface HeatmapCell {
  grade: number;
  ritBucket: string; // e.g., "160-170"
  ritMin: number;
  ritMax: number;
  count: number;
}

export interface RitGradeHeatmapData {
  termTested: string;
  cells: HeatmapCell[];
  maxCount: number;
  totalStudents: number;
  ritBuckets: string[];
}

/**
 * 取得 RIT vs Grade 熱力圖資料
 *
 * Permission: All authenticated users
 */
export async function getRitGradeHeatmapData(params: {
  termTested?: string;
  course?: Course | "Average";
}): Promise<RitGradeHeatmapData | null> {
  await requireAuth();
  const supabase = createClient();

  // 決定要使用的 term
  let targetTerm = params.termTested;
  if (!targetTerm) {
    const { data: termsData } = await supabase
      .from("map_assessments")
      .select("term_tested")
      .order("term_tested", { ascending: false })
      .limit(1);

    targetTerm = termsData?.[0]?.term_tested;
  }

  if (!targetTerm) return null;

  // 查詢該學期的所有 G3-G6 資料
  const { data, error } = await supabase
    .from("map_assessments")
    .select(
      `
      grade,
      course,
      rit_score,
      student_id,
      student_number,
      students:student_id (
        is_active
      )
    `
    )
    .eq("term_tested", targetTerm)
    .in("grade", [3, 4, 5, 6])
    .not("student_id", "is", null);

  if (error) {
    console.error("Error fetching heatmap data:", error);
    return null;
  }

  if (!data || data.length === 0) return null;

  // 過濾已停用的學生
  const activeData = data.filter((d) => {
    const student = d.students as unknown as { is_active: boolean } | null;
    return student?.is_active === true;
  });

  // 定義 RIT 區間 (140-260, 每 10 分一格)
  const RIT_BUCKETS: { label: string; min: number; max: number }[] = [];
  for (let rit = 140; rit < 260; rit += 10) {
    RIT_BUCKETS.push({
      label: `${rit}-${rit + 10}`,
      min: rit,
      max: rit + 10,
    });
  }

  // 按學生分組計算 RIT（如果是 Average 需要計算兩科平均）
  interface StudentRit {
    grade: number;
    rit: number;
  }
  const studentRits: StudentRit[] = [];

  if (params.course === "Average" || !params.course) {
    // 計算兩科平均
    const studentMap = new Map<
      string,
      { grade: number; lu: number | null; rd: number | null }
    >();

    for (const row of activeData) {
      let student = studentMap.get(row.student_number);
      if (!student) {
        student = { grade: row.grade, lu: null, rd: null };
        studentMap.set(row.student_number, student);
      }

      if (row.course === "Language Usage") {
        student.lu = row.rit_score;
      } else if (row.course === "Reading") {
        student.rd = row.rit_score;
      }
    }

    for (const s of studentMap.values()) {
      // 計算平均（至少需要一科有分數）
      if (s.lu !== null && s.rd !== null) {
        studentRits.push({ grade: s.grade, rit: (s.lu + s.rd) / 2 });
      } else if (s.lu !== null) {
        studentRits.push({ grade: s.grade, rit: s.lu });
      } else if (s.rd !== null) {
        studentRits.push({ grade: s.grade, rit: s.rd });
      }
    }
  } else {
    // 單科
    for (const row of activeData) {
      if (row.course === params.course) {
        studentRits.push({ grade: row.grade, rit: row.rit_score });
      }
    }
  }

  if (studentRits.length === 0) return null;

  // 計算每個 cell 的學生數
  const cellCounts = new Map<string, number>();
  const grades = [3, 4, 5, 6];

  // 初始化所有 cell 為 0
  for (const grade of grades) {
    for (const bucket of RIT_BUCKETS) {
      cellCounts.set(`${grade}-${bucket.label}`, 0);
    }
  }

  // 計數
  for (const s of studentRits) {
    for (const bucket of RIT_BUCKETS) {
      if (s.rit >= bucket.min && s.rit < bucket.max) {
        const key = `${s.grade}-${bucket.label}`;
        cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
        break;
      }
    }
  }

  // 構建結果
  const cells: HeatmapCell[] = [];
  let maxCount = 0;

  for (const grade of grades) {
    for (const bucket of RIT_BUCKETS) {
      const key = `${grade}-${bucket.label}`;
      const count = cellCounts.get(key) ?? 0;
      if (count > maxCount) maxCount = count;

      cells.push({
        grade,
        ritBucket: bucket.label,
        ritMin: bucket.min,
        ritMax: bucket.max,
        count,
      });
    }
  }

  return {
    termTested: targetTerm,
    cells,
    maxCount,
    totalStudents: studentRits.length,
    ritBuckets: RIT_BUCKETS.map((b) => b.label),
  };
}

/**
 * 取得 RIT-Growth 散佈圖資料
 *
 * 根據 termTested 參數決定成長期間：
 * - 如果 termTested 是 Fall term，則使用該 term 作為 toTerm，前一個 Fall 作為 fromTerm
 * - 如果未指定或不是 Fall term，則使用最近的兩個 Fall terms
 */
export async function getRitGrowthScatterData(params?: {
  termTested?: string;
}): Promise<RitGrowthScatterData | null> {
  await requireAuth();
  const supabase = createClient();

  // 動態查找可用的 Fall terms
  const { data: termsData } = await supabase
    .from("map_assessments")
    .select("term_tested")
    .like("term_tested", "Fall %")
    .in("grade", [3, 4, 5, 6]);

  if (!termsData || termsData.length === 0) return null;

  const fallTerms = [...new Set(termsData.map((d) => d.term_tested))].sort(
    compareTermTested
  );
  if (fallTerms.length < 2) return null;

  // 決定 fromTerm 和 toTerm
  let fromTerm: string;
  let toTerm: string;

  // 檢查 termTested 是否為 Fall term
  const selectedTerm = params?.termTested;
  if (selectedTerm && selectedTerm.startsWith("Fall ")) {
    // 找到 selectedTerm 在 fallTerms 中的位置
    const selectedIndex = fallTerms.indexOf(selectedTerm);
    if (selectedIndex > 0) {
      // 使用選擇的 term 作為 toTerm，前一個作為 fromTerm
      toTerm = selectedTerm;
      fromTerm = fallTerms[selectedIndex - 1];
    } else {
      // selectedTerm 是最早的 Fall 或不存在，使用最近的兩個
      fromTerm = fallTerms[fallTerms.length - 2];
      toTerm = fallTerms[fallTerms.length - 1];
    }
  } else {
    // 未指定或不是 Fall term，使用最近的兩個 Fall terms
    fromTerm = fallTerms[fallTerms.length - 2];
    toTerm = fallTerms[fallTerms.length - 1];
  }

  if (!fromTerm || !toTerm) return null;

  // 查詢兩個學期的資料
  const { data, error } = await supabase
    .from("map_assessments")
    .select(
      `
      student_number,
      term_tested,
      course,
      rit_score,
      grade,
      student_id,
      students:student_id (
        is_active
      )
    `
    )
    .in("term_tested", [fromTerm, toTerm])
    .in("grade", [3, 4, 5, 6])
    .not("student_id", "is", null);

  if (error) {
    console.error("Error fetching RIT-Growth data:", error);
    return null;
  }

  if (!data || data.length === 0) return null;

  // 過濾已停用的學生
  const activeData = data.filter((d) => {
    const student = d.students as unknown as { is_active: boolean } | null;
    return student?.is_active === true;
  });

  // 按學生分組
  interface StudentData {
    grade: number;
    fromLU: number | null;
    toLU: number | null;
    fromRD: number | null;
    toRD: number | null;
  }
  const studentMap = new Map<string, StudentData>();

  for (const row of activeData) {
    let student = studentMap.get(row.student_number);
    if (!student) {
      student = {
        grade: row.grade,
        fromLU: null,
        toLU: null,
        fromRD: null,
        toRD: null,
      };
      studentMap.set(row.student_number, student);
    }

    const isFrom = row.term_tested === fromTerm;
    if (row.course === "Language Usage") {
      if (isFrom) student.fromLU = row.rit_score;
      else student.toLU = row.rit_score;
    } else if (row.course === "Reading") {
      if (isFrom) student.fromRD = row.rit_score;
      else student.toRD = row.rit_score;
    }
  }

  // 計算每個學生的起始 RIT 和成長
  const points: RitGrowthDataPoint[] = [];
  const startRits: number[] = [];
  const growths: number[] = [];

  for (const s of studentMap.values()) {
    // 需要至少一科有完整的 from/to 資料
    const hasLU = s.fromLU !== null && s.toLU !== null;
    const hasRD = s.fromRD !== null && s.toRD !== null;

    if (!hasLU && !hasRD) continue;

    // 計算平均起始 RIT 和成長
    let startRit = 0;
    let growth = 0;
    let count = 0;

    if (hasLU) {
      startRit += s.fromLU!;
      growth += s.toLU! - s.fromLU!;
      count++;
    }
    if (hasRD) {
      startRit += s.fromRD!;
      growth += s.toRD! - s.fromRD!;
      count++;
    }

    startRit /= count;
    growth /= count;

    points.push({
      startRit: Math.round(startRit * 10) / 10,
      growth: Math.round(growth * 10) / 10,
      grade: s.grade,
    });

    startRits.push(startRit);
    growths.push(growth);
  }

  if (points.length === 0) return null;

  // 計算統計
  const correlation = calculateCorrelation(startRits, growths);

  return {
    fromTerm,
    toTerm,
    points,
    stats: {
      minRit: Math.min(...startRits),
      maxRit: Math.max(...startRits),
      minGrowth: Math.min(...growths),
      maxGrowth: Math.max(...growths),
      correlation: Math.round(correlation * 100) / 100,
    },
  };
}
