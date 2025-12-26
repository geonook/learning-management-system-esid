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

const TERM_COLORS: Record<
  Term | "all",
  { bg: string; text: string; border: string; activeBg: string }
> = {
  all: {
    bg: "bg-slate-50 dark:bg-slate-900/20",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-800",
    activeBg: "bg-slate-100 dark:bg-slate-900/40",
  },
  1: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    activeBg: "bg-amber-100 dark:bg-amber-900/40",
  },
  2: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
    activeBg: "bg-orange-100 dark:bg-orange-900/40",
  },
  3: {
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-200 dark:border-cyan-800",
    activeBg: "bg-cyan-100 dark:bg-cyan-900/40",
  },
  4: {
    bg: "bg-teal-50 dark:bg-teal-900/20",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-800",
    activeBg: "bg-teal-100 dark:bg-teal-900/40",
  },
};

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
      <div className="flex items-center gap-1 p-1 bg-surface-secondary rounded-lg border border-border-subtle">
        {options.map((term) => {
          const isActive = term === currentTerm;
          const colors = TERM_COLORS[term];
          const isLocked = term !== "all" && lockedTerms.has(term);

          return (
            <button
              key={term}
              onClick={() => onChange(term)}
              disabled={disabled}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-offset-1",
                "flex items-center gap-1",
                compact && "px-2 py-1",
                disabled && "opacity-50 cursor-not-allowed",
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
                      !disabled && "hover:bg-surface-hover"
                    )
              )}
              title={isLocked ? `${getLabel(term)} (Locked)` : getLabel(term)}
            >
              {getLabel(term)}
              {isLocked && (
                <Lock className="h-3 w-3 text-red-500 dark:text-red-400" />
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
