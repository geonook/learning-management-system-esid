"use client";

/**
 * School Tab Component
 *
 * 全校 MAP 表現總覽
 * 分為兩大區塊：
 * 1. Achievement Analysis (成就分析) - 單一時間點的表現
 * 2. Growth Analysis (成長分析) - 兩個時間點之間的進步
 *
 * 設計目標：讓沒有 MAP 背景知識的使用者也能理解
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { RefreshCw, Info, TrendingUp, BarChart3, HelpCircle } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  // State - Progressive loading
  const [termsLoading, setTermsLoading] = useState(true);
  const [achievementLoading, setAchievementLoading] = useState(true);
  const [growthLoading, setGrowthLoading] = useState(true);
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

  // 使用 ref 追蹤初始化狀態，避免依賴 state 導致無限迴圈
  const isInitializedRef = useRef(false);
  const selectedTermRef = useRef(selectedTerm);
  const selectedGrowthPeriodRef = useRef(selectedGrowthPeriod);

  // 同步 ref
  useEffect(() => { selectedTermRef.current = selectedTerm; }, [selectedTerm]);
  useEffect(() => { selectedGrowthPeriodRef.current = selectedGrowthPeriod; }, [selectedGrowthPeriod]);

  // 載入資料 - Progressive loading (Achievement first, then Growth)
  // 注意：不依賴 selectedTerm/selectedGrowthPeriod，使用 ref 讀取避免無限迴圈
  const loadData = useCallback(async () => {
    setTermsLoading(true);
    setAchievementLoading(true);
    setGrowthLoading(true);
    setError(null);

    try {
      // ========================================
      // Phase 1: 載入 terms（控制元件需要）
      // ========================================
      const [termsResult, growthPeriodsResult] = await Promise.all([
        getAvailableSchoolTerms(),
        getAvailableGrowthPeriods(),
      ]);

      setAvailableTerms(termsResult);
      setAvailableGrowthPeriods(growthPeriodsResult);
      setTermsLoading(false);

      // 設定預設 growth period（如果尚未選擇）
      // 使用 ref 讀取當前值，避免觸發依賴變化
      let currentGrowthPeriod = selectedGrowthPeriodRef.current;
      if (!currentGrowthPeriod && growthPeriodsResult.length > 0) {
        const firstPeriod = growthPeriodsResult[0];
        if (firstPeriod) {
          currentGrowthPeriod = `${firstPeriod.fromTerm}→${firstPeriod.toTerm}`;
          setSelectedGrowthPeriod(currentGrowthPeriod);
        }
      }

      // ========================================
      // Phase 2: 載入 Achievement（優先顯示）
      // ========================================
      const termForQuery = selectedTermRef.current;
      const [statsResult, heatmapResult] = await Promise.all([
        getCrossGradeStats({ termTested: termForQuery }),
        getRitGradeHeatmapData({ termTested: termForQuery }),
      ]);

      setData(statsResult);
      setHeatmapData(heatmapResult);

      // 設定預設選擇的 term（僅在初始化時）
      if (!termForQuery && statsResult?.termTested) {
        setSelectedTerm(statsResult.termTested);
      }

      setAchievementLoading(false); // ← Achievement 完成，立即顯示

      // ========================================
      // Phase 3: 載入 Growth（延後載入）
      // ========================================
      const { fromTerm, toTerm } = parseGrowthPeriod(currentGrowthPeriod);
      console.log('[SchoolTab] Loading Growth data:', { currentGrowthPeriod, fromTerm, toTerm });
      const [growthResult, scatterResult] = await Promise.all([
        getSchoolGrowthDistribution({ fromTerm, toTerm }),
        getRitGrowthScatterData({ fromTerm, toTerm }),
      ]);
      console.log('[SchoolTab] Growth data loaded:', {
        growthResult: growthResult ? { totalStudents: growthResult.totalStudents } : null,
        scatterResult: scatterResult ? { totalStudents: scatterResult.totalStudents } : null
      });

      setGrowthData(growthResult);
      setScatterData(scatterResult);
      setGrowthLoading(false); // ← Growth 完成

      isInitializedRef.current = true;

    } catch (err) {
      console.error("Error loading school data:", err);
      setError("Failed to load data");
      setTermsLoading(false);
      setAchievementLoading(false);
      setGrowthLoading(false);
    }
  }, []); // 空依賴，永不重建

  // 初始載入（僅執行一次）
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 監聽 term 變化，重新載入資料（用戶手動變更時）
  useEffect(() => {
    if (!isInitializedRef.current) return; // 跳過初始化階段
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTerm, selectedGrowthPeriod]);

  // 處理 term 變更 - 智慧連動 Growth Period
  const handleTermChange = (term: string) => {
    setSelectedTerm(term);

    // 智慧連動：當選擇 Term 時，自動設定對應的 Growth Period
    // 找到以該 term 為 toTerm 的 growth period
    const matchingPeriod = availableGrowthPeriods.find(
      (p) => p.toTerm === term
    );
    if (matchingPeriod) {
      setSelectedGrowthPeriod(
        `${matchingPeriod.fromTerm}→${matchingPeriod.toTerm}`
      );
    }
  };

  // 解析當前的 growth period 用於顯示
  const currentGrowthPeriodInfo = useMemo(() => {
    const { fromTerm, toTerm } = parseGrowthPeriod(selectedGrowthPeriod);
    return { fromTerm, toTerm };
  }, [selectedGrowthPeriod]);

  // 過濾資料（依選擇的 course）
  const filteredData: CrossGradeStats[] =
    data?.grades.filter((g) => g.course === selectedCourse) ?? [];

  // Initial loading skeleton - only show if terms are not loaded yet
  if (termsLoading) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600 animate-pulse" />
              <Skeleton className="h-5 w-40" />
            </div>
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[350px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600 animate-pulse" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-4 w-56 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
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
              {/* Loading indicator */}
              {(achievementLoading || growthLoading) && (
                <span className="ml-2 inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span className="text-xs">
                    {achievementLoading ? "Loading achievement..." : "Loading growth..."}
                  </span>
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Glossary Tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm">
                  <HelpCircle className="w-4 h-4 mr-1" />
                  Glossary
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm p-4" side="bottom">
                <div className="space-y-2 text-xs">
                  <p className="font-semibold text-sm mb-2">Common Terms</p>
                  <div>
                    <span className="font-medium">RIT Score:</span>{" "}
                    MAP test scale (150-260), higher = better
                  </div>
                  <div>
                    <span className="font-medium">NWEA Norm:</span>{" "}
                    U.S. national average for same grade/term
                  </div>
                  <div>
                    <span className="font-medium">Achievement:</span>{" "}
                    Performance at one point in time
                  </div>
                  <div>
                    <span className="font-medium">Growth:</span>{" "}
                    Improvement between two test dates
                  </div>
                  <div>
                    <span className="font-medium">E1/E2/E3:</span>{" "}
                    E1=Exceeds, E2=Meets, E3=Below expectations
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Term Selector - controls both Achievement and Growth */}
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Select a test term. Achievement charts show this term&apos;s results.
                  Growth charts automatically compare with the previous year.
                </p>
              </TooltipContent>
            </Tooltip>
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

        {/* ============================================ */}
        {/* SECTION 1: Achievement Analysis */}
        {/* ============================================ */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className={`w-5 h-5 text-blue-600 ${achievementLoading ? "animate-pulse" : ""}`} />
              <CardTitle className="text-base">Achievement Analysis</CardTitle>
            </div>
            <CardDescription>
              {achievementLoading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  Loading achievement data...
                </span>
              ) : (
                <>
                  How did students perform on the MAP test in{" "}
                  <span className="font-medium text-foreground">{selectedTerm || "this term"}</span>?
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {achievementLoading ? (
              /* Achievement Loading Skeleton */
              <div className="space-y-6">
                <div className="rounded-lg border bg-card/50 p-4">
                  <Skeleton className="h-5 w-48 mb-4" />
                  <Skeleton className="h-[350px] w-full" />
                </div>
                <div className="rounded-lg border bg-card/50 p-4">
                  <Skeleton className="h-5 w-40 mb-4" />
                  <Skeleton className="h-[150px] w-full" />
                </div>
              </div>
            ) : (
              <>
                {/* Cross-Grade Chart */}
                <div className="rounded-lg border bg-card/50 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-sm font-medium">Cross-Grade Performance</h3>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          Compares KCIS student average RIT with U.S. national norms.
                          Error bars show ±1 standard deviation (68% of students fall within this range).
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <CrossGradeChart data={filteredData} />
                </div>

                {/* Summary Table */}
                <div className="rounded-lg border bg-card/50 p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-sm font-medium">Summary Statistics</h3>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          Key metrics for each grade.{" "}
                          <span className="text-green-600">Green</span> = above national norm,{" "}
                          <span className="text-red-600">Red</span> = below.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <SchoolSummaryTable data={filteredData} />
                </div>

                {/* RIT-Grade Heatmap */}
                {heatmapData && (
                  <div className="rounded-lg border bg-card/50 p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-sm font-medium">RIT Distribution Heatmap</h3>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">
                            Shows how students are distributed across RIT ranges.
                            Darker colors = more students in that range.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <RitGradeHeatmap data={heatmapData} />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ============================================ */}
        {/* SECTION 2: Growth Analysis */}
        {/* ============================================ */}
        {(growthLoading || growthData || scatterData) && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className={`w-5 h-5 text-green-600 ${growthLoading ? "animate-pulse" : ""}`} />
                <CardTitle className="text-base">Growth Analysis</CardTitle>
              </div>
              <CardDescription>
                {growthLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Analyzing student growth between terms...
                  </span>
                ) : (
                  <>
                    How much did students grow from{" "}
                    <span className="font-medium text-foreground">
                      {currentGrowthPeriodInfo.fromTerm || "previous term"}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium text-foreground">
                      {currentGrowthPeriodInfo.toTerm || "current term"}
                    </span>?
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 ml-1 inline text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          Growth analysis requires students to have taken tests in BOTH terms.
                          Students missing either test are not included.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {growthLoading ? (
                /* Growth Loading Skeleton with hint */
                <div className="space-y-6">
                  <div className="rounded-lg border bg-card/50 p-4">
                    <Skeleton className="h-5 w-40 mb-4" />
                    <Skeleton className="h-[300px] w-full" />
                    <p className="text-xs text-muted-foreground text-center mt-4">
                      Comparing student scores across test periods...
                    </p>
                  </div>
                  <div className="rounded-lg border bg-card/50 p-4">
                    <Skeleton className="h-5 w-48 mb-4" />
                    <Skeleton className="h-[350px] w-full" />
                  </div>
                </div>
              ) : (
                <>
                  {/* Growth Distribution */}
                  {growthData && (
                    <div className="rounded-lg border bg-card/50 p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-sm font-medium">Growth Distribution</h3>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">
                              Shows how much RIT growth each student achieved.
                              <span className="text-red-600"> Red bars</span> = students who went backward
                              (may need extra support).
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <GrowthDistributionChart data={growthData} />
                    </div>
                  )}

                  {/* RIT-Growth Scatter Chart */}
                  {scatterData && (
                    <div className="rounded-lg border bg-card/50 p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-sm font-medium">Starting RIT vs Growth</h3>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="text-xs space-y-2">
                              <p>
                                Shows relationship between where students started and how much they grew.
                              </p>
                              <p className="text-blue-600">
                                <strong>Why negative correlation?</strong> This is normal!
                                Students who start high have less room to grow (ceiling effect).
                                It&apos;s a statistical pattern, not a teaching problem.
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <RitGrowthScatterChart data={scatterData} />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
