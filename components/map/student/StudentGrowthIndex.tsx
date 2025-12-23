"use client";

import { TrendingUp, TrendingDown, Minus, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { type GrowthRecord, type CourseGrowthData } from "@/lib/api/map-student-analytics";

interface StudentGrowthIndexProps {
  data: GrowthRecord[];
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

function getGrowthIndicator(courseData: CourseGrowthData) {
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
}

function formatGrowth(growth: number | null) {
  if (growth === null) return "N/A";
  return growth >= 0 ? `+${growth}` : `${growth}`;
}

/**
 * Fall → Spring 完整成長卡片（顯示 Growth, Expected, Index, Met, Quintile）
 */
function FallToSpringCard({ record }: { record: GrowthRecord }) {
  const { languageUsage, reading, fromTermLabel, toTermLabel, grade } = record;

  const luIndicator = getGrowthIndicator(languageUsage);
  const rdIndicator = getGrowthIndicator(reading);

  // 取得官方 Quintile 資訊
  const luQuintileInfo = getQuintileInfo(languageUsage.officialGrowthQuintile);
  const rdQuintileInfo = getQuintileInfo(reading.officialGrowthQuintile);

  // 取得顯示用的值（優先官方）
  const getLUDisplayIndex = () => languageUsage.officialConditionalGrowthIndex ?? languageUsage.growthIndex;
  const getRDDisplayIndex = () => reading.officialConditionalGrowthIndex ?? reading.growthIndex;
  const getLUDisplayGrowth = () => languageUsage.officialObservedGrowth ?? languageUsage.actualGrowth;
  const getRDDisplayGrowth = () => reading.officialObservedGrowth ?? reading.actualGrowth;
  const getLUExpectedGrowth = () => languageUsage.officialProjectedGrowth ?? languageUsage.expectedGrowth;
  const getRDExpectedGrowth = () => reading.officialProjectedGrowth ?? reading.expectedGrowth;

  // 檢查是否有足夠資料
  const hasLUData = languageUsage.fromScore !== null && languageUsage.toScore !== null;
  const hasRDData = reading.fromScore !== null && reading.toScore !== null;

  return (
    <div className="bg-surface-secondary rounded-lg p-4">
      {/* Term Range Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-border-subtle">
        <span className="text-sm font-medium text-text-primary">
          {fromTermLabel} → {toTermLabel} (G{grade})
        </span>
      </div>

      {/* Growth Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Language Usage */}
        <div className="bg-surface-elevated rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-tertiary">Language Usage</span>
            {/* Met Projected Growth 狀態 */}
            {languageUsage.officialMetProjectedGrowth !== null && (
              <div className={cn(
                "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium",
                languageUsage.officialMetProjectedGrowth
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              )}>
                {languageUsage.officialMetProjectedGrowth ? (
                  <><CheckCircle className="w-2.5 h-2.5" /> Met</>
                ) : (
                  <><AlertCircle className="w-2.5 h-2.5" /> Not Met</>
                )}
              </div>
            )}
          </div>

          {hasLUData ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">Growth:</span>
                <span className={cn(
                  "font-medium",
                  getLUDisplayGrowth() !== null && getLUDisplayGrowth()! >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}>
                  {formatGrowth(getLUDisplayGrowth())}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">Expected:</span>
                <span className="font-medium text-text-primary">
                  {formatGrowth(getLUExpectedGrowth())}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-border-subtle pt-1.5 mt-1.5">
                <span className="text-text-secondary text-xs">Index:</span>
                <div className="flex items-center gap-1">
                  <span className={cn("text-sm font-bold", luIndicator?.color || "text-text-primary")}>
                    {getLUDisplayIndex() !== null ? getLUDisplayIndex()!.toFixed(2) : "N/A"}
                  </span>
                  {luIndicator && (
                    <luIndicator.icon className={cn("w-3 h-3", luIndicator.color)} />
                  )}
                </div>
              </div>
              {/* 顯示官方 Growth Quintile */}
              {luQuintileInfo && (
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-text-tertiary text-xs">Quintile:</span>
                  <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", luQuintileInfo.bgColor, luQuintileInfo.color)}>
                    {luQuintileInfo.label}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-2 text-text-tertiary text-xs">
              Missing data
            </div>
          )}
        </div>

        {/* Reading */}
        <div className="bg-surface-elevated rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-tertiary">Reading</span>
            {/* Met Projected Growth 狀態 */}
            {reading.officialMetProjectedGrowth !== null && (
              <div className={cn(
                "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium",
                reading.officialMetProjectedGrowth
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              )}>
                {reading.officialMetProjectedGrowth ? (
                  <><CheckCircle className="w-2.5 h-2.5" /> Met</>
                ) : (
                  <><AlertCircle className="w-2.5 h-2.5" /> Not Met</>
                )}
              </div>
            )}
          </div>

          {hasRDData ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">Growth:</span>
                <span className={cn(
                  "font-medium",
                  getRDDisplayGrowth() !== null && getRDDisplayGrowth()! >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}>
                  {formatGrowth(getRDDisplayGrowth())}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">Expected:</span>
                <span className="font-medium text-text-primary">
                  {formatGrowth(getRDExpectedGrowth())}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-border-subtle pt-1.5 mt-1.5">
                <span className="text-text-secondary text-xs">Index:</span>
                <div className="flex items-center gap-1">
                  <span className={cn("text-sm font-bold", rdIndicator?.color || "text-text-primary")}>
                    {getRDDisplayIndex() !== null ? getRDDisplayIndex()!.toFixed(2) : "N/A"}
                  </span>
                  {rdIndicator && (
                    <rdIndicator.icon className={cn("w-3 h-3", rdIndicator.color)} />
                  )}
                </div>
              </div>
              {/* 顯示官方 Growth Quintile */}
              {rdQuintileInfo && (
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-text-tertiary text-xs">Quintile:</span>
                  <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", rdQuintileInfo.bgColor, rdQuintileInfo.color)}>
                    {rdQuintileInfo.label}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-2 text-text-tertiary text-xs">
              Missing data
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Spring → Fall 簡化成長卡片（只顯示 Growth）
 */
function SpringToFallCard({ record }: { record: GrowthRecord }) {
  const { languageUsage, reading, fromTermLabel, toTermLabel, grade } = record;

  // 只計算 Growth（無官方資料）
  const luGrowth = languageUsage.actualGrowth;
  const rdGrowth = reading.actualGrowth;

  // 檢查是否有足夠資料
  const hasLUData = languageUsage.fromScore !== null && languageUsage.toScore !== null;
  const hasRDData = reading.fromScore !== null && reading.toScore !== null;

  return (
    <div className="bg-surface-secondary rounded-lg p-4">
      {/* Term Range Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-border-subtle">
        <span className="text-sm font-medium text-text-primary">
          {fromTermLabel} → {toTermLabel} (G{grade})
        </span>
      </div>

      {/* Growth Cards - 簡化版，只顯示 Growth */}
      <div className="grid grid-cols-2 gap-3">
        {/* Language Usage */}
        <div className="bg-surface-elevated rounded-lg p-3">
          <div className="mb-2">
            <span className="text-xs text-text-tertiary">Language Usage</span>
          </div>

          {hasLUData ? (
            <div className="flex justify-between items-center">
              <span className="text-text-secondary text-xs">Growth:</span>
              <span className={cn(
                "text-lg font-bold",
                luGrowth !== null && luGrowth >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}>
                {formatGrowth(luGrowth)}
              </span>
            </div>
          ) : (
            <div className="text-center py-2 text-text-tertiary text-xs">
              Missing data
            </div>
          )}
        </div>

        {/* Reading */}
        <div className="bg-surface-elevated rounded-lg p-3">
          <div className="mb-2">
            <span className="text-xs text-text-tertiary">Reading</span>
          </div>

          {hasRDData ? (
            <div className="flex justify-between items-center">
              <span className="text-text-secondary text-xs">Growth:</span>
              <span className={cn(
                "text-lg font-bold",
                rdGrowth !== null && rdGrowth >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}>
                {formatGrowth(rdGrowth)}
              </span>
            </div>
          ) : (
            <div className="text-center py-2 text-text-tertiary text-xs">
              Missing data
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 單一成長紀錄卡片（根據類型選擇渲染方式）
 */
function GrowthRecordCard({ record }: { record: GrowthRecord }) {
  if (record.growthType === "fallToSpring") {
    return <FallToSpringCard record={record} />;
  } else {
    return <SpringToFallCard record={record} />;
  }
}

export function StudentGrowthIndex({ data }: StudentGrowthIndexProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Personal Growth Index</h3>
        <div className="text-center py-8 text-text-tertiary">
          <p>No growth data available</p>
          <p className="text-sm mt-2">Need at least two consecutive test results to calculate growth</p>
        </div>
      </div>
    );
  }

  // 按時間排序（新到舊顯示）- 使用 fromTerm 比較
  const sortedRecords = [...data].sort((a, b) => {
    // 比較 toTerm（目標測驗），較新的在前面
    // 簡單比較：先比學年，再比學期
    const aYear = a.academicYear;
    const bYear = b.academicYear;
    if (aYear !== bYear) return bYear.localeCompare(aYear);
    // 同學年內，Spring 比 Fall 新
    const aIsSpring = a.toTermLabel.startsWith("SP");
    const bIsSpring = b.toTermLabel.startsWith("SP");
    if (aIsSpring && !bIsSpring) return -1;
    if (!aIsSpring && bIsSpring) return 1;
    return 0;
  });

  return (
    <div className="bg-surface-elevated rounded-xl border border-border-default p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Personal Growth Index</h3>

      {/* Growth Records */}
      <div className="space-y-4">
        {sortedRecords.map((record, index) => (
          <GrowthRecordCard key={`${record.fromTermLabel}-${record.toTermLabel}-${index}`} record={record} />
        ))}
      </div>

      {/* Explanation */}
      <div className="mt-4 pt-3 border-t border-border-subtle text-xs text-text-tertiary space-y-1">
        <p><strong>Growth</strong>: RIT score change between consecutive tests.</p>
        <p><strong>Fall → Spring</strong>: Full metrics available (Growth, Expected, Index, Met/Not Met, Quintile) from official NWEA data.</p>
        <p><strong>Spring → Fall</strong>: Only Growth shown (no official NWEA benchmarks for summer growth).</p>
        <p><strong>Index</strong>: Actual growth ÷ Expected growth. ≥1.0 means exceeded expectations.</p>
        <p><strong>Quintile</strong>: Growth compared to similar students nationally (High = top 20%, Low = bottom 20%).</p>
      </div>
    </div>
  );
}
