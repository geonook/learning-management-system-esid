/**
 * MAP Growth Analytics API
 *
 * 提供 MAP 統計分析功能，用於 /browse/stats/map 頁面
 * 依據 lms-map-analytics skill 的 queries.md
 *
 * Permission Model (2025-12-29):
 * - All authenticated users can read MAP analytics
 * - Data is filtered by grade if Head role with grade band
 */

import { createClient } from "@/lib/supabase/client";
import { requireAuth } from './permissions';
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
  type MapTerm,
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
  mapTerm: MapTerm;
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
  mapTerm: MapTerm;
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
 *
 * Permission: All authenticated users
 */
export async function getAvailableTerms(): Promise<string[]> {
  await requireAuth()
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
 *
 * Permission: All authenticated users
 */
export async function getMapGroupAverages(params: {
  grade?: number;
}): Promise<MapGroupAverage[]> {
  await requireAuth()
  const supabase = createClient();

  // 查詢 MAP 資料，JOIN students 取得 level (英文等級)
  // 使用 student_id (UUID) 連接 students 表
  // 注意：使用學生「目前的年級」(students.grade) 來分組，而不是 MAP 記錄的年級
  const { data, error } = await supabase
    .from("map_assessments")
    .select(
      `
      grade,
      course,
      term_tested,
      academic_year,
      map_term,
      rit_score,
      student_id,
      students:student_id (
        grade,
        level,
        is_active
      )
    `
    )
    .not("student_id", "is", null)
    .order("term_tested");

  if (error) {
    console.error("Error fetching MAP group averages:", error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // 過濾已停用的學生
  const activeData = data.filter((d) => {
    const student = d.students as unknown as { grade: number; level: string; is_active: boolean } | null;
    return student?.is_active === true;
  });

  // 過濾特定年級（如果有指定）- 使用學生「目前的年級」
  const filteredData = params.grade
    ? activeData.filter((d) => {
        const student = d.students as unknown as { grade: number } | null;
        return student?.grade === params.grade;
      })
    : activeData;

  // 分組計算平均
  type GroupKey = string;
  interface GroupData {
    scores: number[];
    grade: number;
    englishLevel: string;
    course: string;
    termTested: string;
    academicYear: string;
    mapTerm: string;
  }
  const groups = new Map<GroupKey, GroupData>();

  for (const row of filteredData) {
    // 從 students 表取得學生目前的年級和英文等級
    const student = row.students as unknown as { grade: number; level: string } | null;
    const currentGrade = student?.grade ?? row.grade;  // fallback to MAP grade
    const studentLevel = student?.level;
    const englishLevel = studentLevel
      ? studentLevel.slice(-2)  // 取最後兩個字元 (E1, E2, E3)
      : "Unknown";

    // 按 English Level 分組 - 使用學生目前的年級
    const levelKey = `${currentGrade}-${englishLevel}-${row.course}-${row.term_tested}`;
    let levelGroup = groups.get(levelKey);
    if (!levelGroup) {
      levelGroup = {
        scores: [],
        grade: currentGrade,
        englishLevel,
        course: row.course,
        termTested: row.term_tested,
        academicYear: row.academic_year,
        mapTerm: row.map_term,
      };
      groups.set(levelKey, levelGroup);
    }
    levelGroup.scores.push(row.rit_score);

    // 按 All 分組 - 使用學生目前的年級
    const allKey = `${currentGrade}-All-${row.course}-${row.term_tested}`;
    let allGroup = groups.get(allKey);
    if (!allGroup) {
      allGroup = {
        scores: [],
        grade: currentGrade,
        englishLevel: "All",
        course: row.course,
        termTested: row.term_tested,
        academicYear: row.academic_year,
        mapTerm: row.map_term,
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
      mapTerm: group.mapTerm as MapTerm,
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
 *
 * Permission: All authenticated users
 */
export async function getBenchmarkDistribution(params: {
  grade: number;
  termTested?: string; // 預設使用最近的 Spring
}): Promise<BenchmarkDistribution | null> {
  await requireAuth()
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
 *
 * Permission: All authenticated users
 */
export async function getMapChartData(params: {
  grade: number;
}): Promise<MapAnalyticsChartData[]> {
  await requireAuth()
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
 *
 * Permission: All authenticated users
 */
export async function getOverviewTableData(params: {
  grade: number;
}): Promise<OverviewTableRow[]> {
  await requireAuth()
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
 *
 * Permission: All authenticated users
 */
export async function getNormComparison(params: {
  grade: number;
}): Promise<NormComparison[]> {
  await requireAuth()
  const groupAverages = await getMapGroupAverages({ grade: params.grade });

  // 只看 "All" 等級的平均
  const allAverages = groupAverages.filter((g) => g.englishLevel === "All");

  const results: NormComparison[] = [];

  for (const avg of allAverages) {
    const norm = getNorm(
      avg.academicYear,
      avg.grade,
      avg.mapTerm,
      avg.course as Course
    );

    if (norm === null) continue;

    results.push({
      grade: avg.grade,
      mapTerm: avg.mapTerm,
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
 *
 * Permission: All authenticated users
 */
export async function getMapAnalyticsData(params: {
  grade: number;
}): Promise<MapAnalyticsData> {
  await requireAuth()
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
// Advanced Analytics Types
// ============================================================

export type GrowthType = "within-year" | "year-over-year";

export interface GrowthAnalysisData {
  grade: number;
  growthType: GrowthType;
  fromTerm: string;
  toTerm: string;
  fromGrade?: number;  // 跨學年時的起始年級
  toGrade?: number;    // 跨學年時的結束年級（= grade）
  academicYear?: string;  // 學年內成長時使用
  byLevel: {
    englishLevel: string;
    languageUsage: {
      avgFrom: number | null;
      avgTo: number | null;
      actualGrowth: number | null;
      expectedGrowth: number | null;
      growthIndex: number | null;
      studentCount: number;
    };
    reading: {
      avgFrom: number | null;
      avgTo: number | null;
      actualGrowth: number | null;
      expectedGrowth: number | null;
      growthIndex: number | null;
      studentCount: number;
    };
  }[];
  distribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
}

export interface GoalPerformanceData {
  grade: number;
  course: Course;
  termTested: string;
  byLevel: {
    englishLevel: string;
    goals: {
      goalName: string;
      avgMidpoint: number | null;
      studentCount: number;
    }[];
    overallRit: number | null;
  }[];
  allStudents: {
    goalName: string;
    avgMidpoint: number | null;
    vsOverall: number | null;
    studentCount: number;
  }[];
}

export interface LexileAnalysisData {
  grade: number;
  termTested: string;
  stats: {
    count: number;
    avg: number | null;
    median: number | null;
    min: number | null;
    max: number | null;
    stdDev: number | null;
  };
  distribution: {
    band: string;
    description: string;
    color: string;
    count: number;
    percentage: number;
  }[];
  correlation: {
    ritScore: number;
    lexileScore: number;
  }[];
}

export interface TestQualityData {
  termTested: string;
  summary: {
    normal: { count: number; percentage: number };
    caution: { count: number; percentage: number };
    flagged: { count: number; percentage: number };
    total: number;
  };
  flaggedStudents: {
    studentNumber: string;
    studentName: string;
    grade: number;
    course: Course;
    ritScore: number;
    rapidGuessingPercent: number;
  }[];
}

export interface BenchmarkTransitionData {
  grade: number;
  fromTerm: string;
  toTerm: string;
  matrix: {
    from: "E1" | "E2" | "E3";
    to: "E1" | "E2" | "E3";
    count: number;
  }[];
  summary: {
    improved: { count: number; percentage: number };
    same: { count: number; percentage: number };
    declined: { count: number; percentage: number };
    total: number;
  };
  fromCounts: { e1: number; e2: number; e3: number };
  toCounts: { e1: number; e2: number; e3: number };
}

export interface CohortTrackingData {
  cohortPrefix: string;
  cohortDescription: string;
  studentCount: number;
  terms: {
    termTested: string;
    grade: number;
    languageUsage: number | null;
    reading: number | null;
    average: number | null;
    norm: number | null;
  }[];
  totalGrowth: {
    languageUsage: number | null;
    reading: number | null;
    vsNorm: number | null;
  };
}

// ============================================================
// Growth Analysis API
// ============================================================

import { getExpectedGrowth, getExpectedYearOverYearGrowth } from "@/lib/map/norms";

/**
 * 取得成長分析資料
 *
 * 支援兩種成長類型：
 * 1. within-year: 學年內成長 (Fall → Spring)，同一學年內的成長
 * 2. year-over-year: 跨學年成長 (Fall Year1 → Fall Year2)，追蹤學生年度進步
 *
 * 對於 year-over-year，優先使用 CDF 官方 FallToFall 資料
 *
 * Permission: All authenticated users
 */
export async function getGrowthAnalysis(params: {
  grade: number;
  growthType?: GrowthType;
  academicYear?: string;  // within-year 時使用
  fromTerm?: string;      // year-over-year 時使用
  toTerm?: string;        // year-over-year 時使用
}): Promise<GrowthAnalysisData | null> {
  await requireAuth()
  const supabase = createClient();

  const growthType = params.growthType ?? "within-year";

  let fromTerm: string;
  let toTerm: string;
  let fromGrade: number | undefined;
  let toGrade: number | undefined;
  let fromAcademicYear: string | undefined;
  let toAcademicYear: string | undefined;

  if (growthType === "within-year") {
    // 學年內成長：Fall → Spring
    const academicYear = params.academicYear ?? "2024-2025";
    fromTerm = `Fall ${academicYear}`;
    toTerm = `Spring ${academicYear}`;
    fromAcademicYear = academicYear;
    toAcademicYear = academicYear;
  } else {
    // 跨學年成長：使用傳入的 term，或預設 Fall 2024-2025 → Fall 2025-2026
    fromTerm = params.fromTerm ?? "Fall 2024-2025";
    toTerm = params.toTerm ?? "Fall 2025-2026";

    // 解析學年
    const fromParsed = parseTermTested(fromTerm);
    const toParsed = parseTermTested(toTerm);
    fromAcademicYear = fromParsed?.academicYear;
    toAcademicYear = toParsed?.academicYear;

    // 跨學年成長：學生升了一年級
    fromGrade = params.grade - 1;
    toGrade = params.grade;
  }

  // 取得兩個學期的資料
  // 對於 year-over-year，同時取得官方 FallToFall 欄位
  const { data, error } = await supabase
    .from("map_assessments")
    .select(`
      student_number,
      course,
      term_tested,
      rit_score,
      grade,
      fall_to_fall_projected_growth,
      fall_to_fall_observed_growth,
      fall_to_fall_conditional_growth_index,
      fall_to_fall_growth_quintile,
      students:student_id (
        grade,
        level,
        is_active
      )
    `)
    .in("term_tested", [fromTerm, toTerm])
    .not("student_id", "is", null);

  if (error) {
    console.error("Error fetching growth analysis:", error);
    return null;
  }

  if (!data || data.length === 0) return null;

  // 過濾活躍學生
  // 對於跨學年成長，需要追蹤學生的學號而不是目前年級
  const filteredData = data.filter((d) => {
    const student = d.students as unknown as { grade: number; level: string; is_active: boolean } | null;
    if (student?.is_active !== true) return false;

    if (growthType === "within-year") {
      // 學年內成長：使用學生目前年級
      return student.grade === params.grade;
    } else {
      // 跨學年成長：使用學生目前年級（應該是 toGrade）
      return student.grade === params.grade;
    }
  });

  // 按學生分組
  type StudentData = {
    level: string;
    from: { languageUsage: number | null; reading: number | null };
    to: { languageUsage: number | null; reading: number | null };
    // 官方 FallToFall 資料 (用於 year-over-year)
    officialF2F: {
      luProjectedGrowth: number | null;
      luObservedGrowth: number | null;
      luGrowthIndex: number | null;
      rdProjectedGrowth: number | null;
      rdObservedGrowth: number | null;
      rdGrowthIndex: number | null;
    };
  };
  const studentMap = new Map<string, StudentData>();

  for (const row of filteredData) {
    const student = row.students as unknown as { level: string } | null;
    const level = student?.level?.slice(-2) || "Unknown";
    const isFromTerm = row.term_tested === fromTerm;

    let studentData = studentMap.get(row.student_number);
    if (!studentData) {
      studentData = {
        level,
        from: { languageUsage: null, reading: null },
        to: { languageUsage: null, reading: null },
        officialF2F: {
          luProjectedGrowth: null,
          luObservedGrowth: null,
          luGrowthIndex: null,
          rdProjectedGrowth: null,
          rdObservedGrowth: null,
          rdGrowthIndex: null,
        },
      };
      studentMap.set(row.student_number, studentData);
    }

    const termData = isFromTerm ? studentData.from : studentData.to;
    if (row.course === "Language Usage") {
      termData.languageUsage = row.rit_score;
      // 收集 toTerm 的官方 FallToFall 資料
      if (!isFromTerm && growthType === "year-over-year") {
        studentData.officialF2F.luProjectedGrowth = row.fall_to_fall_projected_growth;
        studentData.officialF2F.luObservedGrowth = row.fall_to_fall_observed_growth;
        studentData.officialF2F.luGrowthIndex = row.fall_to_fall_conditional_growth_index;
      }
    } else if (row.course === "Reading") {
      termData.reading = row.rit_score;
      // 收集 toTerm 的官方 FallToFall 資料
      if (!isFromTerm && growthType === "year-over-year") {
        studentData.officialF2F.rdProjectedGrowth = row.fall_to_fall_projected_growth;
        studentData.officialF2F.rdObservedGrowth = row.fall_to_fall_observed_growth;
        studentData.officialF2F.rdGrowthIndex = row.fall_to_fall_conditional_growth_index;
      }
    }
  }

  // 計算各 Level 的成長
  const levels = ["E1", "E2", "E3", "All"];
  const byLevel: GrowthAnalysisData["byLevel"] = [];

  // 用於計算成長分佈
  const allGrowths: number[] = [];

  for (const level of levels) {
    const students = level === "All"
      ? Array.from(studentMap.values())
      : Array.from(studentMap.values()).filter((s) => s.level === level);

    // Language Usage
    const luStudents = students.filter(
      (s) => s.from.languageUsage !== null && s.to.languageUsage !== null
    );
    const luFromSum = luStudents.reduce((sum, s) => sum + (s.from.languageUsage ?? 0), 0);
    const luToSum = luStudents.reduce((sum, s) => sum + (s.to.languageUsage ?? 0), 0);

    // Reading
    const rdStudents = students.filter(
      (s) => s.from.reading !== null && s.to.reading !== null
    );
    const rdFromSum = rdStudents.reduce((sum, s) => sum + (s.from.reading ?? 0), 0);
    const rdToSum = rdStudents.reduce((sum, s) => sum + (s.to.reading ?? 0), 0);

    // Expected Growth and Growth Index calculation
    // 對於 year-over-year，優先使用 CDF 官方 FallToFall 資料
    let expectedLU: number | null = null;
    let expectedRD: number | null = null;
    let luGrowthIndex: number | null = null;
    let rdGrowthIndex: number | null = null;

    const luAvgFrom = luStudents.length > 0 ? luFromSum / luStudents.length : null;
    const luAvgTo = luStudents.length > 0 ? luToSum / luStudents.length : null;
    const luActualGrowth = luAvgFrom !== null && luAvgTo !== null ? luAvgTo - luAvgFrom : null;

    const rdAvgFrom = rdStudents.length > 0 ? rdFromSum / rdStudents.length : null;
    const rdAvgTo = rdStudents.length > 0 ? rdToSum / rdStudents.length : null;
    const rdActualGrowth = rdAvgFrom !== null && rdAvgTo !== null ? rdAvgTo - rdAvgFrom : null;

    if (growthType === "within-year" && fromAcademicYear) {
      // 學年內成長：使用 norms.ts 計算
      expectedLU = getExpectedGrowth(fromAcademicYear, params.grade, "Language Usage");
      expectedRD = getExpectedGrowth(fromAcademicYear, params.grade, "Reading");
      luGrowthIndex = luActualGrowth !== null && expectedLU !== null && expectedLU !== 0
        ? luActualGrowth / expectedLU
        : null;
      rdGrowthIndex = rdActualGrowth !== null && expectedRD !== null && expectedRD !== 0
        ? rdActualGrowth / expectedRD
        : null;
    } else if (growthType === "year-over-year") {
      // 跨學年成長：優先使用 CDF 官方 FallToFall 資料
      // 計算有官方資料的學生
      const luStudentsWithOfficial = luStudents.filter(
        (s) => s.officialF2F.luProjectedGrowth !== null && s.officialF2F.luGrowthIndex !== null
      );
      const rdStudentsWithOfficial = rdStudents.filter(
        (s) => s.officialF2F.rdProjectedGrowth !== null && s.officialF2F.rdGrowthIndex !== null
      );

      if (luStudentsWithOfficial.length > 0) {
        // 使用官方資料計算平均
        const luOfficialExpectedSum = luStudentsWithOfficial.reduce(
          (sum, s) => sum + (s.officialF2F.luProjectedGrowth ?? 0), 0
        );
        const luOfficialIndexSum = luStudentsWithOfficial.reduce(
          (sum, s) => sum + (s.officialF2F.luGrowthIndex ?? 0), 0
        );
        expectedLU = Math.round((luOfficialExpectedSum / luStudentsWithOfficial.length) * 10) / 10;
        luGrowthIndex = luOfficialIndexSum / luStudentsWithOfficial.length;
      } else if (fromAcademicYear && toAcademicYear && fromGrade && toGrade) {
        // Fallback: 使用 norms.ts 計算
        expectedLU = getExpectedYearOverYearGrowth(fromAcademicYear, toAcademicYear, fromGrade, toGrade, "Language Usage");
        luGrowthIndex = luActualGrowth !== null && expectedLU !== null && expectedLU !== 0
          ? luActualGrowth / expectedLU
          : null;
      }

      if (rdStudentsWithOfficial.length > 0) {
        // 使用官方資料計算平均
        const rdOfficialExpectedSum = rdStudentsWithOfficial.reduce(
          (sum, s) => sum + (s.officialF2F.rdProjectedGrowth ?? 0), 0
        );
        const rdOfficialIndexSum = rdStudentsWithOfficial.reduce(
          (sum, s) => sum + (s.officialF2F.rdGrowthIndex ?? 0), 0
        );
        expectedRD = Math.round((rdOfficialExpectedSum / rdStudentsWithOfficial.length) * 10) / 10;
        rdGrowthIndex = rdOfficialIndexSum / rdStudentsWithOfficial.length;
      } else if (fromAcademicYear && toAcademicYear && fromGrade && toGrade) {
        // Fallback: 使用 norms.ts 計算
        expectedRD = getExpectedYearOverYearGrowth(fromAcademicYear, toAcademicYear, fromGrade, toGrade, "Reading");
        rdGrowthIndex = rdActualGrowth !== null && expectedRD !== null && expectedRD !== 0
          ? rdActualGrowth / expectedRD
          : null;
      }
    }

    // 收集個人成長值 (用於分佈圖)
    // 對於 year-over-year，使用官方 growth index 來分類
    if (level === "All") {
      if (growthType === "year-over-year") {
        // 使用官方 growth index 分佈
        for (const s of luStudents) {
          if (s.officialF2F.luObservedGrowth !== null) {
            allGrowths.push(s.officialF2F.luObservedGrowth);
          } else {
            const growth = (s.to.languageUsage ?? 0) - (s.from.languageUsage ?? 0);
            allGrowths.push(growth);
          }
        }
        for (const s of rdStudents) {
          if (s.officialF2F.rdObservedGrowth !== null) {
            allGrowths.push(s.officialF2F.rdObservedGrowth);
          } else {
            const growth = (s.to.reading ?? 0) - (s.from.reading ?? 0);
            allGrowths.push(growth);
          }
        }
      } else {
        for (const s of luStudents) {
          const growth = (s.to.languageUsage ?? 0) - (s.from.languageUsage ?? 0);
          allGrowths.push(growth);
        }
        for (const s of rdStudents) {
          const growth = (s.to.reading ?? 0) - (s.from.reading ?? 0);
          allGrowths.push(growth);
        }
      }
    }

    byLevel.push({
      englishLevel: level,
      languageUsage: {
        avgFrom: luAvgFrom !== null ? Math.round(luAvgFrom * 10) / 10 : null,
        avgTo: luAvgTo !== null ? Math.round(luAvgTo * 10) / 10 : null,
        actualGrowth: luActualGrowth !== null ? Math.round(luActualGrowth * 10) / 10 : null,
        expectedGrowth: expectedLU,
        growthIndex: luGrowthIndex !== null ? Math.round(luGrowthIndex * 100) / 100 : null,
        studentCount: luStudents.length,
      },
      reading: {
        avgFrom: rdAvgFrom !== null ? Math.round(rdAvgFrom * 10) / 10 : null,
        avgTo: rdAvgTo !== null ? Math.round(rdAvgTo * 10) / 10 : null,
        actualGrowth: rdActualGrowth !== null ? Math.round(rdActualGrowth * 10) / 10 : null,
        expectedGrowth: expectedRD,
        growthIndex: rdGrowthIndex !== null ? Math.round(rdGrowthIndex * 100) / 100 : null,
        studentCount: rdStudents.length,
      },
    });
  }

  // 計算成長分佈
  const growthRanges = [
    { range: "<0", min: -Infinity, max: 0 },
    { range: "0-5", min: 0, max: 5 },
    { range: "5-10", min: 5, max: 10 },
    { range: "10-15", min: 10, max: 15 },
    { range: "15+", min: 15, max: Infinity },
  ];

  const distribution = growthRanges.map((r) => {
    const count = allGrowths.filter((g) => g >= r.min && g < r.max).length;
    return {
      range: r.range,
      count,
      percentage: allGrowths.length > 0 ? Math.round((count / allGrowths.length) * 1000) / 10 : 0,
    };
  });

  return {
    grade: params.grade,
    growthType,
    fromTerm,
    toTerm,
    fromGrade: growthType === "year-over-year" ? fromGrade : undefined,
    toGrade: growthType === "year-over-year" ? toGrade : undefined,
    academicYear: growthType === "within-year" ? fromAcademicYear : undefined,
    byLevel,
    distribution,
  };
}

// ============================================================
// Consecutive Growth Analysis API (for stats page)
// ============================================================

/**
 * 連續成長分析資料類型
 * 用於統計頁面顯示連續測驗成長（含跨學年）
 */
export type ConsecutiveGrowthType = "fallToSpring" | "springToFall";

export interface ConsecutiveGrowthLevelData {
  englishLevel: string;
  languageUsage: {
    avgFrom: number | null;
    avgTo: number | null;
    actualGrowth: number | null;
    expectedGrowth: number | null;  // Only for fallToSpring
    growthIndex: number | null;     // Only for fallToSpring
    studentCount: number;
  };
  reading: {
    avgFrom: number | null;
    avgTo: number | null;
    actualGrowth: number | null;
    expectedGrowth: number | null;  // Only for fallToSpring
    growthIndex: number | null;     // Only for fallToSpring
    studentCount: number;
  };
}

export interface ConsecutiveGrowthRecord {
  growthType: ConsecutiveGrowthType;
  fromTerm: string;           // "Fall 2024-2025" or "Spring 2024-2025"
  toTerm: string;             // "Spring 2024-2025" or "Fall 2025-2026"
  fromTermLabel: string;      // "FA 24-25" or "SP 24-25"
  toTermLabel: string;        // "SP 24-25" or "FA 25-26"
  fromGrade: number;          // Grade at fromTerm
  toGrade: number;            // Grade at toTerm
  byLevel: ConsecutiveGrowthLevelData[];
}

export interface ConsecutiveGrowthAnalysisData {
  grade: number;
  records: ConsecutiveGrowthRecord[];
}

/**
 * 取得連續成長分析資料
 *
 * 找出所有連續的測驗對（Fall→Spring 和 Spring→Fall）
 * 並按 English Level 分組計算平均成長
 *
 * Permission: All authenticated users
 */
export async function getConsecutiveGrowthAnalysis(params: {
  grade: number;
}): Promise<ConsecutiveGrowthAnalysisData | null> {
  await requireAuth()
  const supabase = createClient();

  // 1. 取得該年級所有學生的 MAP 資料
  const { data, error } = await supabase
    .from("map_assessments")
    .select(`
      id,
      student_number,
      term_tested,
      academic_year,
      map_term,
      course,
      rit_score,
      observed_growth,
      projected_growth,
      conditional_growth_index,
      students:student_id (
        grade,
        level,
        is_active
      )
    `)
    .eq("course", "Reading")  // 只抓 Reading 來判斷學期（避免重複）
    .not("student_id", "is", null);

  if (error) {
    console.error("Error fetching consecutive growth data:", error);
    return null;
  }

  // 過濾出該年級學生
  type StudentData = { grade: number; level: string | null; is_active: boolean };
  const gradeData = data?.filter((d) => {
    // Handle both single object and array from Supabase nested join
    const studentRaw = d.students;
    const student = (Array.isArray(studentRaw) ? studentRaw[0] : studentRaw) as StudentData | null;
    return student && student.is_active;
  }) ?? [];

  // 找出所有不重複的 term_tested
  const uniqueTerms = [...new Set(gradeData.map((d) => d.term_tested))];
  const sortedTerms = uniqueTerms.sort((a, b) => compareTermTested(a, b));

  if (sortedTerms.length < 2) {
    return { grade: params.grade, records: [] };
  }

  // 2. 對於每一對連續測驗，計算成長
  const records: ConsecutiveGrowthRecord[] = [];

  for (let i = 0; i < sortedTerms.length - 1; i++) {
    const fromTerm = sortedTerms[i];
    const toTerm = sortedTerms[i + 1];

    const fromParsed = parseTermTested(fromTerm);
    const toParsed = parseTermTested(toTerm);

    if (!fromParsed || !toParsed) continue;

    // 判斷成長類型
    let growthType: ConsecutiveGrowthType;
    if (fromParsed.mapTerm === "fall" && toParsed.mapTerm === "spring") {
      growthType = "fallToSpring";
    } else if (fromParsed.mapTerm === "spring" && toParsed.mapTerm === "fall") {
      growthType = "springToFall";
    } else {
      continue; // 跳過其他組合（如 fall → fall）
    }

    // 計算年級
    // Fall → Spring: 同年級，學生 grade 不變
    // Spring → Fall: 升一年級，用 toTerm 的學生 grade 來篩選目標年級
    const actualFromGrade = growthType === "springToFall" ? params.grade - 1 : params.grade;

    // 3. 取得兩個學期的完整資料（所有課程）
    const { data: fullData, error: fullError } = await supabase
      .from("map_assessments")
      .select(`
        student_number,
        term_tested,
        course,
        rit_score,
        observed_growth,
        projected_growth,
        conditional_growth_index,
        students:student_id (
          grade,
          level,
          is_active
        )
      `)
      .in("term_tested", [fromTerm, toTerm])
      .not("student_id", "is", null);

    if (fullError || !fullData) continue;

    // 策略說明：
    // - 資料庫中 student.grade 是學生「目前」的年級
    // - Fall → Spring: 學生年級不變，直接用 params.grade 篩選
    // - Spring → Fall:
    //   - toTerm (Fall) 時學生是 params.grade
    //   - fromTerm (Spring) 時學生是 params.grade - 1，但資料庫中 grade 已是 params.grade
    //   - 解法：用 toTerm 的學生清單來決定哪些學生要納入，fromTerm 不額外篩選年級

    // Step 1: 先收集 toTerm 中目標年級的學生
    const toTermStudents = new Set<string>();
    for (const row of fullData) {
      const studentRaw = row.students;
      const student = (Array.isArray(studentRaw) ? studentRaw[0] : studentRaw) as StudentData | null;
      if (!student || !student.is_active) continue;
      if (row.term_tested === toTerm && student.grade === params.grade) {
        toTermStudents.add(row.student_number);
      }
    }

    // 建立學生資料映射
    const studentDataMap = new Map<string, {
      level: string;
      from: { languageUsage: number | null; reading: number | null };
      to: { languageUsage: number | null; reading: number | null };
      official: {
        luObservedGrowth: number | null;
        luProjectedGrowth: number | null;
        luGrowthIndex: number | null;
        rdObservedGrowth: number | null;
        rdProjectedGrowth: number | null;
        rdGrowthIndex: number | null;
      };
    }>();

    for (const row of fullData) {
      // Handle both single object and array from Supabase nested join
      const studentRaw = row.students;
      const student = (Array.isArray(studentRaw) ? studentRaw[0] : studentRaw) as StudentData | null;
      if (!student || !student.is_active) continue;

      const studentNumber = row.student_number;
      const level = student.level || "Unknown";
      const isFromTerm = row.term_tested === fromTerm;
      const isToTerm = row.term_tested === toTerm;

      // 篩選邏輯：只納入 toTerm 中目標年級的學生
      if (!toTermStudents.has(studentNumber)) continue;

      // 額外檢查：toTerm 時年級必須是 params.grade
      if (isToTerm && student.grade !== params.grade) continue;

      if (!studentDataMap.has(studentNumber)) {
        studentDataMap.set(studentNumber, {
          level,
          from: { languageUsage: null, reading: null },
          to: { languageUsage: null, reading: null },
          official: {
            luObservedGrowth: null,
            luProjectedGrowth: null,
            luGrowthIndex: null,
            rdObservedGrowth: null,
            rdProjectedGrowth: null,
            rdGrowthIndex: null,
          },
        });
      }

      const studentData = studentDataMap.get(studentNumber)!;

      if (isFromTerm) {
        if (row.course === "Language Usage") {
          studentData.from.languageUsage = row.rit_score;
        } else if (row.course === "Reading") {
          studentData.from.reading = row.rit_score;
        }
      } else if (isToTerm) {
        if (row.course === "Language Usage") {
          studentData.to.languageUsage = row.rit_score;
          // 官方成長資料（來自 to term）
          studentData.official.luObservedGrowth = row.observed_growth;
          studentData.official.luProjectedGrowth = row.projected_growth;
          studentData.official.luGrowthIndex = row.conditional_growth_index;
        } else if (row.course === "Reading") {
          studentData.to.reading = row.rit_score;
          studentData.official.rdObservedGrowth = row.observed_growth;
          studentData.official.rdProjectedGrowth = row.projected_growth;
          studentData.official.rdGrowthIndex = row.conditional_growth_index;
        }
      }
    }

    // 4. 按 English Level 分組計算
    const levels = ["E1", "E2", "E3", "All"];
    const byLevel: ConsecutiveGrowthLevelData[] = [];

    for (const level of levels) {
      const levelStudents = Array.from(studentDataMap.entries()).filter(([, data]) => {
        if (level === "All") return true;
        return data.level === level;
      });

      // 計算有完整資料的學生
      const luStudents = levelStudents.filter(
        ([, data]) => data.from.languageUsage !== null && data.to.languageUsage !== null
      );
      const rdStudents = levelStudents.filter(
        ([, data]) => data.from.reading !== null && data.to.reading !== null
      );

      if (luStudents.length === 0 && rdStudents.length === 0) continue;

      // 計算平均值
      const luFromSum = luStudents.reduce((sum, [, s]) => sum + (s.from.languageUsage ?? 0), 0);
      const luToSum = luStudents.reduce((sum, [, s]) => sum + (s.to.languageUsage ?? 0), 0);
      const rdFromSum = rdStudents.reduce((sum, [, s]) => sum + (s.from.reading ?? 0), 0);
      const rdToSum = rdStudents.reduce((sum, [, s]) => sum + (s.to.reading ?? 0), 0);

      const luAvgFrom = luStudents.length > 0 ? luFromSum / luStudents.length : null;
      const luAvgTo = luStudents.length > 0 ? luToSum / luStudents.length : null;
      const rdAvgFrom = rdStudents.length > 0 ? rdFromSum / rdStudents.length : null;
      const rdAvgTo = rdStudents.length > 0 ? rdToSum / rdStudents.length : null;

      const luActualGrowth = luAvgFrom !== null && luAvgTo !== null ? luAvgTo - luAvgFrom : null;
      const rdActualGrowth = rdAvgFrom !== null && rdAvgTo !== null ? rdAvgTo - rdAvgFrom : null;

      // Expected Growth and Index (only for fallToSpring)
      let luExpectedGrowth: number | null = null;
      let luGrowthIndex: number | null = null;
      let rdExpectedGrowth: number | null = null;
      let rdGrowthIndex: number | null = null;

      if (growthType === "fallToSpring") {
        luExpectedGrowth = getExpectedGrowth(fromParsed.academicYear, params.grade, "Language Usage");
        rdExpectedGrowth = getExpectedGrowth(fromParsed.academicYear, params.grade, "Reading");

        if (luActualGrowth !== null && luExpectedGrowth !== null && luExpectedGrowth !== 0) {
          luGrowthIndex = luActualGrowth / luExpectedGrowth;
        }
        if (rdActualGrowth !== null && rdExpectedGrowth !== null && rdExpectedGrowth !== 0) {
          rdGrowthIndex = rdActualGrowth / rdExpectedGrowth;
        }
      }

      byLevel.push({
        englishLevel: level,
        languageUsage: {
          avgFrom: luAvgFrom !== null ? Math.round(luAvgFrom * 10) / 10 : null,
          avgTo: luAvgTo !== null ? Math.round(luAvgTo * 10) / 10 : null,
          actualGrowth: luActualGrowth !== null ? Math.round(luActualGrowth * 10) / 10 : null,
          expectedGrowth: luExpectedGrowth,
          growthIndex: luGrowthIndex !== null ? Math.round(luGrowthIndex * 100) / 100 : null,
          studentCount: luStudents.length,
        },
        reading: {
          avgFrom: rdAvgFrom !== null ? Math.round(rdAvgFrom * 10) / 10 : null,
          avgTo: rdAvgTo !== null ? Math.round(rdAvgTo * 10) / 10 : null,
          actualGrowth: rdActualGrowth !== null ? Math.round(rdActualGrowth * 10) / 10 : null,
          expectedGrowth: rdExpectedGrowth,
          growthIndex: rdGrowthIndex !== null ? Math.round(rdGrowthIndex * 100) / 100 : null,
          studentCount: rdStudents.length,
        },
      });
    }

    // 格式化 term labels
    const { formatTermStats } = await import("@/lib/map/utils");

    records.push({
      growthType,
      fromTerm,
      toTerm,
      fromTermLabel: formatTermStats(fromTerm),
      toTermLabel: formatTermStats(toTerm),
      fromGrade: actualFromGrade,
      toGrade: params.grade,
      byLevel,
    });
  }

  // 按時間排序（新到舊）
  records.sort((a, b) => compareTermTested(b.toTerm, a.toTerm));

  return {
    grade: params.grade,
    records,
  };
}

// ============================================================
// Goal Performance API
// ============================================================

import { parseRitRange, READING_GOALS, LANGUAGE_USAGE_GOALS } from "@/lib/map/goals";

/**
 * 取得 Goal 效能分析資料
 *
 * Permission: All authenticated users
 */
export async function getGoalPerformance(params: {
  grade: number;
  course: Course;
  termTested: string;
}): Promise<GoalPerformanceData | null> {
  await requireAuth()
  const supabase = createClient();

  // 取得 MAP 評量和 Goal Scores
  const { data, error } = await supabase
    .from("map_assessments")
    .select(`
      id,
      student_number,
      rit_score,
      students:student_id (
        grade,
        level,
        is_active
      ),
      map_goal_scores (
        goal_name,
        goal_rit_range
      )
    `)
    .eq("course", params.course)
    .eq("term_tested", params.termTested)
    .not("student_id", "is", null);

  if (error) {
    console.error("Error fetching goal performance:", error);
    return null;
  }

  if (!data || data.length === 0) return null;

  // 過濾活躍學生和指定年級
  const filteredData = data.filter((d) => {
    const student = d.students as unknown as { grade: number; is_active: boolean } | null;
    return student?.is_active === true && student?.grade === params.grade;
  });

  const goalNames = params.course === "Reading"
    ? READING_GOALS.map((g) => g.name)
    : LANGUAGE_USAGE_GOALS.map((g) => g.name);

  const levels = ["E1", "E2", "E3", "All"];
  const byLevel: GoalPerformanceData["byLevel"] = [];

  // 整體資料
  const allGoalScores = new Map<string, number[]>();
  let allRitScores: number[] = [];

  for (const level of levels) {
    const levelData = level === "All"
      ? filteredData
      : filteredData.filter((d) => {
          const student = d.students as unknown as { level: string } | null;
          return student?.level?.slice(-2) === level;
        });

    const goalScores = new Map<string, number[]>();
    const ritScores: number[] = [];

    for (const row of levelData) {
      ritScores.push(row.rit_score);

      const goals = row.map_goal_scores as Array<{ goal_name: string; goal_rit_range: string | null }> || [];
      for (const goal of goals) {
        const midpoint = parseRitRange(goal.goal_rit_range);
        if (midpoint !== null) {
          const existing = goalScores.get(goal.goal_name) || [];
          existing.push(midpoint);
          goalScores.set(goal.goal_name, existing);

          // 收集整體資料
          if (level !== "All") {
            const allExisting = allGoalScores.get(goal.goal_name) || [];
            allExisting.push(midpoint);
            allGoalScores.set(goal.goal_name, allExisting);
          }
        }
      }

      if (level !== "All") {
        allRitScores.push(row.rit_score);
      }
    }

    const overallRit = ritScores.length > 0
      ? Math.round((ritScores.reduce((a, b) => a + b, 0) / ritScores.length) * 10) / 10
      : null;

    byLevel.push({
      englishLevel: level,
      goals: goalNames.map((name) => {
        const scores = goalScores.get(name) || [];
        return {
          goalName: name,
          avgMidpoint: scores.length > 0
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
            : null,
          studentCount: scores.length,
        };
      }),
      overallRit,
    });
  }

  // 計算整體的 vs Overall
  const overallAvgRit = allRitScores.length > 0
    ? allRitScores.reduce((a, b) => a + b, 0) / allRitScores.length
    : null;

  const allStudents = goalNames.map((name) => {
    const scores = allGoalScores.get(name) || [];
    const avg = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : null;
    return {
      goalName: name,
      avgMidpoint: avg !== null ? Math.round(avg * 10) / 10 : null,
      vsOverall: avg !== null && overallAvgRit !== null
        ? Math.round((avg - overallAvgRit) * 10) / 10
        : null,
      studentCount: scores.length,
    };
  });

  return {
    grade: params.grade,
    course: params.course,
    termTested: params.termTested,
    byLevel,
    allStudents,
  };
}

// ============================================================
// Lexile Analysis API
// ============================================================

import {
  parseLexile,
  calculateLexileStats,
  calculateLexileDistribution,
} from "@/lib/map/lexile";

/**
 * 取得 Lexile 分析資料
 *
 * Permission: All authenticated users
 */
export async function getLexileAnalysis(params: {
  grade: number;
  termTested: string;
}): Promise<LexileAnalysisData | null> {
  await requireAuth()
  const supabase = createClient();

  const { data, error } = await supabase
    .from("map_assessments")
    .select(`
      rit_score,
      lexile_score,
      students:student_id (
        grade,
        is_active
      )
    `)
    .eq("course", "Reading")
    .eq("term_tested", params.termTested)
    .not("lexile_score", "is", null)
    .not("student_id", "is", null);

  if (error) {
    console.error("Error fetching lexile analysis:", error);
    return null;
  }

  if (!data || data.length === 0) return null;

  // 過濾活躍學生和指定年級
  const filteredData = data.filter((d) => {
    const student = d.students as unknown as { grade: number; is_active: boolean } | null;
    return student?.is_active === true && student?.grade === params.grade;
  });

  // 解析 Lexile 分數
  const lexileValues: (number | null)[] = filteredData.map((d) => parseLexile(d.lexile_score));
  const validLexileValues = lexileValues.filter((v): v is number => v !== null);

  // 計算統計
  const stats = calculateLexileStats(validLexileValues);

  // 計算分佈
  const rawDistribution = calculateLexileDistribution(validLexileValues);
  const distribution = rawDistribution.map((d) => ({
    band: d.band.label,
    description: d.band.description,
    color: d.band.color,
    count: d.count,
    percentage: d.percentage,
  }));

  // 準備相關性資料
  const correlation = filteredData
    .map((d) => {
      const lexile = parseLexile(d.lexile_score);
      return lexile !== null ? { ritScore: d.rit_score, lexileScore: lexile } : null;
    })
    .filter((d): d is { ritScore: number; lexileScore: number } => d !== null);

  return {
    grade: params.grade,
    termTested: params.termTested,
    stats,
    distribution,
    correlation,
  };
}

// ============================================================
// Test Quality API
// ============================================================

/**
 * 取得測驗品質報告
 *
 * Permission: All authenticated users
 */
export async function getTestQualityReport(params: {
  termTested: string;
  grade?: number;  // Optional grade filter
  flagThreshold?: number;
}): Promise<TestQualityData | null> {
  await requireAuth()
  const supabase = createClient();
  const threshold = params.flagThreshold ?? 30;

  const { data, error } = await supabase
    .from("map_assessments")
    .select(`
      student_number,
      course,
      rit_score,
      rapid_guessing_percent,
      students:student_id (
        grade,
        full_name,
        is_active
      )
    `)
    .eq("term_tested", params.termTested)
    .not("rapid_guessing_percent", "is", null)
    .not("student_id", "is", null);

  if (error) {
    console.error("Error fetching test quality:", error);
    return null;
  }

  if (!data || data.length === 0) return null;

  // Filter active students and optionally by grade
  const filteredData = data.filter((d) => {
    const student = d.students as unknown as { grade: number; is_active: boolean } | null;
    if (student?.is_active !== true) return false;
    // Filter by grade if specified
    if (params.grade !== undefined && student?.grade !== params.grade) return false;
    return true;
  });

  // 分類
  let normalCount = 0;
  let cautionCount = 0;
  let flaggedCount = 0;

  const flaggedStudents: TestQualityData["flaggedStudents"] = [];

  for (const row of filteredData) {
    const percent = row.rapid_guessing_percent ?? 0;

    if (percent <= 15) {
      normalCount++;
    } else if (percent <= threshold) {
      cautionCount++;
    } else {
      flaggedCount++;

      const student = row.students as unknown as {
        grade: number;
        full_name: string;
      } | null;

      flaggedStudents.push({
        studentNumber: row.student_number,
        studentName: student?.full_name ?? row.student_number,
        grade: student?.grade ?? 0,
        course: row.course as Course,
        ritScore: row.rit_score,
        rapidGuessingPercent: percent,
      });
    }
  }

  const total = normalCount + cautionCount + flaggedCount;

  // 按 rapid guessing % 降序排序
  flaggedStudents.sort((a, b) => b.rapidGuessingPercent - a.rapidGuessingPercent);

  return {
    termTested: params.termTested,
    summary: {
      normal: {
        count: normalCount,
        percentage: total > 0 ? Math.round((normalCount / total) * 1000) / 10 : 0,
      },
      caution: {
        count: cautionCount,
        percentage: total > 0 ? Math.round((cautionCount / total) * 1000) / 10 : 0,
      },
      flagged: {
        count: flaggedCount,
        percentage: total > 0 ? Math.round((flaggedCount / total) * 1000) / 10 : 0,
      },
      total,
    },
    flaggedStudents,
  };
}

// ============================================================
// Benchmark Transition API
// ============================================================

/**
 * 取得 Benchmark 等級流動分析
 *
 * Permission: All authenticated users
 */
export async function getBenchmarkTransition(params: {
  grade: number;
  fromTerm: string;
  toTerm: string;
  fromGrade?: number;  // 跨學年時，from 的年級 (預設與 grade 相同)
  toGrade?: number;    // 跨學年時，to 的年級 (預設與 grade 相同)
}): Promise<BenchmarkTransitionData | null> {
  await requireAuth()
  const supabase = createClient();

  // 跨學年時使用不同年級的 Benchmark 閾值
  const fromGrade = params.fromGrade ?? params.grade;
  const toGrade = params.toGrade ?? params.grade;

  // 取得兩個學期的資料
  const { data, error } = await supabase
    .from("map_assessments")
    .select(`
      student_number,
      course,
      term_tested,
      rit_score,
      grade,
      students:student_id (
        grade,
        is_active
      )
    `)
    .in("term_tested", [params.fromTerm, params.toTerm])
    .not("student_id", "is", null);

  if (error) {
    console.error("Error fetching benchmark transition:", error);
    return null;
  }

  if (!data || data.length === 0) return null;

  // 過濾活躍學生 (以目前年級 = toGrade 為主)
  // 跨學年的情況下，學生的 current grade 會是 toGrade
  const filteredData = data.filter((d) => {
    const student = d.students as unknown as { grade: number; is_active: boolean } | null;
    return student?.is_active === true && student?.grade === toGrade;
  });

  // 按學生分組，計算每個學期的 Average
  type StudentTermData = {
    languageUsage: number | null;
    reading: number | null;
  };
  const studentData = new Map<string, {
    from: StudentTermData;
    to: StudentTermData;
  }>();

  for (const row of filteredData) {
    let student = studentData.get(row.student_number);
    if (!student) {
      student = {
        from: { languageUsage: null, reading: null },
        to: { languageUsage: null, reading: null },
      };
      studentData.set(row.student_number, student);
    }

    const termData = row.term_tested === params.fromTerm ? student.from : student.to;
    if (row.course === "Language Usage") {
      termData.languageUsage = row.rit_score;
    } else if (row.course === "Reading") {
      termData.reading = row.rit_score;
    }
  }

  // 計算 Benchmark 並追蹤流動
  type BenchmarkLevel = "E1" | "E2" | "E3";
  const transitions: { from: BenchmarkLevel; to: BenchmarkLevel }[] = [];
  const fromCounts = { e1: 0, e2: 0, e3: 0 };
  const toCounts = { e1: 0, e2: 0, e3: 0 };

  for (const student of studentData.values()) {
    // 需要兩科都有資料才能計算
    if (
      student.from.languageUsage === null ||
      student.from.reading === null ||
      student.to.languageUsage === null ||
      student.to.reading === null
    ) {
      continue;
    }

    const fromAvg = calculateMapAverage(student.from.languageUsage, student.from.reading);
    const toAvg = calculateMapAverage(student.to.languageUsage, student.to.reading);

    // 使用對應年級的 Benchmark 閾值
    // fromGrade 用於 fromTerm，toGrade 用於 toTerm
    const fromBenchmark = classifyBenchmark(fromGrade, fromAvg) as BenchmarkLevel | null;
    const toBenchmark = classifyBenchmark(toGrade, toAvg) as BenchmarkLevel | null;

    if (fromBenchmark && toBenchmark) {
      transitions.push({ from: fromBenchmark, to: toBenchmark });

      // 計數
      fromCounts[fromBenchmark.toLowerCase() as "e1" | "e2" | "e3"]++;
      toCounts[toBenchmark.toLowerCase() as "e1" | "e2" | "e3"]++;
    }
  }

  // 建立轉換矩陣
  const benchmarkLevels: BenchmarkLevel[] = ["E1", "E2", "E3"];
  const matrix: BenchmarkTransitionData["matrix"] = [];

  for (const from of benchmarkLevels) {
    for (const to of benchmarkLevels) {
      const count = transitions.filter((t) => t.from === from && t.to === to).length;
      matrix.push({ from, to, count });
    }
  }

  // 計算摘要
  const improved = transitions.filter((t) => {
    const levels = { E1: 3, E2: 2, E3: 1 };
    return levels[t.to] > levels[t.from];
  }).length;

  const declined = transitions.filter((t) => {
    const levels = { E1: 3, E2: 2, E3: 1 };
    return levels[t.to] < levels[t.from];
  }).length;

  const same = transitions.length - improved - declined;
  const total = transitions.length;

  return {
    grade: params.grade,
    fromTerm: params.fromTerm,
    toTerm: params.toTerm,
    matrix,
    summary: {
      improved: {
        count: improved,
        percentage: total > 0 ? Math.round((improved / total) * 1000) / 10 : 0,
      },
      same: {
        count: same,
        percentage: total > 0 ? Math.round((same / total) * 1000) / 10 : 0,
      },
      declined: {
        count: declined,
        percentage: total > 0 ? Math.round((declined / total) * 1000) / 10 : 0,
      },
      total,
    },
    fromCounts,
    toCounts,
  };
}

// ============================================================
// Cohort Tracking API
// ============================================================

/**
 * 取得同屆學生追蹤資料
 *
 * Permission: All authenticated users
 */
export async function getCohortTracking(params: {
  cohortPrefix: string;
}): Promise<CohortTrackingData | null> {
  await requireAuth()
  const supabase = createClient();

  // 根據 cohort prefix 查詢學生
  // LE11xxx = 2024-25 入學的 G4 學生
  const { data, error } = await supabase
    .from("map_assessments")
    .select(`
      student_number,
      course,
      term_tested,
      academic_year,
      rit_score,
      grade,
      students:student_id (
        is_active
      )
    `)
    .like("student_number", `${params.cohortPrefix}%`)
    .not("student_id", "is", null)
    .order("term_tested");

  if (error) {
    console.error("Error fetching cohort tracking:", error);
    return null;
  }

  if (!data || data.length === 0) return null;

  // 過濾活躍學生
  const filteredData = data.filter((d) => {
    const student = d.students as unknown as { is_active: boolean } | null;
    return student?.is_active === true;
  });

  // 取得唯一學生數
  const uniqueStudents = new Set(filteredData.map((d) => d.student_number));

  // 按 term 分組
  const termMap = new Map<string, {
    grade: number;
    languageUsage: number[];
    reading: number[];
  }>();

  for (const row of filteredData) {
    let termData = termMap.get(row.term_tested);
    if (!termData) {
      termData = { grade: row.grade, languageUsage: [], reading: [] };
      termMap.set(row.term_tested, termData);
    }

    if (row.course === "Language Usage") {
      termData.languageUsage.push(row.rit_score);
    } else if (row.course === "Reading") {
      termData.reading.push(row.rit_score);
    }
  }

  // 轉換為結果格式
  const terms: CohortTrackingData["terms"] = [];
  const sortedTerms = Array.from(termMap.keys()).sort(compareTermTested);

  for (const termTested of sortedTerms) {
    const termData = termMap.get(termTested)!;
    const luAvg = termData.languageUsage.length > 0
      ? termData.languageUsage.reduce((a, b) => a + b, 0) / termData.languageUsage.length
      : null;
    const rdAvg = termData.reading.length > 0
      ? termData.reading.reduce((a, b) => a + b, 0) / termData.reading.length
      : null;
    const avg = luAvg !== null && rdAvg !== null ? (luAvg + rdAvg) / 2 : null;

    // 取得常模
    const parsed = parseTermTested(termTested);
    const normAvg = parsed
      ? getNormAverage(parsed.academicYear, termData.grade, parsed.mapTerm)
      : null;

    terms.push({
      termTested,
      grade: termData.grade,
      languageUsage: luAvg !== null ? Math.round(luAvg * 10) / 10 : null,
      reading: rdAvg !== null ? Math.round(rdAvg * 10) / 10 : null,
      average: avg !== null ? Math.round(avg * 10) / 10 : null,
      norm: normAvg !== null ? Math.round(normAvg * 10) / 10 : null,
    });
  }

  // 計算總成長
  const firstTerm = terms[0];
  const lastTerm = terms[terms.length - 1];

  let totalGrowth: CohortTrackingData["totalGrowth"] = {
    languageUsage: null,
    reading: null,
    vsNorm: null,
  };

  if (firstTerm && lastTerm) {
    totalGrowth = {
      languageUsage: firstTerm.languageUsage !== null && lastTerm.languageUsage !== null
        ? Math.round((lastTerm.languageUsage - firstTerm.languageUsage) * 10) / 10
        : null,
      reading: firstTerm.reading !== null && lastTerm.reading !== null
        ? Math.round((lastTerm.reading - firstTerm.reading) * 10) / 10
        : null,
      vsNorm: firstTerm.norm !== null && lastTerm.norm !== null &&
              lastTerm.average !== null && firstTerm.average !== null
        ? Math.round(((lastTerm.average - firstTerm.average) - (lastTerm.norm - firstTerm.norm)) * 10) / 10
        : null,
    };
  }

  // 解析 cohort 描述
  const cohortYear = params.cohortPrefix.slice(2, 4); // "11" from "LE11"
  const cohortDescription = `20${cohortYear} Cohort (LE${cohortYear}xxx)`;

  return {
    cohortPrefix: params.cohortPrefix,
    cohortDescription,
    studentCount: uniqueStudents.size,
    terms,
    totalGrowth,
  };
}

// ============================================================
// Goal RIT Distribution API
// ============================================================

import { calculateMean, calculateStdDev, generateGaussianCurve } from "@/lib/map/statistics";

/**
 * Goal RIT 分佈資料類型
 * 用於 Goals Tab 顯示各 Goal 區域的 RIT 分佈曲線
 */
export interface GoalRitDistributionData {
  course: Course;
  grade: number;
  termTested: string;
  // 整體 RIT 統計
  overallStats: {
    mean: number;
    sd: number;
    count: number;
    gaussianCurve: { x: number; y: number }[];
  };
  // 各 Goal 區域統計
  goals: {
    name: string;
    shortName: string;
    color: string;
    stats: {
      mean: number;
      sd: number;
      count: number;
    };
    gaussianCurve: { x: number; y: number }[];
  }[];
}

/**
 * Goal 區域顏色配置
 */
const GOAL_COLORS: Record<string, { color: string; shortName: string }> = {
  // Reading Goals
  "Informational Text": { color: "#3b82f6", shortName: "Info" },      // blue-500
  "Literary Text": { color: "#10b981", shortName: "Literary" },       // emerald-500
  "Vocabulary": { color: "#f59e0b", shortName: "Vocab" },             // amber-500
  // Language Usage Goals
  "Writing": { color: "#3b82f6", shortName: "Writing" },              // blue-500
  "Grammar and Usage": { color: "#10b981", shortName: "Grammar" },    // emerald-500
  "Mechanics": { color: "#f59e0b", shortName: "Mechanics" },          // amber-500
};

/**
 * 取得 Goal RIT 分佈資料
 *
 * 返回整體 RIT 分佈和各 Goal 區域的分佈曲線，用於 overlay 顯示
 *
 * Permission: All authenticated users
 */
export async function getGoalRitDistribution(params: {
  grade: number;
  course: Course;
  termTested: string;
}): Promise<GoalRitDistributionData | null> {
  await requireAuth();
  const supabase = createClient();

  // 取得 MAP 評量和 Goal Scores
  const { data, error } = await supabase
    .from("map_assessments")
    .select(`
      id,
      student_number,
      rit_score,
      students:student_id (
        grade,
        is_active
      ),
      map_goal_scores (
        goal_name,
        goal_rit_range
      )
    `)
    .eq("course", params.course)
    .eq("term_tested", params.termTested)
    .not("student_id", "is", null);

  if (error) {
    console.error("Error fetching goal RIT distribution:", error);
    return null;
  }

  if (!data || data.length === 0) return null;

  // 過濾活躍學生和指定年級
  const filteredData = data.filter((d) => {
    const student = d.students as unknown as { grade: number; is_active: boolean } | null;
    return student?.is_active === true && student?.grade === params.grade;
  });

  if (filteredData.length === 0) return null;

  // 收集整體 RIT 分數
  const allRitScores: number[] = filteredData.map((d) => d.rit_score);

  // 計算整體統計
  const overallMean = calculateMean(allRitScores);
  const overallSd = calculateStdDev(allRitScores);

  // 決定 X 軸範圍（使用 ±3σ 或資料範圍）
  const minRit = Math.min(...allRitScores);
  const maxRit = Math.max(...allRitScores);
  const xMin = Math.max(100, Math.min(minRit - 10, overallMean - 3 * overallSd));
  const xMax = Math.min(300, Math.max(maxRit + 10, overallMean + 3 * overallSd));
  const binWidth = 5; // 每 5 RIT 一個 bin

  // 生成整體高斯曲線
  const overallGaussian = generateGaussianCurve(
    overallMean,
    overallSd,
    xMin,
    xMax,
    allRitScores.length,
    binWidth,
    60
  );

  // 收集各 Goal 的 RIT 分數
  const goalNames = params.course === "Reading"
    ? READING_GOALS.map((g) => g.name)
    : LANGUAGE_USAGE_GOALS.map((g) => g.name);

  const goalRitScores = new Map<string, number[]>();
  for (const name of goalNames) {
    goalRitScores.set(name, []);
  }

  for (const row of filteredData) {
    const goals = row.map_goal_scores as Array<{ goal_name: string; goal_rit_range: string | null }> || [];
    for (const goal of goals) {
      const midpoint = parseRitRange(goal.goal_rit_range);
      if (midpoint !== null) {
        const existing = goalRitScores.get(goal.goal_name);
        if (existing) {
          existing.push(midpoint);
        }
      }
    }
  }

  // 計算各 Goal 統計和高斯曲線
  const goalsData: GoalRitDistributionData["goals"] = [];

  for (const name of goalNames) {
    const scores = goalRitScores.get(name) || [];
    if (scores.length === 0) continue;

    const goalMean = calculateMean(scores);
    const goalSd = calculateStdDev(scores);
    const config = GOAL_COLORS[name] || { color: "#6b7280", shortName: name.slice(0, 6) };

    // 生成 Goal 高斯曲線（使用相同 X 範圍以便 overlay）
    const goalGaussian = generateGaussianCurve(
      goalMean,
      goalSd,
      xMin,
      xMax,
      scores.length,
      binWidth,
      60
    );

    goalsData.push({
      name,
      shortName: config.shortName,
      color: config.color,
      stats: {
        mean: Math.round(goalMean * 10) / 10,
        sd: Math.round(goalSd * 10) / 10,
        count: scores.length,
      },
      gaussianCurve: goalGaussian,
    });
  }

  return {
    course: params.course,
    grade: params.grade,
    termTested: params.termTested,
    overallStats: {
      mean: Math.round(overallMean * 10) / 10,
      sd: Math.round(overallSd * 10) / 10,
      count: allRitScores.length,
      gaussianCurve: overallGaussian,
    },
    goals: goalsData,
  };
}

// ============================================================
// Export utilities
// ============================================================

export { BENCHMARK_COLORS };
