"use client";

/**
 * MAP Goal Comparison Table
 *
 * 顯示各 English Level 在各 Goal 的平均分數
 * 顯示 vs Overall (與整體 RIT 的差異)
 * 正值顯示綠色，負值顯示紅色
 */

import { Info } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { GoalPerformanceData } from "@/lib/api/map-analytics";
import { formatTermStats, CHART_EXPLANATIONS } from "@/lib/map/utils";

// Goal 短名稱映射 (用於表頭)
const GOAL_SHORT_NAMES: Record<string, string> = {
  "Informational Text": "Info Text",
  "Literary Text": "Literary",
  "Vocabulary": "Vocab",
  "Grammar and Usage": "Grammar",
  "Mechanics": "Mechanics",
  "Writing": "Writing",
};

interface MapGoalTableProps {
  data: GoalPerformanceData | null;
  showAllLevel?: boolean; // 是否顯示 "All" Level
}

export function MapGoalTable({
  data,
  showAllLevel = true,
}: MapGoalTableProps) {
  if (!data || data.byLevel.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No goal performance data available
      </div>
    );
  }

  // 取得要顯示的 Levels
  const levelsToShow = showAllLevel
    ? data.byLevel
    : data.byLevel.filter((l) => l.englishLevel !== "All");

  // 取得課程的所有 Goal 名稱
  const goalNames = data.allStudents.map((g) => g.goalName);

  // 格式化分數
  const formatScore = (score: number | null): string => {
    if (score === null) return "-";
    return score.toFixed(1);
  };

  // 格式化差異值 (帶正負號)
  const formatDifference = (diff: number | null): string => {
    if (diff === null) return "-";
    const sign = diff > 0 ? "+" : "";
    return `${sign}${diff.toFixed(1)}`;
  };

  // 取得差異值樣式
  const getDifferenceStyle = (diff: number | null): string => {
    if (diff === null) return "";
    if (diff > 0) {
      return "text-green-600 dark:text-green-400 font-medium";
    }
    if (diff < 0) {
      return "text-red-600 dark:text-red-400 font-medium";
    }
    return "text-muted-foreground";
  };

  const courseTitle = data.course === "Reading" ? "Reading" : "Language Usage";

  return (
    <TooltipProvider>
      <div className="w-full space-y-3">
        {/* Header with Info */}
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">
            G{data.grade} {courseTitle} Goal Comparison
          </h4>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[320px]">
              <div className="text-xs space-y-1">
                <p><strong>Table Guide:</strong></p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li><strong>Avg</strong>: Average goal RIT score (midpoint)</li>
                  <li><strong>vs Overall</strong>: Difference from overall RIT score</li>
                  <li className="text-green-600">• Positive values: Goal score above overall RIT</li>
                  <li className="text-red-600">• Negative values: Goal score below overall RIT</li>
                </ul>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        <p className="text-xs text-muted-foreground">
          Term: {formatTermStats(data.termTested)}
        </p>

        {/* Color Legend */}
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">Legend:</span>
          <span className="flex items-center gap-1">
            <span className="text-green-600 dark:text-green-400 font-medium">+N</span>
            <span>Above Overall (Strength)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="text-red-600 dark:text-red-400 font-medium">-N</span>
            <span>Below Overall (Weakness)</span>
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Goal Area</TableHead>
                {levelsToShow.map((levelData) => (
                  <TableHead
                    key={levelData.englishLevel}
                    colSpan={2}
                    className="text-center border-l"
                  >
                    {levelData.englishLevel === "All"
                      ? `All G${data.grade}`
                      : `G${data.grade}${levelData.englishLevel}`}
                  </TableHead>
                ))}
              </TableRow>
              <TableRow>
                <TableHead className="text-xs text-muted-foreground">
                  (n = students)
                </TableHead>
                {levelsToShow.flatMap((levelData) => [
                  <TableHead
                    key={`${levelData.englishLevel}-avg`}
                    className="text-center text-xs px-2 py-1 w-16 border-l"
                  >
                    Avg
                  </TableHead>,
                  <TableHead
                    key={`${levelData.englishLevel}-vs`}
                    className="text-center text-xs px-2 py-1 w-16"
                  >
                    vs Overall
                  </TableHead>,
                ])}
              </TableRow>
            </TableHeader>
            <TableBody>
              {goalNames.map((goalName) => (
                <TableRow key={goalName}>
                  <TableCell className="font-medium text-sm">
                    {GOAL_SHORT_NAMES[goalName] || goalName}
                  </TableCell>
                  {levelsToShow.flatMap((levelData) => {
                    const goal = levelData.goals.find((g) => g.goalName === goalName);
                    const avgScore = goal?.avgMidpoint ?? null;
                    const vsOverall =
                      avgScore !== null && levelData.overallRit !== null
                        ? Math.round((avgScore - levelData.overallRit) * 10) / 10
                        : null;

                    return [
                      <TableCell
                        key={`${levelData.englishLevel}-${goalName}-avg`}
                        className="text-center text-sm px-2 py-2 border-l"
                      >
                        {formatScore(avgScore)}
                        {goal && goal.studentCount > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({goal.studentCount})
                          </span>
                        )}
                      </TableCell>,
                      <TableCell
                        key={`${levelData.englishLevel}-${goalName}-vs`}
                        className={cn(
                          "text-center text-sm px-2 py-2",
                          getDifferenceStyle(vsOverall)
                        )}
                      >
                        {vsOverall !== null && vsOverall >= 5 && (
                          <span className="mr-0.5" title="Relative Strength">★</span>
                        )}
                        {vsOverall !== null && vsOverall <= -5 && (
                          <span className="mr-0.5" title="Suggested Focus">◆</span>
                        )}
                        {formatDifference(vsOverall)}
                      </TableCell>,
                    ];
                  })}
                </TableRow>
              ))}

              {/* Overall RIT Row */}
              <TableRow className="bg-muted/30 font-medium">
                <TableCell className="text-sm">Overall RIT</TableCell>
                {levelsToShow.flatMap((levelData) => [
                  <TableCell
                    key={`${levelData.englishLevel}-overall-avg`}
                    className="text-center text-sm px-2 py-2 border-l"
                  >
                    {formatScore(levelData.overallRit)}
                  </TableCell>,
                  <TableCell
                    key={`${levelData.englishLevel}-overall-vs`}
                    className="text-center text-sm px-2 py-2 text-muted-foreground"
                  >
                    -
                  </TableCell>,
                ])}
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Footer Explanation */}
        <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
          <p>{CHART_EXPLANATIONS.goalAreas.en}</p>
        </div>
      </div>
    </TooltipProvider>
  );
}
