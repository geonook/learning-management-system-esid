"use client";

/**
 * MAP Growth Analysis Page
 *
 * 位置: /browse/stats/map
 * Tab-based 統計分析頁面，包括：
 * - Overview: Growth Trend, Benchmark, Overview Table
 * - Growth: Growth Index, Distribution
 * - Goals: Goal Radar, Goal Table
 * - Lexile: Lexile Distribution, Stats
 * - Quality: Test Quality Monitoring
 * - Transitions: Benchmark Transition Matrix
 */

import { useState, useEffect, useCallback } from "react";
import {
  Target,
  RefreshCw,
  LayoutDashboard,
  TrendingUp,
  BookOpen,
  Shield,
  ArrowLeftRight,
  LayoutGrid,
  Square,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapGrowthLineChart,
  MapBenchmarkDonutChart,
  MapOverviewTable,
  MapGrowthIndexChart,
  MapGrowthDistribution,
  MapGoalRadar,
  MapGoalTable,
  MapLexileDistribution,
  MapLexileStats,
  MapTestQualityPie,
  MapBenchmarkTransition,
  MapConsecutiveGrowth,
} from "@/components/map/charts";
import {
  getMapAnalyticsData,
  getGrowthAnalysis,
  getGoalPerformance,
  getLexileAnalysis,
  getTestQualityReport,
  getBenchmarkTransition,
  getConsecutiveGrowthAnalysis,
  type MapAnalyticsData,
  type GrowthAnalysisData,
  type GrowthType,
  type GoalPerformanceData,
  type LexileAnalysisData,
  type TestQualityData,
  type BenchmarkTransitionData,
  type ConsecutiveGrowthAnalysisData,
} from "@/lib/api/map-analytics";
import { isBenchmarkSupported } from "@/lib/map/benchmarks";
import { formatTermStats } from "@/lib/map/utils";

const SUPPORTED_GRADES = [3, 4, 5, 6];

// Analysis Tabs 定義
const ANALYSIS_TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "growth", label: "Growth", icon: TrendingUp },
  { id: "goals", label: "Goals", icon: Target },
  { id: "lexile", label: "Lexile", icon: BookOpen },
  { id: "quality", label: "Quality", icon: Shield },
  { id: "transitions", label: "Transitions", icon: ArrowLeftRight },
];

// Chart view mode for Overview tab
type ChartViewMode = "grid" | "single";

// Transition period options
type TransitionPeriod = "fall-to-spring" | "spring-to-fall";

const TRANSITION_PERIODS = [
  {
    id: "fall-to-spring" as TransitionPeriod,
    label: "Fall → Spring 2024-25",
    fromTerm: "Fall 2024-2025",
    toTerm: "Spring 2024-2025",
    description: "Within-year benchmark changes",
  },
  {
    id: "spring-to-fall" as TransitionPeriod,
    label: "Spring 24-25 → Fall 25-26",
    fromTerm: "Spring 2024-2025",
    toTerm: "Fall 2025-2026",
    description: "Cross-year benchmark changes (after grade promotion)",
  },
];

export default function MapAnalysisPage() {
  // Grade selection
  const [selectedGrade, setSelectedGrade] = useState(5);
  // Analysis tab selection
  const [selectedTab, setSelectedTab] = useState("overview");
  // Growth type selection (extended to include "consecutive")
  type ExtendedGrowthType = GrowthType | "consecutive";
  const [growthType, setGrowthType] = useState<ExtendedGrowthType>("within-year");
  // Transition period selection
  const [transitionPeriod, setTransitionPeriod] = useState<TransitionPeriod>("fall-to-spring");
  // Chart view mode for Overview tab
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>("grid");
  // Selected course for single view mode
  const [selectedChartCourse, setSelectedChartCourse] = useState<string>("Language Usage");

  // Data states
  const [overviewData, setOverviewData] = useState<MapAnalyticsData | null>(null);
  // Growth data per grade and type: key = `${grade}-${type}`
  const [growthDataCache, setGrowthDataCache] = useState<Record<string, GrowthAnalysisData | null>>({});
  // Consecutive growth data per grade
  const [consecutiveGrowthCache, setConsecutiveGrowthCache] = useState<Record<number, ConsecutiveGrowthAnalysisData | null>>({});
  // Derived growthData for current selection
  const growthData = growthType !== "consecutive" ? growthDataCache[`${selectedGrade}-${growthType}`] ?? null : null;
  const consecutiveGrowthData = consecutiveGrowthCache[selectedGrade] ?? null;
  const [goalData, setGoalData] = useState<{
    reading: GoalPerformanceData | null;
    languageUsage: GoalPerformanceData | null;
  }>({ reading: null, languageUsage: null });
  const [lexileData, setLexileData] = useState<LexileAnalysisData | null>(null);
  const [qualityData, setQualityData] = useState<TestQualityData | null>(null);
  const [transitionData, setTransitionData] = useState<BenchmarkTransitionData | null>(null);

  // Loading states per tab
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({
    overview: false,
    growth: false,
    goals: false,
    lexile: false,
    quality: false,
    transitions: false,
  });

  // Error states per tab
  const [errorStates, setErrorStates] = useState<Record<string, string | null>>({
    overview: null,
    growth: null,
    goals: null,
    lexile: null,
    quality: null,
    transitions: null,
  });

  // Track which tabs have been loaded
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());

  // Helper to set loading state
  const setLoading = (tab: string, loading: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [tab]: loading }));
  };

  // Helper to set error state
  const setError = (tab: string, error: string | null) => {
    setErrorStates((prev) => ({ ...prev, [tab]: error }));
  };

  // Fetch Overview Data
  const fetchOverviewData = useCallback(async (grade: number) => {
    setLoading("overview", true);
    setError("overview", null);
    try {
      const result = await getMapAnalyticsData({ grade });
      setOverviewData(result);
    } catch (err) {
      console.error("Error fetching overview data:", err);
      setError("overview", "Failed to load overview data");
    } finally {
      setLoading("overview", false);
    }
  }, []);

  // Fetch Growth Data (within-year or year-over-year)
  const fetchGrowthData = useCallback(async (grade: number, type: GrowthType) => {
    setLoading("growth", true);
    setError("growth", null);
    try {
      let result: GrowthAnalysisData | null;

      if (type === "within-year") {
        // Within-year growth: Fall 2024-2025 → Spring 2024-2025
        result = await getGrowthAnalysis({
          grade,
          growthType: "within-year",
          academicYear: "2024-2025",
        });
      } else {
        // Year-over-year growth: Fall 2024-2025 → Fall 2025-2026
        result = await getGrowthAnalysis({
          grade,
          growthType: "year-over-year",
          fromTerm: "Fall 2024-2025",
          toTerm: "Fall 2025-2026",
        });
      }

      // Store in cache by grade and type
      const cacheKey = `${grade}-${type}`;
      setGrowthDataCache(prev => ({ ...prev, [cacheKey]: result }));
    } catch (err) {
      console.error("Error fetching growth data:", err);
      setError("growth", "Failed to load growth data");
    } finally {
      setLoading("growth", false);
    }
  }, []);

  // Fetch Consecutive Growth Data (all consecutive term pairs)
  const fetchConsecutiveGrowthData = useCallback(async (grade: number) => {
    setLoading("growth", true);
    setError("growth", null);
    try {
      const result = await getConsecutiveGrowthAnalysis({ grade });
      setConsecutiveGrowthCache(prev => ({ ...prev, [grade]: result }));
    } catch (err) {
      console.error("Error fetching consecutive growth data:", err);
      setError("growth", "Failed to load consecutive growth data");
    } finally {
      setLoading("growth", false);
    }
  }, []);

  // Fetch Goal Data (both courses)
  const fetchGoalData = useCallback(async (grade: number) => {
    setLoading("goals", true);
    setError("goals", null);
    try {
      // Use the most recent term
      const termTested = "Fall 2025-2026";
      const [reading, languageUsage] = await Promise.all([
        getGoalPerformance({ grade, course: "Reading", termTested }),
        getGoalPerformance({ grade, course: "Language Usage", termTested }),
      ]);
      setGoalData({ reading, languageUsage });
    } catch (err) {
      console.error("Error fetching goal data:", err);
      setError("goals", "Failed to load goal data");
    } finally {
      setLoading("goals", false);
    }
  }, []);

  // Fetch Lexile Data
  const fetchLexileData = useCallback(async (grade: number) => {
    setLoading("lexile", true);
    setError("lexile", null);
    try {
      // Use the most recent term
      const result = await getLexileAnalysis({ grade, termTested: "Fall 2025-2026" });
      setLexileData(result);
    } catch (err) {
      console.error("Error fetching lexile data:", err);
      setError("lexile", "Failed to load lexile data");
    } finally {
      setLoading("lexile", false);
    }
  }, []);

  // Fetch Quality Data
  const fetchQualityData = useCallback(async (grade: number) => {
    setLoading("quality", true);
    setError("quality", null);
    try {
      // Use the most recent term and filter by grade
      const result = await getTestQualityReport({
        termTested: "Fall 2025-2026",
        grade,
      });
      setQualityData(result);
    } catch (err) {
      console.error("Error fetching quality data:", err);
      setError("quality", "Failed to load quality data");
    } finally {
      setLoading("quality", false);
    }
  }, []);

  // Fetch Transition Data
  const fetchTransitionData = useCallback(async (grade: number, period: TransitionPeriod) => {
    setLoading("transitions", true);
    setError("transitions", null);
    try {
      const periodConfig = TRANSITION_PERIODS.find((p) => p.id === period);
      if (!periodConfig) {
        setError("transitions", "Invalid transition period");
        return;
      }

      // 跨學年時，fromGrade 需要減 1（學生升級後）
      const isCrossYear = period === "spring-to-fall";
      const fromGrade = isCrossYear ? grade - 1 : grade;
      const toGrade = grade;

      // G3 跨學年無法計算（因為 G2 沒有 Benchmark）
      if (isCrossYear && fromGrade < 3) {
        setTransitionData(null);
        return;
      }

      const result = await getBenchmarkTransition({
        grade,
        fromTerm: periodConfig.fromTerm,
        toTerm: periodConfig.toTerm,
        fromGrade,
        toGrade,
      });
      setTransitionData(result);
    } catch (err) {
      console.error("Error fetching transition data:", err);
      setError("transitions", "Failed to load transition data");
    } finally {
      setLoading("transitions", false);
    }
  }, []);

  // Load data when tab changes (lazy loading)
  useEffect(() => {
    const loadTabData = async () => {
      // Skip if already loaded for this grade (and growth type for growth tab, transition period for transitions tab)
      let tabKey: string;
      if (selectedTab === "growth") {
        tabKey = `${selectedTab}-${selectedGrade}-${growthType}`;
      } else if (selectedTab === "transitions") {
        tabKey = `${selectedTab}-${selectedGrade}-${transitionPeriod}`;
      } else {
        // All other tabs (including quality) are grade-specific
        tabKey = `${selectedTab}-${selectedGrade}`;
      }
      if (loadedTabs.has(tabKey)) return;

      switch (selectedTab) {
        case "overview":
          await fetchOverviewData(selectedGrade);
          break;
        case "growth":
          if (growthType === "consecutive") {
            await fetchConsecutiveGrowthData(selectedGrade);
          } else {
            await fetchGrowthData(selectedGrade, growthType);
          }
          break;
        case "goals":
          await fetchGoalData(selectedGrade);
          break;
        case "lexile":
          await fetchLexileData(selectedGrade);
          break;
        case "quality":
          await fetchQualityData(selectedGrade);
          break;
        case "transitions":
          if (isBenchmarkSupported(selectedGrade)) {
            await fetchTransitionData(selectedGrade, transitionPeriod);
          }
          break;
      }

      setLoadedTabs((prev) => new Set(prev).add(tabKey));
    };

    loadTabData();
  }, [
    selectedTab,
    selectedGrade,
    growthType,
    transitionPeriod,
    loadedTabs,
    fetchOverviewData,
    fetchGrowthData,
    fetchConsecutiveGrowthData,
    fetchGoalData,
    fetchLexileData,
    fetchQualityData,
    fetchTransitionData,
  ]);

  // Handle growth type change - trigger reload
  const handleGrowthTypeChange = (type: ExtendedGrowthType) => {
    setGrowthType(type);
    // Reset loaded tabs to trigger reload for growth tab
    const tabKey = `growth-${selectedGrade}-${type}`;
    if (!loadedTabs.has(tabKey)) {
      // Will be loaded by the useEffect
    }
  };

  // Handle transition period change - trigger reload
  const handleTransitionPeriodChange = (period: TransitionPeriod) => {
    setTransitionPeriod(period);
    // Reset loaded tabs to trigger reload for transitions tab
    const tabKey = `transitions-${selectedGrade}-${period}`;
    if (!loadedTabs.has(tabKey)) {
      // Will be loaded by the useEffect
    }
  };

  // Reset loaded tabs when grade changes
  const handleGradeChange = (value: string) => {
    setSelectedGrade(parseInt(value, 10));
    setLoadedTabs(new Set()); // Reset loaded tabs to trigger reload
  };

  // Refresh current tab
  const handleRefresh = () => {
    const tabKey = `${selectedTab}-${selectedGrade}`;
    setLoadedTabs((prev) => {
      const next = new Set(prev);
      next.delete(tabKey);
      return next;
    });
  };

  // Render loading skeleton
  const renderSkeleton = (count: number = 3) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px]" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Render error message
  const renderError = (message: string) => (
    <Card className="border-red-200 dark:border-red-800">
      <CardContent className="pt-6">
        <p className="text-red-600 dark:text-red-400">{message}</p>
      </CardContent>
    </Card>
  );

  // Render no data message
  const renderNoData = (message: string) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Target className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No data available</p>
          <p className="text-sm">{message}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">MAP Growth Analysis</h1>
            <p className="text-sm text-muted-foreground">
              G3-G6 Reading &amp; Language Usage Performance Analytics
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loadingStates[selectedTab]}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loadingStates[selectedTab] ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Grade Tabs */}
      <Tabs value={selectedGrade.toString()} onValueChange={handleGradeChange}>
        <TabsList>
          {SUPPORTED_GRADES.map((grade) => (
            <TabsTrigger key={grade} value={grade.toString()}>
              G{grade}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Analysis Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6">
          {ANALYSIS_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1.5">
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {loadingStates.overview && renderSkeleton(3)}
          {errorStates.overview && renderError(errorStates.overview)}
          {!loadingStates.overview && !errorStates.overview && overviewData && (
            <>
              {/* View Mode Toggle */}
              <div className="flex justify-end">
                <div className="flex gap-1 p-1 bg-muted rounded-lg">
                  <Button
                    variant={chartViewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setChartViewMode("grid")}
                    title="Grid view - show all charts"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={chartViewMode === "single" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setChartViewMode("single")}
                    title="Single view - one chart at a time"
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Growth Trend Charts - Grid Mode */}
              {chartViewMode === "grid" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {overviewData.chartData.map((chart) => (
                    <Card key={`${chart.grade}-${chart.course}`}>
                      <CardContent className="pt-4">
                        <MapGrowthLineChart data={chart} showNorm height={280} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Growth Trend Charts - Single Mode with Tabs */}
              {chartViewMode === "single" && (
                <Card>
                  <CardContent className="pt-4">
                    <Tabs value={selectedChartCourse} onValueChange={setSelectedChartCourse}>
                      <TabsList className="mb-4">
                        <TabsTrigger value="Language Usage">Language Usage</TabsTrigger>
                        <TabsTrigger value="Reading">Reading</TabsTrigger>
                        <TabsTrigger value="Average">Average</TabsTrigger>
                      </TabsList>
                      {overviewData.chartData
                        .filter((c) => c.course === selectedChartCourse)
                        .map((chart) => (
                          <TabsContent key={chart.course} value={chart.course} className="mt-0">
                            <MapGrowthLineChart data={chart} showNorm height={350} />
                          </TabsContent>
                        ))}
                    </Tabs>
                  </CardContent>
                </Card>
              )}

              {/* Benchmark + Overview Table */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Benchmark Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isBenchmarkSupported(selectedGrade) ? (
                      <MapBenchmarkDonutChart data={overviewData.benchmarkDistribution} />
                    ) : (
                      <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                        <p>G6 does not have benchmark classification</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Overview Table</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MapOverviewTable
                      data={overviewData.overviewTable}
                      normComparison={overviewData.normComparison}
                      grade={selectedGrade}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Data Info */}
              {overviewData.terms.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Data includes {overviewData.terms.length} term(s):{" "}
                  {overviewData.terms.map(formatTermStats).join(", ")}
                </p>
              )}
            </>
          )}
          {!loadingStates.overview &&
            !errorStates.overview &&
            overviewData?.chartData.length === 0 &&
            renderNoData(`No MAP data for Grade ${selectedGrade}`)}
        </TabsContent>

        {/* Growth Tab */}
        <TabsContent value="growth" className="space-y-6 mt-6">
          {/* Growth Type Selector */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-sm mb-1">Growth Analysis Type</h3>
                  <p className="text-xs text-muted-foreground">
                    {growthType === "within-year"
                      ? "Measures student progress within a single academic year (Fall → Spring)"
                      : growthType === "year-over-year"
                        ? "Measures student progress over one year (Fall → Fall of next year)"
                        : "Shows all consecutive test growths (Fall→Spring and Spring→Fall)"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant={growthType === "within-year" ? "default" : "outline"}
                    onClick={() => handleGrowthTypeChange("within-year")}
                    disabled={loadingStates.growth}
                  >
                    Within Year
                  </Button>
                  <Button
                    size="sm"
                    variant={growthType === "year-over-year" ? "default" : "outline"}
                    onClick={() => handleGrowthTypeChange("year-over-year")}
                    disabled={loadingStates.growth}
                  >
                    Year-over-Year
                  </Button>
                  <Button
                    size="sm"
                    variant={growthType === "consecutive" ? "default" : "outline"}
                    onClick={() => handleGrowthTypeChange("consecutive")}
                    disabled={loadingStates.growth}
                  >
                    Consecutive
                  </Button>
                </div>
              </div>

              {/* Explanation Box */}
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs space-y-2">
                <p>
                  <strong>Within Year:</strong> Fall 2024-2025 → Spring 2024-2025 (same grade, same year)
                </p>
                <p>
                  <strong>Year-over-Year:</strong> Fall 2024-2025 → Fall 2025-2026 (advance one grade)
                </p>
                <p>
                  <strong>Consecutive:</strong> All consecutive tests (FA→SP with full metrics, SP→FA with growth only)
                </p>
                <p className="text-muted-foreground">
                  Growth Index = Actual Growth ÷ Expected Growth | 1.0 = on target | &gt; 1.0 = above expected | &lt; 1.0 = below expected
                </p>
              </div>
            </CardContent>
          </Card>

          {loadingStates.growth && renderSkeleton(2)}
          {errorStates.growth && renderError(errorStates.growth)}

          {/* Within-Year or Year-over-Year View */}
          {!loadingStates.growth && !errorStates.growth && growthType !== "consecutive" && growthData && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Growth Index Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Growth Index by English Level</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MapGrowthIndexChart data={growthData} />
                  </CardContent>
                </Card>

                {/* Growth Distribution */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Growth Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MapGrowthDistribution data={growthData} />
                  </CardContent>
                </Card>
              </div>

              {/* Summary Info */}
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="text-center text-sm">
                    <p className="font-medium">
                      {growthData.growthType === "within-year"
                        ? `${growthData.fromTerm} → ${growthData.toTerm}`
                        : `G${growthData.fromGrade} ${growthData.fromTerm.split(" ")[0]} → G${growthData.toGrade} ${growthData.toTerm.split(" ")[0]}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {growthData.growthType === "within-year"
                        ? "Within-year growth: Tracking student progress from Fall to Spring within the same academic year"
                        : "Year-over-year growth: Tracking student progress after advancing one grade level"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Consecutive Growth View */}
          {!loadingStates.growth && !errorStates.growth && growthType === "consecutive" && consecutiveGrowthData && (
            <Card>
              <CardContent className="pt-4">
                <MapConsecutiveGrowth data={consecutiveGrowthData} />
              </CardContent>
            </Card>
          )}

          {/* No Data States */}
          {!loadingStates.growth &&
            !errorStates.growth &&
            growthType !== "consecutive" &&
            (!growthData || growthData.byLevel.length === 0) &&
            renderNoData(`No growth data for Grade ${selectedGrade}`)}
          {!loadingStates.growth &&
            !errorStates.growth &&
            growthType === "consecutive" &&
            (!consecutiveGrowthData || consecutiveGrowthData.records.length === 0) &&
            renderNoData(`No consecutive growth data for Grade ${selectedGrade}`)}
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-6 mt-6">
          {loadingStates.goals && renderSkeleton(2)}
          {errorStates.goals && renderError(errorStates.goals)}
          {!loadingStates.goals && !errorStates.goals && (goalData.reading || goalData.languageUsage) && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Reading Goals */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Reading Goal Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {goalData.reading ? (
                      <MapGoalRadar data={goalData.reading} />
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        No Reading goal data
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Language Usage Goals */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Language Usage Goal Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {goalData.languageUsage ? (
                      <MapGoalRadar data={goalData.languageUsage} />
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        No Language Usage goal data
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Goal Comparison Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Reading Goal Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {goalData.reading ? (
                      <MapGoalTable data={goalData.reading} />
                    ) : (
                      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                        No Reading goal data
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Language Usage Goal Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {goalData.languageUsage ? (
                      <MapGoalTable data={goalData.languageUsage} />
                    ) : (
                      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                        No Language Usage goal data
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
          {!loadingStates.goals &&
            !errorStates.goals &&
            !goalData.reading &&
            !goalData.languageUsage &&
            renderNoData(`No goal data for Grade ${selectedGrade}`)}
        </TabsContent>

        {/* Lexile Tab */}
        <TabsContent value="lexile" className="space-y-6 mt-6">
          {loadingStates.lexile && renderSkeleton(2)}
          {errorStates.lexile && renderError(errorStates.lexile)}
          {!loadingStates.lexile && !errorStates.lexile && lexileData && (
            <>
              {/* Lexile Stats */}
              <MapLexileStats data={lexileData} />

              {/* Lexile Distribution Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Lexile Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <MapLexileDistribution data={lexileData} />
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground text-center">
                Lexile data from {lexileData.termTested} for Grade {lexileData.grade}
              </p>
            </>
          )}
          {!loadingStates.lexile &&
            !errorStates.lexile &&
            (!lexileData || lexileData.stats.count === 0) &&
            renderNoData(`No Lexile data for Grade ${selectedGrade}`)}
        </TabsContent>

        {/* Quality Tab */}
        <TabsContent value="quality" className="space-y-6 mt-6">
          {loadingStates.quality && renderSkeleton(2)}
          {errorStates.quality && renderError(errorStates.quality)}
          {!loadingStates.quality && !errorStates.quality && qualityData && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Quality Pie Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Rapid Guessing Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MapTestQualityPie data={qualityData} />
                  </CardContent>
                </Card>

                {/* Summary Stats */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Test Quality Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {qualityData.summary.normal.count}
                          </p>
                          <p className="text-xs text-muted-foreground">Normal (≤15%)</p>
                        </div>
                        <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {qualityData.summary.caution.count}
                          </p>
                          <p className="text-xs text-muted-foreground">Caution (15-30%)</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {qualityData.summary.flagged.count}
                          </p>
                          <p className="text-xs text-muted-foreground">Flagged (&gt;30%)</p>
                        </div>
                      </div>

                      {qualityData.flaggedStudents.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">Flagged Students</h4>
                          <div className="max-h-[200px] overflow-y-auto space-y-2">
                            {qualityData.flaggedStudents.slice(0, 10).map((student, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/20 rounded text-sm"
                              >
                                <span>
                                  {student.studentName} (G{student.grade})
                                </span>
                                <span className="text-red-600 dark:text-red-400 font-medium">
                                  {student.rapidGuessingPercent}%
                                </span>
                              </div>
                            ))}
                            {qualityData.flaggedStudents.length > 10 && (
                              <p className="text-xs text-muted-foreground text-center">
                                And {qualityData.flaggedStudents.length - 10} more...
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Quality data from {qualityData.termTested}. Total assessments: {qualityData.summary.total}
              </p>
            </>
          )}
          {!loadingStates.quality &&
            !errorStates.quality &&
            (!qualityData || qualityData.summary.total === 0) &&
            renderNoData("No test quality data available")}
        </TabsContent>

        {/* Transitions Tab */}
        <TabsContent value="transitions" className="space-y-6 mt-6">
          {!isBenchmarkSupported(selectedGrade) ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ArrowLeftRight className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Not Available for G6</p>
                  <p className="text-sm">Benchmark transitions are only tracked for G3-G5</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Transition Period Selector */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-sm mb-1">Transition Period</h3>
                      <p className="text-xs text-muted-foreground">
                        {transitionPeriod === "fall-to-spring"
                          ? "Track benchmark changes within the same academic year"
                          : "Track benchmark changes across academic years (students advance one grade)"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {TRANSITION_PERIODS.map((period) => {
                        // G3 cross-year not available (G2 has no Benchmark classification)
                        const isDisabled = period.id === "spring-to-fall" && selectedGrade === 3;
                        return (
                          <Button
                            key={period.id}
                            size="sm"
                            variant={transitionPeriod === period.id ? "default" : "outline"}
                            onClick={() => handleTransitionPeriodChange(period.id)}
                            disabled={loadingStates.transitions || isDisabled}
                            title={isDisabled ? "G3 cross-year not available (G2 has no Benchmark classification)" : period.description}
                          >
                            {period.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Explanation Box */}
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs space-y-2">
                    <p>
                      <strong>Within-year (Fall → Spring):</strong> Benchmark changes within the same academic year, using the same grade thresholds
                    </p>
                    <p>
                      <strong>Cross-year (Spring → Fall):</strong> Benchmark changes across academic years, students advance one grade and use new grade thresholds
                    </p>
                    {transitionPeriod === "spring-to-fall" && (
                      <p className="text-amber-600 dark:text-amber-400">
                        Note: G{selectedGrade} students were G{selectedGrade - 1} in Spring 24-25, using G{selectedGrade - 1} benchmark thresholds for the starting point
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {loadingStates.transitions && renderSkeleton(1)}
              {errorStates.transitions && renderError(errorStates.transitions)}
              {!loadingStates.transitions && !errorStates.transitions && transitionData && (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Benchmark Transition ({transitionData.fromTerm} → {transitionData.toTerm})
                        {transitionPeriod === "spring-to-fall" && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            (G{selectedGrade - 1} → G{selectedGrade})
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MapBenchmarkTransition data={transitionData} />
                    </CardContent>
                  </Card>

                  {/* Transition Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                      <CardContent className="pt-4 text-center">
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {transitionData.summary.improved.count}
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Improved ({transitionData.summary.improved.percentage}%)
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-50 dark:bg-gray-900/30">
                      <CardContent className="pt-4 text-center">
                        <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                          {transitionData.summary.same.count}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Same ({transitionData.summary.same.percentage}%)
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
                      <CardContent className="pt-4 text-center">
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {transitionData.summary.declined.count}
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          Declined ({transitionData.summary.declined.percentage}%)
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
              {!loadingStates.transitions &&
                !errorStates.transitions &&
                !transitionData &&
                renderNoData(`No transition data for Grade ${selectedGrade}`)}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
