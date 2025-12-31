"use client";

/**
 * Growth Context Banner
 *
 * Displays the current growth analysis context at the top of the Growth Tab.
 * Shows:
 * - Selected growth period with full dates
 * - Student count with complete data
 * - Whether official NWEA benchmark is available
 * - Additional notes for specific growth types
 */

import { BarChart3, Users, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GrowthPeriodOption } from "./GrowthPeriodSelector";

interface GrowthContextBannerProps {
  period: GrowthPeriodOption;
  studentCount: number;
  isLoading?: boolean;
}

/**
 * Get duration label for the growth period
 */
function getDurationLabel(months: number | undefined): string {
  if (!months) return "";
  if (months <= 4) return "~4 months";
  if (months <= 7) return "~6 months";
  return "~12 months";
}

/**
 * Get alert variant based on benchmark availability
 */
function getAlertVariant(hasOfficialBenchmark: boolean): "default" | "destructive" {
  return "default";  // We use custom styling instead of destructive
}

export function GrowthContextBanner({
  period,
  studentCount,
  isLoading = false,
}: GrowthContextBannerProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse h-[100px] bg-muted rounded-lg" />
    );
  }

  const durationLabel = getDurationLabel(period.durationMonths);

  return (
    <TooltipProvider>
      <Alert className={period.hasOfficialBenchmark
        ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30"
        : "border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/30"
      }>
        <BarChart3 className="h-5 w-5 text-blue-600" />
        <AlertTitle className="flex items-center gap-2 text-base font-semibold">
          {period.fromTerm} → {period.toTerm}
          {durationLabel && (
            <span className="text-sm font-normal text-muted-foreground">
              ({durationLabel})
            </span>
          )}
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          {/* Student Count */}
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>
              Based on <strong>{studentCount.toLocaleString()}</strong> students with complete data
            </span>
          </div>

          {/* Benchmark Status */}
          <div className="flex items-center gap-2 text-sm">
            {period.hasOfficialBenchmark ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-green-700 dark:text-green-400">
                  Expected growth from <strong>NWEA 2025 Norms</strong> (Official)
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[300px]">
                    <p className="text-xs">
                      {period.type === "within-year"
                        ? "NWEA Technical Manual Figure 3.1 Type F: Fall-to-Spring within-year growth norms."
                        : "NWEA Technical Manual Table C.3 & C.5: Fall-to-Fall year-over-year growth norms including summer break and grade advancement."
                      }
                    </p>
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="text-yellow-700 dark:text-yellow-400">
                  No official NWEA benchmark - showing <strong>actual growth only</strong>
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[300px]">
                    <p className="text-xs">
                      NWEA does not provide official growth norms for Spring-to-Fall periods
                      (summer break). Growth Index and comparisons to expected values are not available.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>

          {/* Type-specific notes */}
          {period.type === "year-over-year" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Info className="w-3.5 h-3.5" />
              <span>
                Note: Year-over-year growth includes summer break and grade advancement.
                Students are compared by their <em>starting grade</em> (e.g., G5 Fall → G6 Fall uses G5 norms).
              </span>
            </div>
          )}

          {period.type === "summer" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Info className="w-3.5 h-3.5" />
              <span>
                Summer period only. Some regression is normal during extended breaks.
                This period is useful for identifying summer learning loss patterns.
              </span>
            </div>
          )}
        </AlertDescription>
      </Alert>
    </TooltipProvider>
  );
}
