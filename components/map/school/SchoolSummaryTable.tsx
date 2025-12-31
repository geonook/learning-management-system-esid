"use client";

/**
 * School Summary Table
 *
 * 跨年級摘要表格，顯示各年級的關鍵統計數據
 * 包含學生數、平均分、標準差、常模、與常模差異
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
import type { CrossGradeStats } from "@/lib/api/map-school-analytics";

interface SchoolSummaryTableProps {
  data: CrossGradeStats[];
}

export function SchoolSummaryTable({ data }: SchoolSummaryTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No data available
      </div>
    );
  }

  // 取得差異顯示樣式
  const getDiffStyle = (vsNorm: number | null): string => {
    if (vsNorm === null) return "";
    if (vsNorm >= 0) {
      return "text-green-600 dark:text-green-400 font-medium";
    }
    return "text-red-600 dark:text-red-400 font-medium";
  };

  // 格式化差異顯示
  const formatDiff = (vsNorm: number | null): string => {
    if (vsNorm === null) return "-";
    const sign = vsNorm >= 0 ? "+" : "";
    return `${sign}${vsNorm.toFixed(1)}`;
  };

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Grade</TableHead>
              <TableHead className="text-right w-20">Count</TableHead>
              <TableHead className="text-right w-24">Mean RIT</TableHead>
              <TableHead className="text-right w-20">Std Dev</TableHead>
              <TableHead className="text-right w-20">Norm</TableHead>
              <TableHead className="text-right w-24">vs Norm</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={`${row.grade}-${row.course}`}>
                <TableCell className="font-medium">G{row.grade}</TableCell>
                <TableCell className="text-right">{row.studentCount}</TableCell>
                <TableCell className="text-right font-mono">
                  {row.meanRit.toFixed(1)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground font-mono">
                  {row.stdDev.toFixed(1)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground font-mono">
                  {row.norm !== null ? row.norm.toFixed(1) : "-"}
                </TableCell>
                <TableCell
                  className={cn("text-right", getDiffStyle(row.vsNorm))}
                >
                  {formatDiff(row.vsNorm)}
                  {row.vsNorm !== null && row.vsNorm >= 0 && " ✓"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 表格說明 */}
      <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
        <p>
          <strong>Legend:</strong> Count = number of students, Std Dev =
          standard deviation, Norm = NWEA national norm, vs Norm = difference
          from norm (green = above, red = below).
        </p>
      </div>
    </div>
  );
}
