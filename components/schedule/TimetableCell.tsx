"use client";

import { cn } from "@/lib/utils";
import type { TimetableEntryWithPeriod } from "@/lib/api/timetable";

interface TimetableCellProps {
  entry: TimetableEntryWithPeriod;
  onClick?: (entry: TimetableEntryWithPeriod) => void;
  isActive?: boolean;
}

const COURSE_TYPE_STYLES = {
  english: {
    accent: "bg-blue-500",
    bg: "bg-blue-50/80 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    hover: "hover:bg-blue-100 dark:hover:bg-blue-900/50",
  },
  ev: {
    accent: "bg-purple-500",
    bg: "bg-purple-50/80 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    hover: "hover:bg-purple-100 dark:hover:bg-purple-900/50",
  },
  kcfs: {
    accent: "bg-emerald-500",
    bg: "bg-emerald-50/80 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    hover: "hover:bg-emerald-100 dark:hover:bg-emerald-900/50",
  },
};

const DEFAULT_STYLES = COURSE_TYPE_STYLES.english;

export function TimetableCell({
  entry,
  onClick,
  isActive,
}: TimetableCellProps) {
  const styles =
    COURSE_TYPE_STYLES[entry.course_type as keyof typeof COURSE_TYPE_STYLES] ??
    DEFAULT_STYLES;

  return (
    <button
      onClick={() => onClick?.(entry)}
      className={cn(
        "group w-full h-full min-h-[52px] rounded-lg text-left transition-all duration-200",
        "flex items-stretch overflow-hidden",
        styles.bg,
        styles.hover,
        onClick && "cursor-pointer active:scale-[0.98]",
        isActive && "shadow-[0_0_0_2px] shadow-primary/50"
      )}
    >
      {/* Color accent bar */}
      <div className={cn("w-1 shrink-0", styles.accent)} />

      {/* Content */}
      <div className="flex-1 px-2.5 py-2 min-w-0">
        <div className={cn("font-medium text-[13px] leading-tight truncate", styles.text)}>
          {entry.class_name}
        </div>
        {entry.classroom && (
          <div className="text-[11px] text-text-tertiary mt-0.5 truncate opacity-70 group-hover:opacity-100 transition-opacity">
            {entry.classroom}
          </div>
        )}
      </div>
    </button>
  );
}
