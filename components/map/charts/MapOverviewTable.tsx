"use client";

/**
 * MAP Overview Table
 *
 * 詳細數據表格，支援多學期
 * 顯示每個 English Level 的 Language Usage, Reading, Average
 * 條件格式: 高於常模淺綠, 低於常模淺紅
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead rowSpan={2} className="border-r w-20">
              Level
            </TableHead>
            {terms.map((term) => (
              <TableHead
                key={term}
                colSpan={3}
                className="text-center border-r last:border-r-0"
              >
                {formatTermLabel(term)}
              </TableHead>
            ))}
          </TableRow>
          <TableRow>
            {terms.map((term) => (
              <TableHead key={`${term}-sub`} className="text-center p-0">
                <div className="flex">
                  <span className="flex-1 px-2 py-1 text-xs border-r">LU</span>
                  <span className="flex-1 px-2 py-1 text-xs border-r">R</span>
                  <span className="flex-1 px-2 py-1 text-xs">Avg</span>
                </div>
              </TableHead>
            ))}
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
              {row.termData.map((termData) => (
                <TableCell key={termData.termTested} className="p-0 border-r last:border-r-0">
                  <div className="flex">
                    <span
                      className={cn(
                        "flex-1 px-2 py-2 text-center text-sm border-r",
                        getScoreStyle(
                          termData.languageUsage,
                          termData.termTested,
                          "Language Usage"
                        )
                      )}
                    >
                      {formatScore(termData.languageUsage)}
                    </span>
                    <span
                      className={cn(
                        "flex-1 px-2 py-2 text-center text-sm border-r",
                        getScoreStyle(termData.reading, termData.termTested, "Reading")
                      )}
                    >
                      {formatScore(termData.reading)}
                    </span>
                    <span
                      className={cn(
                        "flex-1 px-2 py-2 text-center text-sm font-medium",
                        getScoreStyle(termData.average, termData.termTested, "Average")
                      )}
                    >
                      {formatScore(termData.average)}
                    </span>
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}

          {/* Norm Row */}
          <TableRow className="bg-muted/50">
            <TableCell className="font-medium border-r text-muted-foreground">
              Norm
            </TableCell>
            {terms.map((term) => {
              const luNorm = getNormValue(term, "Language Usage");
              const rNorm = getNormValue(term, "Reading");
              const avgNorm = getNormValue(term, "Average");

              return (
                <TableCell key={`norm-${term}`} className="p-0 border-r last:border-r-0">
                  <div className="flex">
                    <span className="flex-1 px-2 py-2 text-center text-sm text-muted-foreground border-r">
                      {luNorm !== null ? luNorm : "-"}
                    </span>
                    <span className="flex-1 px-2 py-2 text-center text-sm text-muted-foreground border-r">
                      {rNorm !== null ? rNorm : "-"}
                    </span>
                    <span className="flex-1 px-2 py-2 text-center text-sm text-muted-foreground">
                      {avgNorm !== null ? avgNorm.toFixed(1) : "-"}
                    </span>
                  </div>
                </TableCell>
              );
            })}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
