"use client";

/**
 * School Tab Component
 *
 * 全校 MAP 表現總覽
 * 顯示 G3-G6 跨年級比較圖表和摘要表格
 */

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { CrossGradeChart } from "./CrossGradeChart";
import { SchoolSummaryTable } from "./SchoolSummaryTable";
import {
  getCrossGradeStats,
  getAvailableSchoolTerms,
  type SchoolOverviewData,
  type CrossGradeStats,
} from "@/lib/api/map-school-analytics";
import type { Course } from "@/lib/map/norms";

export function SchoolTab() {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SchoolOverviewData | null>(null);
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string | undefined>();
  const [selectedCourse, setSelectedCourse] = useState<Course | "Average">(
    "Average"
  );

  // 載入資料
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [termsResult, statsResult] = await Promise.all([
        getAvailableSchoolTerms(),
        getCrossGradeStats({ termTested: selectedTerm }),
      ]);

      setAvailableTerms(termsResult);
      setData(statsResult);

      // 設定預設選擇的 term
      if (!selectedTerm && statsResult?.termTested) {
        setSelectedTerm(statsResult.termTested);
      }
    } catch (err) {
      console.error("Error loading school data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [selectedTerm]);

  // 初始載入
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 處理 term 變更
  const handleTermChange = (term: string) => {
    setSelectedTerm(term);
  };

  // 過濾資料（依選擇的 course）
  const filteredData: CrossGradeStats[] =
    data?.grades.filter((g) => g.course === selectedCourse) ?? [];

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[350px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
        <p>{error}</p>
        <Button variant="outline" onClick={loadData} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">School-wide Performance</h2>
            <p className="text-sm text-muted-foreground">
              Cross-grade analysis for all G3-G6 students
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Term Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Term:</span>
            <Select value={selectedTerm} onValueChange={handleTermChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                {availableTerms.map((term) => (
                  <SelectItem key={term} value={term}>
                    {term}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Course Tabs */}
          <Tabs
            value={selectedCourse}
            onValueChange={(v) => setSelectedCourse(v as Course | "Average")}
          >
            <TabsList>
              <TabsTrigger value="Average">Average</TabsTrigger>
              <TabsTrigger value="Language Usage">Language Usage</TabsTrigger>
              <TabsTrigger value="Reading">Reading</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Cross-Grade Chart */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-medium">Cross-Grade Performance</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Compares KCISLK student performance across G3-G6 with NWEA
                  national norms. Error bars show ±1 standard deviation.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <CrossGradeChart data={filteredData} />
        </div>

        {/* Summary Table */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-medium">Summary Table</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Shows key metrics for each grade compared to NWEA national
                  norms. Green indicates above norm, red indicates below.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <SchoolSummaryTable data={filteredData} />
        </div>
      </div>
    </TooltipProvider>
  );
}
