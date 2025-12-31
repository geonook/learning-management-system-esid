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

import { useState, useEffect, useCallback, useRef } from "react";
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
  School,
  ChevronDown,
  ChevronUp,
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
  MapGoalRitDistribution,
  MapLexileDistribution,
  MapLexileStats,
  MapTestQualityPie,
  MapBenchmarkTransition,
  MapConsecutiveGrowth,
  MapGradeGrowthDistribution,
  MapGradeRitDistribution,
} from "@/components/map/charts";
import {
  getMapAnalyticsData,
  getGrowthAnalysis,
  getGoalPerformance,
  getGoalRitDistribution,
  getLexileAnalysis,
  getTestQualityReport,
  getBenchmarkTransition,
  getConsecutiveGrowthAnalysis,
  getGradeGrowthDistribution,
  getGradeRitDistribution,
  type MapAnalyticsData,
  type GrowthAnalysisData,
  type GrowthType,
  type GoalPerformanceData,
  type GoalRitDistributionData,
  type LexileAnalysisData,
  type TestQualityData,
  type BenchmarkTransitionData,
  type ConsecutiveGrowthAnalysisData,
  type GradeGrowthDistributionData,
  type GradeRitDistributionData,
} from "@/lib/api/map-analytics";
import {
  getCrossGradeGrowth,
  getGrowthSpotlight,
  getClassGrowthComparison,
  type CrossGradeGrowthData,
  type GrowthSpotlightData,
  type ClassComparisonData,
} from "@/lib/api/map-growth-analytics";
import {
  CrossGradeGrowthChart,
  GrowthSpotlight,
  ClassComparisonTable,
  GrowthPeriodSelector,
  GrowthContextBanner,
  createGrowthPeriodOptions,
  type GrowthPeriodOption,
} from "@/components/map/growth";
import { isBenchmarkSupported } from "@/lib/map/benchmarks";
import { formatTermStats } from "@/lib/map/utils";
import { SchoolTab } from "@/components/map/school";

const SUPPORTED_GRADES = [3, 4, 5, 6];

// Analysis Tabs 定義
const ANALYSIS_TABS = [
  { id: "school", label: "School", icon: School },
  { id: "overview", label: "Grades", icon: LayoutDashboard },
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
    description: "Cross-grade benchmark changes (after grade promotion)",
  },
];

export default function MapAnalysisPage() {
  // Grade selection
  const [selectedGrade, setSelectedGrade] = useState(5);
  // Analysis tab selection
  const [selectedTab, setSelectedTab] = useState("overview");
  // Growth type selection (extended to include "consecutive")
  type ExtendedGrowthType = GrowthType | "consecutive";
  const [growthType, setGrowthType] =
    useState<ExtendedGrowthType>("within-year");
  // Transition period selection
  const [transitionPeriod, setTransitionPeriod] =
    useState<TransitionPeriod>("fall-to-spring");
  // Chart view mode for Overview tab
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>("grid");
  // Selected course for single view mode
  const [selectedChartCourse, setSelectedChartCourse] =
    useState<string>("Language Usage");

  // Data states
  const [overviewData, setOverviewData] = useState<MapAnalyticsData | null>(
    null
  );
  // Growth data per grade and type: key = `${grade}-${type}`
  const [growthDataCache, setGrowthDataCache] = useState<
    Record<string, GrowthAnalysisData | null>
  >({});
  // Consecutive growth data per grade
  const [consecutiveGrowthCache, setConsecutiveGrowthCache] = useState<
    Record<number, ConsecutiveGrowthAnalysisData | null>
  >({});
  // Derived growthData for current selection
  const growthData =
    growthType !== "consecutive"
      ? growthDataCache[`${selectedGrade}-${growthType}`] ?? null
      : null;
  const consecutiveGrowthData = consecutiveGrowthCache[selectedGrade] ?? null;
  const [goalData, setGoalData] = useState<{
    reading: GoalPerformanceData | null;
    languageUsage: GoalPerformanceData | null;
  }>({ reading: null, languageUsage: null });
  const [goalRitData, setGoalRitData] = useState<{
    reading: GoalRitDistributionData | null;
    languageUsage: GoalRitDistributionData | null;
  }>({ reading: null, languageUsage: null });
  const [lexileData, setLexileData] = useState<LexileAnalysisData | null>(null);
  const [qualityData, setQualityData] = useState<TestQualityData | null>(null);
  const [transitionData, setTransitionData] =
    useState<BenchmarkTransitionData | null>(null);
  // Grade growth distribution cache: key = `${grade}-${course}`
  const [gradeGrowthCache, setGradeGrowthCache] = useState<
    Record<string, GradeGrowthDistributionData | null>
  >({});
  // Grade RIT distribution cache: key = `${grade}-${course}-${term}`
  const [gradeRitCache, setGradeRitCache] = useState<
    Record<string, GradeRitDistributionData | null>
  >({});

  // New Growth Tab data states (使用快取物件模式)
  // 快取 key: growthType (within-year | year-over-year)
  const [crossGradeGrowthCache, setCrossGradeGrowthCache] = useState<
    Record<string, CrossGradeGrowthData | null>
  >({});
  // 快取 key: `${grade}-${course}-${growthType}`
  const [growthSpotlightCache, setGrowthSpotlightCache] = useState<
    Record<string, GrowthSpotlightData | null>
  >({});
  // 快取 key: `${grade}-${course}-${growthType}`
  const [classComparisonCache, setClassComparisonCache] = useState<
    Record<string, ClassComparisonData | null>
  >({});
  // Selected course for Growth Spotlight
  const [spotlightCourse, setSpotlightCourse] = useState<"Reading" | "Language Usage">("Reading");

  // Growth Period Options (generated from available terms)
  // For now, hardcode available terms - later can be fetched from API
  const availableTerms = ["Fall 2024-2025", "Spring 2024-2025", "Fall 2025-2026"];
  const growthPeriodOptions = createGrowthPeriodOptions(availableTerms);
  const [selectedGrowthPeriodId, setSelectedGrowthPeriodId] = useState<string>(
    growthPeriodOptions[0]?.id ?? "fall-to-spring-2024-2025"
  );
  const selectedGrowthPeriod = growthPeriodOptions.find(p => p.id === selectedGrowthPeriodId);
  // Expandable state for "All Growth Records" section
  const [showAllGrowthRecords, setShowAllGrowthRecords] = useState(false);

  // 衍生資料（根據當前選擇從快取取得）
  const crossGradeGrowthData = crossGradeGrowthCache[growthType] ?? null;
  const growthSpotlightData = growthSpotlightCache[`${selectedGrade}-${spotlightCourse}-${growthType}`] ?? null;
  const classComparisonData = classComparisonCache[`${selectedGrade}-${spotlightCourse}-${growthType}`] ?? null;

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
  const [errorStates, setErrorStates] = useState<Record<string, string | null>>(
    {
      overview: null,
      growth: null,
      goals: null,
      lexile: null,
      quality: null,
      transitions: null,
    }
  );

  // Track which tabs have been loaded (使用 ref 避免觸發不必要的渲染)
  const loadedTabsRef = useRef<Set<string>>(new Set());
  // 用於觸發重新載入的 state（僅在需要刷新時使用）
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  // Fetch Grade Growth Distribution Data (for Grades Tab)
  const fetchGradeGrowthData = useCallback(
    async (grade: number, course: "Reading" | "Language Usage") => {
      const cacheKey = `${grade}-${course}`;
      // Skip if already cached
      if (gradeGrowthCache[cacheKey] !== undefined) return;

      try {
        // Use Fall-to-Fall growth (1 year growth)
        const result = await getGradeGrowthDistribution({
          grade,
          course,
          fromTerm: "Fall 2024-2025",
          toTerm: "Fall 2025-2026",
        });
        setGradeGrowthCache((prev) => ({ ...prev, [cacheKey]: result }));
      } catch (err) {
        console.error("Error fetching grade growth distribution:", err);
        // Store null to prevent re-fetching
        setGradeGrowthCache((prev) => ({ ...prev, [cacheKey]: null }));
      }
    },
    [gradeGrowthCache]
  );

  // Fetch Grade RIT Distribution Data (for Grades Tab)
  const fetchGradeRitData = useCallback(
    async (grade: number, course: "Reading" | "Language Usage", termTested: string) => {
      const cacheKey = `${grade}-${course}-${termTested}`;
      // Skip if already cached
      if (gradeRitCache[cacheKey] !== undefined) return;

      try {
        const result = await getGradeRitDistribution({
          grade,
          course,
          termTested,
        });
        setGradeRitCache((prev) => ({ ...prev, [cacheKey]: result }));
      } catch (err) {
        console.error("Error fetching grade RIT distribution:", err);
        // Store null to prevent re-fetching
        setGradeRitCache((prev) => ({ ...prev, [cacheKey]: null }));
      }
    },
    [gradeRitCache]
  );

  // Fetch Growth Data (within-year or year-over-year)
  const fetchGrowthData = useCallback(
    async (grade: number, type: GrowthType) => {
      const cacheKey = `${grade}-${type}`;
      // 快取檢查：如果已有資料則跳過
      if (growthDataCache[cacheKey] !== undefined) return;

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
        setGrowthDataCache((prev) => ({ ...prev, [cacheKey]: result }));
      } catch (err) {
        console.error("Error fetching growth data:", err);
        setError("growth", "Failed to load growth data");
      } finally {
        setLoading("growth", false);
      }
    },
    [growthDataCache]
  );

  // Fetch Consecutive Growth Data (all consecutive term pairs)
  const fetchConsecutiveGrowthData = useCallback(async (grade: number) => {
    // 快取檢查
    if (consecutiveGrowthCache[grade] !== undefined) return;

    setLoading("growth", true);
    setError("growth", null);
    try {
      const result = await getConsecutiveGrowthAnalysis({ grade });
      setConsecutiveGrowthCache((prev) => ({ ...prev, [grade]: result }));
    } catch (err) {
      console.error("Error fetching consecutive growth data:", err);
      setError("growth", "Failed to load consecutive growth data");
    } finally {
      setLoading("growth", false);
    }
  }, [consecutiveGrowthCache]);

  // Fetch Cross-Grade Growth Data (for new Growth Overview section)
  const fetchCrossGradeGrowthData = useCallback(async (type: GrowthType) => {
    // 快取檢查
    if (crossGradeGrowthCache[type] !== undefined) return;

    try {
      let fromTerm: string;
      let toTerm: string;

      if (type === "within-year") {
        fromTerm = "Fall 2024-2025";
        toTerm = "Spring 2024-2025";
      } else {
        fromTerm = "Fall 2024-2025";
        toTerm = "Fall 2025-2026";
      }

      const result = await getCrossGradeGrowth({ fromTerm, toTerm });
      setCrossGradeGrowthCache((prev) => ({ ...prev, [type]: result }));
    } catch (err) {
      console.error("Error fetching cross-grade growth data:", err);
    }
  }, [crossGradeGrowthCache]);

  // Fetch Growth Spotlight Data
  const fetchGrowthSpotlightData = useCallback(async (
    grade: number,
    course: "Reading" | "Language Usage",
    type: GrowthType
  ) => {
    const cacheKey = `${grade}-${course}-${type}`;
    // 快取檢查
    if (growthSpotlightCache[cacheKey] !== undefined) return;

    try {
      let fromTerm: string;
      let toTerm: string;

      if (type === "within-year") {
        fromTerm = "Fall 2024-2025";
        toTerm = "Spring 2024-2025";
      } else {
        fromTerm = "Fall 2024-2025";
        toTerm = "Fall 2025-2026";
      }

      const result = await getGrowthSpotlight({
        grade,
        course,
        fromTerm,
        toTerm,
        limit: 5,
      });
      setGrowthSpotlightCache((prev) => ({ ...prev, [cacheKey]: result }));
    } catch (err) {
      console.error("Error fetching growth spotlight data:", err);
    }
  }, [growthSpotlightCache]);

  // Fetch Class Comparison Data
  const fetchClassComparisonData = useCallback(async (
    grade: number,
    course: "Reading" | "Language Usage",
    type: GrowthType
  ) => {
    const cacheKey = `${grade}-${course}-${type}`;
    // 快取檢查
    if (classComparisonCache[cacheKey] !== undefined) return;

    try {
      let fromTerm: string;
      let toTerm: string;

      if (type === "within-year") {
        fromTerm = "Fall 2024-2025";
        toTerm = "Spring 2024-2025";
      } else {
        fromTerm = "Fall 2024-2025";
        toTerm = "Fall 2025-2026";
      }

      const result = await getClassGrowthComparison({
        grade,
        course,
        fromTerm,
        toTerm,
      });
      setClassComparisonCache((prev) => ({ ...prev, [cacheKey]: result }));
    } catch (err) {
      console.error("Error fetching class comparison data:", err);
    }
  }, [classComparisonCache]);

  // Fetch Goal Data (both courses + RIT distribution)
  const fetchGoalData = useCallback(async (grade: number) => {
    setLoading("goals", true);
    setError("goals", null);
    try {
      // Use the most recent term
      const termTested = "Fall 2025-2026";
      const [reading, languageUsage, readingRit, languageUsageRit] = await Promise.all([
        getGoalPerformance({ grade, course: "Reading", termTested }),
        getGoalPerformance({ grade, course: "Language Usage", termTested }),
        getGoalRitDistribution({ grade, course: "Reading", termTested }),
        getGoalRitDistribution({ grade, course: "Language Usage", termTested }),
      ]);
      setGoalData({ reading, languageUsage });
      setGoalRitData({ reading: readingRit, languageUsage: languageUsageRit });
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
      const result = await getLexileAnalysis({
        grade,
        termTested: "Fall 2025-2026",
      });
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
  const fetchTransitionData = useCallback(
    async (grade: number, period: TransitionPeriod) => {
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
    },
    []
  );

  // Load data when tab changes (lazy loading)
  // 優化：使用 ref 追蹤已載入標籤，減少依賴項數量
  useEffect(() => {
    const loadTabData = async () => {
      // 計算當前標籤的快取鍵
      let tabKey: string;
      if (selectedTab === "growth") {
        tabKey = `${selectedTab}-${selectedGrade}-${growthType}`;
      } else if (selectedTab === "transitions") {
        tabKey = `${selectedTab}-${selectedGrade}-${transitionPeriod}`;
      } else {
        tabKey = `${selectedTab}-${selectedGrade}`;
      }

      // 使用 ref 檢查是否已載入（不觸發重新渲染）
      if (loadedTabsRef.current.has(tabKey)) return;

      switch (selectedTab) {
        case "overview":
          await fetchOverviewData(selectedGrade);
          // 同時載入年級成長分佈資料（兩門課程）
          fetchGradeGrowthData(selectedGrade, "Reading");
          fetchGradeGrowthData(selectedGrade, "Language Usage");
          // 同時載入年級 RIT 分佈資料
          fetchGradeRitData(selectedGrade, "Reading", "Fall 2025-2026");
          fetchGradeRitData(selectedGrade, "Language Usage", "Fall 2025-2026");
          break;
        case "growth":
          if (growthType === "consecutive") {
            await fetchConsecutiveGrowthData(selectedGrade);
          } else {
            await fetchGrowthData(selectedGrade, growthType);
            // 同時載入新版 Growth Tab 資料
            fetchCrossGradeGrowthData(growthType);
            fetchGrowthSpotlightData(selectedGrade, spotlightCourse, growthType);
            fetchClassComparisonData(selectedGrade, spotlightCourse, growthType);
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

      // 更新 ref（不觸發重新渲染）
      loadedTabsRef.current.add(tabKey);
    };

    loadTabData();
  }, [
    selectedTab,
    selectedGrade,
    growthType,
    transitionPeriod,
    spotlightCourse,
    refreshTrigger, // 用於手動觸發重新載入
    fetchOverviewData,
    fetchGradeGrowthData,
    fetchGradeRitData,
    fetchGrowthData,
    fetchConsecutiveGrowthData,
    fetchCrossGradeGrowthData,
    fetchGrowthSpotlightData,
    fetchClassComparisonData,
    fetchGoalData,
    fetchLexileData,
    fetchQualityData,
    fetchTransitionData,
  ]);

  // Handle growth type change - trigger reload
  const handleGrowthTypeChange = (type: ExtendedGrowthType) => {
    setGrowthType(type);
    // useEffect 會自動檢查並載入（如果尚未載入）
  };

  // Handle growth period change (new dropdown-based selector)
  const handleGrowthPeriodChange = (periodId: string) => {
    setSelectedGrowthPeriodId(periodId);
    const period = growthPeriodOptions.find(p => p.id === periodId);
    if (period) {
      // Map period type to ExtendedGrowthType
      if (period.type === "within-year") {
        setGrowthType("within-year");
      } else if (period.type === "year-over-year") {
        setGrowthType("year-over-year");
      }
      // Note: "summer" type doesn't have NWEA benchmark, treat as year-over-year for display
      // The component will handle showing "no benchmark" appropriately
    }
  };

  // Handle transition period change - trigger reload
  const handleTransitionPeriodChange = (period: TransitionPeriod) => {
    setTransitionPeriod(period);
    // useEffect 會自動檢查並載入（如果尚未載入）
  };

  // Reset loaded tabs when grade changes
  const handleGradeChange = (value: string) => {
    setSelectedGrade(parseInt(value, 10));
    loadedTabsRef.current.clear(); // 清空已載入標籤
    setRefreshTrigger((prev) => prev + 1); // 觸發重新載入
  };

  // Refresh current tab
  const handleRefresh = () => {
    // 計算當前標籤的快取鍵
    let tabKey: string;
    if (selectedTab === "growth") {
      tabKey = `${selectedTab}-${selectedGrade}-${growthType}`;
    } else if (selectedTab === "transitions") {
      tabKey = `${selectedTab}-${selectedGrade}-${transitionPeriod}`;
    } else {
      tabKey = `${selectedTab}-${selectedGrade}`;
    }
    loadedTabsRef.current.delete(tabKey); // 移除快取標記
    setRefreshTrigger((prev) => prev + 1); // 觸發重新載入
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
            className={`w-4 h-4 mr-2 ${
              loadingStates[selectedTab] ? "animate-spin" : ""
            }`}
          />
          Refresh
        </Button>
      </div>

      {/* Grade Tabs */}
      {selectedTab === "school" ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
          <span className="text-sm text-muted-foreground">All Grades</span>
          <span className="text-xs text-muted-foreground">(G3-G6)</span>
        </div>
      ) : (
        <Tabs
          value={selectedGrade.toString()}
          onValueChange={handleGradeChange}
        >
          <TabsList>
            {SUPPORTED_GRADES.map((grade) => (
              <TabsTrigger key={grade} value={grade.toString()}>
                G{grade}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Analysis Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-7">
          {ANALYSIS_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-1.5"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* School Tab */}
        <TabsContent value="school" className="space-y-6 mt-6">
          <SchoolTab />
        </TabsContent>

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
                        <MapGrowthLineChart
                          data={chart}
                          showNorm
                          height={280}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Growth Trend Charts - Single Mode with Tabs */}
              {chartViewMode === "single" && (
                <Card>
                  <CardContent className="pt-4">
                    <Tabs
                      value={selectedChartCourse}
                      onValueChange={setSelectedChartCourse}
                    >
                      <TabsList className="mb-4">
                        <TabsTrigger value="Language Usage">
                          Language Usage
                        </TabsTrigger>
                        <TabsTrigger value="Reading">Reading</TabsTrigger>
                        <TabsTrigger value="Average">Average</TabsTrigger>
                      </TabsList>
                      {overviewData.chartData
                        .filter((c) => c.course === selectedChartCourse)
                        .map((chart) => (
                          <TabsContent
                            key={chart.course}
                            value={chart.course}
                            className="mt-0"
                          >
                            <MapGrowthLineChart
                              data={chart}
                              showNorm
                              height={350}
                            />
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
                    <CardTitle className="text-base">
                      Benchmark Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isBenchmarkSupported(selectedGrade) ? (
                      <MapBenchmarkDonutChart
                        data={overviewData.benchmarkDistribution}
                      />
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

              {/* Grade Growth Distribution (Colab-style) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {gradeGrowthCache[`${selectedGrade}-Reading`] && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Reading Growth Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MapGradeGrowthDistribution
                        data={gradeGrowthCache[`${selectedGrade}-Reading`]!}
                        height={300}
                      />
                    </CardContent>
                  </Card>
                )}
                {gradeGrowthCache[`${selectedGrade}-Language Usage`] && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Language Usage Growth Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MapGradeGrowthDistribution
                        data={gradeGrowthCache[`${selectedGrade}-Language Usage`]!}
                        height={300}
                      />
                    </CardContent>
                  </Card>
                )}
                {!gradeGrowthCache[`${selectedGrade}-Reading`] &&
                  !gradeGrowthCache[`${selectedGrade}-Language Usage`] && (
                    <div className="lg:col-span-2 flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                      <p>Loading grade growth distribution...</p>
                    </div>
                  )}
              </div>

              {/* Grade RIT Distribution (Colab-style) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {gradeRitCache[`${selectedGrade}-Reading-Fall 2025-2026`] && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Reading RIT Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MapGradeRitDistribution
                        data={gradeRitCache[`${selectedGrade}-Reading-Fall 2025-2026`]!}
                        height={300}
                      />
                    </CardContent>
                  </Card>
                )}
                {gradeRitCache[`${selectedGrade}-Language Usage-Fall 2025-2026`] && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Language Usage RIT Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MapGradeRitDistribution
                        data={gradeRitCache[`${selectedGrade}-Language Usage-Fall 2025-2026`]!}
                        height={300}
                      />
                    </CardContent>
                  </Card>
                )}
                {!gradeRitCache[`${selectedGrade}-Reading-Fall 2025-2026`] &&
                  !gradeRitCache[`${selectedGrade}-Language Usage-Fall 2025-2026`] && (
                    <div className="lg:col-span-2 flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                      <p>Loading grade RIT distribution...</p>
                    </div>
                  )}
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
          {/* Growth Period Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 w-full sm:max-w-md">
              <GrowthPeriodSelector
                periods={growthPeriodOptions}
                selectedId={selectedGrowthPeriodId}
                onChange={handleGrowthPeriodChange}
                disabled={loadingStates.growth}
              />
            </div>
          </div>

          {/* Context Banner */}
          {selectedGrowthPeriod && (
            <GrowthContextBanner
              period={selectedGrowthPeriod}
              studentCount={crossGradeGrowthData?.grades.reduce(
                (sum, g) => sum + Math.max(g.reading.studentCount, g.languageUsage.studentCount),
                0
              ) ?? 0}
              isLoading={loadingStates.growth}
            />
          )}

          {loadingStates.growth && renderSkeleton(2)}
          {errorStates.growth && renderError(errorStates.growth)}

          {/* Within-Year or Year-over-Year View */}
          {!loadingStates.growth &&
            !errorStates.growth &&
            growthType !== "consecutive" && (
              <>
                {/* Cross-Grade Growth Overview */}
                <CrossGradeGrowthChart
                  data={crossGradeGrowthData}
                  hasOfficialBenchmark={selectedGrowthPeriod?.hasOfficialBenchmark ?? true}
                />

                {/* Growth Index and Distribution */}
                {growthData && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Growth Index Chart */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          G{selectedGrade} Growth Index by English Level
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <MapGrowthIndexChart data={growthData} />
                      </CardContent>
                    </Card>

                    {/* Growth Distribution */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          G{selectedGrade} Growth Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <MapGrowthDistribution data={growthData} />
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Student Spotlight - Course Selector + Cards (NEW) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Student Spotlight</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={spotlightCourse === "Reading" ? "default" : "outline"}
                        onClick={() => {
                          setSpotlightCourse("Reading");
                          fetchGrowthSpotlightData(selectedGrade, "Reading", growthType as GrowthType);
                        }}
                      >
                        Reading
                      </Button>
                      <Button
                        size="sm"
                        variant={spotlightCourse === "Language Usage" ? "default" : "outline"}
                        onClick={() => {
                          setSpotlightCourse("Language Usage");
                          fetchGrowthSpotlightData(selectedGrade, "Language Usage", growthType as GrowthType);
                        }}
                      >
                        Language Usage
                      </Button>
                    </div>
                  </div>
                  <GrowthSpotlight data={growthSpotlightData} />
                </div>

                {/* Class Comparison Table (NEW) */}
                <ClassComparisonTable data={classComparisonData} />

                {/* Summary Info */}
                {growthData && (
                  <Card className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="text-center text-sm">
                        <p className="font-medium">
                          {growthData.growthType === "within-year"
                            ? `${growthData.fromTerm} → ${growthData.toTerm}`
                            : `G${growthData.fromGrade} ${
                                growthData.fromTerm.split(" ")[0]
                              } → G${growthData.toGrade} ${
                                growthData.toTerm.split(" ")[0]
                              }`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {growthData.growthType === "within-year"
                            ? "Within-year growth: Tracking student progress from Fall to Spring within the same academic year"
                            : "Year-over-year growth: Tracking student progress after advancing one grade level"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

          {/* All Growth Records (Expandable) */}
          {!loadingStates.growth &&
            !errorStates.growth &&
            growthType !== "consecutive" && (
              <Card className="border-dashed">
                <CardHeader className="pb-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-between"
                    onClick={() => {
                      setShowAllGrowthRecords(!showAllGrowthRecords);
                      // Fetch consecutive data if not already loaded
                      if (!showAllGrowthRecords && !consecutiveGrowthCache[selectedGrade]) {
                        fetchConsecutiveGrowthData(selectedGrade);
                      }
                    }}
                  >
                    <span className="text-sm font-medium">
                      View All Growth Records (Consecutive Pairs)
                    </span>
                    {showAllGrowthRecords ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </CardHeader>
                {showAllGrowthRecords && (
                  <CardContent>
                    {consecutiveGrowthData ? (
                      <MapConsecutiveGrowth data={consecutiveGrowthData} />
                    ) : (
                      <div className="flex items-center justify-center h-[100px] text-muted-foreground text-sm">
                        Loading all growth records...
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )}

          {/* No Data States */}
          {!loadingStates.growth &&
            !errorStates.growth &&
            growthType !== "consecutive" &&
            (!growthData || growthData.byLevel.length === 0) &&
            renderNoData(`No growth data for Grade ${selectedGrade}`)}
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-6 mt-6">
          {loadingStates.goals && renderSkeleton(2)}
          {errorStates.goals && renderError(errorStates.goals)}
          {!loadingStates.goals &&
            !errorStates.goals &&
            (goalData.reading || goalData.languageUsage) && (
              <>
                {/* Explanation Box */}
                <div className="p-3 bg-muted/50 dark:bg-muted/30 rounded-lg text-xs space-y-2">
                  <p>
                    <strong>Radar Chart:</strong> Shows relative performance across
                    goal areas. Each axis represents a different skill area (e.g.,
                    Literary Text, Informational Text, Vocabulary).
                  </p>
                  <p>
                    <strong>Goal Table:</strong> Compares each goal area RIT score
                    to overall RIT. Positive difference = strength, negative = area
                    for improvement.
                  </p>
                  <p className="text-muted-foreground">
                    Goal areas vary by course: Reading has Literary/Informational
                    Text + Vocabulary | Language Usage has
                    Grammar/Mechanics/Usage.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Reading Goals */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Reading Goal Performance
                      </CardTitle>
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
                      <CardTitle className="text-base">
                        Language Usage Goal Performance
                      </CardTitle>
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
                      <CardTitle className="text-base">
                        Reading Goal Details
                      </CardTitle>
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
                      <CardTitle className="text-base">
                        Language Usage Goal Details
                      </CardTitle>
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

                {/* Goal RIT Distribution Charts */}
                {(goalRitData.reading || goalRitData.languageUsage) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Reading Goal RIT Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {goalRitData.reading ? (
                          <MapGoalRitDistribution data={goalRitData.reading} />
                        ) : (
                          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                            No Reading RIT distribution data
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Language Usage Goal RIT Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {goalRitData.languageUsage ? (
                          <MapGoalRitDistribution data={goalRitData.languageUsage} />
                        ) : (
                          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                            No Language Usage RIT distribution data
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
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
                  <CardTitle className="text-base">
                    Lexile Score Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MapLexileDistribution data={lexileData} />
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground text-center">
                Lexile data from {lexileData.termTested} for Grade{" "}
                {lexileData.grade}
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
              {/* Explanation Box */}
              <div className="p-3 bg-muted/50 dark:bg-muted/30 rounded-lg text-xs space-y-2">
                <p>
                  <strong>Rapid Guessing:</strong> NWEA detects when students
                  answer too quickly to have read the question. High rapid
                  guessing percentages may indicate disengagement or test anxiety.
                </p>
                <p>
                  <strong>Normal (≤15%):</strong> Reliable test results. |{" "}
                  <strong>Caution (15-30%):</strong> Some questions may not
                  reflect true ability. |{" "}
                  <strong>Flagged (&gt;30%):</strong> Scores may be invalid;
                  consider retesting.
                </p>
                <p className="text-muted-foreground">
                  NWEA recommends investigating students with &gt;30% rapid
                  guessing to ensure RIT scores accurately reflect their
                  abilities.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Quality Pie Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Rapid Guessing Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MapTestQualityPie data={qualityData} />
                  </CardContent>
                </Card>

                {/* Summary Stats */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Test Quality Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {qualityData.summary.normal.count}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Normal (≤15%)
                          </p>
                        </div>
                        <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {qualityData.summary.caution.count}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Caution (15-30%)
                          </p>
                        </div>
                        <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {qualityData.summary.flagged.count}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Flagged (&gt;30%)
                          </p>
                        </div>
                      </div>

                      {qualityData.flaggedStudents.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">
                            Flagged Students
                          </h4>
                          <div className="max-h-[200px] overflow-y-auto space-y-2">
                            {qualityData.flaggedStudents
                              .slice(0, 10)
                              .map((student, idx) => (
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
                                And {qualityData.flaggedStudents.length - 10}{" "}
                                more...
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
                Quality data from {qualityData.termTested}. Total assessments:{" "}
                {qualityData.summary.total}
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
                  <p className="text-sm">
                    Benchmark transitions are only tracked for G3-G5
                  </p>
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
                      <h3 className="font-medium text-sm mb-1">
                        Transition Period
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {transitionPeriod === "fall-to-spring"
                          ? "Track benchmark changes within the same academic year"
                          : "Track benchmark changes across academic years (students advance one grade)"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {TRANSITION_PERIODS.map((period) => {
                        // G3 cross-grade not available (G2 has no Benchmark classification)
                        const isDisabled =
                          period.id === "spring-to-fall" && selectedGrade === 3;
                        return (
                          <Button
                            key={period.id}
                            size="sm"
                            variant={
                              transitionPeriod === period.id
                                ? "default"
                                : "outline"
                            }
                            onClick={() =>
                              handleTransitionPeriodChange(period.id)
                            }
                            disabled={loadingStates.transitions || isDisabled}
                            title={
                              isDisabled
                                ? "G3 cross-grade not available (G2 has no Benchmark classification)"
                                : period.description
                            }
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
                      <strong>Within-year (Fall → Spring):</strong> Benchmark
                      changes within the same academic year, using the same
                      grade thresholds
                    </p>
                    <p>
                      <strong>Cross-grade (Spring → Fall):</strong> Benchmark
                      changes across academic years, students advance one grade
                      and use new grade thresholds
                    </p>
                    {transitionPeriod === "spring-to-fall" && (
                      <p className="text-amber-600 dark:text-amber-400">
                        Note: G{selectedGrade} students were G
                        {selectedGrade - 1} in Spring 24-25, using G
                        {selectedGrade - 1} benchmark thresholds for the
                        starting point
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {loadingStates.transitions && renderSkeleton(1)}
              {errorStates.transitions && renderError(errorStates.transitions)}
              {!loadingStates.transitions &&
                !errorStates.transitions &&
                transitionData && (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Benchmark Transition ({transitionData.fromTerm} →{" "}
                          {transitionData.toTerm})
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
                            Improved (
                            {transitionData.summary.improved.percentage}%)
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
                            Declined (
                            {transitionData.summary.declined.percentage}%)
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
