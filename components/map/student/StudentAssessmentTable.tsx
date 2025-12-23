"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgressHistoryPoint } from "@/lib/api/map-student-analytics";

interface StudentAssessmentTableProps {
  data: ProgressHistoryPoint[];
  course: "reading" | "languageUsage";
  title: string;
}

interface StudentAssessmentTablesProps {
  data: ProgressHistoryPoint[];
  collapsible?: boolean;
}

// Standard error is typically ±3 for MAP assessments
const STD_ERROR = 3;

export function StudentAssessmentTable({
  data,
  course,
  title,
}: StudentAssessmentTableProps) {
  // Sort data in reverse chronological order (newest first)
  const sortedData = [...data].reverse();

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface-elevated rounded-xl border border-border-default overflow-hidden">
      <div className="px-4 py-3 bg-surface-secondary border-b border-border-default">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-secondary/50 border-b border-border-default">
              <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">
                Term/Year
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-text-secondary">
                Grade
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-text-secondary">
                RIT Score<br />(+/- Std Err)
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-text-secondary">
                RIT<br />Growth
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-text-secondary">
                Growth<br />Projection
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((point, index) => {
              const courseData = course === "reading" ? point.reading : point.languageUsage;

              if (!courseData) return null;

              const { rit, growth, expectedGrowth } = courseData;
              const ritLow = rit - STD_ERROR;
              const ritHigh = rit + STD_ERROR;

              // Determine growth indicator color
              let growthColor = "";
              if (growth !== null && expectedGrowth !== null) {
                if (growth >= expectedGrowth) {
                  growthColor = "text-green-600 dark:text-green-400";
                } else if (growth >= expectedGrowth * 0.8) {
                  growthColor = "text-yellow-600 dark:text-yellow-400";
                } else {
                  growthColor = "text-red-600 dark:text-red-400";
                }
              }

              return (
                <tr
                  key={point.termTested}
                  className={cn(
                    "border-b border-border-default last:border-0",
                    index === 0 && "bg-primary/5"
                  )}
                >
                  <td className="px-3 py-2.5 text-text-primary font-medium">
                    {point.termShort}
                  </td>
                  <td className="px-3 py-2.5 text-center text-text-secondary">
                    {point.grade}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-text-tertiary text-xs">{ritLow}-</span>
                    <span className="font-bold text-text-primary">{rit}</span>
                    <span className="text-text-tertiary text-xs">-{ritHigh}</span>
                  </td>
                  <td className={cn("px-3 py-2.5 text-center font-medium", growthColor)}>
                    {growth !== null ? (
                      <>
                        {growth > 0 && "+"}
                        {growth}
                      </>
                    ) : (
                      <span className="text-text-tertiary">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center text-text-secondary">
                    {expectedGrowth !== null ? expectedGrowth : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Wrapper component that displays both Reading and Language Usage tables
 * Supports collapsible mode for compact layout
 */
export function StudentAssessmentTables({
  data,
  collapsible = false,
}: StudentAssessmentTablesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (data.length === 0) {
    return null;
  }

  // 可收合模式：預設收合，顯示摘要
  if (collapsible) {
    const latestReading = data[data.length - 1]?.reading;
    const latestLU = data[data.length - 1]?.languageUsage;
    const totalTests = data.length;

    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default overflow-hidden">
        {/* 摘要 Header (可點擊展開) */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-4 flex items-center justify-between hover:bg-surface-secondary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surface-tertiary rounded-lg">
              <Table2 className="w-4 h-4 text-text-secondary" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-text-primary">
                Assessment Details
              </h3>
              <p className="text-xs text-text-tertiary">
                {totalTests} {totalTests === 1 ? "test" : "tests"} recorded
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 快速摘要 */}
            {!isExpanded && (
              <div className="hidden sm:flex items-center gap-2 text-xs">
                {latestReading && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                    R: {latestReading.rit}
                  </span>
                )}
                {latestLU && (
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                    LU: {latestLU.rit}
                  </span>
                )}
              </div>
            )}
            {/* 展開/收合圖標 */}
            <div className="text-text-tertiary">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </div>
          </div>
        </button>

        {/* 展開的內容 */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-2 space-y-4 border-t border-border-default">
            {/* 簡化的表格：合併兩科到一個表格 */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-secondary/50 border-b border-border-default">
                    <th className="px-2 py-2 text-left font-medium text-text-secondary">
                      Term
                    </th>
                    <th className="px-2 py-2 text-center font-medium text-text-secondary">
                      G
                    </th>
                    <th className="px-2 py-2 text-center font-medium text-blue-600 dark:text-blue-400">
                      Reading
                    </th>
                    <th className="px-2 py-2 text-center font-medium text-text-tertiary">
                      +/-
                    </th>
                    <th className="px-2 py-2 text-center font-medium text-purple-600 dark:text-purple-400">
                      LU
                    </th>
                    <th className="px-2 py-2 text-center font-medium text-text-tertiary">
                      +/-
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...data].reverse().map((point, index) => {
                    const reading = point.reading;
                    const lu = point.languageUsage;

                    return (
                      <tr
                        key={point.termTested}
                        className={cn(
                          "border-b border-border-default last:border-0",
                          index === 0 && "bg-primary/5"
                        )}
                      >
                        <td className="px-2 py-2 text-text-primary font-medium">
                          {point.termShort}
                        </td>
                        <td className="px-2 py-2 text-center text-text-secondary">
                          {point.grade}
                        </td>
                        <td className="px-2 py-2 text-center font-bold text-text-primary">
                          {reading?.rit ?? "-"}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {reading?.growth !== null && reading?.growth !== undefined ? (
                            <span className={cn(
                              "font-medium",
                              reading.growth > 0
                                ? "text-green-600 dark:text-green-400"
                                : reading.growth < 0
                                ? "text-red-600 dark:text-red-400"
                                : "text-text-secondary"
                            )}>
                              {reading.growth > 0 ? "+" : ""}{reading.growth}
                            </span>
                          ) : (
                            <span className="text-text-tertiary">-</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center font-bold text-text-primary">
                          {lu?.rit ?? "-"}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {lu?.growth !== null && lu?.growth !== undefined ? (
                            <span className={cn(
                              "font-medium",
                              lu.growth > 0
                                ? "text-green-600 dark:text-green-400"
                                : lu.growth < 0
                                ? "text-red-600 dark:text-red-400"
                                : "text-text-secondary"
                            )}>
                              {lu.growth > 0 ? "+" : ""}{lu.growth}
                            </span>
                          ) : (
                            <span className="text-text-tertiary">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 非可收合模式：原始雙表格布局
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <StudentAssessmentTable
        data={data}
        course="reading"
        title="Reading Assessment History"
      />
      <StudentAssessmentTable
        data={data}
        course="languageUsage"
        title="Language Usage Assessment History"
      />
    </div>
  );
}
