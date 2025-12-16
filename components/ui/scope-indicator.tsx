"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGradeBandDisplay } from "@/lib/utils/gradeband";

interface ScopeIndicatorProps {
  gradeBand: string;
  courseType?: "LT" | "IT" | "KCFS" | null;
  academicYear?: string;
  term?: number | "all" | null;
  className?: string;
  variant?: "compact" | "detailed";
}

/**
 * Displays the current data scope for Head Teacher pages
 *
 * @example
 * <ScopeIndicator
 *   gradeBand="5-6"
 *   courseType="IT"
 *   academicYear="2025-2026"
 *   term={1}
 * />
 */
export function ScopeIndicator({
  gradeBand,
  courseType,
  academicYear,
  term,
  className,
  variant = "compact",
}: ScopeIndicatorProps) {
  const gradeBandDisplay = getGradeBandDisplay(gradeBand);

  const termDisplay = React.useMemo(() => {
    if (term === "all" || term === null || term === undefined) return "All Terms";
    return `Term ${term}`;
  }, [term]);

  const courseTypeLabel = React.useMemo(() => {
    if (!courseType) return null;
    switch (courseType) {
      case "LT":
        return "Local Teacher";
      case "IT":
        return "International Teacher";
      case "KCFS":
        return "KCFS";
      default:
        return courseType;
    }
  }, [courseType]);

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm",
          className
        )}
      >
        <Info className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
        <span className="text-text-secondary">
          Showing data for{" "}
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            {gradeBandDisplay}
          </span>
          {courseType && (
            <>
              {" "}• <span className="text-text-primary font-medium">{courseType}</span>
            </>
          )}
          {academicYear && (
            <>
              {" "}• <span className="text-text-secondary">{academicYear}</span>
            </>
          )}
          {term !== undefined && (
            <>
              {" "}• <span className="text-text-secondary">{termDisplay}</span>
            </>
          )}
        </span>
      </div>
    );
  }

  // Detailed variant
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20",
        className
      )}
    >
      <Info className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-text-secondary">Current scope:</span>
        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 font-medium">
          {gradeBandDisplay}
        </span>
        {courseTypeLabel && (
          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-medium">
            {courseType} ({courseTypeLabel})
          </span>
        )}
        {academicYear && (
          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-600 dark:text-purple-400">
            {academicYear}
          </span>
        )}
        {term !== undefined && (
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
            {termDisplay}
          </span>
        )}
      </div>
    </div>
  );
}
