"use client";

/**
 * School Tab Component
 *
 * 全校 MAP 表現總覽
 * 顯示 G3-G6 跨年級比較圖表、摘要表格、成長分佈
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
import { GrowthDistributionChart } from "./GrowthDistributionChart";
import { RitGrowthScatterChart } from "./RitGrowthScatterChart";
import { RitGradeHeatmap } from "./RitGradeHeatmap";
import {
  getCrossGradeStats,
  getAvailableSchoolTerms,
  getAvailableGrowthPeriods,
  getSchoolGrowthDistribution,
  getRitGrowthScatterData,
  getRitGradeHeatmapData,
  type SchoolOverviewData,
  type CrossGradeStats,
  type SchoolGrowthDistributionData,
  type RitGrowthScatterData,
  type RitGradeHeatmapData,
  type GrowthPeriodOption,
} from "@/lib/api/map-school-analytics";
import type { Course } from "@/lib/map/norms";

export function SchoolTab() {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SchoolOverviewData | null>(null);
  const [growthData, setGrowthData] =
    useState<SchoolGrowthDistributionData | null>(null);
  const [scatterData, setScatterData] = useState<RitGrowthScatterData | null>(
    null
  );
  const [heatmapData, setHeatmapData] = useState<RitGradeHeatmapData | null>(
    null
  );
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string | undefined>();
  const [selectedCourse, setSelectedCourse] = useState<Course | "Average">(
    "Average"
  );
  // Growth Period selection state
  const [availableGrowthPeriods, setAvailableGrowthPeriods] = useState<GrowthPeriodOption[]>([]);
  const [selectedGrowthPeriod, setSelectedGrowthPeriod] = useState<string | undefined>();

  // 解析選擇的 growth period
  const parseGrowthPeriod = (periodKey: string | undefined) => {
    if (!periodKey) return { fromTerm: undefined, toTerm: undefined };
    const [fromTerm, toTerm] = periodKey.split("→").map((s) => s.trim());
    return { fromTerm, toTerm };
  };

  // 載入資料
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 取得可用的 terms 和 growth periods
      const [termsResult, growthPeriodsResult] = await Promise.all([
        getAvailableSchoolTerms(),
        getAvailableGrowthPeriods(),
      ]);

      setAvailableTerms(termsResult);
      setAvailableGrowthPeriods(growthPeriodsResult);

      // 設定預設 growth period（如果尚未選擇）
      let currentGrowthPeriod = selectedGrowthPeriod;
      if (!currentGrowthPeriod && growthPeriodsResult.length > 0) {
        // 預設選擇第一個（通常是 Fall-to-Fall）
        const firstPeriod = growthPeriodsResult[0];
        if (firstPeriod) {
          currentGrowthPeriod = `${firstPeriod.fromTerm}→${firstPeriod.toTerm}`;
          setSelectedGrowthPeriod(currentGrowthPeriod);
        }
      }

      // 解析 growth period 參數
      const { fromTerm, toTerm } = parseGrowthPeriod(currentGrowthPeriod);

      // 載入圖表資料
      const [statsResult, growthResult, scatterResult, heatmapResult] =
        await Promise.all([
          getCrossGradeStats({ termTested: selectedTerm }),
          getSchoolGrowthDistribution({ fromTerm, toTerm }),
          getRitGrowthScatterData({ fromTerm, toTerm }),
          getRitGradeHeatmapData({ termTested: selectedTerm }),
        ]);

      setData(statsResult);
      setGrowthData(growthResult);
      setScatterData(scatterResult);
      setHeatmapData(heatmapResult);

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
  }, [selectedTerm, selectedGrowthPeriod]);

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
        <Skeleton className="h-[300px] w-full" />
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

          {/* Growth Period Selector */}
          {availableGrowthPeriods.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Growth Period:</span>
              <Select
                value={selectedGrowthPeriod}
                onValueChange={(v) => setSelectedGrowthPeriod(v)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select growth period" />
                </SelectTrigger>
                <SelectContent>
                  {availableGrowthPeriods.map((period) => {
                    const key = `${period.fromTerm}→${period.toTerm}`;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center justify-between gap-2">
                          <span>{period.label}</span>
                          <span className="text-xs text-muted-foreground">
                            (n={period.studentCount})
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    Growth charts require paired data from two terms. Only students
                    with assessments in both terms are included in growth analysis.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
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

        {/* RIT-Grade Heatmap */}
        {heatmapData && (
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-medium">RIT Distribution by Grade</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    2D heatmap showing RIT score distribution across grade
                    levels. Darker cells indicate more students in that range.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <RitGradeHeatmap data={heatmapData} />
          </div>
        )}

        {/* Growth Distribution */}
        {growthData && (
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-medium">Growth Distribution</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    Shows Fall-to-Fall growth distribution across all grades.
                    Red bars indicate students with negative growth who may need
                    intervention.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <GrowthDistributionChart data={growthData} />
          </div>
        )}

        {/* RIT-Growth Scatter Chart */}
        {scatterData && (
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-medium">RIT-Growth Correlation</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    Shows relationship between starting RIT and growth. Negative
                    correlation may indicate ceiling effect for high performers.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <RitGrowthScatterChart data={scatterData} />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
