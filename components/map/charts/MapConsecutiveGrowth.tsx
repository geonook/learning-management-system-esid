"use client";

/**
 * MAP Consecutive Growth Analysis (v1.62.0)
 *
 * 顯示連續測驗成長（含跨學年）
 * - Fall → Spring: 完整顯示（Growth, Expected, Index）
 * - Spring → Fall: 簡化顯示（僅 Growth）
 *
 * 與學生頁面 StudentGrowthIndex 邏輯一致
 */

import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  ConsecutiveGrowthAnalysisData,
  ConsecutiveGrowthRecord,
  ConsecutiveGrowthLevelData,
} from "@/lib/api/map-analytics";
import { GROWTH_INDEX_COLORS, GROWTH_INDEX_THRESHOLDS, getGrowthIndexColor } from "@/lib/map/colors";
import { CHART_EXPLANATIONS } from "@/lib/map/utils";

interface MapConsecutiveGrowthProps {
  data: ConsecutiveGrowthAnalysisData | null;
  showAllLevel?: boolean;
}

function formatGrowth(growth: number | null): string {
  if (growth === null) return "N/A";
  return growth >= 0 ? `+${growth}` : `${growth}`;
}

function getGrowthIndicator(index: number | null) {
  if (index === null) return null;
  if (index >= GROWTH_INDEX_THRESHOLDS.ON_TARGET) {
    return { icon: TrendingUp, color: "text-green-600 dark:text-green-400", label: "Above Expected" };
  } else if (index >= GROWTH_INDEX_THRESHOLDS.NEAR_EXPECTED) {
    return { icon: Minus, color: "text-amber-600 dark:text-amber-400", label: "Near Expected" };
  } else {
    return { icon: TrendingDown, color: "text-red-600 dark:text-red-400", label: "Below Expected" };
  }
}

/**
 * Fall → Spring 完整成長卡片
 */
function FallToSpringCard({ record }: { record: ConsecutiveGrowthRecord }) {
  const { fromTermLabel, toTermLabel, fromGrade, toGrade, byLevel } = record;

  // 過濾出 All 資料
  const allData = byLevel.find((l) => l.englishLevel === "All");
  const levelData = byLevel.filter((l) => l.englishLevel !== "All");

  return (
    <div className="bg-muted/50 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
        <span className="text-sm font-medium">
          {fromTermLabel} → {toTermLabel}
          {fromGrade !== toGrade && (
            <span className="text-muted-foreground ml-1">
              (G{fromGrade} → G{toGrade})
            </span>
          )}
          {fromGrade === toGrade && (
            <span className="text-muted-foreground ml-1">(G{toGrade})</span>
          )}
        </span>
        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
          Full Metrics
        </span>
      </div>

      {/* Level-by-Level Data */}
      <div className="space-y-3">
        {/* Header Row */}
        <div className="grid grid-cols-5 gap-2 text-xs text-muted-foreground">
          <div>Level</div>
          <div className="text-center">Course</div>
          <div className="text-right">Growth</div>
          <div className="text-right">Expected</div>
          <div className="text-right">Index</div>
        </div>

        {/* All Students Row */}
        {allData && (
          <div className="bg-background rounded p-2 border border-border">
            <div className="grid grid-cols-5 gap-2 text-xs items-center">
              <div className="font-medium">All</div>
              <div className="text-center text-muted-foreground">LU</div>
              <div className={cn(
                "text-right font-medium",
                allData.languageUsage.actualGrowth !== null && allData.languageUsage.actualGrowth >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}>
                {formatGrowth(allData.languageUsage.actualGrowth)}
              </div>
              <div className="text-right">
                {formatGrowth(allData.languageUsage.expectedGrowth)}
              </div>
              <div className="text-right flex items-center justify-end gap-1">
                <span className={cn(
                  "font-bold",
                  getGrowthIndicator(allData.languageUsage.growthIndex)?.color
                )}>
                  {allData.languageUsage.growthIndex?.toFixed(2) ?? "N/A"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2 text-xs items-center mt-1">
              <div></div>
              <div className="text-center text-muted-foreground">RD</div>
              <div className={cn(
                "text-right font-medium",
                allData.reading.actualGrowth !== null && allData.reading.actualGrowth >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}>
                {formatGrowth(allData.reading.actualGrowth)}
              </div>
              <div className="text-right">
                {formatGrowth(allData.reading.expectedGrowth)}
              </div>
              <div className="text-right flex items-center justify-end gap-1">
                <span className={cn(
                  "font-bold",
                  getGrowthIndicator(allData.reading.growthIndex)?.color
                )}>
                  {allData.reading.growthIndex?.toFixed(2) ?? "N/A"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* By English Level */}
        {levelData.map((level) => (
          <div key={level.englishLevel} className="bg-background rounded p-2">
            <div className="grid grid-cols-5 gap-2 text-xs items-center">
              <div className="font-medium">{level.englishLevel}</div>
              <div className="text-center text-muted-foreground">LU</div>
              <div className={cn(
                "text-right",
                level.languageUsage.actualGrowth !== null && level.languageUsage.actualGrowth >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}>
                {formatGrowth(level.languageUsage.actualGrowth)}
              </div>
              <div className="text-right text-muted-foreground">
                {formatGrowth(level.languageUsage.expectedGrowth)}
              </div>
              <div className="text-right">
                <span className={cn(
                  "font-medium",
                  getGrowthIndicator(level.languageUsage.growthIndex)?.color
                )}>
                  {level.languageUsage.growthIndex?.toFixed(2) ?? "N/A"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2 text-xs items-center mt-1">
              <div></div>
              <div className="text-center text-muted-foreground">RD</div>
              <div className={cn(
                "text-right",
                level.reading.actualGrowth !== null && level.reading.actualGrowth >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}>
                {formatGrowth(level.reading.actualGrowth)}
              </div>
              <div className="text-right text-muted-foreground">
                {formatGrowth(level.reading.expectedGrowth)}
              </div>
              <div className="text-right">
                <span className={cn(
                  "font-medium",
                  getGrowthIndicator(level.reading.growthIndex)?.color
                )}>
                  {level.reading.growthIndex?.toFixed(2) ?? "N/A"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Student Count */}
      {allData && (
        <div className="mt-3 pt-2 border-t border-border text-xs text-muted-foreground">
          Students: {allData.languageUsage.studentCount} (LU), {allData.reading.studentCount} (RD)
        </div>
      )}
    </div>
  );
}

/**
 * Spring → Fall 簡化成長卡片（僅顯示 Growth）
 */
function SpringToFallCard({ record }: { record: ConsecutiveGrowthRecord }) {
  const { fromTermLabel, toTermLabel, fromGrade, toGrade, byLevel } = record;

  const allData = byLevel.find((l) => l.englishLevel === "All");
  const levelData = byLevel.filter((l) => l.englishLevel !== "All");

  return (
    <div className="bg-muted/50 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
        <span className="text-sm font-medium">
          {fromTermLabel} → {toTermLabel}
          <span className="text-muted-foreground ml-1">
            (G{fromGrade} → G{toGrade})
          </span>
        </span>
        <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
          Growth Only
        </span>
      </div>

      {/* Level-by-Level Data */}
      <div className="space-y-3">
        {/* Header Row */}
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div>Level</div>
          <div className="text-center">LU Growth</div>
          <div className="text-center">RD Growth</div>
        </div>

        {/* All Students Row */}
        {allData && (
          <div className="bg-background rounded p-2 border border-border">
            <div className="grid grid-cols-3 gap-2 text-xs items-center">
              <div className="font-medium">All</div>
              <div className={cn(
                "text-center text-lg font-bold",
                allData.languageUsage.actualGrowth !== null && allData.languageUsage.actualGrowth >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}>
                {formatGrowth(allData.languageUsage.actualGrowth)}
              </div>
              <div className={cn(
                "text-center text-lg font-bold",
                allData.reading.actualGrowth !== null && allData.reading.actualGrowth >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}>
                {formatGrowth(allData.reading.actualGrowth)}
              </div>
            </div>
          </div>
        )}

        {/* By English Level */}
        {levelData.map((level) => (
          <div key={level.englishLevel} className="bg-background rounded p-2">
            <div className="grid grid-cols-3 gap-2 text-xs items-center">
              <div className="font-medium">{level.englishLevel}</div>
              <div className={cn(
                "text-center font-medium",
                level.languageUsage.actualGrowth !== null && level.languageUsage.actualGrowth >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}>
                {formatGrowth(level.languageUsage.actualGrowth)}
              </div>
              <div className={cn(
                "text-center font-medium",
                level.reading.actualGrowth !== null && level.reading.actualGrowth >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}>
                {formatGrowth(level.reading.actualGrowth)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Student Count + Explanation */}
      <div className="mt-3 pt-2 border-t border-border text-xs text-muted-foreground space-y-1">
        {allData && (
          <p>Students: {allData.languageUsage.studentCount} (LU), {allData.reading.studentCount} (RD)</p>
        )}
        <p className="italic">
          Note: NWEA does not provide expected growth benchmarks for summer (Spring → Fall).
          Only actual growth is shown.
        </p>
      </div>
    </div>
  );
}

/**
 * 單一成長紀錄卡片
 */
function GrowthRecordCard({ record }: { record: ConsecutiveGrowthRecord }) {
  if (record.growthType === "fallToSpring") {
    return <FallToSpringCard record={record} />;
  } else {
    return <SpringToFallCard record={record} />;
  }
}

export function MapConsecutiveGrowth({ data }: MapConsecutiveGrowthProps) {
  if (!data || data.records.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No consecutive growth data available
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-center gap-1 mb-4">
          <h4 className="text-sm font-medium text-center">
            G{data.grade} Consecutive Growth by English Level
          </h4>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[300px]">
              <div className="text-xs space-y-1">
                <p>
                  <strong>Fall → Spring:</strong> Full metrics available (Growth, Expected, Index) from official NWEA data.
                </p>
                <p>
                  <strong>Spring → Fall:</strong> Only Growth shown (no official NWEA benchmarks for summer growth).
                </p>
                <p className="pt-1 border-t mt-1">
                  <strong>Index:</strong> Actual ÷ Expected. ≥1.0 = met expectations.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Growth Index Color Legend */}
        <div className="flex items-center gap-4 justify-center text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: GROWTH_INDEX_COLORS.above }}></div>
            <span>Above Expected (≥ {GROWTH_INDEX_THRESHOLDS.ON_TARGET})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: GROWTH_INDEX_COLORS.atTarget }}></div>
            <span>Near Expected (≥ {GROWTH_INDEX_THRESHOLDS.NEAR_EXPECTED})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: GROWTH_INDEX_COLORS.below }}></div>
            <span>Below Expected (&lt; {GROWTH_INDEX_THRESHOLDS.NEAR_EXPECTED})</span>
          </div>
        </div>

        {/* Growth Records */}
        <div className="space-y-4">
          {data.records.map((record, index) => (
            <GrowthRecordCard
              key={`${record.fromTerm}-${record.toTerm}-${index}`}
              record={record}
            />
          ))}
        </div>

        {/* Explanation */}
        <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
          <p>{CHART_EXPLANATIONS.growthIndex.en}</p>
        </div>
      </div>
    </TooltipProvider>
  );
}
