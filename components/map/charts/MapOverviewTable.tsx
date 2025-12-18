"use client";

/**
 * MAP Overview Table
 *
 * 詳細數據表格，支援多學期
 * 顯示每個 English Level 的 Language Usage, Reading, Average
 * 條件格式: 高於常模淺綠, 低於常模淺紅
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
import type { OverviewTableRow, NormComparison } from "@/lib/api/map-analytics";
import { getNorm, getNormAverage, parseTermTested, type Course } from "@/lib/map/norms";

interface MapOverviewTableProps {
  data: OverviewTableRow[];
  normComparison: NormComparison[];
  grade: number;
}

export function MapOverviewTable({
  data,
  normComparison,
  grade,
}: MapOverviewTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No data available
      </div>
    );
  }

  // 取得所有 terms
  const terms = data[0]?.termData.map((t) => t.termTested) || [];

  // 格式化學期標籤
  const formatTermLabel = (term: string): string => {
    const match = term.match(/^(Fall|Spring)\s+(\d{4})-(\d{4})$/);
    if (!match) return term;
    return `${match[1] === "Fall" ? "F" : "S"} ${match[2]?.slice(2)}-${match[3]?.slice(2)}`;
  };

  // 取得常模值
  const getNormValue = (
    term: string,
    course: "Language Usage" | "Reading" | "Average"
  ): number | null => {
    const parsed = parseTermTested(term);
    if (!parsed) return null;

    if (course === "Average") {
      return getNormAverage(parsed.academicYear, grade, parsed.term);
    }
    return getNorm(parsed.academicYear, grade, parsed.term, course);
  };

  // 取得分數樣式 (與常模比較)
  const getScoreStyle = (
    score: number | null,
    term: string,
    course: "Language Usage" | "Reading" | "Average"
  ): string => {
    if (score === null) return "";

    const norm = getNormValue(term, course);
    if (norm === null) return "";

    if (score >= norm) {
      return "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400";
    }
    return "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400";
  };

  // 格式化分數
  const formatScore = (score: number | null): string => {
    if (score === null) return "-";
    return score.toFixed(1);
  };

  return (
    <TooltipProvider>
      <div className="w-full space-y-3">
        {/* Header with Info */}
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">G{grade} MAP Overview</h4>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[320px]">
              <div className="text-xs space-y-1">
                <p><strong>Table Guide:</strong></p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li><strong>Level</strong>: Student English proficiency group (E1/E2/E3/All)</li>
                  <li><strong>LU</strong>: Language Usage average RIT score</li>
                  <li><strong>R</strong>: Reading average RIT score</li>
                  <li><strong>Avg</strong>: Two-subject average (LU + R) ÷ 2</li>
                  <li><strong>Norm</strong>: NWEA national norm (reference baseline)</li>
                </ul>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Color Legend */}
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">Legend:</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-green-100 dark:bg-green-950/50 border border-green-300 dark:border-green-800" />
            <span className="text-green-700 dark:text-green-400">≥ Norm (At/Above)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800" />
            <span className="text-red-700 dark:text-red-400">&lt; Norm (Below)</span>
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
        <TableHeader>
          <TableRow>
            <TableHead rowSpan={2} className="border-r w-20 align-bottom">
              Level
            </TableHead>
            {terms.map((term, idx) => (
              <TableHead
                key={term}
                colSpan={3}
                className={cn(
                  "text-center",
                  idx < terms.length - 1 && "border-r"
                )}
              >
                {formatTermLabel(term)}
              </TableHead>
            ))}
          </TableRow>
          <TableRow>
            {terms.flatMap((term, termIdx) => [
              <TableHead key={`${term}-lu`} className="text-center text-xs px-2 py-1 w-14">
                LU
              </TableHead>,
              <TableHead key={`${term}-r`} className="text-center text-xs px-2 py-1 w-14">
                R
              </TableHead>,
              <TableHead
                key={`${term}-avg`}
                className={cn(
                  "text-center text-xs px-2 py-1 w-14",
                  termIdx < terms.length - 1 && "border-r"
                )}
              >
                Avg
              </TableHead>,
            ])}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.englishLevel}>
              <TableCell className="font-medium border-r">
                {row.englishLevel === "All"
                  ? `All G${grade}`
                  : `G${grade}${row.englishLevel}`}
              </TableCell>
              {row.termData.flatMap((termData, termIdx) => [
                <TableCell
                  key={`${termData.termTested}-lu`}
                  className={cn(
                    "text-center text-sm px-2 py-2",
                    getScoreStyle(termData.languageUsage, termData.termTested, "Language Usage")
                  )}
                >
                  {formatScore(termData.languageUsage)}
                </TableCell>,
                <TableCell
                  key={`${termData.termTested}-r`}
                  className={cn(
                    "text-center text-sm px-2 py-2",
                    getScoreStyle(termData.reading, termData.termTested, "Reading")
                  )}
                >
                  {formatScore(termData.reading)}
                </TableCell>,
                <TableCell
                  key={`${termData.termTested}-avg`}
                  className={cn(
                    "text-center text-sm px-2 py-2 font-medium",
                    termIdx < row.termData.length - 1 && "border-r",
                    getScoreStyle(termData.average, termData.termTested, "Average")
                  )}
                >
                  {formatScore(termData.average)}
                </TableCell>,
              ])}
            </TableRow>
          ))}

          {/* Norm Row */}
          <TableRow className="bg-muted/50">
            <TableCell className="font-medium border-r text-muted-foreground">
              Norm
            </TableCell>
            {terms.flatMap((term, termIdx) => {
              const luNorm = getNormValue(term, "Language Usage");
              const rNorm = getNormValue(term, "Reading");
              const avgNorm = getNormValue(term, "Average");

              return [
                <TableCell
                  key={`norm-${term}-lu`}
                  className="text-center text-sm px-2 py-2 text-muted-foreground"
                >
                  {luNorm !== null ? luNorm : "-"}
                </TableCell>,
                <TableCell
                  key={`norm-${term}-r`}
                  className="text-center text-sm px-2 py-2 text-muted-foreground"
                >
                  {rNorm !== null ? rNorm : "-"}
                </TableCell>,
                <TableCell
                  key={`norm-${term}-avg`}
                  className={cn(
                    "text-center text-sm px-2 py-2 text-muted-foreground",
                    termIdx < terms.length - 1 && "border-r"
                  )}
                >
                  {avgNorm !== null ? avgNorm.toFixed(1) : "-"}
                </TableCell>,
              ];
            })}
          </TableRow>
        </TableBody>
      </Table>
        </div>

        {/* Footer Explanation */}
        <div className="p-2 bg-muted/50 rounded-md text-xs text-muted-foreground space-y-1">
          <p>
            <strong>Term Codes:</strong>{" "}
            F = Fall, S = Spring. e.g. &quot;F 24-25&quot; = Fall 2024-2025.
          </p>
          <p>
            <strong>RIT Score:</strong>{" "}
            NWEA MAP Growth standardized score for tracking student learning growth.
            Spring scores should typically be higher than Fall (indicating growth within the academic year).
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}
