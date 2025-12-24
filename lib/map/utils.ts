/**
 * MAP Utilities - 共用工具函數
 *
 * 統一 X 軸標籤格式、Y 軸範圍計算等。
 */

/**
 * 將 term_tested 轉換為簡短格式（學生頁面用）
 * @example "Fall 2024-2025" → "FA25"
 * @example "Spring 2024-2025" → "SP25"
 */
export function formatTermShort(termTested: string): string {
  const match = termTested.match(/(Fall|Spring|Winter)\s+(\d{4})-(\d{4})/i);
  if (!match) return termTested;

  const [, season, , endYear] = match;
  const shortYear = endYear?.slice(-2) ?? "";

  const seasonAbbr =
    season?.toLowerCase() === "fall"
      ? "FA"
      : season?.toLowerCase() === "spring"
        ? "SP"
        : "WI";

  return `${seasonAbbr}${shortYear}`;
}

/**
 * 將 term_tested 轉換為統計頁面格式（包含學年範圍）
 * @example "Fall 2024-2025" → "FA 24-25"
 * @example "Spring 2024-2025" → "SP 24-25"
 */
export function formatTermStats(termTested: string): string {
  const match = termTested.match(/(Fall|Spring|Winter)\s+(\d{4})-(\d{4})/i);
  if (!match) return termTested;

  const [, season, startYear, endYear] = match;
  const shortStartYear = startYear?.slice(-2) ?? "";
  const shortEndYear = endYear?.slice(-2) ?? "";

  const seasonAbbr =
    season?.toLowerCase() === "fall"
      ? "FA"
      : season?.toLowerCase() === "spring"
        ? "SP"
        : "WI";

  return `${seasonAbbr} ${shortStartYear}-${shortEndYear}`;
}

/**
 * 將 term_tested 轉換為帶年級的格式
 * @example ("Fall 2024-2025", 4) → "FA25 (G4)"
 */
export function formatTermWithGrade(termTested: string, grade: number): string {
  const shortTerm = formatTermShort(termTested);
  return `${shortTerm} (G${grade})`;
}

/**
 * 將 term_tested 轉換為完整格式（用於 tooltip）
 * @example ("Fall 2024-2025", 4) → "Fall 2024-2025 (Grade 4)"
 */
export function formatTermFull(termTested: string, grade?: number): string {
  if (grade === undefined) return termTested;
  return `${termTested} (Grade ${grade})`;
}

/**
 * 解析 term_tested 字串
 * @example "Fall 2024-2025" → { season: "Fall", startYear: "2024", endYear: "2025", mapTerm: "fall", academicYear: "2024-2025" }
 */
export function parseTermTested(termTested: string): {
  season: string;
  startYear: string;
  endYear: string;
  mapTerm: "fall" | "spring" | "winter";
  academicYear: string;
} | null {
  const match = termTested.match(/(Fall|Spring|Winter)\s+(\d{4})-(\d{4})/i);
  if (!match) return null;

  const [, season, startYear, endYear] = match;
  const mapTerm = season?.toLowerCase() as "fall" | "spring" | "winter";

  return {
    season: season ?? "",
    startYear: startYear ?? "",
    endYear: endYear ?? "",
    mapTerm,
    academicYear: `${startYear}-${endYear}`,
  };
}

/**
 * 計算圖表 Y 軸範圍（仿 NWEA 官方報告風格）
 *
 * @param values - 所有數據值
 * @param options - 選項
 * @returns { minY, maxY }
 */
export function calculateYAxisRange(
  values: (number | null | undefined)[],
  options: {
    /** Y 軸最小值下限（預設 100，符合 NWEA 報告風格） */
    minFloor?: number;
    /** 最小值下方留白（預設 20） */
    minPadding?: number;
    /** 最大值上方留白（預設 15，給 LabelList 留空間） */
    maxPadding?: number;
    /** 四捨五入到最近的倍數（預設 10） */
    roundTo?: number;
  } = {}
): { minY: number; maxY: number } {
  const {
    minFloor = 100,
    minPadding = 20,
    maxPadding = 15,
    roundTo = 10,
  } = options;

  const validValues = values.filter(
    (v): v is number => v !== null && v !== undefined && !isNaN(v)
  );

  if (validValues.length === 0) {
    return { minY: minFloor, maxY: 250 };
  }

  const min = Math.min(...validValues);
  const max = Math.max(...validValues);

  // Y 軸最小值：比最小數據低 padding，但至少從 minFloor 開始
  const calcMinY = Math.max(
    minFloor,
    Math.floor((min - minPadding) / roundTo) * roundTo
  );

  // Y 軸最大值：比最大數據高 padding
  const calcMaxY = Math.ceil((max + maxPadding) / roundTo) * roundTo;

  return { minY: calcMinY, maxY: calcMaxY };
}

/**
 * 格式化成長值
 * @example 12 → "+12"
 * @example -5 → "-5"
 * @example null → "N/A"
 */
export function formatGrowth(growth: number | null): string {
  if (growth === null) return "N/A";
  return growth >= 0 ? `+${growth}` : `${growth}`;
}

/**
 * 格式化成長指數
 * @example 1.25 → "1.25"
 * @example null → "N/A"
 */
export function formatGrowthIndex(index: number | null, decimals = 2): string {
  if (index === null) return "N/A";
  return index.toFixed(decimals);
}

/**
 * 比較兩個 term_tested 的時間順序
 * @returns 負數表示 a 在 b 之前，正數表示 a 在 b 之後
 */
export function compareTermTested(a: string, b: string): number {
  const parsedA = parseTermTested(a);
  const parsedB = parseTermTested(b);

  if (!parsedA || !parsedB) return 0;

  // 先比學年
  const yearCompare = parsedA.academicYear.localeCompare(parsedB.academicYear);
  if (yearCompare !== 0) return yearCompare;

  // 同學年內，Fall < Winter < Spring
  const termOrder = { fall: 0, winter: 1, spring: 2 };
  return termOrder[parsedA.mapTerm] - termOrder[parsedB.mapTerm];
}

/**
 * 判斷成長類型
 * @returns "fallToSpring" | "springToFall" | null
 */
export function getGrowthType(
  fromTerm: string,
  toTerm: string
): "fallToSpring" | "springToFall" | null {
  const from = parseTermTested(fromTerm);
  const to = parseTermTested(toTerm);

  if (!from || !to) return null;

  if (from.mapTerm === "fall" && to.mapTerm === "spring") {
    return "fallToSpring";
  }
  if (from.mapTerm === "spring" && to.mapTerm === "fall") {
    return "springToFall";
  }

  return null;
}

/**
 * 取得圖表解釋文字（中英對照）
 */
export const CHART_EXPLANATIONS = {
  growthTrend: {
    en: "This chart shows RIT score trends across terms by English Level. Each line represents a term, with the dashed line showing the NWEA national norm.",
    zh: "此圖表顯示各英文等級學生的 RIT 成長趨勢。每條線代表一個學期，虛線為 NWEA 全國常模。",
  },
  growthIndex: {
    en: "Growth Index = Actual Growth ÷ Expected Growth. Values ≥1.0 indicate meeting or exceeding growth expectations.",
    zh: "成長指數 = 實際成長 ÷ 預期成長。≥1.0 表示達到或超越成長預期。",
  },
  benchmark: {
    en: "Students are classified into E1 (Advanced), E2 (Intermediate), or E3 (Developing) based on their average RIT score (Reading + Language Usage).",
    zh: "學生依據兩科平均 RIT（閱讀 + 語言使用）分類為 E1（進階）、E2（中級）或 E3（發展中）。",
  },
  goalAreas: {
    en: "Goal performance compared to overall RIT. ★ indicates relative strength, ◆ indicates suggested focus area.",
    zh: "目標表現與整體 RIT 比較。★ 表示相對優勢，◆ 表示建議加強領域。",
  },
  lexile: {
    en: "Lexile measures reading ability. Recommended reading range is 50L below to 100L above the student's Lexile score.",
    zh: "Lexile 衡量閱讀能力。建議閱讀範圍為學生 Lexile 分數 -50L 至 +100L。",
  },
  testQuality: {
    en: "Rapid Guessing indicates potential test validity concerns. >15% warrants attention, >25% may require retest consideration.",
    zh: "快速猜測比例過高可能影響測驗效度。>15% 需關注，>25% 可能需考慮重測。",
  },
  transition: {
    en: "This matrix shows how students moved between benchmark levels (E1/E2/E3) across terms.",
    zh: "此矩陣顯示學生在各學期間的基準等級（E1/E2/E3）流動情況。",
  },
} as const;
