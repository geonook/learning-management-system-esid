"use client";

/**
 * MAP Growth Analysis Page
 *
 * 位置: /browse/stats/map
 * 顯示 MAP Growth 統計分析，包括：
 * - Growth Trend Line Charts (Language Usage, Reading, Average)
 * - Benchmark Distribution Donut Chart
 * - Overview Table
 */

import { useState, useEffect } from "react";
import { Target, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapGrowthLineChart,
  MapBenchmarkDonutChart,
  MapOverviewTable,
} from "@/components/map/charts";
import {
  getMapAnalyticsData,
  type MapAnalyticsData,
} from "@/lib/api/map-analytics";
import { isBenchmarkSupported } from "@/lib/map/benchmarks";

const SUPPORTED_GRADES = [3, 4, 5, 6];

export default function MapAnalysisPage() {
  const [selectedGrade, setSelectedGrade] = useState(5);
  const [data, setData] = useState<MapAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (grade: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMapAnalyticsData({ grade });
      setData(result);
    } catch (err) {
      console.error("Error fetching MAP analytics:", err);
      setError("Failed to load MAP analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedGrade);
  }, [selectedGrade]);

  const handleGradeChange = (value: string) => {
    setSelectedGrade(parseInt(value, 10));
  };

  const handleRefresh = () => {
    fetchData(selectedGrade);
  };

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
              G3-G6 Reading &amp; Language Usage Performance by English Level
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
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

      {/* Error State */}
      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-6">
          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
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
          {/* Bottom Section Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[280px]" />
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[280px]" />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!loading && data && (
        <div className="space-y-6">
          {/* Growth Trend Charts (3 columns) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.chartData.map((chart) => (
              <Card key={`${chart.grade}-${chart.course}`}>
                <CardContent className="pt-4">
                  <MapGrowthLineChart data={chart} showNorm />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bottom Section: Benchmark Donut + Overview Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Benchmark Distribution (only for G3-G5) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Benchmark Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {isBenchmarkSupported(selectedGrade) ? (
                  <MapBenchmarkDonutChart data={data.benchmarkDistribution} />
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                    <p>G6 does not have benchmark classification</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Overview Table */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Overview Table</CardTitle>
              </CardHeader>
              <CardContent>
                <MapOverviewTable
                  data={data.overviewTable}
                  normComparison={data.normComparison}
                  grade={selectedGrade}
                />
              </CardContent>
            </Card>
          </div>

          {/* Data Info */}
          {data.terms.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Data includes {data.terms.length} term(s):{" "}
              {data.terms
                .map((t) => {
                  const match = t.match(/^(Fall|Spring)\s+(\d{4})-(\d{4})$/);
                  if (!match) return t;
                  return `${match[1]} ${match[2]?.slice(2)}-${match[3]?.slice(2)}`;
                })
                .join(", ")}
            </p>
          )}
        </div>
      )}

      {/* No Data State */}
      {!loading && !error && data && data.chartData.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Target className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No MAP data available</p>
              <p className="text-sm">
                There is no MAP assessment data for Grade {selectedGrade}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
