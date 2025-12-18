/**
 * MAP Goal Score Utilities
 *
 * 解析和處理 NWEA MAP 的 Goal Area 分數
 * Goal 資料儲存為 RIT Range 格式 (如 "161-170")
 */

/**
 * Goal Area 定義
 */
export interface GoalArea {
  name: string;
  course: "Reading" | "Language Usage";
  description: string;
}

/**
 * Reading 課程的 Goal Areas
 */
export const READING_GOALS: GoalArea[] = [
  { name: "Informational Text", course: "Reading", description: "Understanding informational texts" },
  { name: "Literary Text", course: "Reading", description: "Understanding literary texts" },
  { name: "Vocabulary", course: "Reading", description: "Vocabulary acquisition and use" },
];

/**
 * Language Usage 課程的 Goal Areas
 */
export const LANGUAGE_USAGE_GOALS: GoalArea[] = [
  { name: "Grammar and Usage", course: "Language Usage", description: "Grammar and language conventions" },
  { name: "Mechanics", course: "Language Usage", description: "Capitalization, punctuation, spelling" },
  { name: "Writing", course: "Language Usage", description: "Writing process and composition" },
];

/**
 * 所有 Goal Areas
 */
export const ALL_GOALS: GoalArea[] = [...READING_GOALS, ...LANGUAGE_USAGE_GOALS];

/**
 * 取得特定課程的 Goal Areas
 */
export function getGoalsByCoaurse(course: "Reading" | "Language Usage"): GoalArea[] {
  return course === "Reading" ? READING_GOALS : LANGUAGE_USAGE_GOALS;
}

/**
 * 解析 RIT Range 字串為中點數值
 * @param ritRange - RIT Range 字串 (如 "161-170", "HI", "Lo")
 * @returns 中點數值 或 null
 *
 * 特殊處理:
 * - "HI" 或 "High" → 返回 null (超出範圍)
 * - "Lo" 或 "Low" → 返回 null (低於範圍)
 * - "161-170" → 返回 165.5 (中點)
 */
export function parseRitRange(ritRange: string | null | undefined): number | null {
  if (!ritRange || typeof ritRange !== "string") return null;

  const trimmed = ritRange.trim();

  // 處理特殊值
  if (/^(HI|High)$/i.test(trimmed)) return null;
  if (/^(Lo|Low)$/i.test(trimmed)) return null;

  // 標準範圍格式: "161-170"
  const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/);
  if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
    const min = parseInt(rangeMatch[1], 10);
    const max = parseInt(rangeMatch[2], 10);
    return (min + max) / 2;
  }

  // 單一數值格式: "165"
  const singleMatch = trimmed.match(/^(\d+)$/);
  if (singleMatch && singleMatch[1]) {
    return parseInt(singleMatch[1], 10);
  }

  return null;
}

/**
 * 格式化 RIT Range
 * @param min - 最小值
 * @param max - 最大值
 * @returns 格式化字串 (如 "161-170")
 */
export function formatRitRange(min: number, max: number): string {
  return `${min}-${max}`;
}

/**
 * Goal 分數資料
 */
export interface GoalScore {
  goalName: string;
  ritRange: string | null;
  midpoint: number | null;
}

/**
 * 解析 Goal Scores 陣列
 * @param goals - 原始 Goal 資料
 * @returns 解析後的 Goal Scores
 */
export function parseGoalScores(
  goals: Array<{ goal_name: string; goal_rit_range: string | null }>
): GoalScore[] {
  return goals.map((g) => ({
    goalName: g.goal_name,
    ritRange: g.goal_rit_range,
    midpoint: parseRitRange(g.goal_rit_range),
  }));
}

/**
 * Goal 效能比較
 */
export interface GoalPerformanceComparison {
  goalName: string;
  avgMidpoint: number | null;
  vsOverall: number | null; // 與整體 RIT 的差異
  studentCount: number;
}

/**
 * 計算 Goal 效能比較
 * @param goalScores - Goal 分數陣列
 * @param overallRit - 整體 RIT 分數
 * @returns Goal 效能比較
 */
export function calculateGoalPerformance(
  goalScores: GoalScore[],
  overallRit: number | null
): GoalPerformanceComparison[] {
  // 按 goalName 分組
  const grouped = new Map<string, number[]>();

  for (const score of goalScores) {
    if (score.midpoint === null) continue;

    const existing = grouped.get(score.goalName) || [];
    existing.push(score.midpoint);
    grouped.set(score.goalName, existing);
  }

  // 計算平均和差異
  const results: GoalPerformanceComparison[] = [];

  for (const [goalName, midpoints] of grouped.entries()) {
    if (midpoints.length === 0) continue;

    const sum = midpoints.reduce((a, b) => a + b, 0);
    const avg = sum / midpoints.length;

    results.push({
      goalName,
      avgMidpoint: Math.round(avg * 10) / 10,
      vsOverall: overallRit !== null ? Math.round((avg - overallRit) * 10) / 10 : null,
      studentCount: midpoints.length,
    });
  }

  return results;
}

/**
 * Goal 分佈資料 (用於雷達圖)
 */
export interface GoalRadarData {
  goalName: string;
  shortName: string;
  value: number | null;
  fullMark: number; // 參考最大值
}

/**
 * 轉換為雷達圖資料格式
 * @param performance - Goal 效能比較資料
 * @param fullMark - 參考最大值 (預設 250)
 * @returns 雷達圖資料
 */
export function toRadarData(
  performance: GoalPerformanceComparison[],
  fullMark: number = 250
): GoalRadarData[] {
  const shortNames: Record<string, string> = {
    "Informational Text": "Info",
    "Literary Text": "Literary",
    "Vocabulary": "Vocab",
    "Grammar and Usage": "Grammar",
    "Mechanics": "Mechanics",
    "Writing": "Writing",
  };

  return performance.map((p) => ({
    goalName: p.goalName,
    shortName: shortNames[p.goalName] || p.goalName.slice(0, 6),
    value: p.avgMidpoint,
    fullMark,
  }));
}

/**
 * 識別強項和弱項
 * @param performance - Goal 效能比較資料
 * @returns { strengths, weaknesses }
 */
export function identifyStrengthsWeaknesses(
  performance: GoalPerformanceComparison[]
): { strengths: string[]; weaknesses: string[] } {
  const withVsOverall = performance.filter((p) => p.vsOverall !== null);

  if (withVsOverall.length === 0) {
    return { strengths: [], weaknesses: [] };
  }

  // 按 vsOverall 排序
  const sorted = [...withVsOverall].sort((a, b) => (b.vsOverall ?? 0) - (a.vsOverall ?? 0));

  // 高於整體的是強項，低於整體的是弱項
  const strengths = sorted.filter((p) => (p.vsOverall ?? 0) > 0).map((p) => p.goalName);
  const weaknesses = sorted.filter((p) => (p.vsOverall ?? 0) < 0).map((p) => p.goalName);

  return { strengths, weaknesses };
}
