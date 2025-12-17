"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { getAllAcademicYears } from "@/lib/api/academic-year";
import { getCurrentAcademicYear } from "@/types/academic-year";

interface AcademicYearSelectorProps {
  /** Available academic years to choose from. If not provided, will fetch from API */
  availableYears?: string[];
  /** Compact mode for smaller UI */
  compact?: boolean;
  /** Variant: buttons or dropdown */
  variant?: "buttons" | "dropdown";
  /** Optional className override */
  className?: string;
}

/**
 * Academic Year Selector Component
 *
 * Uses Zustand global store for state management.
 * Supports both button group and dropdown variants.
 */
export function AcademicYearSelector({
  availableYears: propYears,
  compact = false,
  variant = "dropdown",
  className,
}: AcademicYearSelectorProps) {
  const { selectedAcademicYear, setSelectedAcademicYear } = useAppStore();
  const [years, setYears] = useState<string[]>(propYears || []);
  const [loading, setLoading] = useState(!propYears);

  useEffect(() => {
    if (propYears) {
      setYears(propYears);
      return;
    }

    // Fetch available years from API
    async function fetchYears() {
      try {
        const fetchedYears = await getAllAcademicYears();
        console.log("[AcademicYearSelector] Fetched years:", fetchedYears);
        if (fetchedYears.length > 0) {
          setYears(fetchedYears);
        } else {
          // Fallback to current year if no data
          console.log("[AcademicYearSelector] No years found, using current year");
          setYears([getCurrentAcademicYear()]);
        }
      } catch (error) {
        console.error("[AcademicYearSelector] Failed to fetch years:", error);
        setYears([getCurrentAcademicYear()]);
      } finally {
        setLoading(false);
      }
    }

    fetchYears();
  }, [propYears]);

  // Ensure selected year is valid
  // If current selection is not in the list, prefer current academic year or first available
  useEffect(() => {
    if (years.length === 0) return;

    if (!years.includes(selectedAcademicYear)) {
      // Prefer the current academic year if available
      const currentYear = getCurrentAcademicYear();
      if (years.includes(currentYear)) {
        console.log('[AcademicYearSelector] Syncing to current year:', currentYear);
        setSelectedAcademicYear(currentYear);
      } else {
        // Fallback to first available year
        const firstYear = years[0];
        if (firstYear) {
          console.log('[AcademicYearSelector] Syncing to first year:', firstYear);
          setSelectedAcademicYear(firstYear);
        }
      }
    }
  }, [years, selectedAcademicYear, setSelectedAcademicYear]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-secondary font-medium">Year:</span>
        <div className="h-8 w-24 bg-surface-secondary animate-pulse rounded-md" />
      </div>
    );
  }

  if (years.length <= 1) {
    // Only one year, show as static text
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="text-sm text-text-secondary font-medium">Year:</span>
        <span className="text-sm font-medium text-text-primary">
          {selectedAcademicYear}
        </span>
      </div>
    );
  }

  if (variant === "dropdown") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="text-sm text-text-secondary font-medium">Year:</span>
        <select
          value={selectedAcademicYear}
          onChange={(e) => setSelectedAcademicYear(e.target.value)}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium",
            "bg-surface-secondary border border-border-subtle",
            "text-text-primary",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
            compact && "px-2 py-1 text-xs"
          )}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Buttons variant
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm text-text-secondary font-medium">Year:</span>
      <div className="flex items-center gap-1 p-1 bg-surface-secondary rounded-lg border border-border-subtle">
        {years.map((year) => {
          const isActive = year === selectedAcademicYear;

          return (
            <button
              key={year}
              onClick={() => setSelectedAcademicYear(year)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-offset-1",
                compact && "px-2 py-1 text-xs",
                isActive
                  ? cn(
                      "bg-primary-100 dark:bg-primary-900/40",
                      "text-primary-700 dark:text-primary-300",
                      "shadow-sm",
                      "ring-2 ring-offset-1 ring-primary-200 dark:ring-primary-800"
                    )
                  : cn(
                      "text-text-secondary hover:text-text-primary",
                      "hover:bg-surface-hover"
                    )
              )}
            >
              {year}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Standalone hook for getting/setting academic year from URL params
 * Use when you need URL-synced year instead of global store
 */
export function useAcademicYearParam() {
  const { selectedAcademicYear, setSelectedAcademicYear } = useAppStore();
  return {
    academicYear: selectedAcademicYear,
    setAcademicYear: setSelectedAcademicYear,
  };
}
