"use client";

/**
 * Growth Period Selector
 *
 * Dropdown component for selecting MAP growth analysis period.
 * Based on NWEA Technical Manual Figure 3.1 growth types:
 * - Within-Year: Fall→Spring (Type F) - Official benchmark available
 * - Year-over-Year: Fall→Fall (Type H) - Official benchmark available (Table C.3/C.5)
 * - Summer: Spring→Fall (Type G) - No official benchmark
 */

import { Calendar, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export interface GrowthPeriodOption {
  id: string;
  label: string;
  shortLabel: string;  // Displayed in the selector button
  fromTerm: string;    // e.g., "Fall 2024-2025"
  toTerm: string;      // e.g., "Spring 2024-2025"
  type: "within-year" | "year-over-year" | "summer";
  hasOfficialBenchmark: boolean;
  note: string;        // Explanation shown in dropdown
  durationMonths?: number;  // Approximate duration in months
}

interface GrowthPeriodSelectorProps {
  periods: GrowthPeriodOption[];
  selectedId: string;
  onChange: (periodId: string) => void;
  disabled?: boolean;
}

/**
 * Get badge color based on growth period type
 */
function getTypeBadgeColor(type: GrowthPeriodOption["type"]): string {
  switch (type) {
    case "within-year":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "year-over-year":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "summer":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
}

/**
 * Get human-readable type label
 */
function getTypeLabel(type: GrowthPeriodOption["type"]): string {
  switch (type) {
    case "within-year":
      return "Within Year";
    case "year-over-year":
      return "Year-over-Year";
    case "summer":
      return "Summer";
    default:
      return type;
  }
}

export function GrowthPeriodSelector({
  periods,
  selectedId,
  onChange,
  disabled = false,
}: GrowthPeriodSelectorProps) {
  const selectedPeriod = periods.find((p) => p.id === selectedId);

  if (periods.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted text-muted-foreground text-sm">
        <Calendar className="w-4 h-4" />
        <span>No growth periods available</span>
      </div>
    );
  }

  return (
    <Select value={selectedId} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full min-w-[280px]">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <SelectValue placeholder="Select growth period...">
            {selectedPeriod && (
              <div className="flex items-center gap-2">
                <span>{selectedPeriod.shortLabel}</span>
                {selectedPeriod.hasOfficialBenchmark ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />
                )}
              </div>
            )}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent className="w-[400px]">
        {periods.map((period) => (
          <SelectItem key={period.id} value={period.id} className="py-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{period.label}</span>
                <Badge variant="secondary" className={cn("text-xs", getTypeBadgeColor(period.type))}>
                  {getTypeLabel(period.type)}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {period.hasOfficialBenchmark ? (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-3 h-3" />
                    NWEA Official
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                    <AlertTriangle className="w-3 h-3" />
                    No benchmark
                  </span>
                )}
                {period.durationMonths && (
                  <span className="text-muted-foreground">
                    (~{period.durationMonths}mo)
                  </span>
                )}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Helper function to create growth period options from available terms
 * This can be used by the page component to generate options dynamically
 */
export function createGrowthPeriodOptions(
  availableTerms: string[]
): GrowthPeriodOption[] {
  const options: GrowthPeriodOption[] = [];

  // Parse and sort terms
  interface ParsedTerm {
    original: string;
    season: "fall" | "winter" | "spring";
    year: string;
  }

  const parsedTerms: ParsedTerm[] = availableTerms
    .map((term) => {
      const match = term.match(/(Fall|Winter|Spring)\s+(\d{4}-\d{4})/i);
      if (!match || !match[1] || !match[2]) return null;
      return {
        original: term,
        season: match[1].toLowerCase() as "fall" | "winter" | "spring",
        year: match[2],
      };
    })
    .filter((t): t is ParsedTerm => t !== null);

  // Group by academic year
  const byYear = new Map<string, ParsedTerm[]>();
  for (const term of parsedTerms) {
    const existing = byYear.get(term.year) || [];
    existing.push(term);
    byYear.set(term.year, existing);
  }

  // Sort years descending (most recent first)
  const sortedYears = Array.from(byYear.keys()).sort().reverse();

  for (const year of sortedYears) {
    const terms = byYear.get(year);
    if (!terms) continue;

    const hasFall = terms.some((t) => t.season === "fall");
    const hasSpring = terms.some((t) => t.season === "spring");

    // Within-Year: Fall → Spring (Type F)
    if (hasFall && hasSpring) {
      options.push({
        id: `fall-to-spring-${year}`,
        label: `Fall → Spring ${year}`,
        shortLabel: `Fall → Spring ${year.split("-")[0]}`,
        fromTerm: `Fall ${year}`,
        toTerm: `Spring ${year}`,
        type: "within-year",
        hasOfficialBenchmark: true,
        note: "NWEA Technical Manual Figure 3.1 Type F - Primary growth measure",
        durationMonths: 6,
      });
    }
  }

  // Year-over-Year: Fall → Fall (Type H)
  // Check consecutive years
  for (let i = 0; i < sortedYears.length - 1; i++) {
    const toYear = sortedYears[i];        // Later year (more recent)
    const fromYear = sortedYears[i + 1];  // Earlier year
    if (!fromYear || !toYear) continue;

    const fromTerms = byYear.get(fromYear);
    const toTerms = byYear.get(toYear);
    if (!fromTerms || !toTerms) continue;

    const fromHasFall = fromTerms.some((t) => t.season === "fall");
    const toHasFall = toTerms.some((t) => t.season === "fall");

    if (fromHasFall && toHasFall) {
      options.push({
        id: `fall-to-fall-${fromYear}-${toYear}`,
        label: `Fall ${fromYear} → Fall ${toYear}`,
        shortLabel: `Fall ${fromYear.split("-")[0]} → Fall ${toYear.split("-")[0]}`,
        fromTerm: `Fall ${fromYear}`,
        toTerm: `Fall ${toYear}`,
        type: "year-over-year",
        hasOfficialBenchmark: true,
        note: "NWEA Technical Manual Table C.3/C.5 - Includes summer + grade advancement",
        durationMonths: 12,
      });
    }

    // Summer: Spring → Fall (Type G)
    const fromHasSpring = fromTerms.some((t) => t.season === "spring");
    if (fromHasSpring && toHasFall) {
      options.push({
        id: `spring-to-fall-${fromYear}-${toYear}`,
        label: `Spring ${fromYear} → Fall ${toYear}`,
        shortLabel: `Spring ${fromYear.split("-")[0]} → Fall ${toYear.split("-")[0]}`,
        fromTerm: `Spring ${fromYear}`,
        toTerm: `Fall ${toYear}`,
        type: "summer",
        hasOfficialBenchmark: false,
        note: "Summer period only - No official NWEA benchmark available",
        durationMonths: 4,
      });
    }
  }

  // Sort options by toTerm (most recent first)
  // Parse toTerm to get year and season for sorting
  const getToTermSortKey = (option: GrowthPeriodOption): number => {
    const match = option.toTerm.match(/(Fall|Winter|Spring)\s+(\d{4})-(\d{4})/i);
    if (!match) return 0;
    const season = match[1]?.toLowerCase();
    const year = parseInt(match[3] ?? "0", 10); // Use end year (e.g., 2025 from 2024-2025)
    // Season order: Spring > Winter > Fall (within same year)
    const seasonOrder = season === "spring" ? 2 : season === "winter" ? 1 : 0;
    return year * 10 + seasonOrder;
  };

  options.sort((a, b) => getToTermSortKey(b) - getToTermSortKey(a));

  return options;
}
