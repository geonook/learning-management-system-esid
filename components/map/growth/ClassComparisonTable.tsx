"use client";

/**
 * Class Growth Comparison Table
 *
 * 比較同年級不同班級的成長表現
 * 可排序表格，顯示平均成長、成長指數、學生數
 */

import { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Users, Info, ChevronDown, ChevronUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ClassComparisonData } from "@/lib/api/map-growth-analytics";
import { getGrowthQuintileColor } from "@/lib/map/colors";

interface ClassComparisonTableProps {
  data: ClassComparisonData | null;
  loading?: boolean;
}

type SortKey = "className" | "avgGrowth" | "growthIndex" | "studentCount" | "vsNorm";
type SortDirection = "asc" | "desc";

export function ClassComparisonTable({ data, loading }: ClassComparisonTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("growthIndex");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showDistribution, setShowDistribution] = useState(false);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-5 bg-muted rounded w-48" />
        </CardHeader>
        <CardContent>
          <div className="h-[200px] bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.classes.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground">
          <div className="text-center">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No class comparison data available</p>
            <p className="text-xs mt-1">Classes may not be assigned to students</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 排序
  const sortedClasses = [...data.classes].sort((a, b) => {
    const aValue = a[sortKey];
    const bValue = b[sortKey];

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === "asc"
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1" />
    );
  };

  const formatGrowthIndex = (value: number) => {
    const color = getGrowthQuintileColor(value);
    return (
      <span style={{ color }} className="font-medium">
        {value.toFixed(2)}
      </span>
    );
  };

  const formatVsNorm = (value: number) => {
    const isPositive = value >= 0;
    return (
      <span className={isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
        {isPositive ? "+" : ""}{value.toFixed(1)}
      </span>
    );
  };

  // 計算分佈百分比
  const getDistributionPercent = (dist: ClassComparisonData["classes"][0]["distribution"], key: keyof typeof dist, total: number) => {
    return total > 0 ? Math.round((dist[key] / total) * 100) : 0;
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base">G{data.grade} Class Comparison</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px]">
                  <p className="text-xs mb-2">
                    Compare growth across different classes in G{data.grade}.
                  </p>
                  <ul className="text-xs space-y-1">
                    <li><strong>Avg Growth:</strong> Average RIT point increase</li>
                    <li><strong>Growth Index:</strong> Actual / Expected (1.0 = target)</li>
                    <li><strong>vs Norm:</strong> Difference from expected growth</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDistribution(!showDistribution)}
              className="text-xs"
            >
              {showDistribution ? "Hide" : "Show"} Distribution
              {showDistribution ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
            </Button>
          </div>
          <CardDescription>
            {data.course} | {data.fromTerm.split(' ')[0]} → {data.toTerm.split(' ')[0]}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("className")}
                  >
                    <div className="flex items-center">
                      Class
                      <SortIcon columnKey="className" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 text-right"
                    onClick={() => handleSort("studentCount")}
                  >
                    <div className="flex items-center justify-end">
                      Students
                      <SortIcon columnKey="studentCount" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 text-right"
                    onClick={() => handleSort("avgGrowth")}
                  >
                    <div className="flex items-center justify-end">
                      Avg Growth
                      <SortIcon columnKey="avgGrowth" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 text-right"
                    onClick={() => handleSort("growthIndex")}
                  >
                    <div className="flex items-center justify-end">
                      Growth Index
                      <SortIcon columnKey="growthIndex" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 text-right"
                    onClick={() => handleSort("vsNorm")}
                  >
                    <div className="flex items-center justify-end">
                      vs Expected
                      <SortIcon columnKey="vsNorm" />
                    </div>
                  </TableHead>
                  {showDistribution && (
                    <TableHead className="text-center min-w-[160px]">
                      Distribution
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedClasses.map((classData, index) => (
                  <TableRow key={classData.classId}>
                    <TableCell className="font-medium">
                      {classData.className}
                      {index === 0 && sortKey === "growthIndex" && sortDirection === "desc" && (
                        <span className="ml-1 text-xs text-green-600">🏆</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {classData.studentCount}
                    </TableCell>
                    <TableCell className="text-right">
                      +{classData.avgGrowth.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatGrowthIndex(classData.growthIndex)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatVsNorm(classData.vsNorm)}
                    </TableCell>
                    {showDistribution && (
                      <TableCell>
                        <div className="flex items-center gap-1 min-w-[140px]">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex-1 flex h-4 rounded overflow-hidden">
                                <div
                                  className="bg-red-500"
                                  style={{ width: `${getDistributionPercent(classData.distribution, "negative", classData.studentCount)}%` }}
                                />
                                <div
                                  className="bg-yellow-500"
                                  style={{ width: `${getDistributionPercent(classData.distribution, "low", classData.studentCount)}%` }}
                                />
                                <div
                                  className="bg-blue-500"
                                  style={{ width: `${getDistributionPercent(classData.distribution, "average", classData.studentCount)}%` }}
                                />
                                <div
                                  className="bg-green-500"
                                  style={{ width: `${getDistributionPercent(classData.distribution, "high", classData.studentCount)}%` }}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-1">
                                <p className="text-red-400">Negative (&lt;0): {classData.distribution.negative}</p>
                                <p className="text-yellow-400">Low (0-5): {classData.distribution.low}</p>
                                <p className="text-blue-400">Avg (5-10): {classData.distribution.average}</p>
                                <p className="text-green-400">High (10+): {classData.distribution.high}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}

                {/* Grade Average Row */}
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell>G{data.grade} Average</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {data.gradeAverage.studentCount}
                  </TableCell>
                  <TableCell className="text-right">
                    +{data.gradeAverage.avgGrowth.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatGrowthIndex(data.gradeAverage.growthIndex)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    -
                  </TableCell>
                  {showDistribution && <TableCell />}
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Legend */}
          {showDistribution && (
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
              <span>Distribution:</span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-500" /> Negative
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-yellow-500" /> Low (0-5)
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-blue-500" /> Avg (5-10)
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-500" /> High (10+)
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
