/**
 * MAP Growth Analytics API
 *
 * 提供 MAP 統計分析功能，用於 /browse/stats/map 頁面
 * 依據 lms-map-analytics skill 的 queries.md
 */

import { createClient } from "@/lib/supabase/client";
import {
  classifyBenchmark,
  calculateMapAverage,
  type BenchmarkLevel,
  BENCHMARK_COLORS,
} from "@/lib/map/benchmarks";
import {
  getNorm,
  getNormAverage,
  parseTermTested,
  compareTermTested,
  type Term,
  type Course,
} from "@/lib/map/norms";

// ============================================================
// Types
// ============================================================

export interface MapGroupAverage {
  grade: number;
  englishLevel: string; // 'E1', 'E2', 'E3', 'All'
  course: Course | "Average";
  termTested: string;
  academicYear: string;
  term: Term;
  studentCount: number;
  avgRit: number;
}

export interface BenchmarkDistribution {
  grade: number;
  termTested: string;
  e1: { count: number; percentage: number };
  e2: { count: number; percentage: number };
  e3: { count: number; percentage: number };
  total: number;
}

export interface TermGrowthStats {
  grade: number;
  englishLevel: string;
  course: Course;
  fromTerm: string;
  toTerm: string;
  avgFromRit: number;
  avgToRit: number;
  avgGrowth: number;
  studentCount: number;
}

export interface NormComparison {
  grade: number;
  term: Term;
  termTested: string;
  course: Course;
  schoolAvg: number;
  nationalNorm: number;
  difference: number;
  isAboveNorm: boolean;
}

export interface OverviewTableRow {
  grade: number;
  englishLevel: string;
  termData: {
    termTested: string;
    languageUsage: number | null;
    reading: number | null;
    average: number | null;
    studentCount: number;
  }[];
}

export interface MapAnalyticsChartData {
  grade: number;
  course: Course | "Average";
  terms: string[];
  data: {
    level: string; // 'E1', 'E2', 'E3', 'All'
    scores: (number | null)[];
  }[];
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * 取得所有可用的 term_tested 值（排序後）
 */
export async function getAvailableTerms(): Promise<string[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("map_assessments")
    .select("term_tested")
    .order("term_tested", { ascending: true });

  if (error) {
    console.error("Error fetching available terms:", error);
    return [];
  }

  // 取得唯一值並排序
  const terms = [...new Set(data?.map((d) => d.term_tested) || [])];
  return terms.sort(compareTermTested);
}

// ============================================================
// Group Averages API
// ============================================================

/**
 * 取得群組平均 (按 Grade × English Level × Course × Term)
 */
export async function getMapGroupAverages(params: {
  grade?: number;
}): Promise<MapGroupAverage[]> {
  const supabase = createClient();

  // 查詢 MAP 資料，JOIN students 取得 english_level
  const { data, error } = await supabase
    .from("map_assessments")
    .select(
      `
      grade,
      course,
      term_tested,
      academic_year,
      term,
      rit_score,
      student_id,
      students!inner (
        english_level
      )
    `
    )
    .eq("students.is_active", true)
    .order("grade")
    .order("term_tested");

  if (error) {
    console.error("Error fetching MAP group averages:", error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // 過濾特定年級（如果有指定）
  const filteredData = params.grade
    ? data.filter((d) => d.grade === params.grade)
    : data;

  // 分組計算平均
  type GroupKey = string;
  interface GroupData {
    scores: number[];
    grade: number;
    englishLevel: string;
    course: string;
    termTested: string;
    academicYear: string;
    term: string;
  }
  const groups = new Map<GroupKey, GroupData>();

  for (const row of filteredData) {
    const englishLevel =
      (row.students as unknown as { english_level: string })?.english_level ||
      "Unknown";

    // 按 English Level 分組
    const levelKey = `${row.grade}-${englishLevel}-${row.course}-${row.term_tested}`;
    let levelGroup = groups.get(levelKey);
    if (!levelGroup) {
      levelGroup = {
        scores: [],
        grade: row.grade,
        englishLevel,
        course: row.course,
        termTested: row.term_tested,
        academicYear: row.academic_year,
        term: row.term,
      };
      groups.set(levelKey, levelGroup);
    }
    levelGroup.scores.push(row.rit_score);

    // 按 All 分組
    const allKey = `${row.grade}-All-${row.course}-${row.term_tested}`;
    let allGroup = groups.get(allKey);
    if (!allGroup) {
      allGroup = {
        scores: [],
        grade: row.grade,
        englishLevel: "All",
        course: row.course,
        termTested: row.term_tested,
        academicYear: row.academic_year,
        term: row.term,
      };
      groups.set(allKey, allGroup);
    }
    allGroup.scores.push(row.rit_score);
  }

  // 轉換為結果陣列
  const results: MapGroupAverage[] = [];

  for (const group of groups.values()) {
    const avg = group.scores.reduce((a, b) => a + b, 0) / group.scores.length;

    results.push({
      grade: group.grade,
      englishLevel: group.englishLevel,
      course: group.course as Course,
      termTested: group.termTested,
      academicYear: group.academicYear,
      term: group.term as Term,
      studentCount: group.scores.length,
      avgRit: Math.round(avg * 100) / 100,
    });
  }

  return results.sort((a, b) => {
    if (a.grade !== b.grade) return a.grade - b.grade;
    if (a.termTested !== b.termTested)
      return compareTermTested(a.termTested, b.termTested);
    if (a.englishLevel !== b.englishLevel)
      return a.englishLevel.localeCompare(b.englishLevel);
    return a.course.localeCompare(b.course);
  });
}

// ============================================================
// Benchmark Distribution API
// ============================================================

/**
 * 取得 Benchmark 分佈 (基於 Spring Average)
 */
export async function getBenchmarkDistribution(params: {
  grade: number;
  termTested?: string; // 預設使用最近的 Spring
}): Promise<BenchmarkDistribution | null> {
  const supabase = createClient();

  // 決定要使用的 term
  let targetTerm = params.termTested;
  if (!targetTerm) {
    // 找最近的 Spring term
    const terms = await getAvailableTerms();
    const springTerms = terms.filter((t) => t.toLowerCase().includes("spring"));
    targetTerm = springTerms[springTerms.length - 1]; // 最新的 Spring
  }

  if (!targetTerm) return null;

  // 查詢該學期的所有學生成績
  const { data, error } = await supabase
    .from("map_assessments")
    .select("student_number, course, rit_score")
    .eq("grade", params.grade)
    .eq("term_tested", targetTerm);

  if (error) {
    console.error("Error fetching benchmark distribution:", error);
    return null;
  }

  if (!data || data.length === 0) return null;

  // 按學生分組，計算 Average
  const studentScores = new Map<
    string,
    { languageUsage: number | null; reading: number | null }
  >();

  for (const row of data) {
    const existing = studentScores.get(row.student_number) || {
      languageUsage: null,
      reading: null,
    };
    if (row.course === "Language Usage") {
      existing.languageUsage = row.rit_score;
    } else if (row.course === "Reading") {
      existing.reading = row.rit_score;
    }
    studentScores.set(row.student_number, existing);
  }

  // 分類 Benchmark
  let e1Count = 0;
  let e2Count = 0;
  let e3Count = 0;

  for (const scores of studentScores.values()) {
    // 需要兩科都有成績才能分類
    if (scores.languageUsage === null || scores.reading === null) continue;

    const average = calculateMapAverage(scores.languageUsage, scores.reading);
    const benchmark = classifyBenchmark(params.grade, average);

    if (benchmark === "E1") e1Count++;
    else if (benchmark === "E2") e2Count++;
    else if (benchmark === "E3") e3Count++;
  }

  const total = e1Count + e2Count + e3Count;
  if (total === 0) return null;

  return {
    grade: params.grade,
    termTested: targetTerm,
    e1: {
      count: e1Count,
      percentage: Math.round((e1Count / total) * 1000) / 10,
    },
    e2: {
      count: e2Count,
      percentage: Math.round((e2Count / total) * 1000) / 10,
    },
    e3: {
      count: e3Count,
      percentage: Math.round((e3Count / total) * 1000) / 10,
    },
    total,
  };
}

// ============================================================
// Chart Data API
// ============================================================

/**
 * 取得圖表資料 (Growth Trend Line Chart)
 */
export async function getMapChartData(params: {
  grade: number;
}): Promise<MapAnalyticsChartData[]> {
  const groupAverages = await getMapGroupAverages({ grade: params.grade });

  if (groupAverages.length === 0) return [];

  // 取得所有 term (排序)
  const terms = [...new Set(groupAverages.map((g) => g.termTested))].sort(
    compareTermTested
  );

  // 準備三種圖表：Language Usage, Reading, Average
  const courses: (Course | "Average")[] = [
    "Language Usage",
    "Reading",
    "Average",
  ];
  const levels = ["E1", "E2", "E3", "All"];

  const results: MapAnalyticsChartData[] = [];

  for (const course of courses) {
    const chartData: MapAnalyticsChartData = {
      grade: params.grade,
      course,
      terms,
      data: [],
    };

    for (const level of levels) {
      const scores: (number | null)[] = [];

      for (const term of terms) {
        if (course === "Average") {
          // 計算 Language Usage 和 Reading 的平均
          const lu = groupAverages.find(
            (g) =>
              g.termTested === term &&
              g.englishLevel === level &&
              g.course === "Language Usage"
          );
          const rd = groupAverages.find(
            (g) =>
              g.termTested === term &&
              g.englishLevel === level &&
              g.course === "Reading"
          );

          if (lu && rd) {
            scores.push(Math.round(((lu.avgRit + rd.avgRit) / 2) * 100) / 100);
          } else {
            scores.push(null);
          }
        } else {
          const found = groupAverages.find(
            (g) =>
              g.termTested === term &&
              g.englishLevel === level &&
              g.course === course
          );
          scores.push(found ? found.avgRit : null);
        }
      }

      chartData.data.push({
        level,
        scores,
      });
    }

    results.push(chartData);
  }

  return results;
}

// ============================================================
// Overview Table Data API
// ============================================================

/**
 * 取得 Overview Table 資料
 */
export async function getOverviewTableData(params: {
  grade: number;
}): Promise<OverviewTableRow[]> {
  const groupAverages = await getMapGroupAverages({ grade: params.grade });

  if (groupAverages.length === 0) return [];

  // 取得所有 term (排序)
  const terms = [...new Set(groupAverages.map((g) => g.termTested))].sort(
    compareTermTested
  );

  const levels = ["E1", "E2", "E3", "All"];
  const results: OverviewTableRow[] = [];

  for (const level of levels) {
    const termData: OverviewTableRow["termData"] = [];

    for (const term of terms) {
      const lu = groupAverages.find(
        (g) =>
          g.termTested === term &&
          g.englishLevel === level &&
          g.course === "Language Usage"
      );
      const rd = groupAverages.find(
        (g) =>
          g.termTested === term &&
          g.englishLevel === level &&
          g.course === "Reading"
      );

      const luScore = lu?.avgRit ?? null;
      const rdScore = rd?.avgRit ?? null;
      const avg =
        luScore !== null && rdScore !== null
          ? Math.round(((luScore + rdScore) / 2) * 100) / 100
          : null;

      termData.push({
        termTested: term,
        languageUsage: luScore,
        reading: rdScore,
        average: avg,
        studentCount: lu?.studentCount || rd?.studentCount || 0,
      });
    }

    results.push({
      grade: params.grade,
      englishLevel: level,
      termData,
    });
  }

  return results;
}

// ============================================================
// Norm Comparison API
// ============================================================

/**
 * 取得 Norm 比較資料
 */
export async function getNormComparison(params: {
  grade: number;
}): Promise<NormComparison[]> {
  const groupAverages = await getMapGroupAverages({ grade: params.grade });

  // 只看 "All" 等級的平均
  const allAverages = groupAverages.filter((g) => g.englishLevel === "All");

  const results: NormComparison[] = [];

  for (const avg of allAverages) {
    const norm = getNorm(
      avg.academicYear,
      avg.grade,
      avg.term,
      avg.course as Course
    );

    if (norm === null) continue;

    results.push({
      grade: avg.grade,
      term: avg.term,
      termTested: avg.termTested,
      course: avg.course as Course,
      schoolAvg: avg.avgRit,
      nationalNorm: norm,
      difference: Math.round((avg.avgRit - norm) * 10) / 10,
      isAboveNorm: avg.avgRit >= norm,
    });
  }

  return results.sort((a, b) => {
    if (a.termTested !== b.termTested)
      return compareTermTested(a.termTested, b.termTested);
    return a.course.localeCompare(b.course);
  });
}

// ============================================================
// Complete Analytics Data (for page)
// ============================================================

export interface MapAnalyticsData {
  grade: number;
  terms: string[];
  chartData: MapAnalyticsChartData[];
  benchmarkDistribution: BenchmarkDistribution | null;
  overviewTable: OverviewTableRow[];
  normComparison: NormComparison[];
}

/**
 * 取得完整的 MAP 分析資料（一次性載入頁面所需的所有資料）
 */
export async function getMapAnalyticsData(params: {
  grade: number;
}): Promise<MapAnalyticsData> {
  const [chartData, benchmarkDistribution, overviewTable, normComparison] =
    await Promise.all([
      getMapChartData(params),
      getBenchmarkDistribution(params),
      getOverviewTableData(params),
      getNormComparison(params),
    ]);

  // 從 chartData 取得 terms
  const terms = chartData[0]?.terms || [];

  return {
    grade: params.grade,
    terms,
    chartData,
    benchmarkDistribution,
    overviewTable,
    normComparison,
  };
}

// ============================================================
// Export utilities
// ============================================================

export { BENCHMARK_COLORS };
