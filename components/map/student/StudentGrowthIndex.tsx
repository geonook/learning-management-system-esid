"use client";

import { TrendingUp, TrendingDown, Minus, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { type StudentGrowthIndex as GrowthIndexData, type CourseGrowthData } from "@/lib/api/map-student-analytics";

interface StudentGrowthIndexProps {
  data: GrowthIndexData | null;
}

/**
 * 將官方 Growth Quintile 對應到顯示資訊
 */
const QUINTILE_INFO: Record<string, { label: string; color: string; bgColor: string }> = {
  "High": { label: "High", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30" },
  "HiAvg": { label: "High Avg", color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
  "Avg": { label: "Average", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  "LoAvg": { label: "Low Avg", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  "Low": { label: "Low", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30" },
};

function getQuintileInfo(quintile: string | null) {
  if (!quintile) return null;
  return QUINTILE_INFO[quintile] ?? null;
}

export function StudentGrowthIndex({ data }: StudentGrowthIndexProps) {
  if (!data) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Personal Growth Index</h3>
        <div className="text-center py-8 text-text-tertiary">
          <p>No growth data available</p>
          <p className="text-sm mt-2">Need both Fall and Spring term data to calculate growth</p>
        </div>
      </div>
    );
  }

  const { languageUsage, reading, fromTerm, toTerm, gradeAverage } = data;

  const getGrowthIndicator = (courseData: CourseGrowthData) => {
    // 優先使用官方 Growth Index
    const index = courseData.officialConditionalGrowthIndex ?? courseData.growthIndex;
    if (index === null) return null;
    if (index >= 1.0) {
      return { icon: TrendingUp, color: "text-green-600 dark:text-green-400", label: "Above Expected" };
    } else if (index >= 0.8) {
      return { icon: Minus, color: "text-amber-600 dark:text-amber-400", label: "Near Expected" };
    } else {
      return { icon: TrendingDown, color: "text-red-600 dark:text-red-400", label: "Below Expected" };
    }
  };

  const formatGrowth = (growth: number | null) => {
    if (growth === null) return "N/A";
    return growth >= 0 ? `+${growth}` : `${growth}`;
  };

  const luIndicator = getGrowthIndicator(languageUsage);
  const rdIndicator = getGrowthIndicator(reading);

  // 取得官方 Quintile 資訊
  const luQuintileInfo = getQuintileInfo(languageUsage.officialGrowthQuintile);
  const rdQuintileInfo = getQuintileInfo(reading.officialGrowthQuintile);

  // 取得顯示用的 growth index（優先官方）
  const getLUDisplayIndex = () => languageUsage.officialConditionalGrowthIndex ?? languageUsage.growthIndex;
  const getRDDisplayIndex = () => reading.officialConditionalGrowthIndex ?? reading.growthIndex;

  // 取得顯示用的 growth（優先官方）
  const getLUDisplayGrowth = () => languageUsage.officialObservedGrowth ?? languageUsage.actualGrowth;
  const getRDDisplayGrowth = () => reading.officialObservedGrowth ?? reading.actualGrowth;

  // 取得顯示用的 expected growth（優先官方）
  const getLUExpectedGrowth = () => languageUsage.officialProjectedGrowth ?? languageUsage.expectedGrowth;
  const getRDExpectedGrowth = () => reading.officialProjectedGrowth ?? reading.expectedGrowth;

  // 檢查是否有足夠資料
  const hasLUData = languageUsage.fromScore !== null && languageUsage.toScore !== null;
  const hasRDData = reading.fromScore !== null && reading.toScore !== null;

  if (!hasLUData && !hasRDData) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Personal Growth Index</h3>
        <div className="text-center py-8 text-text-tertiary">
          <p>Insufficient data for growth calculation</p>
          <p className="text-sm mt-2">Need both {fromTerm} and {toTerm} scores</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated rounded-xl border border-border-default p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Personal Growth Index</h3>

      {/* Term Range */}
      <div className="text-center text-text-secondary text-sm mb-6">
        {fromTerm} → {toTerm}
      </div>

      {/* Growth Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Language Usage */}
        <div className="bg-surface-tertiary rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-tertiary">Language Usage</span>
            {/* Met Projected Growth 狀態 */}
            {languageUsage.officialMetProjectedGrowth !== null && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                languageUsage.officialMetProjectedGrowth
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              )}>
                {languageUsage.officialMetProjectedGrowth ? (
                  <><CheckCircle className="w-3 h-3" /> Met</>
                ) : (
                  <><AlertCircle className="w-3 h-3" /> Not Met</>
                )}
              </div>
            )}
          </div>

          {hasLUData ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Growth:</span>
                  <span className={cn(
                    "font-medium",
                    getLUDisplayGrowth() !== null && getLUDisplayGrowth()! >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )}>
                    {formatGrowth(getLUDisplayGrowth())}
                    {languageUsage.officialObservedGrowth !== null && (
                      <span className="text-xs text-text-tertiary ml-1">(Official)</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Expected:</span>
                  <span className="font-medium text-text-primary">
                    {formatGrowth(getLUExpectedGrowth())}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-border-subtle pt-2 mt-2">
                  <span className="text-text-secondary text-sm">Index:</span>
                  <div className="flex items-center gap-1">
                    <span className={cn("text-lg font-bold", luIndicator?.color || "text-text-primary")}>
                      {getLUDisplayIndex() !== null ? getLUDisplayIndex()!.toFixed(2) : "N/A"}
                    </span>
                    {luIndicator && (
                      <luIndicator.icon className={cn("w-4 h-4", luIndicator.color)} />
                    )}
                  </div>
                </div>
                {/* 顯示官方 Growth Quintile */}
                {luQuintileInfo && (
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-text-tertiary text-xs">Quintile:</span>
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", luQuintileInfo.bgColor, luQuintileInfo.color)}>
                      {luQuintileInfo.label}
                    </span>
                  </div>
                )}
              </div>

              {gradeAverage.languageUsageIndex !== null && (
                <div className="mt-3 pt-3 border-t border-border-subtle">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-tertiary">Grade Avg:</span>
                    <span className="text-text-secondary">{gradeAverage.languageUsageIndex.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-text-tertiary text-sm">
              Missing term data
            </div>
          )}
        </div>

        {/* Reading */}
        <div className="bg-surface-tertiary rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-tertiary">Reading</span>
            {/* Met Projected Growth 狀態 */}
            {reading.officialMetProjectedGrowth !== null && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                reading.officialMetProjectedGrowth
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              )}>
                {reading.officialMetProjectedGrowth ? (
                  <><CheckCircle className="w-3 h-3" /> Met</>
                ) : (
                  <><AlertCircle className="w-3 h-3" /> Not Met</>
                )}
              </div>
            )}
          </div>

          {hasRDData ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Growth:</span>
                  <span className={cn(
                    "font-medium",
                    getRDDisplayGrowth() !== null && getRDDisplayGrowth()! >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )}>
                    {formatGrowth(getRDDisplayGrowth())}
                    {reading.officialObservedGrowth !== null && (
                      <span className="text-xs text-text-tertiary ml-1">(Official)</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Expected:</span>
                  <span className="font-medium text-text-primary">
                    {formatGrowth(getRDExpectedGrowth())}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-border-subtle pt-2 mt-2">
                  <span className="text-text-secondary text-sm">Index:</span>
                  <div className="flex items-center gap-1">
                    <span className={cn("text-lg font-bold", rdIndicator?.color || "text-text-primary")}>
                      {getRDDisplayIndex() !== null ? getRDDisplayIndex()!.toFixed(2) : "N/A"}
                    </span>
                    {rdIndicator && (
                      <rdIndicator.icon className={cn("w-4 h-4", rdIndicator.color)} />
                    )}
                  </div>
                </div>
                {/* 顯示官方 Growth Quintile */}
                {rdQuintileInfo && (
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-text-tertiary text-xs">Quintile:</span>
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", rdQuintileInfo.bgColor, rdQuintileInfo.color)}>
                      {rdQuintileInfo.label}
                    </span>
                  </div>
                )}
              </div>

              {gradeAverage.readingIndex !== null && (
                <div className="mt-3 pt-3 border-t border-border-subtle">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-tertiary">Grade Avg:</span>
                    <span className="text-text-secondary">{gradeAverage.readingIndex.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 text-text-tertiary text-sm">
              Missing term data
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {(hasLUData || hasRDData) && (
        <div className="mt-4 pt-4 border-t border-border-subtle">
          {getLUDisplayIndex() !== null && getLUDisplayIndex()! >= 1.0 &&
           getRDDisplayIndex() !== null && getRDDisplayIndex()! >= 1.0 && (
            <div className="text-center text-green-600 dark:text-green-400 text-sm font-medium">
              Above Expected Growth in both subjects!
            </div>
          )}
          {((getLUDisplayIndex() !== null && getLUDisplayIndex()! < 0.8) ||
            (getRDDisplayIndex() !== null && getRDDisplayIndex()! < 0.8)) && (
            <div className="text-center text-amber-600 dark:text-amber-400 text-sm">
              Some areas may need additional support
            </div>
          )}
        </div>
      )}

      {/* Explanation */}
      <div className="mt-4 pt-3 border-t border-border-subtle text-xs text-text-tertiary space-y-1">
        <p><strong>Growth Index</strong>: Compares actual growth to expected growth (1.0 = met expectations).</p>
        <p><strong>Met/Not Met</strong>: Whether the student achieved NWEA&apos;s projected growth target.</p>
        <p><strong>Quintile</strong>: Growth compared to similar students nationally (High = top 20%, Low = bottom 20%).</p>
      </div>
    </div>
  );
}
