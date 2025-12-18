"use client";

import { ChartWrapper } from "./ChartWrapper";
import type { ClassCompletionItem } from "@/lib/api/dashboard";

interface ClassCompletionBarsProps {
  data: ClassCompletionItem[];
  loading: boolean;
  title?: string;
  subtitle?: string;
}

// Get progress bar color based on percentage
function getProgressColor(percentage: number): string {
  if (percentage >= 90) return "bg-green-500";
  if (percentage >= 70) return "bg-blue-500";
  if (percentage >= 50) return "bg-amber-500";
  return "bg-red-500";
}

// Get course type badge color
function getCourseTypeColor(courseType: string): string {
  switch (courseType) {
    case "LT":
      return "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400";
    case "IT":
      return "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400";
    case "KCFS":
      return "bg-pink-500/20 text-pink-600 dark:text-pink-400";
    default:
      return "bg-gray-500/20 text-gray-600 dark:text-gray-400";
  }
}

export function ClassCompletionBars({
  data,
  loading,
  title = "Class Completion Progress",
  subtitle = "Grade entry progress by class",
}: ClassCompletionBarsProps) {
  const isEmpty = !data || data.length === 0;

  return (
    <ChartWrapper
      title={title}
      subtitle={subtitle}
      loading={loading}
      isEmpty={isEmpty}
      height={280}
    >
      <div className="space-y-3 overflow-y-auto max-h-[260px] pr-2">
        {data.map((item, index) => (
          <div key={`${item.classId}-${item.courseType}-${index}`} className="space-y-1">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">
                  {item.className}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded ${getCourseTypeColor(
                    item.courseType
                  )}`}
                >
                  {item.courseType}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary">
                  {item.entered}/{item.expected}
                </span>
                <span
                  className={`text-sm font-bold ${
                    item.percentage >= 70
                      ? "text-green-600 dark:text-green-400"
                      : item.percentage >= 50
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {item.percentage}%
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                  item.percentage
                )}`}
                style={{ width: `${Math.min(item.percentage, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {data.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border-subtle flex justify-between text-sm">
          <span className="text-text-secondary">
            {data.length} course{data.length > 1 ? "s" : ""} total
          </span>
          <span className="text-text-secondary">
            Avg:{" "}
            <span className="font-medium text-text-primary">
              {Math.round(
                data.reduce((sum, item) => sum + item.percentage, 0) / data.length
              )}
              %
            </span>
          </span>
        </div>
      )}
    </ChartWrapper>
  );
}
