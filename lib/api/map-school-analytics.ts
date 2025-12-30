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

  // 取得唯一值
  const terms = [...new Set(data?.map((d) => d.term_tested) || [])];
  return terms;
}
