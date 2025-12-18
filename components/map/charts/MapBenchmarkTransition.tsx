"use client";

/**
 * MAP Benchmark Transition Matrix
 *
 * 顯示 Benchmark 等級流動矩陣 (E1/E2/E3 → E1/E2/E3)
 * 使用條件格式：對角線淺灰，進步淺綠，退步淺紅
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
import type { BenchmarkTransitionData } from "@/lib/api/map-analytics";

interface MapBenchmarkTransitionProps {
  data: BenchmarkTransitionData | null;
}

export function MapBenchmarkTransition({ data }: MapBenchmarkTransitionProps) {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No benchmark transition data available
      </div>
    );
  }

  const benchmarkLevels: ("E1" | "E2" | "E3")[] = ["E1", "E2", "E3"];

  // Get count from matrix
  const getCount = (from: "E1" | "E2" | "E3", to: "E1" | "E2" | "E3"): number => {
    const found = data.matrix.find((m) => m.from === from && m.to === to);
    return found?.count ?? 0;
  };

  // Get cell style based on transition direction
  const getCellStyle = (from: "E1" | "E2" | "E3", to: "E1" | "E2" | "E3"): string => {
    const levels = { E1: 3, E2: 2, E3: 1 };
    const fromLevel = levels[from];
    const toLevel = levels[to];

    if (fromLevel === toLevel) {
      // Diagonal - Same level (light gray)
      return "bg-muted/50";
    } else if (toLevel > fromLevel) {
      // Upper triangle - Improved (light green)
      return "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 font-medium";
    } else {
      // Lower triangle - Declined (light red)
      return "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 font-medium";
    }
  };

  // Format term label
  const formatTermLabel = (term: string): string => {
    const match = term.match(/^(Fall|Spring)\s+(\d{4})-(\d{4})$/);
    if (!match) return term;
    return `${match[1]} ${match[2]?.slice(2)}-${match[3]?.slice(2)}`;
  };

  return (
    <TooltipProvider>
      <div className="w-full space-y-3">
        {/* Header with Info */}
        <div className="flex items-center justify-center gap-2">
          <h4 className="text-sm font-medium text-center">
            G{data.grade} Benchmark Transition Matrix
          </h4>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[320px]">
              <div className="text-xs space-y-1">
                <p><strong>Matrix Guide:</strong></p>
                <p>Shows how students moved between benchmark levels from one term to another.</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li><strong>Rows:</strong> Starting benchmark level ({formatTermLabel(data.fromTerm)})</li>
                  <li><strong>Columns:</strong> Ending benchmark level ({formatTermLabel(data.toTerm)})</li>
                  <li><strong>Green cells:</strong> Students who improved</li>
                  <li><strong>Gray diagonal:</strong> Students who stayed at same level</li>
                  <li><strong>Red cells:</strong> Students who declined</li>
                </ul>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {formatTermLabel(data.fromTerm)} → {formatTermLabel(data.toTerm)}
        </p>

        {/* Transition Matrix Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24 text-center border-r bg-muted/50">
                  From → To
                </TableHead>
                {benchmarkLevels.map((level) => (
                  <TableHead key={level} className="text-center w-20">
                    {level}
                  </TableHead>
                ))}
                <TableHead className="text-center w-24 border-l bg-muted/50">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {benchmarkLevels.map((fromLevel) => {
                const rowTotal = benchmarkLevels.reduce(
                  (sum, toLevel) => sum + getCount(fromLevel, toLevel),
                  0
                );

                return (
                  <TableRow key={fromLevel}>
                    <TableCell className="text-center font-medium border-r bg-muted/50">
                      {fromLevel}
                    </TableCell>
                    {benchmarkLevels.map((toLevel) => {
                      const count = getCount(fromLevel, toLevel);
                      return (
                        <TableCell
                          key={`${fromLevel}-${toLevel}`}
                          className={cn(
                            "text-center",
                            getCellStyle(fromLevel, toLevel)
                          )}
                        >
                          {count > 0 ? count : "-"}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center font-medium border-l bg-muted/50">
                      {rowTotal}
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Column totals */}
              <TableRow className="border-t-2">
                <TableCell className="text-center font-medium border-r bg-muted/50">
                  Total
                </TableCell>
                {benchmarkLevels.map((level) => {
                  const colTotal = benchmarkLevels.reduce(
                    (sum, fromLevel) => sum + getCount(fromLevel, level),
                    0
                  );
                  return (
                    <TableCell key={level} className="text-center font-medium bg-muted/50">
                      {colTotal}
                    </TableCell>
                  );
                })}
                <TableCell className="text-center font-bold border-l bg-muted/50">
                  {data.summary.total}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <div className="text-xs text-muted-foreground mb-1">Improved</div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {data.summary.improved.count}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">
              {data.summary.improved.percentage}%
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Same Level</div>
            <div className="text-2xl font-bold">
              {data.summary.same.count}
            </div>
            <div className="text-xs text-muted-foreground">
              {data.summary.same.percentage}%
            </div>
          </div>

          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <div className="text-xs text-muted-foreground mb-1">Declined</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {data.summary.declined.count}
            </div>
            <div className="text-xs text-red-600 dark:text-red-400">
              {data.summary.declined.percentage}%
            </div>
          </div>
        </div>

        {/* Footer Explanation */}
        <div className="p-2 bg-muted/50 rounded-md text-xs text-muted-foreground space-y-1">
          <p>
            <strong>Reading the Matrix:</strong> Each cell shows the number of students who
            transitioned from one benchmark level (row) to another (column).
          </p>
          <p>
            <strong>Benchmark Levels:</strong> E1 (Advanced), E2 (Intermediate), E3 (Developing).
            Only students with valid MAP Average scores in both terms are included.
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}
