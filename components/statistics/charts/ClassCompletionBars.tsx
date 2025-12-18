"use client";

import { Skeleton } from "@/components/ui/skeleton";
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
}: ClassCompletionBarsProps) {
  if (loading) {
    return (
      <div className="h-full flex flex-col space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  const isEmpty = !data || data.length === 0;

  if (isEmpty) {
    return (
      <div className="h-full flex items-center justify-center text-text-tertiary text-sm">
        No classes assigned
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {data.map((item, index) => (
          <div key={`${item.classId}-${item.courseType}-${index}`} className="space-y-0.5">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-medium text-text-primary truncate">
                  {item.className}
                </span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${getCourseTypeColor(
                    item.courseType
                  )}`}
                >
                  {item.courseType}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10px] text-text-secondary">
                  {item.entered}/{item.expected}
                </span>
                <span
                  className={`text-xs font-bold ${
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
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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

      {/* Compact Summary */}
      {data.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border-subtle flex justify-between text-xs">
          <span className="text-text-secondary">
            {data.length} course{data.length > 1 ? "s" : ""}
          </span>
          <span className="text-text-secondary">
            Avg:{" "}
            <span className="font-medium text-text-primary">
              {Math.round(
                data.reduce((sum, item) => sum + item.percentage, 0) / data.length
              )}%
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
