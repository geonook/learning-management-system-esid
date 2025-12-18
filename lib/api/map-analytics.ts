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
      term,
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
    term: string;
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
        term: row.term,
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
// Advanced Analytics Types
// ============================================================

export interface GrowthAnalysisData {
  grade: number;
  academicYear: string;
  byLevel: {
    englishLevel: string;
    languageUsage: {
      avgFall: number | null;
      avgSpring: number | null;
      actualGrowth: number | null;
      expectedGrowth: number | null;
      growthIndex: number | null;
      studentCount: number;
    };
    reading: {
      avgFall: number | null;
      avgSpring: number | null;
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

import { getExpectedGrowth } from "@/lib/map/norms";

/**
 * 取得成長分析資料 (Fall → Spring)
 */
export async function getGrowthAnalysis(params: {
  grade: number;
  academicYear: string;
}): Promise<GrowthAnalysisData | null> {
  const supabase = createClient();

  const fallTerm = `Fall ${params.academicYear}`;
  const springTerm = `Spring ${params.academicYear}`;

  // 取得 Fall 和 Spring 的資料
  const { data, error } = await supabase
    .from("map_assessments")
    .select(`
      student_number,
      course,
      term_tested,
      rit_score,
      students:student_id (
        grade,
        level,
        is_active
      )
    `)
    .in("term_tested", [fallTerm, springTerm])
    .not("student_id", "is", null);

  if (error) {
    console.error("Error fetching growth analysis:", error);
    return null;
  }

  if (!data || data.length === 0) return null;

  // 過濾活躍學生和指定年級
  const filteredData = data.filter((d) => {
    const student = d.students as unknown as { grade: number; level: string; is_active: boolean } | null;
    return student?.is_active === true && student?.grade === params.grade;
  });

  // 按學生分組
  type StudentData = {
    level: string;
    fall: { languageUsage: number | null; reading: number | null };
    spring: { languageUsage: number | null; reading: number | null };
  };
  const studentMap = new Map<string, StudentData>();

  for (const row of filteredData) {
    const student = row.students as unknown as { level: string } | null;
    const level = student?.level?.slice(-2) || "Unknown";
    const isFall = row.term_tested === fallTerm;

    let studentData = studentMap.get(row.student_number);
    if (!studentData) {
      studentData = {
        level,
        fall: { languageUsage: null, reading: null },
        spring: { languageUsage: null, reading: null },
      };
      studentMap.set(row.student_number, studentData);
    }

    const termData = isFall ? studentData.fall : studentData.spring;
    if (row.course === "Language Usage") {
      termData.languageUsage = row.rit_score;
    } else if (row.course === "Reading") {
      termData.reading = row.rit_score;
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
      (s) => s.fall.languageUsage !== null && s.spring.languageUsage !== null
    );
    const luFallSum = luStudents.reduce((sum, s) => sum + (s.fall.languageUsage ?? 0), 0);
    const luSpringSum = luStudents.reduce((sum, s) => sum + (s.spring.languageUsage ?? 0), 0);

    // Reading
    const rdStudents = students.filter(
      (s) => s.fall.reading !== null && s.spring.reading !== null
    );
    const rdFallSum = rdStudents.reduce((sum, s) => sum + (s.fall.reading ?? 0), 0);
    const rdSpringSum = rdStudents.reduce((sum, s) => sum + (s.spring.reading ?? 0), 0);

    // Expected Growth
    const expectedLU = getExpectedGrowth(params.academicYear, params.grade, "Language Usage");
    const expectedRD = getExpectedGrowth(params.academicYear, params.grade, "Reading");

    const luAvgFall = luStudents.length > 0 ? luFallSum / luStudents.length : null;
    const luAvgSpring = luStudents.length > 0 ? luSpringSum / luStudents.length : null;
    const luActualGrowth = luAvgFall !== null && luAvgSpring !== null ? luAvgSpring - luAvgFall : null;
    const luGrowthIndex = luActualGrowth !== null && expectedLU !== null && expectedLU !== 0
      ? luActualGrowth / expectedLU
      : null;

    const rdAvgFall = rdStudents.length > 0 ? rdFallSum / rdStudents.length : null;
    const rdAvgSpring = rdStudents.length > 0 ? rdSpringSum / rdStudents.length : null;
    const rdActualGrowth = rdAvgFall !== null && rdAvgSpring !== null ? rdAvgSpring - rdAvgFall : null;
    const rdGrowthIndex = rdActualGrowth !== null && expectedRD !== null && expectedRD !== 0
      ? rdActualGrowth / expectedRD
      : null;

    // 收集個人成長值 (用於分佈圖)
    if (level === "All") {
      for (const s of luStudents) {
        const growth = (s.spring.languageUsage ?? 0) - (s.fall.languageUsage ?? 0);
        allGrowths.push(growth);
      }
      for (const s of rdStudents) {
        const growth = (s.spring.reading ?? 0) - (s.fall.reading ?? 0);
        allGrowths.push(growth);
      }
    }

    byLevel.push({
      englishLevel: level,
      languageUsage: {
        avgFall: luAvgFall !== null ? Math.round(luAvgFall * 10) / 10 : null,
        avgSpring: luAvgSpring !== null ? Math.round(luAvgSpring * 10) / 10 : null,
        actualGrowth: luActualGrowth !== null ? Math.round(luActualGrowth * 10) / 10 : null,
        expectedGrowth: expectedLU,
        growthIndex: luGrowthIndex !== null ? Math.round(luGrowthIndex * 100) / 100 : null,
        studentCount: luStudents.length,
      },
      reading: {
        avgFall: rdAvgFall !== null ? Math.round(rdAvgFall * 10) / 10 : null,
        avgSpring: rdAvgSpring !== null ? Math.round(rdAvgSpring * 10) / 10 : null,
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
    academicYear: params.academicYear,
    byLevel,
    distribution,
  };
}

// ============================================================
// Goal Performance API
// ============================================================

import { parseRitRange, READING_GOALS, LANGUAGE_USAGE_GOALS } from "@/lib/map/goals";

/**
 * 取得 Goal 效能分析資料
 */
export async function getGoalPerformance(params: {
  grade: number;
  course: Course;
  termTested: string;
}): Promise<GoalPerformanceData | null> {
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
 */
export async function getLexileAnalysis(params: {
  grade: number;
  termTested: string;
}): Promise<LexileAnalysisData | null> {
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
 */
export async function getTestQualityReport(params: {
  termTested: string;
  flagThreshold?: number;
}): Promise<TestQualityData | null> {
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
        first_name,
        last_name,
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

  // 過濾活躍學生
  const filteredData = data.filter((d) => {
    const student = d.students as unknown as { is_active: boolean } | null;
    return student?.is_active === true;
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
        first_name: string;
        last_name: string;
      } | null;

      flaggedStudents.push({
        studentNumber: row.student_number,
        studentName: student ? `${student.first_name} ${student.last_name}` : row.student_number,
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
 */
export async function getBenchmarkTransition(params: {
  grade: number;
  fromTerm: string;
  toTerm: string;
}): Promise<BenchmarkTransitionData | null> {
  const supabase = createClient();

  // 取得兩個學期的資料
  const { data, error } = await supabase
    .from("map_assessments")
    .select(`
      student_number,
      course,
      term_tested,
      rit_score,
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

  // 過濾活躍學生和指定年級
  const filteredData = data.filter((d) => {
    const student = d.students as unknown as { grade: number; is_active: boolean } | null;
    return student?.is_active === true && student?.grade === params.grade;
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

    const fromBenchmark = classifyBenchmark(params.grade, fromAvg) as BenchmarkLevel | null;
    const toBenchmark = classifyBenchmark(params.grade, toAvg) as BenchmarkLevel | null;

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
 */
export async function getCohortTracking(params: {
  cohortPrefix: string;
}): Promise<CohortTrackingData | null> {
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
      ? getNormAverage(parsed.academicYear, termData.grade, parsed.term)
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
// Export utilities
// ============================================================

export { BENCHMARK_COLORS };
