/**
 * Lexile Score Utilities
 *
 * 解析和處理 NWEA MAP Reading 的 Lexile 分數
 * Lexile 格式: "1190L" (標準) 或 "BR400" (Beginning Reader)
 */

/**
 * Lexile 分級定義
 */
export interface LexileBand {
  min: number;
  max: number;
  label: string;
  description: string;
  color: string;
}

/**
 * Lexile 分級表
 * BR (Beginning Reader) 使用負值表示
 */
export const LEXILE_BANDS: LexileBand[] = [
  { min: -Infinity, max: 0, label: "BR", description: "Beginning Reader", color: "#ef4444" },
  { min: 0, max: 200, label: "0-200L", description: "Early Reader", color: "#f97316" },
  { min: 200, max: 400, label: "200-400L", description: "Early", color: "#f59e0b" },
  { min: 400, max: 600, label: "400-600L", description: "Transitional", color: "#eab308" },
  { min: 600, max: 800, label: "600-800L", description: "Intermediate", color: "#84cc16" },
  { min: 800, max: 1000, label: "800-1000L", description: "Advanced", color: "#22c55e" },
  { min: 1000, max: Infinity, label: "1000L+", description: "Proficient", color: "#059669" },
];

/**
 * 解析 Lexile 字串為數值
 * @param lexileStr - Lexile 字串 (如 "1190L", "BR400L", "BR400", "850L")
 * @returns 數值 (BR 為負值) 或 null
 *
 * 支援格式:
 * - "1190L" → 1190 (標準格式)
 * - "BR100L" → -100 (Beginning Reader，資料庫實際格式)
 * - "BR100" → -100 (Beginning Reader，備用格式)
 * - "1190" → 1190 (純數字)
 */
export function parseLexile(lexileStr: string | null | undefined): number | null {
  if (!lexileStr || typeof lexileStr !== "string") return null;

  const trimmed = lexileStr.trim();

  // BR (Beginning Reader) 格式帶 L: BR400L → -400
  // 這是資料庫中實際使用的格式
  const brWithLMatch = trimmed.match(/^BR(\d+)L$/i);
  if (brWithLMatch && brWithLMatch[1]) {
    return -parseInt(brWithLMatch[1], 10);
  }

  // BR (Beginning Reader) 格式不帶 L: BR400 → -400
  const brMatch = trimmed.match(/^BR(\d+)$/i);
  if (brMatch && brMatch[1]) {
    return -parseInt(brMatch[1], 10);
  }

  // 標準格式: 1190L → 1190
  const stdMatch = trimmed.match(/^(\d+)L$/i);
  if (stdMatch && stdMatch[1]) {
    return parseInt(stdMatch[1], 10);
  }

  // 純數字格式 (無 L): 1190 → 1190
  const numMatch = trimmed.match(/^(\d+)$/);
  if (numMatch && numMatch[1]) {
    return parseInt(numMatch[1], 10);
  }

  return null;
}

/**
 * 格式化數值為 Lexile 字串
 * @param value - Lexile 數值 (BR 為負值)
 * @returns 格式化字串 (如 "1190L", "BR400L")
 *
 * 注意: BR 格式輸出為 "BR100L" 以與資料庫格式一致
 */
export function formatLexile(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";

  if (value < 0) {
    return `BR${Math.abs(value)}L`;
  }

  return `${value}L`;
}

/**
 * 取得 Lexile 分級
 * @param value - Lexile 數值
 * @returns 對應的分級資訊
 */
export function getLexileBand(value: number | null | undefined): LexileBand | null {
  if (value === null || value === undefined) return null;

  for (const band of LEXILE_BANDS) {
    if (value >= band.min && value < band.max) {
      return band;
    }
  }

  // 處理邊界情況
  if (value >= 1000) {
    return LEXILE_BANDS[LEXILE_BANDS.length - 1] ?? null;
  }

  return LEXILE_BANDS[0] ?? null;
}

/**
 * 取得 Lexile 分級標籤
 */
export function getLexileBandLabel(value: number | null | undefined): string {
  const band = getLexileBand(value);
  return band?.label ?? "-";
}

/**
 * 取得 Lexile 分級描述
 */
export function getLexileBandDescription(value: number | null | undefined): string {
  const band = getLexileBand(value);
  return band?.description ?? "Unknown";
}

/**
 * 取得 Lexile 分級顏色
 */
export function getLexileBandColor(value: number | null | undefined): string {
  const band = getLexileBand(value);
  return band?.color ?? "#9ca3af";
}

/**
 * 計算 Lexile 分佈統計
 */
export interface LexileDistribution {
  band: LexileBand;
  count: number;
  percentage: number;
}

/**
 * 計算 Lexile 分佈
 * @param values - Lexile 數值陣列
 * @returns 各分級的分佈統計
 */
export function calculateLexileDistribution(values: (number | null)[]): LexileDistribution[] {
  const validValues = values.filter((v): v is number => v !== null);
  const total = validValues.length;

  if (total === 0) {
    return LEXILE_BANDS.map((band) => ({
      band,
      count: 0,
      percentage: 0,
    }));
  }

  const distribution: LexileDistribution[] = LEXILE_BANDS.map((band) => {
    const count = validValues.filter((v) => v >= band.min && v < band.max).length;
    return {
      band,
      count,
      percentage: Math.round((count / total) * 1000) / 10,
    };
  });

  return distribution;
}

/**
 * 計算 Lexile 統計摘要
 */
export interface LexileStats {
  count: number;
  avg: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  stdDev: number | null;
}

/**
 * 計算 Lexile 統計
 * @param values - Lexile 數值陣列
 * @returns 統計摘要
 */
export function calculateLexileStats(values: (number | null)[]): LexileStats {
  const validValues = values.filter((v): v is number => v !== null).sort((a, b) => a - b);

  if (validValues.length === 0) {
    return {
      count: 0,
      avg: null,
      median: null,
      min: null,
      max: null,
      stdDev: null,
    };
  }

  const count = validValues.length;
  const sum = validValues.reduce((a, b) => a + b, 0);
  const avg = sum / count;

  // Median
  const mid = Math.floor(count / 2);
  const median = count % 2 === 0
    ? ((validValues[mid - 1] ?? 0) + (validValues[mid] ?? 0)) / 2
    : validValues[mid] ?? null;

  // Standard deviation
  const squaredDiffs = validValues.map((v) => Math.pow(v - avg, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / count;
  const stdDev = Math.sqrt(avgSquaredDiff);

  return {
    count,
    avg: Math.round(avg * 10) / 10,
    median: median !== null ? Math.round(median * 10) / 10 : null,
    min: validValues[0] ?? null,
    max: validValues[count - 1] ?? null,
    stdDev: Math.round(stdDev * 10) / 10,
  };
}
