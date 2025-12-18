/**
 * MAP Student Analytics API
 *
 * 提供個別學生的 MAP 進階分析功能
 * 用於學生詳情頁的 MAP Analysis tab
 */

import { createClient } from "@/lib/supabase/client";
import {
  classifyBenchmark,
  calculateMapAverage,
  getBenchmarkThresholds,
  type BenchmarkLevel,
} from "@/lib/map/benchmarks";
import {
  getNorm,
  getExpectedGrowth,
  parseTermTested,
  compareTermTested,
  type Term,
  type Course,
} from "@/lib/map/norms";
import { parseRitRange } from "@/lib/map/goals";
import { parseLexile, getLexileBand, formatLexile } from "@/lib/map/lexile";

// ============================================================
// Types
// ============================================================

export interface StudentBenchmarkStatus {
  testGrade: number;       // 測驗時的年級
  nextYearGrade: number;   // 下學年的年級 (用於 Benchmark 判斷)
  termTested: string;
  languageUsage: number | null;
  reading: number | null;
  average: number | null;
  benchmark: BenchmarkLevel | null;
  thresholds: {
    e1Threshold: number;
    e2Threshold: number;
  } | null;
  distanceToE1: number | null;
  distanceToE3: number | null;
}

export interface StudentGrowthIndex {
  academicYear: string;
  fromTerm: string;
  toTerm: string;
  languageUsage: {
    fromScore: number | null;
    toScore: number | null;
    actualGrowth: number | null;
    expectedGrowth: number | null;
    growthIndex: number | null;
  };
  reading: {
    fromScore: number | null;
    toScore: number | null;
    actualGrowth: number | null;
    expectedGrowth: number | null;
    growthIndex: number | null;
  };
  gradeAverage: {
    languageUsageIndex: number | null;
    readingIndex: number | null;
  };
}

export interface StudentGoalPerformance {
  termTested: string;
  reading: {
    overallRit: number;
    goals: {
      goalName: string;
      midpoint: number | null;
      vsOverall: number | null;
    }[];
  } | null;
  languageUsage: {
    overallRit: number;
    goals: {
      goalName: string;
      midpoint: number | null;
      vsOverall: number | null;
    }[];
  } | null;
  strengths: string[];
  weaknesses: string[];
}

export interface StudentLexileStatus {
  termTested: string;
  lexileScore: number | null;
  lexileFormatted: string;
  band: {
    label: string;
    description: string;
    color: string;
  } | null;
  recommendedRange: {
    min: number;
    max: number;
    minFormatted: string;
    maxFormatted: string;
  } | null;
  growth: {
    fromTerm: string;
    fromScore: number | null;
    change: number | null;
  } | null;
}

export interface BenchmarkHistoryPoint {
  termTested: string;
  languageUsage: number | null;
  reading: number | null;
  average: number | null;
  benchmark: BenchmarkLevel | null;
  grade: number;
}

export interface StudentRankings {
  termTested: string;
  reading: {
    score: number;
    classRank: number;
    classTotal: number;
    gradeRank: number;
    gradeTotal: number;
    classAvg: number;
    gradeAvg: number;
    norm: number | null;
  } | null;
  languageUsage: {
    score: number;
    classRank: number;
    classTotal: number;
    gradeRank: number;
    gradeTotal: number;
    classAvg: number;
    gradeAvg: number;
    norm: number | null;
  } | null;
}

export interface StudentMapAnalytics {
  benchmarkStatus: StudentBenchmarkStatus | null;
  growthIndex: StudentGrowthIndex | null;
  goalPerformance: StudentGoalPerformance | null;
  lexileStatus: StudentLexileStatus | null;
  benchmarkHistory: BenchmarkHistoryPoint[];
  rankings: StudentRankings | null;
}

// ============================================================
// API Functions
// ============================================================

/**
 * 取得學生 Benchmark 狀態
 *
 * Benchmark 使用「下學年年級」的閾值判斷：
 * - 測驗時 G3 → 用 G4 閾值判斷是否準備好升級
 * - 測驗時 G4 → 用 G5 閾值判斷是否準備好升級
 * - 測驗時 G5 → 無閾值（G6 畢業無 Benchmark）
 */
export async function getStudentBenchmarkStatus(
  studentNumber: string,
  _currentGrade: number, // 保留參數但不使用，改用測驗時的年級
  termTested?: string
): Promise<StudentBenchmarkStatus | null> {
  const supabase = createClient();

  // 取得該學生最新的 MAP 資料（包含測驗時的年級）
  let query = supabase
    .from("map_assessments")
    .select("term_tested, course, rit_score, grade")
    .eq("student_number", studentNumber)
    .in("course", ["Reading", "Language Usage"]);

  if (termTested) {
    query = query.eq("term_tested", termTested);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) return null;

  // 取得最新的學期（使用正確的學期排序邏輯，而非字串排序）
  const uniqueTerms = [...new Set(data.map(d => d.term_tested))];
  const sortedTerms = uniqueTerms.sort((a, b) => -compareTermTested(a, b));
  const latestTerm = termTested || sortedTerms[0];
  if (!latestTerm) return null;

  // 取得該學期的兩科成績和測驗時年級
  const termData = data.filter((d) => d.term_tested === latestTerm);
  const readingData = termData.find((d) => d.course === "Reading");
  const luData = termData.find((d) => d.course === "Language Usage");

  const readingScore = readingData?.rit_score ?? null;
  const luScore = luData?.rit_score ?? null;

  // 取得測驗時的年級（從任一科目取得）
  const testGrade = readingData?.grade ?? luData?.grade ?? 0;

  // 下學年年級 = 測驗時年級 + 1（用於 Benchmark 判斷）
  const nextYearGrade = testGrade + 1;

  // 計算平均和 Benchmark（使用下學年年級的閾值）
  const average = readingScore !== null && luScore !== null
    ? calculateMapAverage(luScore, readingScore)
    : null;
  const benchmark = average !== null ? classifyBenchmark(nextYearGrade, average) : null;
  const thresholds = getBenchmarkThresholds(nextYearGrade);

  // 計算與閾值的距離
  let distanceToE1: number | null = null;
  let distanceToE3: number | null = null;
  if (average !== null && thresholds) {
    distanceToE1 = thresholds.e1Threshold - average;
    distanceToE3 = average - thresholds.e2Threshold;
  }

  return {
    testGrade,
    nextYearGrade,
    termTested: latestTerm,
    languageUsage: luScore,
    reading: readingScore,
    average: average !== null ? Math.round(average * 10) / 10 : null,
    benchmark,
    thresholds,
    distanceToE1: distanceToE1 !== null ? Math.round(distanceToE1 * 10) / 10 : null,
    distanceToE3: distanceToE3 !== null ? Math.round(distanceToE3 * 10) / 10 : null,
  };
}

/**
 * 取得學生個人 Growth Index
 */
export async function getStudentGrowthIndex(
  studentNumber: string,
  grade: number,
  academicYear?: string
): Promise<StudentGrowthIndex | null> {
  const supabase = createClient();
  const year = academicYear || "2024-2025";
  const fromTerm = `Fall ${year}`;
  const toTerm = `Spring ${year}`;

  const { data, error } = await supabase
    .from("map_assessments")
    .select("term_tested, course, rit_score")
    .eq("student_number", studentNumber)
    .in("term_tested", [fromTerm, toTerm])
    .in("course", ["Reading", "Language Usage"]);

  if (error || !data) return null;

  // 取得各學期各科成績
  const fallReading = data.find((d) => d.term_tested === fromTerm && d.course === "Reading")?.rit_score ?? null;
  const fallLU = data.find((d) => d.term_tested === fromTerm && d.course === "Language Usage")?.rit_score ?? null;
  const springReading = data.find((d) => d.term_tested === toTerm && d.course === "Reading")?.rit_score ?? null;
  const springLU = data.find((d) => d.term_tested === toTerm && d.course === "Language Usage")?.rit_score ?? null;

  // 計算成長
  const expectedLU = getExpectedGrowth(year, grade, "Language Usage");
  const expectedRD = getExpectedGrowth(year, grade, "Reading");

  const actualLUGrowth = fallLU !== null && springLU !== null ? springLU - fallLU : null;
  const actualRDGrowth = fallReading !== null && springReading !== null ? springReading - fallReading : null;

  const luIndex = actualLUGrowth !== null && expectedLU !== null && expectedLU !== 0
    ? actualLUGrowth / expectedLU
    : null;
  const rdIndex = actualRDGrowth !== null && expectedRD !== null && expectedRD !== 0
    ? actualRDGrowth / expectedRD
    : null;

  return {
    academicYear: year,
    fromTerm,
    toTerm,
    languageUsage: {
      fromScore: fallLU,
      toScore: springLU,
      actualGrowth: actualLUGrowth,
      expectedGrowth: expectedLU,
      growthIndex: luIndex !== null ? Math.round(luIndex * 100) / 100 : null,
    },
    reading: {
      fromScore: fallReading,
      toScore: springReading,
      actualGrowth: actualRDGrowth,
      expectedGrowth: expectedRD,
      growthIndex: rdIndex !== null ? Math.round(rdIndex * 100) / 100 : null,
    },
    gradeAverage: {
      languageUsageIndex: null, // TODO: Calculate from grade data
      readingIndex: null,
    },
  };
}

/**
 * 取得學生 Goal Areas 表現
 */
export async function getStudentGoalPerformance(
  studentNumber: string,
  termTested?: string
): Promise<StudentGoalPerformance | null> {
  const supabase = createClient();

  // 取得最新的學期
  let targetTerm = termTested;
  if (!targetTerm) {
    const { data: termsData } = await supabase
      .from("map_assessments")
      .select("term_tested")
      .eq("student_number", studentNumber)
      .order("term_tested", { ascending: false })
      .limit(1);
    targetTerm = termsData?.[0]?.term_tested;
  }

  if (!targetTerm) return null;

  // 取得 MAP 評量和 Goal Scores
  const { data, error } = await supabase
    .from("map_assessments")
    .select(`
      course,
      rit_score,
      map_goal_scores (
        goal_name,
        goal_rit_range
      )
    `)
    .eq("student_number", studentNumber)
    .eq("term_tested", targetTerm);

  if (error || !data) return null;

  // 處理 Reading 資料
  const readingData = data.find((d) => d.course === "Reading");
  let readingResult = null;
  if (readingData) {
    const goals = (readingData.map_goal_scores as Array<{ goal_name: string; goal_rit_range: string | null }>) || [];
    readingResult = {
      overallRit: readingData.rit_score,
      goals: goals.map((g) => {
        const midpoint = parseRitRange(g.goal_rit_range);
        return {
          goalName: g.goal_name,
          midpoint,
          vsOverall: midpoint !== null ? Math.round((midpoint - readingData.rit_score) * 10) / 10 : null,
        };
      }),
    };
  }

  // 處理 Language Usage 資料
  const luData = data.find((d) => d.course === "Language Usage");
  let luResult = null;
  if (luData) {
    const goals = (luData.map_goal_scores as Array<{ goal_name: string; goal_rit_range: string | null }>) || [];
    luResult = {
      overallRit: luData.rit_score,
      goals: goals.map((g) => {
        const midpoint = parseRitRange(g.goal_rit_range);
        return {
          goalName: g.goal_name,
          midpoint,
          vsOverall: midpoint !== null ? Math.round((midpoint - luData.rit_score) * 10) / 10 : null,
        };
      }),
    };
  }

  // 識別強弱項
  const allGoals = [
    ...(readingResult?.goals || []),
    ...(luResult?.goals || []),
  ].filter((g) => g.vsOverall !== null);

  const strengths = allGoals
    .filter((g) => (g.vsOverall ?? 0) > 0)
    .sort((a, b) => (b.vsOverall ?? 0) - (a.vsOverall ?? 0))
    .slice(0, 2)
    .map((g) => g.goalName);

  const weaknesses = allGoals
    .filter((g) => (g.vsOverall ?? 0) < 0)
    .sort((a, b) => (a.vsOverall ?? 0) - (b.vsOverall ?? 0))
    .slice(0, 2)
    .map((g) => g.goalName);

  return {
    termTested: targetTerm,
    reading: readingResult,
    languageUsage: luResult,
    strengths,
    weaknesses,
  };
}

/**
 * 取得學生 Lexile 狀態
 */
export async function getStudentLexileStatus(
  studentNumber: string,
  termTested?: string
): Promise<StudentLexileStatus | null> {
  const supabase = createClient();

  // 取得 Reading 評量的 Lexile 資料
  let query = supabase
    .from("map_assessments")
    .select("term_tested, lexile_score")
    .eq("student_number", studentNumber)
    .eq("course", "Reading")
    .not("lexile_score", "is", null)
    .order("term_tested", { ascending: false });

  const { data, error } = await query;

  if (error || !data || data.length === 0) return null;

  // 取得最新的 Lexile
  const latestTerm = termTested || data[0]?.term_tested;
  const latestData = data.find((d) => d.term_tested === latestTerm);
  if (!latestData) return null;

  const lexileScore = parseLexile(latestData.lexile_score);
  const band = getLexileBand(lexileScore);

  // 計算推薦閱讀範圍 (±100L)
  let recommendedRange = null;
  if (lexileScore !== null) {
    const min = lexileScore - 100;
    const max = lexileScore + 100;
    recommendedRange = {
      min,
      max,
      minFormatted: formatLexile(min),
      maxFormatted: formatLexile(max),
    };
  }

  // 計算成長（與上一學期比較）
  let growth = null;
  if (data.length > 1) {
    const previousData = data[1];
    if (previousData) {
      const previousScore = parseLexile(previousData.lexile_score);
      if (previousScore !== null && lexileScore !== null) {
        growth = {
          fromTerm: previousData.term_tested,
          fromScore: previousScore,
          change: lexileScore - previousScore,
        };
      }
    }
  }

  return {
    termTested: latestTerm,
    lexileScore,
    lexileFormatted: formatLexile(lexileScore),
    band: band ? {
      label: band.label,
      description: band.description,
      color: band.color,
    } : null,
    recommendedRange,
    growth,
  };
}

/**
 * 取得學生 Benchmark 歷史
 */
export async function getStudentBenchmarkHistory(
  studentNumber: string
): Promise<BenchmarkHistoryPoint[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("map_assessments")
    .select("term_tested, course, rit_score, grade")
    .eq("student_number", studentNumber)
    .in("course", ["Reading", "Language Usage"])
    .order("term_tested");

  if (error || !data) return [];

  // 按學期分組
  const termMap = new Map<string, {
    grade: number;
    languageUsage: number | null;
    reading: number | null;
  }>();

  for (const row of data) {
    let termData = termMap.get(row.term_tested);
    if (!termData) {
      termData = { grade: row.grade, languageUsage: null, reading: null };
      termMap.set(row.term_tested, termData);
    }
    if (row.course === "Language Usage") {
      termData.languageUsage = row.rit_score;
    } else if (row.course === "Reading") {
      termData.reading = row.rit_score;
    }
  }

  // 轉換為結果陣列
  const results: BenchmarkHistoryPoint[] = [];
  const sortedTerms = Array.from(termMap.keys()).sort(compareTermTested);

  for (const termTested of sortedTerms) {
    const termData = termMap.get(termTested)!;
    const average = termData.languageUsage !== null && termData.reading !== null
      ? calculateMapAverage(termData.languageUsage, termData.reading)
      : null;
    const benchmark = average !== null ? classifyBenchmark(termData.grade, average) : null;

    results.push({
      termTested,
      languageUsage: termData.languageUsage,
      reading: termData.reading,
      average: average !== null ? Math.round(average * 10) / 10 : null,
      benchmark,
      grade: termData.grade,
    });
  }

  return results;
}

/**
 * 取得學生排名比較
 */
export async function getStudentRankings(
  studentNumber: string,
  grade: number,
  classId: string | null,
  termTested?: string
): Promise<StudentRankings | null> {
  const supabase = createClient();

  // 取得該學生最新的學期
  let targetTerm = termTested;
  if (!targetTerm) {
    const { data: termsData } = await supabase
      .from("map_assessments")
      .select("term_tested")
      .eq("student_number", studentNumber)
      .order("term_tested", { ascending: false })
      .limit(1);
    targetTerm = termsData?.[0]?.term_tested;
  }

  if (!targetTerm) return null;

  // 取得該學生的成績
  const { data: studentData } = await supabase
    .from("map_assessments")
    .select("course, rit_score")
    .eq("student_number", studentNumber)
    .eq("term_tested", targetTerm);

  if (!studentData || studentData.length === 0) return null;

  const studentReading = studentData.find((d) => d.course === "Reading")?.rit_score ?? null;
  const studentLU = studentData.find((d) => d.course === "Language Usage")?.rit_score ?? null;

  // 取得年級所有學生的成績（使用學生目前年級）
  const { data: gradeData } = await supabase
    .from("map_assessments")
    .select(`
      student_number,
      course,
      rit_score,
      students:student_id (
        grade,
        class_id,
        is_active
      )
    `)
    .eq("term_tested", targetTerm)
    .not("student_id", "is", null);

  if (!gradeData) return null;

  // 過濾活躍學生和該年級
  const filteredData = gradeData.filter((d) => {
    const student = d.students as unknown as { grade: number; class_id: string; is_active: boolean } | null;
    return student?.is_active === true && student?.grade === grade;
  });

  // 計算排名
  const calculateRankings = (course: "Reading" | "Language Usage", studentScore: number | null) => {
    if (studentScore === null) return null;

    const courseData = filteredData.filter((d) => d.course === course);

    // 年級排名
    const gradeScores = courseData.map((d) => d.rit_score).sort((a, b) => b - a);
    const gradeRank = gradeScores.findIndex((s) => s === studentScore) + 1;
    const gradeAvg = gradeScores.length > 0
      ? gradeScores.reduce((a, b) => a + b, 0) / gradeScores.length
      : 0;

    // 班級排名
    let classRank = 0;
    let classTotal = 0;
    let classAvg = 0;
    if (classId) {
      const classData = courseData.filter((d) => {
        const student = d.students as unknown as { class_id: string } | null;
        return student?.class_id === classId;
      });
      const classScores = classData.map((d) => d.rit_score).sort((a, b) => b - a);
      classRank = classScores.findIndex((s) => s === studentScore) + 1;
      classTotal = classScores.length;
      classAvg = classScores.length > 0
        ? classScores.reduce((a, b) => a + b, 0) / classScores.length
        : 0;
    }

    // 取得常模
    const parsed = parseTermTested(targetTerm);
    const norm = parsed
      ? getNorm(parsed.academicYear, grade, parsed.term, course)
      : null;

    return {
      score: studentScore,
      classRank: classRank || 1,
      classTotal: classTotal || 1,
      gradeRank: gradeRank || 1,
      gradeTotal: gradeScores.length,
      classAvg: Math.round(classAvg * 10) / 10,
      gradeAvg: Math.round(gradeAvg * 10) / 10,
      norm,
    };
  };

  return {
    termTested: targetTerm,
    reading: calculateRankings("Reading", studentReading),
    languageUsage: calculateRankings("Language Usage", studentLU),
  };
}

/**
 * 批次取得所有學生 MAP 分析資料
 */
export async function getStudentMapAnalytics(
  studentId: string,
  studentNumber: string,
  grade: number,
  classId: string | null
): Promise<StudentMapAnalytics> {
  // 並行取得所有資料
  const [
    benchmarkStatus,
    growthIndex,
    goalPerformance,
    lexileStatus,
    benchmarkHistory,
    rankings,
  ] = await Promise.all([
    getStudentBenchmarkStatus(studentNumber, grade),
    getStudentGrowthIndex(studentNumber, grade),
    getStudentGoalPerformance(studentNumber),
    getStudentLexileStatus(studentNumber),
    getStudentBenchmarkHistory(studentNumber),
    getStudentRankings(studentNumber, grade, classId),
  ]);

  return {
    benchmarkStatus,
    growthIndex,
    goalPerformance,
    lexileStatus,
    benchmarkHistory,
    rankings,
  };
}
