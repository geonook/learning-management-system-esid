"use client";

import { TrendingUp, TrendingDown, Minus, BookOpen, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgressHistoryPoint, StudentRankings } from "@/lib/api/map-student-analytics";
import {
  getAchievementStatusInfo,
  formatPercentile,
  type AchievementStatusInfo,
} from "@/lib/map/achievement";

interface ScoreSummaryCardsProps {
  progressHistory: ProgressHistoryPoint[];
  rankings: StudentRankings | null;
}

interface CourseScoreData {
  course: "Reading" | "Language Usage";
  rit: number;
  growth: number | null;
  fromTerm: string | null;
  vsLevelAvg: number | null;
  vsNorm: number | null;
  norm: number | null;
  percentile: number | null;
  termTested: string;
}

/**
 * Hero Section: 兩張大型分數摘要卡片
 * 展示 Reading 和 Language Usage 的最新 RIT 分數、成長、和比較數據
 */
export function ScoreSummaryCards({ progressHistory, rankings }: ScoreSummaryCardsProps) {
  if (progressHistory.length === 0) return null;

  // 取得最新測驗資料
  const latestData = progressHistory[progressHistory.length - 1];
  if (!latestData) return null;

  // 取得前一次測驗資料（用於計算成長）
  const previousData = progressHistory.length > 1
    ? progressHistory[progressHistory.length - 2]
    : null;

  // 準備 Reading 資料
  const readingData: CourseScoreData | null = latestData.reading
    ? {
        course: "Reading",
        rit: latestData.reading.rit,
        growth: latestData.reading.growth,
        fromTerm: previousData?.termShort ?? null,
        vsLevelAvg: rankings?.reading
          ? Math.round((latestData.reading.rit - rankings.reading.levelAvg) * 10) / 10
          : null,
        vsNorm: latestData.reading.norm
          ? Math.round((latestData.reading.rit - latestData.reading.norm) * 10) / 10
          : null,
        norm: latestData.reading.norm,
        percentile: latestData.reading.percentile?.mid ?? null,
        termTested: latestData.termShort,
      }
    : null;

  // 準備 Language Usage 資料
  const languageData: CourseScoreData | null = latestData.languageUsage
    ? {
        course: "Language Usage",
        rit: latestData.languageUsage.rit,
        growth: latestData.languageUsage.growth,
        fromTerm: previousData?.termShort ?? null,
        vsLevelAvg: rankings?.languageUsage
          ? Math.round((latestData.languageUsage.rit - rankings.languageUsage.levelAvg) * 10) / 10
          : null,
        vsNorm: latestData.languageUsage.norm
          ? Math.round((latestData.languageUsage.rit - latestData.languageUsage.norm) * 10) / 10
          : null,
        norm: latestData.languageUsage.norm,
        percentile: latestData.languageUsage.percentile?.mid ?? null,
        termTested: latestData.termShort,
      }
    : null;

  // 取得 level 值
  const levelValue = rankings?.level ?? null;

  // 如果沒有任何資料，不顯示
  if (!readingData && !languageData) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {readingData && <ScoreCard data={readingData} level={levelValue} />}
      {languageData && <ScoreCard data={languageData} level={levelValue} />}
    </div>
  );
}

/**
 * 單一課程分數卡片
 */
function ScoreCard({ data, level }: { data: CourseScoreData; level: string | null }) {
  const isReading = data.course === "Reading";

  // 計算 Achievement Status（需要 norm）
  const achievementInfo: AchievementStatusInfo | null =
    data.norm !== null ? getAchievementStatusInfo(data.rit, data.norm) : null;

  // 課程專屬配色
  const colorScheme = isReading
    ? {
        bgGradient: "from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20",
        border: "border-blue-200/60 dark:border-blue-800/40",
        iconBg: "bg-blue-100 dark:bg-blue-900/50",
        iconColor: "text-blue-600 dark:text-blue-400",
        ritColor: "text-blue-700 dark:text-blue-300",
        accentBg: "bg-blue-100/80 dark:bg-blue-900/40",
      }
    : {
        bgGradient: "from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20",
        border: "border-purple-200/60 dark:border-purple-800/40",
        iconBg: "bg-purple-100 dark:bg-purple-900/50",
        iconColor: "text-purple-600 dark:text-purple-400",
        ritColor: "text-purple-700 dark:text-purple-300",
        accentBg: "bg-purple-100/80 dark:bg-purple-900/40",
      };

  const Icon = isReading ? BookOpen : Languages;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-6",
        "bg-gradient-to-br",
        colorScheme.bgGradient,
        colorScheme.border
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-xl", colorScheme.iconBg)}>
            <Icon className={cn("w-5 h-5", colorScheme.iconColor)} />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">{data.course}</h3>
            <span className="text-xs text-text-tertiary">{data.termTested}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Achievement Status Badge */}
          {achievementInfo && (
            <span
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium",
                achievementInfo.bgColor,
                achievementInfo.textColor
              )}
              title={achievementInfo.description}
            >
              {achievementInfo.shortLabel}
            </span>
          )}
          {/* Level Badge */}
          {level && (
            <span className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium",
              colorScheme.accentBg,
              colorScheme.iconColor
            )}>
              {level}
            </span>
          )}
        </div>
      </div>

      {/* Main Score */}
      <div className="flex items-baseline gap-3 mb-4">
        <span className={cn("text-5xl font-bold tracking-tight", colorScheme.ritColor)}>
          {data.rit}
        </span>
        <span className="text-lg text-text-tertiary">RIT</span>

        {/* Growth Badge */}
        {data.growth !== null && (
          <GrowthBadge growth={data.growth} fromTerm={data.fromTerm} />
        )}
      </div>

      {/* Percentile Display */}
      {data.percentile !== null && (
        <div className="mb-4">
          <span className="text-sm text-text-secondary">
            National Percentile:{" "}
            <span className="font-semibold text-text-primary">
              {formatPercentile(data.percentile)}
            </span>
          </span>
        </div>
      )}

      {/* Comparison Stats */}
      <div className="flex flex-wrap gap-3">
        {data.vsLevelAvg !== null && (
          <ComparisonStat
            label={`vs ${level || 'Level'} Avg`}
            value={data.vsLevelAvg}
          />
        )}
        {data.vsNorm !== null && (
          <ComparisonStat
            label="vs NWEA Norm"
            value={data.vsNorm}
          />
        )}
      </div>
    </div>
  );
}

/**
 * 成長指標 Badge
 */
function GrowthBadge({ growth, fromTerm }: { growth: number; fromTerm: string | null }) {
  const isPositive = growth > 0;
  const isNeutral = growth === 0;

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
        isNeutral
          ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          : isPositive
          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
          : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
      )}
    >
      <Icon className="w-4 h-4" />
      <span>{isPositive ? "+" : ""}{growth}</span>
      {fromTerm && (
        <span className="text-xs opacity-70">from {fromTerm}</span>
      )}
    </div>
  );
}

/**
 * 比較數據小標籤
 */
function ComparisonStat({ label, value }: { label: string; value: number }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/60 dark:bg-white/5 border border-border-default/30">
      <span className="text-xs text-text-tertiary">{label}</span>
      <span
        className={cn(
          "text-sm font-semibold",
          isNeutral
            ? "text-text-secondary"
            : isPositive
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400"
        )}
      >
        {isPositive ? "+" : ""}{value}
      </span>
    </div>
  );
}
