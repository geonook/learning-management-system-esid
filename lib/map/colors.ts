/**
 * MAP Chart Colors - 統一配色系統
 *
 * 基於 NWEA 官方報告風格，確保學生頁面與統計頁面視覺一致性。
 */

/**
 * NWEA 官方風格配色（柔和版本）
 * 用於進度圖表、趨勢圖等
 */
export const NWEA_COLORS = {
  /** Student RIT 柱狀/線條 - 柔和藍色 */
  studentRit: "#5B8BD9",
  /** Level/Grade 平均 - 柔和金黃 */
  levelMean: "#E6B800",
  /** NWEA Norm 常模 - 灰藍色 */
  norm: "#3D5A80",
  /** 預測值（同 studentRit，配合斜線填充） */
  projection: "#5B8BD9",
  /** 網格線 */
  gridLine: "#e5e7eb",
} as const;

/**
 * Benchmark 分類配色
 * E1 (Advanced), E2 (Intermediate), E3 (Developing)
 */
export const BENCHMARK_COLORS = {
  E1: "#22c55e", // green-500
  E2: "#f59e0b", // amber-500
  E3: "#ef4444", // red-500
} as const;

/**
 * Growth Index 閾值常數
 * 用於判斷成長是否達到預期
 */
export const GROWTH_INDEX_THRESHOLDS = {
  /** 達到預期 (Index >= 1.0) */
  ON_TARGET: 1.0,
  /** 接近預期 (Index >= 0.8) */
  NEAR_EXPECTED: 0.8,
} as const;

/**
 * 成長指數配色
 * 用於 Growth Index 圖表
 */
export const GROWTH_INDEX_COLORS = {
  /** 超越預期 (Index > 1.0) */
  above: "#22c55e",
  /** 達標 (Index = 1.0) */
  atTarget: "#3b82f6",
  /** 未達標 (Index < 1.0) */
  below: "#ef4444",
  /** 無資料 */
  null: "#94a3b8",
} as const;

/**
 * 學期序列配色
 * 用於多學期折線圖，每學期一個顏色
 */
export const TERM_SEQUENCE_COLORS = [
  { color: "#f97316", stroke: "#f97316" }, // Fall: 橙色
  { color: "#3b82f6", stroke: "#3b82f6" }, // Spring: 藍色
  { color: "#22c55e", stroke: "#22c55e" }, // Fall (next year): 綠色
  { color: "#a855f7", stroke: "#a855f7" }, // Spring (next year): 紫色
  { color: "#ec4899", stroke: "#ec4899" }, // Future: 粉紅色
] as const;

/**
 * English Level 配色
 * 用於成長趨勢圖，每個 Level 一個顏色
 */
export const ENGLISH_LEVEL_COLORS: Record<string, { color: string; stroke: string }> = {
  E1: { color: "#22c55e", stroke: "#22c55e" }, // 綠色 (Advanced)
  E2: { color: "#f97316", stroke: "#f97316" }, // 橙色 (Intermediate) - 與 BENCHMARK_COLORS 一致
  E3: { color: "#ef4444", stroke: "#ef4444" }, // 紅色 (Developing) - 與 BENCHMARK_COLORS 一致
  All: { color: "#a855f7", stroke: "#a855f7" }, // 紫色
} as const;

/**
 * Achievement Quintile 配色
 * Low, LoAvg, Avg, HiAvg, High
 */
export const QUINTILE_COLORS = {
  High: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
    hex: "#22c55e",
  },
  HiAvg: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    hex: "#10b981",
  },
  Avg: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    hex: "#3b82f6",
  },
  LoAvg: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    hex: "#f59e0b",
  },
  Low: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
    hex: "#ef4444",
  },
} as const;

/**
 * Lexile Band 配色
 */
export const LEXILE_BAND_COLORS = {
  BR: "#ef4444",      // Beginning Reader: 紅色
  "0-200": "#f97316", // Early Reader: 橙色
  "200-400": "#f59e0b", // Transitional Early: 琥珀色
  "400-600": "#eab308", // Transitional: 黃色
  "600-800": "#84cc16", // Intermediate: 萊姆綠
  "800-1000": "#22c55e", // Advanced: 綠色
  "1000+": "#14b8a6",   // Proficient: 青綠色
} as const;

/**
 * 成長分佈配色
 * 用於成長直方圖
 */
export const GROWTH_DISTRIBUTION_COLORS = {
  negative: "#ef4444",  // <0: 紅色
  low: "#f97316",       // 0-5: 橙色
  medium: "#eab308",    // 5-10: 黃色
  high: "#22c55e",      // 10-15: 綠色
  veryHigh: "#15803d",  // 15+: 深綠
} as const;

/**
 * 根據成長指數取得顏色
 */
export function getGrowthIndexColor(index: number | null): string {
  if (index === null) return GROWTH_INDEX_COLORS.null;
  if (index > 1.0) return GROWTH_INDEX_COLORS.above;
  if (index === 1.0) return GROWTH_INDEX_COLORS.atTarget;
  return GROWTH_INDEX_COLORS.below;
}

/**
 * 根據 Benchmark Level 取得顏色
 */
export function getBenchmarkColor(level: "E1" | "E2" | "E3"): string {
  return BENCHMARK_COLORS[level];
}

/**
 * 根據 Quintile 取得配色資訊
 */
export function getQuintileColors(quintile: string): (typeof QUINTILE_COLORS)[keyof typeof QUINTILE_COLORS] | null {
  if (quintile in QUINTILE_COLORS) {
    return QUINTILE_COLORS[quintile as keyof typeof QUINTILE_COLORS];
  }
  return null;
}
