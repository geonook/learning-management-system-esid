"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { CourseType } from "@/lib/actions/gradebook";

interface CourseTypeSelectorProps {
  availableCourseTypes: CourseType[];
  currentCourseType: CourseType | null;
  onChange: (courseType: CourseType) => void;
}

const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  LT: "LT (Local Teacher)",
  IT: "IT (International Teacher)",
  KCFS: "KCFS",
};

const COURSE_TYPE_COLORS: Record<CourseType, { bg: string; text: string; border: string; activeBg: string }> = {
  LT: {
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    activeBg: "bg-emerald-100 dark:bg-emerald-900/40",
  },
  IT: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    activeBg: "bg-blue-100 dark:bg-blue-900/40",
  },
  KCFS: {
    bg: "bg-purple-50 dark:bg-purple-900/20",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
    activeBg: "bg-purple-100 dark:bg-purple-900/40",
  },
};

export function CourseTypeSelector({
  availableCourseTypes,
  currentCourseType,
  onChange,
}: CourseTypeSelectorProps) {
  if (availableCourseTypes.length <= 1) {
    // Don't show selector if only one course type
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-text-secondary font-medium">Course:</span>
      <div className="flex items-center gap-1 p-1 bg-surface-secondary rounded-lg border border-border-subtle">
        {availableCourseTypes.map((type) => {
          const isActive = type === currentCourseType;
          const colors = COURSE_TYPE_COLORS[type];

          return (
            <button
              key={type}
              onClick={() => onChange(type)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-offset-1",
                isActive
                  ? cn(
                      colors.activeBg,
                      colors.text,
                      "shadow-sm",
                      "ring-2 ring-offset-1",
                      colors.border.replace("border-", "ring-")
                    )
                  : cn(
                      "text-text-secondary hover:text-text-primary",
                      "hover:bg-surface-hover"
                    )
              )}
            >
              {type}
            </button>
          );
        })}
      </div>
    </div>
  );
}
