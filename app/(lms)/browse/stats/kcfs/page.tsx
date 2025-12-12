"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Star, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getGradeLevelSummary } from "@/lib/api/statistics";
import { formatNumber, formatPercentage } from "@/lib/statistics/calculations";
import type { GradeLevelSummary } from "@/types/statistics";
import { Skeleton } from "@/components/ui/skeleton";
import { StatisticsActionButtons } from "@/components/statistics/ActionButtons";
import { TrendLineChart, DonutProgressChart, StackedGradeChart } from "@/components/statistics/charts";
import type { ColumnDefinition } from "@/lib/utils/clipboard";
import { GlobalFilterBar, useGlobalFilters } from "@/components/filters";

export default function KCFSAnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<GradeLevelSummary[]>([]);
  const { academicYear, termForApi } = useGlobalFilters();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data = await getGradeLevelSummary("KCFS", {
          academic_year: academicYear,
          term: termForApi,
        });
        setStatistics(data);
      } catch (error) {
        console.error("Failed to fetch KCFS statistics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [academicYear, termForApi]);

  // Calculate totals
  const totals = statistics.reduce(
    (acc, stat) => ({
      students: acc.students + stat.total_students,
      grades: [...acc.grades, stat.grade_avg].filter((g): g is number => g !== null),
      passRates: [...acc.passRates, stat.pass_rate].filter((p): p is number => p !== null),
      excellentRates: [...acc.excellentRates, stat.excellent_rate].filter((e): e is number => e !== null),
    }),
    { students: 0, grades: [] as number[], passRates: [] as number[], excellentRates: [] as number[] }
  );

  const overallAvg = totals.grades.length > 0
    ? totals.grades.reduce((a, b) => a + b, 0) / totals.grades.length
    : null;

  const overallPassRate = totals.passRates.length > 0
    ? totals.passRates.reduce((a, b) => a + b, 0) / totals.passRates.length
    : null;

  const overallExcellentRate = totals.excellentRates.length > 0
    ? totals.excellentRates.reduce((a, b) => a + b, 0) / totals.excellentRates.length
    : null;

  // Column definitions for copy/export
  const columns: ColumnDefinition<GradeLevelSummary>[] = [
    { key: "grade_level", header: "Grade Level" },
    { key: "total_students", header: "Total Students" },
    { key: "grade_avg", header: "Grade Avg", format: (v) => formatNumber(v as number | null) },
    { key: "pass_rate", header: "Pass Rate", format: (v) => formatPercentage(v as number | null) },
    { key: "excellent_rate", header: "Excellent Rate", format: (v) => formatPercentage(v as number | null) },
    { key: "std_dev", header: "Std Dev", format: (v) => formatNumber(v as number | null) },
  ];

  return (
    <AuthGuard requiredRoles={["admin", "head", "office_member"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/browse/stats"
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-text-secondary" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500/20 rounded-lg">
                <Star className="w-6 h-6 text-pink-500 dark:text-pink-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">
                  KCFS Analysis
                </h1>
                <p className="text-sm text-text-secondary">
                  Kang Chiao Future Skills (KCFS) course statistics by grade level
                </p>
              </div>
            </div>
          </div>
          <StatisticsActionButtons
            data={statistics}
            loading={loading}
            columns={columns}
            exportOptions={{ filename: "kcfs-analysis", sheetName: "KCFS Statistics" }}
          />
        </div>

        {/* Global Filters (Year + Term) */}
        <GlobalFilterBar showYear showTerm />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="text-sm text-text-secondary mb-1">Total Students</div>
            <div className="text-2xl font-bold text-text-primary">
              {loading ? <Skeleton className="h-8 w-20" /> : totals.students.toLocaleString()}
            </div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="text-sm text-text-secondary mb-1">Grade Levels</div>
            <div className="text-2xl font-bold text-text-primary">
              {loading ? <Skeleton className="h-8 w-12" /> : statistics.length}
            </div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="text-sm text-text-secondary mb-1">Overall Average</div>
            <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
              {loading ? <Skeleton className="h-8 w-16" /> : formatNumber(overallAvg)}
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrendLineChart
            data={statistics}
            loading={loading}
            title="KCFS Grade Trends"
            color="#ec4899"
          />
          <DonutProgressChart
            passRate={overallPassRate}
            excellentRate={overallExcellentRate}
            loading={loading}
            title="KCFS Pass Rate Overview"
            color="#ec4899"
          />
        </div>

        <StackedGradeChart
          data={statistics}
          loading={loading}
          title="KCFS Student Distribution by Level"
        />

        {/* Statistics Table */}
        <div className="bg-surface-secondary rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default bg-surface-elevated/50">
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">
                    Grade Level
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary">
                    Total Students
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary">
                    Grade Avg
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary">
                    Pass Rate
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary">
                    Excellent Rate
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary">
                    Std Dev
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border-subtle">
                      <td className="p-4">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-12 ml-auto" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-14 ml-auto" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-12 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : statistics.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-text-tertiary"
                    >
                      No KCFS course statistics available
                    </td>
                  </tr>
                ) : (
                  statistics.map((stat) => (
                    <tr
                      key={stat.grade_level}
                      className="border-b border-border-subtle hover:bg-surface-hover transition-colors"
                    >
                      <td className="p-4 text-text-primary font-medium">
                        {stat.grade_level}
                      </td>
                      <td className="p-4 text-right text-text-primary">
                        {stat.total_students}
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={
                            stat.grade_avg !== null
                              ? stat.grade_avg >= 90
                                ? "text-green-600 dark:text-green-400 font-medium"
                                : stat.grade_avg >= 80
                                ? "text-blue-600 dark:text-blue-400"
                                : stat.grade_avg >= 60
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-red-600 dark:text-red-400"
                              : "text-text-tertiary"
                          }
                        >
                          {formatNumber(stat.grade_avg)}
                        </span>
                      </td>
                      <td className="p-4 text-right text-text-secondary">
                        {formatPercentage(stat.pass_rate)}
                      </td>
                      <td className="p-4 text-right text-text-secondary">
                        {formatPercentage(stat.excellent_rate)}
                      </td>
                      <td className="p-4 text-right text-text-secondary">
                        {formatNumber(stat.std_dev)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4">
          <p className="text-text-secondary text-sm">
            <strong>KCFS (Kang Chiao Future Skills):</strong> These courses focus
            on 21st-century skills including critical thinking, creativity,
            collaboration, and communication. KCFS courses follow their own
            curriculum and assessment standards distinct from LT and IT courses.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
