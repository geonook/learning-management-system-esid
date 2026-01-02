"use client";

/**
 * Growth Spotlight Component
 *
 * 顯示成長明星（Top Growth）和需關注學生（Needs Attention）
 * 雙欄並排卡片布局
 */

import { Star, AlertTriangle, TrendingUp, TrendingDown, Zap, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GrowthSpotlightData, GrowthSpotlightStudent } from "@/lib/api/map-growth-analytics";
import { BENCHMARK_COLORS } from "@/lib/map/benchmarks";

interface GrowthSpotlightProps {
  data: GrowthSpotlightData | null;
  loading?: boolean;
}

// 旗標圖示和顏色
const FLAG_CONFIG = {
  negative: {
    icon: TrendingDown,
    label: "Negative Growth",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  low_growth: {
    icon: AlertTriangle,
    label: "Low Growth",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  rapid_guess: {
    icon: Zap,
    label: "Rapid Guessing",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
};

function StudentCard({
  student,
  type,
}: {
  student: GrowthSpotlightStudent;
  type: "star" | "attention";
}) {
  const isPositive = student.growth > 0;
  const flagConfig = student.flag ? FLAG_CONFIG[student.flag] : null;
  const FlagIcon = flagConfig?.icon;

  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-colors",
        type === "star"
          ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
          : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
      )}
    >
      {/* Header: Name + Badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] px-1 py-0 font-mono shrink-0">
              {student.studentNumber.substring(0, 4)}
            </Badge>
            <p className="font-medium text-sm truncate" title={student.studentName}>
              {student.studentName}
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            G{student.grade}{student.englishLevel}
            {student.className && ` | ${student.className}`}
          </p>
        </div>

        {/* Growth Badge */}
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 font-mono text-xs",
            isPositive
              ? "border-green-500 text-green-700 dark:text-green-400"
              : "border-red-500 text-red-700 dark:text-red-400"
          )}
        >
          {isPositive ? "+" : ""}{student.growth} RIT
        </Badge>
      </div>

      {/* Score Change */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <span>{student.fromScore}</span>
        <span>→</span>
        <span className={isPositive ? "text-green-600 dark:text-green-400 font-medium" : "text-red-600 dark:text-red-400 font-medium"}>
          {student.toScore}
        </span>
      </div>

      {/* Growth Metrics: Index + cGP */}
      <div className="flex items-center gap-3 text-xs">
        {student.growthIndex !== null && (
          <span className="text-muted-foreground">
            Index: <span className="font-medium text-foreground">{student.growthIndex.toFixed(2)}</span>
          </span>
        )}
        {student.cgp !== null && (
          <span className="text-muted-foreground">
            cGP: <span className="font-medium text-foreground">{student.cgp}<sup className="text-[10px]">th</sup></span>
          </span>
        )}
      </div>

      {/* Flag Indicator */}
      {flagConfig && FlagIcon && (
        <div className={cn("flex items-center gap-1 text-xs mt-2", flagConfig.color)}>
          <FlagIcon className="w-3 h-3" />
          <span>{flagConfig.label}</span>
        </div>
      )}
    </div>
  );
}

function EmptyState({ type }: { type: "star" | "attention" }) {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
      {type === "star" ? (
        <>
          <Star className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No standout performers yet</p>
        </>
      ) : (
        <>
          <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No students flagged for attention</p>
        </>
      )}
    </div>
  );
}

export function GrowthSpotlight({ data, loading }: GrowthSpotlightProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="animate-pulse">
          <CardHeader className="pb-2">
            <div className="h-5 bg-muted rounded w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader className="pb-2">
            <div className="h-5 bg-muted rounded w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          No growth spotlight data available
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Growth Stars */}
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-green-600 fill-green-600" />
              <CardTitle className="text-base text-green-700 dark:text-green-400">
                Growth Stars
              </CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px]">
                  <p className="text-xs">
                    Students with the <strong>highest RIT growth</strong> during this period.
                    These students exceeded expectations and showed exceptional improvement.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <CardDescription>
              Top performers | {data.course}
              {data.cohortPrefix && ` | ${data.cohortPrefix}xxx cohort`}
              {data.totalStudents > 0 && ` (${data.totalStudents} students)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.topGrowth.length > 0 ? (
              <div className="space-y-2">
                {data.topGrowth.map((student, index) => (
                  <StudentCard key={`star-${index}`} student={student} type="star" />
                ))}
              </div>
            ) : (
              <EmptyState type="star" />
            )}
          </CardContent>
        </Card>

        {/* Needs Attention */}
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <CardTitle className="text-base text-red-700 dark:text-red-400">
                Needs Attention
              </CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px]">
                  <p className="text-xs mb-2">
                    Students who may need additional support:
                  </p>
                  <ul className="text-xs space-y-1">
                    <li className="flex items-center gap-1">
                      <TrendingDown className="w-3 h-3 text-red-500" />
                      <strong>Negative Growth:</strong> Score decreased
                    </li>
                    <li className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-yellow-500" />
                      <strong>Low Growth:</strong> Growth Index &lt; 0.6
                    </li>
                    <li className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-orange-500" />
                      <strong>Rapid Guessing:</strong> &gt;30% rapid guesses
                    </li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </div>
            <CardDescription>
              May need support | {data.course}
              {data.cohortPrefix && ` | ${data.cohortPrefix}xxx cohort`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.needsAttention.length > 0 ? (
              <div className="space-y-2">
                {data.needsAttention.map((student, index) => (
                  <StudentCard key={`attention-${index}`} student={student} type="attention" />
                ))}
              </div>
            ) : (
              <EmptyState type="attention" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Footer */}
      <div className="mt-3 text-xs text-muted-foreground text-center">
        Based on {data.totalStudents} students with complete data for {data.fromTerm.split(' ')[0]} → {data.toTerm.split(' ')[0]}
      </div>
    </TooltipProvider>
  );
}
