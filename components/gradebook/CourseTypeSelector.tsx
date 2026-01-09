"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { CourseType } from "@/lib/actions/gradebook";

interface CourseTypeSelectorProps {
  availableCourseTypes: CourseType[];
  currentCourseType: CourseType | null;
  onChange: (courseType: CourseType) => void;
}

// Unified solid button style - consistent with Browse pages
const COURSE_TYPE_COLORS: Record<CourseType, { active: string; inactive: string }> = {
  LT: {
    active: "bg-emerald-500 text-white dark:text-white",
    inactive: "bg-surface-tertiary text-text-secondary hover:bg-surface-hover hover:text-text-primary",
  },
  IT: {
    active: "bg-blue-500 text-white dark:text-white",
    inactive: "bg-surface-tertiary text-text-secondary hover:bg-surface-hover hover:text-text-primary",
  },
  KCFS: {
    active: "bg-purple-500 text-white dark:text-white",
    inactive: "bg-surface-tertiary text-text-secondary hover:bg-surface-hover hover:text-text-primary",
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
      <div className="flex items-center gap-1">
        {availableCourseTypes.map((type) => {
          const isActive = type === currentCourseType;
          const colors = COURSE_TYPE_COLORS[type];

          return (
            <button
              key={type}
              onClick={() => onChange(type)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-normal ease-apple",
                isActive ? colors.active : colors.inactive
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
