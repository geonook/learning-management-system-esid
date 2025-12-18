/**
 * NWEA MAP Growth Assessment API
 * Frontend data layer for MAP assessment queries
 */

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

// ============================================================
// Types
// ============================================================

export type MapAssessment = Database["public"]["Tables"]["map_assessments"]["Row"];
export type MapGoalScore = Database["public"]["Tables"]["map_goal_scores"]["Row"];

export interface MapAssessmentWithGoals extends MapAssessment {
  goals: MapGoalScore[];
}

export interface MapGrowthData {
  startTerm: string;
  endTerm: string;
  startRit: number;
  endRit: number;
  growth: number;
}

export interface MapTrendPoint {
  termTested: string;
  academicYear: string;
  term: string;
  ritScore: number;
  lexileScore: string | null;
  sortOrder: number;
}

export interface MapStudentSummary {
  studentId: string;
  studentNumber: string;
  studentName: string;
  className: string | null;
  grade: number;
  reading: {
    latestRit: number | null;
    latestLexile: string | null;
    latestTerm: string | null;
    growth: number | null;
  };
  languageUsage: {
    latestRit: number | null;
    latestTerm: string | null;
    growth: number | null;
  };
}

export interface MapClassStats {
  classId: string;
  className: string;
  grade: number;
  termTested: string;
  course: "Reading" | "Language Usage";
  studentCount: number;
  avgRit: number | null;
  minRit: number | null;
  maxRit: number | null;
  avgGrowth: number | null;
}

export interface MapGradeStats {
  grade: number;
  course: "Reading" | "Language Usage";
  termTested: string;
  studentCount: number;
  avgRit: number | null;
  minRit: number | null;
  maxRit: number | null;
}

// ============================================================
// Term Ordering
// ============================================================

const TERM_ORDER: Record<string, number> = {
  "Fall 2024-2025": 1,
  "Spring 2024-2025": 2,
  "Fall 2025-2026": 3,
  "Spring 2025-2026": 4,
  "Fall 2026-2027": 5,
  "Spring 2026-2027": 6,
};

function getTermOrder(termTested: string): number {
  return TERM_ORDER[termTested] || 99;
}

// ============================================================
// Student MAP Data
// ============================================================

/**
 * Get a student's complete MAP history with goals
 */
export async function getStudentMapHistory(
  studentId: string,
  course?: "Reading" | "Language Usage"
): Promise<MapAssessmentWithGoals[]> {
  const supabase = createClient();

  // First get assessments
  let query = supabase
    .from("map_assessments")
    .select("*")
    .eq("student_id", studentId)
    .order("term_tested", { ascending: true });

  if (course) {
    query = query.eq("course", course);
  }

  const { data: assessments, error } = await query;

  if (error) {
    console.error("Error fetching MAP history:", error);
    return [];
  }

  if (!assessments || assessments.length === 0) {
    return [];
  }

  // Get goals for all assessments
  const assessmentIds = assessments.map((a) => a.id);
  const { data: goals, error: goalsError } = await supabase
    .from("map_goal_scores")
    .select("*")
    .in("assessment_id", assessmentIds);

  if (goalsError) {
    console.error("Error fetching MAP goals:", goalsError);
  }

  // Map goals to assessments
  const goalsMap = new Map<string, MapGoalScore[]>();
  for (const goal of goals || []) {
    const existing = goalsMap.get(goal.assessment_id) || [];
    existing.push(goal);
    goalsMap.set(goal.assessment_id, existing);
  }

  // Combine assessments with goals and sort by term
  return assessments
    .map((assessment) => ({
      ...assessment,
      goals: goalsMap.get(assessment.id) || [],
    }))
    .sort((a, b) => getTermOrder(a.term_tested) - getTermOrder(b.term_tested));
}

/**
 * Get a student's MAP history by student_number (for unlinked students)
 */
export async function getStudentMapHistoryByNumber(
  studentNumber: string,
  course?: "Reading" | "Language Usage"
): Promise<MapAssessmentWithGoals[]> {
  const supabase = createClient();

  let query = supabase
    .from("map_assessments")
    .select("*")
    .eq("student_number", studentNumber)
    .order("term_tested", { ascending: true });

  if (course) {
    query = query.eq("course", course);
  }

  const { data: assessments, error } = await query;

  if (error) {
    console.error("Error fetching MAP history by number:", error);
    return [];
  }

  if (!assessments || assessments.length === 0) {
    return [];
  }

  // Get goals
  const assessmentIds = assessments.map((a) => a.id);
  const { data: goals } = await supabase
    .from("map_goal_scores")
    .select("*")
    .in("assessment_id", assessmentIds);

  const goalsMap = new Map<string, MapGoalScore[]>();
  for (const goal of goals || []) {
    const existing = goalsMap.get(goal.assessment_id) || [];
    existing.push(goal);
    goalsMap.set(goal.assessment_id, existing);
  }

  return assessments
    .map((assessment) => ({
      ...assessment,
      goals: goalsMap.get(assessment.id) || [],
    }))
    .sort((a, b) => getTermOrder(a.term_tested) - getTermOrder(b.term_tested));
}

/**
 * Get growth trend for a student and course
 */
export function getGrowthTrend(
  assessments: MapAssessmentWithGoals[],
  course: "Reading" | "Language Usage"
): MapTrendPoint[] {
  return assessments
    .filter((a) => a.course === course)
    .map((a) => ({
      termTested: a.term_tested,
      academicYear: a.academic_year,
      term: a.term,
      ritScore: a.rit_score,
      lexileScore: a.lexile_score,
      sortOrder: getTermOrder(a.term_tested),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Calculate growth between two terms
 */
export function calculateGrowth(
  assessments: MapAssessmentWithGoals[],
  course: "Reading" | "Language Usage",
  startTermTested?: string,
  endTermTested?: string
): MapGrowthData | null {
  const courseAssessments = assessments
    .filter((a) => a.course === course)
    .sort((a, b) => getTermOrder(a.term_tested) - getTermOrder(b.term_tested));

  if (courseAssessments.length < 2) return null;

  // If no specific terms provided, use first and last
  const start = startTermTested
    ? courseAssessments.find((a) => a.term_tested === startTermTested)
    : courseAssessments[0];
  const end = endTermTested
    ? courseAssessments.find((a) => a.term_tested === endTermTested)
    : courseAssessments[courseAssessments.length - 1];

  if (!start || !end || start === end) return null;

  return {
    startTerm: start.term_tested,
    endTerm: end.term_tested,
    startRit: start.rit_score,
    endRit: end.rit_score,
    growth: end.rit_score - start.rit_score,
  };
}

// ============================================================
// Browse & Statistics
// ============================================================

/**
 * Get MAP assessments with filtering for Browse page
 */
export async function getMapAssessments(options: {
  grade?: number;
  course?: "Reading" | "Language Usage";
  termTested?: string;
  academicYear?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: MapAssessment[]; count: number }> {
  const supabase = createClient();

  let query = supabase
    .from("map_assessments")
    .select("*", { count: "exact" });

  if (options.grade) {
    query = query.eq("grade", options.grade);
  }
  if (options.course) {
    query = query.eq("course", options.course);
  }
  if (options.termTested) {
    query = query.eq("term_tested", options.termTested);
  }
  if (options.academicYear) {
    query = query.eq("academic_year", options.academicYear);
  }
  if (options.search) {
    query = query.or(
      `student_number.ilike.%${options.search}%,student_first_name.ilike.%${options.search}%,student_last_name.ilike.%${options.search}%`
    );
  }

  query = query
    .order("grade", { ascending: true })
    .order("student_number", { ascending: true })
    .order("course", { ascending: true });

  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching MAP assessments:", error);
    return { data: [], count: 0 };
  }

  return { data: data || [], count: count || 0 };
}

/**
 * Get available terms for filtering
 */
export async function getAvailableMapTerms(): Promise<string[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("map_assessments")
    .select("term_tested")
    .order("term_tested", { ascending: false });

  if (error) {
    console.error("Error fetching MAP terms:", error);
    return [];
  }

  // Get unique terms
  const terms = [...new Set(data?.map((d) => d.term_tested) || [])];
  return terms.sort((a, b) => getTermOrder(b) - getTermOrder(a));
}

/**
 * Get grade statistics for a term
 */
export async function getGradeMapStatistics(
  grade: number,
  termTested?: string
): Promise<MapGradeStats[]> {
  const supabase = createClient();

  let query = supabase
    .from("map_assessments")
    .select("grade, course, term_tested, rit_score")
    .eq("grade", grade);

  if (termTested) {
    query = query.eq("term_tested", termTested);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching grade MAP statistics:", error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Group by course and term
  const grouped = new Map<string, { scores: number[]; course: string; term: string }>();

  for (const row of data) {
    const key = `${row.course}-${row.term_tested}`;
    const existing = grouped.get(key) || { scores: [] as number[], course: row.course, term: row.term_tested };
    existing.scores.push(row.rit_score);
    grouped.set(key, existing);
  }

  // Calculate statistics
  return Array.from(grouped.values()).map((group) => {
    const scores = group.scores;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

    return {
      grade,
      course: group.course as "Reading" | "Language Usage",
      termTested: group.term,
      studentCount: scores.length,
      avgRit: Math.round(avg * 10) / 10,
      minRit: Math.min(...scores),
      maxRit: Math.max(...scores),
    };
  });
}

/**
 * Get school-wide MAP statistics (for Admin)
 */
export async function getSchoolMapStatistics(
  termTested?: string,
  academicYear?: string
): Promise<{
  totalStudents: number;
  byGrade: Record<number, { reading: number | null; languageUsage: number | null }>;
  byCourse: Record<string, { avgRit: number; count: number }>;
}> {
  const supabase = createClient();

  let query = supabase.from("map_assessments").select("grade, course, rit_score");

  if (termTested) {
    query = query.eq("term_tested", termTested);
  }
  if (academicYear) {
    query = query.eq("academic_year", academicYear);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching school MAP statistics:", error);
    return {
      totalStudents: 0,
      byGrade: {},
      byCourse: {},
    };
  }

  if (!data || data.length === 0) {
    return {
      totalStudents: 0,
      byGrade: {},
      byCourse: {},
    };
  }

  // Count unique students (by rit scores grouped by grade)
  const uniqueStudents = new Set(data.map((d) => `${d.grade}-${d.rit_score}`));

  // Group by grade and course
  const byGradeAndCourse = new Map<string, number[]>();
  const byCourse = new Map<string, number[]>();

  for (const row of data) {
    const gradeKey = `${row.grade}-${row.course}`;
    const gradeScores = byGradeAndCourse.get(gradeKey) || [];
    gradeScores.push(row.rit_score);
    byGradeAndCourse.set(gradeKey, gradeScores);

    const courseScores = byCourse.get(row.course) || [];
    courseScores.push(row.rit_score);
    byCourse.set(row.course, courseScores);
  }

  // Build byGrade object
  const byGrade: Record<number, { reading: number | null; languageUsage: number | null }> = {};
  for (const grade of [3, 4, 5, 6]) {
    const readingScores = byGradeAndCourse.get(`${grade}-Reading`) || [];
    const luScores = byGradeAndCourse.get(`${grade}-Language Usage`) || [];

    byGrade[grade] = {
      reading:
        readingScores.length > 0
          ? Math.round((readingScores.reduce((a, b) => a + b, 0) / readingScores.length) * 10) / 10
          : null,
      languageUsage:
        luScores.length > 0
          ? Math.round((luScores.reduce((a, b) => a + b, 0) / luScores.length) * 10) / 10
          : null,
    };
  }

  // Build byCourse object
  const byCourseResult: Record<string, { avgRit: number; count: number }> = {};
  for (const [course, scores] of byCourse) {
    byCourseResult[course] = {
      avgRit: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
      count: scores.length,
    };
  }

  return {
    totalStudents: uniqueStudents.size,
    byGrade,
    byCourse: byCourseResult,
  };
}

// ============================================================
// Formatting Helpers
// ============================================================

/**
 * Format term label for display
 * @example "Fall 2025-2026" -> "Fall 25-26"
 */
export function formatTermLabel(termTested: string): string {
  const match = termTested.match(/^(Fall|Spring)\s+(\d{4})-(\d{4})$/);
  if (!match || !match[1] || !match[2] || !match[3]) return termTested;

  const season = match[1];
  const startYear = match[2];
  const endYear = match[3];
  return `${season} ${startYear.slice(2)}-${endYear.slice(2)}`;
}

/**
 * Get color class based on RIT score
 */
export function getRitScoreColor(ritScore: number, grade: number): string {
  // Approximate grade-level benchmarks (simplified)
  const benchmarks: Record<number, { low: number; mid: number; high: number }> = {
    3: { low: 170, mid: 185, high: 200 },
    4: { low: 185, mid: 200, high: 215 },
    5: { low: 195, mid: 210, high: 225 },
    6: { low: 205, mid: 220, high: 235 },
  };

  const defaultBenchmark = { low: 195, mid: 210, high: 225 };
  const benchmark = benchmarks[grade] ?? defaultBenchmark;

  if (ritScore >= benchmark.high) return "text-green-600 dark:text-green-400";
  if (ritScore >= benchmark.mid) return "text-blue-600 dark:text-blue-400";
  if (ritScore >= benchmark.low) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

/**
 * Get growth color class
 */
export function getGrowthColor(growth: number): string {
  if (growth >= 10) return "text-green-600 dark:text-green-400";
  if (growth >= 5) return "text-blue-600 dark:text-blue-400";
  if (growth >= 0) return "text-gray-600 dark:text-gray-400";
  return "text-red-600 dark:text-red-400";
}

/**
 * Format growth with sign
 */
export function formatGrowth(growth: number | null): string {
  if (growth === null) return "-";
  const sign = growth >= 0 ? "+" : "";
  return `${sign}${growth}`;
}
