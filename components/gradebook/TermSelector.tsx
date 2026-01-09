"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Term } from "@/types/academic-year";
import { TERM_NAMES, TERM_NAMES_SHORT, ALL_TERMS } from "@/types/academic-year";
import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface TermSelectorProps {
  availableTerms?: Term[];
  currentTerm: Term | "all";
  onChange: (term: Term | "all") => void;
  showAllOption?: boolean;
  compact?: boolean;
  academicYear?: string; // For lock status check
  disabled?: boolean; // Disable all term buttons (e.g., for read-only users)
}

// Unified solid button style - consistent with Browse pages
// Active: solid blue background with white text
// Inactive: surface-tertiary with text-secondary

export function TermSelector({
  availableTerms = ALL_TERMS,
  currentTerm,
  onChange,
  showAllOption = true,
  compact = false,
  academicYear,
  disabled = false,
}: TermSelectorProps) {
  // Track locked terms
  const [lockedTerms, setLockedTerms] = useState<Set<Term>>(new Set());

  // Fetch lock status for terms
  useEffect(() => {
    if (!academicYear) return;

    async function fetchLockStatus() {
      const supabase = createClient();
      const { data } = await supabase
        .from("academic_periods")
        .select("term, status")
        .eq("academic_year", academicYear)
        .eq("period_type", "term")
        .in("status", ["locked", "archived"]);

      if (data) {
        const locked = new Set<Term>();
        data.forEach((row) => {
          if (row.term && (row.status === "locked" || row.status === "archived")) {
            locked.add(row.term as Term);
          }
        });
        setLockedTerms(locked);
      }
    }

    fetchLockStatus();
  }, [academicYear]);

  // Build options list
  const options: (Term | "all")[] = showAllOption
    ? ["all", ...availableTerms]
    : availableTerms;

  if (options.length <= 1) {
    return null;
  }

  const getLabel = (term: Term | "all"): string => {
    if (term === "all") return compact ? "All" : "All Terms";
    return compact ? TERM_NAMES_SHORT[term] : TERM_NAMES[term];
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-text-secondary font-medium">Term:</span>
      <div className="flex items-center gap-1">
        {options.map((term) => {
          const isActive = term === currentTerm;
          const isLocked = term !== "all" && lockedTerms.has(term);

          return (
            <button
              key={term}
              onClick={() => onChange(term)}
              disabled={disabled}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-normal ease-apple",
                "flex items-center gap-1",
                compact && "px-3 py-1.5",
                disabled && "opacity-50 cursor-not-allowed",
                isActive
                  ? "bg-accent-blue text-white dark:text-white"
                  : cn(
                      "bg-surface-tertiary text-text-secondary",
                      !disabled && "hover:bg-surface-hover hover:text-text-primary"
                    )
              )}
              title={isLocked ? `${getLabel(term)} (Locked)` : getLabel(term)}
            >
              {getLabel(term)}
              {isLocked && (
                <Lock className={cn("h-3 w-3", isActive ? "text-white/80" : "text-red-500 dark:text-red-400")} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Dropdown variant of TermSelector for smaller spaces
 */
export function TermSelectorDropdown({
  availableTerms = ALL_TERMS,
  currentTerm,
  onChange,
  showAllOption = true,
}: TermSelectorProps) {
  const options: (Term | "all")[] = showAllOption
    ? ["all", ...availableTerms]
    : availableTerms;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-text-secondary font-medium">Term:</span>
      <select
        value={currentTerm}
        onChange={(e) => {
          const value = e.target.value;
          onChange(value === "all" ? "all" : (parseInt(value, 10) as Term));
        }}
        className={cn(
          "px-3 py-1.5 rounded-md text-sm font-medium",
          "bg-surface-secondary border border-border-subtle",
          "text-text-primary",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        )}
      >
        {options.map((term) => (
          <option key={term} value={term}>
            {term === "all" ? "All Terms" : TERM_NAMES[term]}
          </option>
        ))}
      </select>
    </div>
  );
}
