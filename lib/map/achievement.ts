/**
 * NWEA Achievement Status 計算邏輯
 *
 * 基於學生 RIT 分數與年級 Norm 的差距，判斷學生的學業成就水平。
 * 參考 NWEA Student Profile Report 的 Achievement Status 分類。
 */

export type AchievementStatus =
  | "High"
  | "Above Grade Level"
  | "At Grade Level"
  | "Below Grade Level"
  | "Low";

export interface AchievementStatusInfo {
  status: AchievementStatus;
  label: string;
  shortLabel: string;
  description: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

/**
 * 根據 RIT 與 Norm 的差距計算 Achievement Status
 *
 * @param rit - 學生 RIT 分數
 * @param norm - 年級 Norm（全國平均）
 * @returns AchievementStatus
 *
 * 分類邏輯：
 * - High: RIT >= Norm + 15 (超越年級標準 15+ 分)
 * - Above Grade Level: RIT >= Norm + 5 (高於年級標準 5-14 分)
 * - At Grade Level: RIT >= Norm - 5 && RIT < Norm + 5 (符合年級標準 ±5 分)
 * - Below Grade Level: RIT >= Norm - 15 && RIT < Norm - 5 (低於年級標準 5-14 分)
 * - Low: RIT < Norm - 15 (遠低於年級標準 15+ 分)
 */
export function getAchievementStatus(
  rit: number,
  norm: number
): AchievementStatus {
  const diff = rit - norm;

  if (diff >= 15) return "High";
  if (diff >= 5) return "Above Grade Level";
  if (diff >= -5) return "At Grade Level";
  if (diff >= -15) return "Below Grade Level";
  return "Low";
}

/**
 * 取得 Achievement Status 的完整資訊（含顏色、描述）
 */
export function getAchievementStatusInfo(
  rit: number,
  norm: number
): AchievementStatusInfo {
  const status = getAchievementStatus(rit, norm);
  return ACHIEVEMENT_STATUS_CONFIG[status];
}

/**
 * Achievement Status 配置
 * 包含標籤、描述、顏色等視覺呈現資訊
 */
export const ACHIEVEMENT_STATUS_CONFIG: Record<
  AchievementStatus,
  AchievementStatusInfo
> = {
  High: {
    status: "High",
    label: "High",
    shortLabel: "High",
    description: "Significantly above grade level (15+ points above norm)",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    textColor: "text-green-700 dark:text-green-400",
    borderColor: "border-green-200 dark:border-green-800",
  },
  "Above Grade Level": {
    status: "Above Grade Level",
    label: "Above Grade Level",
    shortLabel: "Above",
    description: "Above grade level expectations (5-14 points above norm)",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    textColor: "text-emerald-700 dark:text-emerald-400",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
  "At Grade Level": {
    status: "At Grade Level",
    label: "At Grade Level",
    shortLabel: "At Grade",
    description: "Meeting grade level expectations (within ±5 points of norm)",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  "Below Grade Level": {
    status: "Below Grade Level",
    label: "Below Grade Level",
    shortLabel: "Below",
    description: "Below grade level expectations (5-14 points below norm)",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    textColor: "text-amber-700 dark:text-amber-400",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  Low: {
    status: "Low",
    label: "Low",
    shortLabel: "Low",
    description: "Significantly below grade level (15+ points below norm)",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-700 dark:text-red-400",
    borderColor: "border-red-200 dark:border-red-800",
  },
};

/**
 * 格式化 Percentile 為序數詞（1st, 2nd, 3rd, 4th...）
 *
 * @param percentile - 百分位數 (1-99)
 * @returns 格式化的序數詞字串，如 "72nd"
 */
export function formatPercentile(percentile: number): string {
  // 特殊處理 11, 12, 13（都用 th）
  if (percentile >= 11 && percentile <= 13) {
    return `${percentile}th`;
  }

  const lastDigit = percentile % 10;

  switch (lastDigit) {
    case 1:
      return `${percentile}st`;
    case 2:
      return `${percentile}nd`;
    case 3:
      return `${percentile}rd`;
    default:
      return `${percentile}th`;
  }
}

/**
 * Projected Proficiency 狀態類型
 * 用於預測學生在 Spring 是否能達到年級標準
 */
export type ProjectedStatus =
  | "On Track to Exceed"
  | "On Track"
  | "Needs Intervention";

export interface ProjectedStatusInfo {
  status: ProjectedStatus;
  label: string;
  icon: "star" | "check" | "alert";
  bgColor: string;
  textColor: string;
  description: string;
}

/**
 * 計算 Projected Proficiency 狀態
 *
 * @param projectedScore - 預測的 Spring 分數 (Fall RIT + Expected Growth)
 * @param springNorm - Spring 年級 Norm
 * @returns ProjectedStatus
 */
export function getProjectedStatus(
  projectedScore: number,
  springNorm: number
): ProjectedStatus {
  const diff = projectedScore - springNorm;

  if (diff >= 10) return "On Track to Exceed";
  if (diff >= 0) return "On Track";
  return "Needs Intervention";
}

/**
 * 取得 Projected Status 的完整資訊
 */
export function getProjectedStatusInfo(
  projectedScore: number,
  springNorm: number
): ProjectedStatusInfo {
  const status = getProjectedStatus(projectedScore, springNorm);
  return PROJECTED_STATUS_CONFIG[status];
}

/**
 * Projected Status 配置
 */
export const PROJECTED_STATUS_CONFIG: Record<
  ProjectedStatus,
  ProjectedStatusInfo
> = {
  "On Track to Exceed": {
    status: "On Track to Exceed",
    label: "Exceeding",
    icon: "star",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    textColor: "text-green-700 dark:text-green-400",
    description: "Projected to exceed grade level expectations",
  },
  "On Track": {
    status: "On Track",
    label: "On Track",
    icon: "check",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-400",
    description: "Projected to meet grade level expectations",
  },
  "Needs Intervention": {
    status: "Needs Intervention",
    label: "Needs Support",
    icon: "alert",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    textColor: "text-amber-700 dark:text-amber-400",
    description: "May need additional support to meet expectations",
  },
};
