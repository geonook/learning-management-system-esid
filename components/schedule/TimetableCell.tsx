"use client";

import { cn } from "@/lib/utils";
import type { TimetableEntryWithPeriod } from "@/lib/api/timetable";
import { MapPin } from "lucide-react";

interface TimetableCellProps {
  entry: TimetableEntryWithPeriod;
  onClick?: (entry: TimetableEntryWithPeriod) => void;
  isActive?: boolean;
  compact?: boolean;
}

const COURSE_TYPE_STYLES = {
  english: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    text: "text-blue-900 dark:text-blue-100",
  },
  homeroom: {
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-800",
    badge: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
    text: "text-green-900 dark:text-green-100",
  },
  ev: {
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-200 dark:border-purple-800",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    text: "text-purple-900 dark:text-purple-100",
  },
};

export function TimetableCell({
  entry,
  onClick,
  isActive,
  compact = false,
}: TimetableCellProps) {
  const styles = COURSE_TYPE_STYLES[entry.course_type];

  const handleClick = () => {
    if (onClick) {
      onClick(entry);
    }
  };

  // Get badge text
  const getBadgeText = () => {
    if (entry.course_type === "homeroom" && entry.course_name) {
      return entry.course_name;
    }
    if (entry.course_type === "ev") {
      return "EV";
    }
    return "ENG";
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full p-2 rounded-md border text-left transition-all",
        styles.bg,
        styles.border,
        onClick ? "cursor-pointer hover:shadow-md" : "cursor-default",
        isActive ? "ring-2 ring-primary" : ""
      )}
    >
      {/* Class name */}
      <div className={cn("font-medium text-sm truncate", styles.text)}>
        {entry.class_name}
      </div>

      {!compact && (
        <>
          {/* Badge */}
          <div className="mt-1">
            <span
              className={cn(
                "inline-block px-1.5 py-0.5 rounded text-[10px] font-medium",
                styles.badge
              )}
            >
              {getBadgeText()}
            </span>
          </div>

          {/* Classroom */}
          {entry.classroom && (
            <div className="mt-1 flex items-center gap-1 text-xs text-text-tertiary">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{entry.classroom}</span>
            </div>
          )}
        </>
      )}
    </button>
  );
}
