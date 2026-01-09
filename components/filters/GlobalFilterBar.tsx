"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { AcademicYearSelector } from "./AcademicYearSelector";
import { TermSelector, TermSelectorDropdown } from "@/components/gradebook/TermSelector";
import type { Term } from "@/types/academic-year";
import type { CourseType } from "@/lib/actions/gradebook";

interface GlobalFilterBarProps {
  /** Show academic year selector */
  showYear?: boolean;
  /** Show term selector */
  showTerm?: boolean;
  /** Show course type selector (requires courseType and onCourseTypeChange) */
  showCourseType?: boolean;
  /** Show grade level selector */
  showGrade?: boolean;
  /** Available academic years (optional, will fetch if not provided) */
  availableYears?: string[];
  /** Available terms (optional, defaults to 1-4) */
  availableTerms?: Term[];
  /** Current course type (required if showCourseType is true) */
  courseType?: CourseType;
  /** Available course types */
  availableCourseTypes?: CourseType[];
  /** Course type change handler (required if showCourseType is true) */
  onCourseTypeChange?: (type: CourseType) => void;
  /** Use compact styling */
  compact?: boolean;
  /** Use dropdown variant for term selector */
  termVariant?: "buttons" | "dropdown";
  /** Use dropdown variant for year selector */
  yearVariant?: "buttons" | "dropdown";
  /** Optional className for container */
  className?: string;
  /** Optional children to render after built-in filters */
  children?: React.ReactNode;
}

const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  LT: "LT (Local)",
  IT: "IT (International)",
  KCFS: "KCFS",
};

// Unified solid button style - consistent with Browse pages and TermSelector
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

/**
 * Global Filter Bar Component
 *
 * Combines Academic Year and Term selectors with optional Course Type selector.
 * Uses Zustand global store for Year and Term state.
 *
 * Usage:
 * ```tsx
 * // Basic: Year + Term filters
 * <GlobalFilterBar showYear showTerm />
 *
 * // With Course Type
 * <GlobalFilterBar
 *   showYear
 *   showTerm
 *   showCourseType
 *   courseType={selectedType}
 *   onCourseTypeChange={setSelectedType}
 * />
 *
 * // Compact dropdown style
 * <GlobalFilterBar showYear showTerm compact termVariant="dropdown" />
 * ```
 */
export function GlobalFilterBar({
  showYear = true,
  showTerm = true,
  showCourseType = false,
  showGrade = false,
  availableYears,
  availableTerms,
  courseType,
  availableCourseTypes = ["LT", "IT", "KCFS"],
  onCourseTypeChange,
  compact = false,
  termVariant = "buttons",
  yearVariant = "dropdown",
  className,
  children,
}: GlobalFilterBarProps) {
  const { selectedTerm, setSelectedTerm } = useAppStore();

  // If nothing to show, return null
  if (!showYear && !showTerm && !showCourseType && !showGrade && !children) {
    return null;
  }

  const TermComponent = termVariant === "dropdown" ? TermSelectorDropdown : TermSelector;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-4",
        !compact && "p-4 bg-card rounded-lg border border-border-default",
        compact && "gap-3",
        className
      )}
    >
      {/* Academic Year Selector */}
      {showYear && (
        <AcademicYearSelector
          availableYears={availableYears}
          compact={compact}
          variant={yearVariant}
        />
      )}

      {/* Term Selector */}
      {showTerm && (
        <TermComponent
          availableTerms={availableTerms}
          currentTerm={selectedTerm}
          onChange={setSelectedTerm}
          showAllOption
          compact={compact}
        />
      )}

      {/* Course Type Selector */}
      {showCourseType && courseType && onCourseTypeChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary font-medium">Course:</span>
          <div className="flex items-center gap-1">
            {availableCourseTypes.map((type) => {
              const isActive = type === courseType;
              const colors = COURSE_TYPE_COLORS[type];

              return (
                <button
                  key={type}
                  onClick={() => onCourseTypeChange(type)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-normal ease-apple",
                    compact && "px-3 py-1.5",
                    isActive ? colors.active : colors.inactive
                  )}
                >
                  {compact ? type : COURSE_TYPE_LABELS[type]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Spacer before children */}
      {children && (
        <>
          <div className="flex-1" />
          {children}
        </>
      )}
    </div>
  );
}

/**
 * Hook to easily access current filter values from global store
 */
export function useGlobalFilters() {
  const {
    selectedAcademicYear,
    selectedTerm,
    setSelectedAcademicYear,
    setSelectedTerm,
  } = useAppStore();

  return {
    academicYear: selectedAcademicYear,
    term: selectedTerm,
    setAcademicYear: setSelectedAcademicYear,
    setTerm: setSelectedTerm,
    // Convenience: get term for API (undefined if "all")
    termForApi: selectedTerm === "all" ? undefined : selectedTerm,
  };
}
