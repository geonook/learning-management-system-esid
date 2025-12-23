"use client";

import { Target } from "lucide-react";
import { type StudentGoalPerformance as GoalPerformanceData } from "@/lib/api/map-student-analytics";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StudentGoalAreasProps {
  data: GoalPerformanceData | null;
}

/**
 * NWEA Quintile 標籤 (五分位數)
 * 基於 Goal RIT 與 Overall RIT 的差距計算
 * 參考: NWEA Student Profile Report
 */
type QuintileLabel = "Low" | "LoAvg" | "Avg" | "HiAvg" | "High";

interface QuintileStyle {
  label: QuintileLabel;
  bgColor: string;
  textColor: string;
  description: string;
}

/**
 * 根據 vsOverall 計算五分位標籤
 * vsOverall 範圍約 -20 到 +20
 * 以 Overall RIT 為中心，每 ±5 分為一個區間
 */
function getQuintile(vsOverall: number | null): QuintileStyle {
  if (vsOverall === null) {
    return {
      label: "Avg",
      bgColor: "bg-gray-100 dark:bg-gray-800",
      textColor: "text-gray-600 dark:text-gray-400",
      description: "No data",
    };
  }

  // 根據與 Overall 的差距判斷 Quintile
  // 這是近似計算，實際 NWEA 使用 percentile
  if (vsOverall >= 8) {
    return {
      label: "High",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      textColor: "text-green-700 dark:text-green-400",
      description: "81st-100th percentile",
    };
  }
  if (vsOverall >= 3) {
    return {
      label: "HiAvg",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      textColor: "text-emerald-700 dark:text-emerald-400",
      description: "61st-80th percentile",
    };
  }
  if (vsOverall >= -3) {
    return {
      label: "Avg",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      textColor: "text-blue-700 dark:text-blue-400",
      description: "41st-60th percentile",
    };
  }
  if (vsOverall >= -8) {
    return {
      label: "LoAvg",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      textColor: "text-amber-700 dark:text-amber-400",
      description: "21st-40th percentile",
    };
  }
  return {
    label: "Low",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-700 dark:text-red-400",
    description: "1st-20th percentile",
  };
}

export function StudentGoalAreas({ data }: StudentGoalAreasProps) {
  if (!data) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Instructional Areas</h3>
        <div className="text-center py-8 text-text-tertiary">
          <Target className="w-8 h-8 mx-auto mb-2" />
          <p>No goal area data available</p>
        </div>
      </div>
    );
  }

  const { termTested, reading, languageUsage, strengths, weaknesses } = data;

  // Goal Row 組件 - 使用 NWEA 風格
  const GoalRow = ({
    goalName,
    midpoint,
    vsOverall,
    isStrength,
    isFocus,
  }: {
    goalName: string;
    midpoint: number | null;
    vsOverall: number | null;
    isStrength: boolean;
    isFocus: boolean;
  }) => {
    const quintile = getQuintile(vsOverall);

    return (
      <div className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0 gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {/* Strength/Focus 標記 */}
          {isStrength && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-green-500 text-xs flex-shrink-0 cursor-help">★</span>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">Relative Strength</p>
              </TooltipContent>
            </Tooltip>
          )}
          {isFocus && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-amber-500 text-xs flex-shrink-0 cursor-help">◆</span>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">Suggested Area of Focus</p>
              </TooltipContent>
            </Tooltip>
          )}
          {/* Goal 名稱 - 不截斷，完整顯示 */}
          <span className="text-sm text-text-secondary">
            {goalName}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* RIT Score */}
          <span className="font-mono text-sm font-medium text-text-primary w-12 text-right">
            {midpoint !== null ? midpoint : "—"}
          </span>
          {/* Quintile 標籤 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium w-14 text-center cursor-help ${quintile.bgColor} ${quintile.textColor}`}
              >
                {quintile.label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">{quintile.description}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="bg-surface-elevated rounded-xl border border-border-default p-6 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Instructional Areas</h3>
          <span className="text-sm text-text-tertiary">{termTested}</span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-green-500">★</span>
            <span className="text-text-tertiary">Relative Strength</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-amber-500">◆</span>
            <span className="text-text-tertiary">Suggested Focus</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reading Goals */}
          {reading && reading.goals.length > 0 && (
            <div className="bg-surface-secondary rounded-lg p-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-subtle">
                <span className="text-sm font-semibold text-text-primary">Reading</span>
                <span className="text-xs text-text-tertiary font-mono">RIT {reading.overallRit}</span>
              </div>
              <div>
                {reading.goals.map((goal) => (
                  <GoalRow
                    key={goal.goalName}
                    goalName={goal.goalName}
                    midpoint={goal.midpoint}
                    vsOverall={goal.vsOverall}
                    isStrength={strengths.includes(goal.goalName)}
                    isFocus={weaknesses.includes(goal.goalName)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Language Usage Goals */}
          {languageUsage && languageUsage.goals.length > 0 && (
            <div className="bg-surface-secondary rounded-lg p-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-subtle">
                <span className="text-sm font-semibold text-text-primary">Language Usage</span>
                <span className="text-xs text-text-tertiary font-mono">RIT {languageUsage.overallRit}</span>
              </div>
              <div>
                {languageUsage.goals.map((goal) => (
                  <GoalRow
                    key={goal.goalName}
                    goalName={goal.goalName}
                    midpoint={goal.midpoint}
                    vsOverall={goal.vsOverall}
                    isStrength={strengths.includes(goal.goalName)}
                    isFocus={weaknesses.includes(goal.goalName)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quintile 說明 */}
        <div className="mt-4 pt-3 border-t border-border-subtle">
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">Low</span>
            <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">LoAvg</span>
            <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">Avg</span>
            <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">HiAvg</span>
            <span className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">High</span>
          </div>
          <p className="text-center text-xs text-text-tertiary mt-2">
            Performance relative to overall RIT score
          </p>
        </div>

        {/* Detailed Explanation */}
        <div className="mt-3 text-xs text-text-tertiary space-y-1">
          <p><strong>Instructional Areas</strong>: Specific skill domains within each subject.</p>
          <p><strong>★ Relative Strength</strong>: Areas where student performs above their own average.</p>
          <p><strong>◆ Suggested Focus</strong>: Areas that could benefit from additional practice.</p>
          <p className="italic">Use these insights to personalize instruction and target specific skills.</p>
        </div>

        {/* Empty state */}
        {!reading && !languageUsage && (
          <div className="text-center py-4 text-text-tertiary text-sm">
            No goal area data available for this term
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
