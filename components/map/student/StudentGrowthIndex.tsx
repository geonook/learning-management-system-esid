"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { type StudentGrowthIndex as GrowthIndexData } from "@/lib/api/map-student-analytics";

interface StudentGrowthIndexProps {
  data: GrowthIndexData | null;
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

  const getGrowthIndicator = (index: number | null) => {
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

  const luIndicator = getGrowthIndicator(languageUsage.growthIndex);
  const rdIndicator = getGrowthIndicator(reading.growthIndex);

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
          <div className="text-sm text-text-tertiary mb-2">Language Usage</div>

          {hasLUData ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Growth:</span>
                  <span className={`font-medium ${languageUsage.actualGrowth !== null && languageUsage.actualGrowth >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {formatGrowth(languageUsage.actualGrowth)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Expected:</span>
                  <span className="font-medium text-text-primary">
                    {formatGrowth(languageUsage.expectedGrowth)}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-border-subtle pt-2 mt-2">
                  <span className="text-text-secondary text-sm">Index:</span>
                  <div className="flex items-center gap-1">
                    <span className={`text-lg font-bold ${luIndicator?.color || "text-text-primary"}`}>
                      {languageUsage.growthIndex !== null ? languageUsage.growthIndex.toFixed(2) : "N/A"}
                    </span>
                    {luIndicator && (
                      <luIndicator.icon className={`w-4 h-4 ${luIndicator.color}`} />
                    )}
                  </div>
                </div>
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
          <div className="text-sm text-text-tertiary mb-2">Reading</div>

          {hasRDData ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Growth:</span>
                  <span className={`font-medium ${reading.actualGrowth !== null && reading.actualGrowth >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {formatGrowth(reading.actualGrowth)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Expected:</span>
                  <span className="font-medium text-text-primary">
                    {formatGrowth(reading.expectedGrowth)}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-border-subtle pt-2 mt-2">
                  <span className="text-text-secondary text-sm">Index:</span>
                  <div className="flex items-center gap-1">
                    <span className={`text-lg font-bold ${rdIndicator?.color || "text-text-primary"}`}>
                      {reading.growthIndex !== null ? reading.growthIndex.toFixed(2) : "N/A"}
                    </span>
                    {rdIndicator && (
                      <rdIndicator.icon className={`w-4 h-4 ${rdIndicator.color}`} />
                    )}
                  </div>
                </div>
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
          {languageUsage.growthIndex !== null && languageUsage.growthIndex >= 1.0 &&
           reading.growthIndex !== null && reading.growthIndex >= 1.0 && (
            <div className="text-center text-green-600 dark:text-green-400 text-sm font-medium">
              Above Expected Growth in both subjects!
            </div>
          )}
          {((languageUsage.growthIndex !== null && languageUsage.growthIndex < 0.8) ||
            (reading.growthIndex !== null && reading.growthIndex < 0.8)) && (
            <div className="text-center text-amber-600 dark:text-amber-400 text-sm">
              Some areas may need additional support
            </div>
          )}
        </div>
      )}
    </div>
  );
}
