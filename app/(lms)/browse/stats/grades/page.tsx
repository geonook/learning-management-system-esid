"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { TrendingUp, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getGradeLevelStatistics } from "@/lib/api/statistics";
import { formatNumber, formatPercentage } from "@/lib/statistics/calculations";
import type { GradeLevelStatistics, CourseType } from "@/types/statistics";
import { Skeleton } from "@/components/ui/skeleton";
import { StatisticsActionButtons } from "@/components/statistics/ActionButtons";
import { GradeComparisonChart } from "@/components/statistics/charts";
import type { ColumnDefinition } from "@/lib/utils/clipboard";

export default function GradeLevelComparisonPage() {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<GradeLevelStatistics[]>([]);
  const [selectedCourseType, setSelectedCourseType] = useState<CourseType>("LT");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data = await getGradeLevelStatistics(selectedCourseType);
        setStatistics(data);
      } catch (error) {
        console.error("Failed to fetch grade level statistics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedCourseType]);

  const courseTypes: CourseType[] = ["LT", "IT", "KCFS"];

  const getCourseColor = (ct: CourseType) => {
    switch (ct) {
      case "LT": return "#06b6d4";
      case "IT": return "#6366f1";
      case "KCFS": return "#ec4899";
    }
  };

  // Column definitions for copy/export
  const columns: ColumnDefinition<GradeLevelStatistics>[] = [
    { key: "grade_level", header: "Grade Level" },
    { key: "class_count", header: "Classes" },
    { key: "student_count", header: "Students" },
    { key: "term_grade_avg", header: "Term Grade Avg", format: (v) => formatNumber(v as number | null) },
    { key: "max", header: "Max", format: (v) => formatNumber(v as number | null) },
    { key: "min", header: "Min", format: (v) => formatNumber(v as number | null) },
    { key: "std_dev", header: "Std Dev", format: (v) => formatNumber(v as number | null) },
    { key: "fa_avg", header: "F.A. Avg", format: (v) => formatNumber(v as number | null) },
    { key: "sa_avg", header: "S.A. Avg", format: (v) => formatNumber(v as number | null) },
    { key: "pass_rate", header: "Pass Rate", format: (v) => formatPercentage(v as number | null) },
    { key: "excellent_rate", header: "Excellent Rate", format: (v) => formatPercentage(v as number | null) },
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
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-500 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">
                  Grade Level Comparison
                </h1>
                <p className="text-sm text-text-secondary">
                  Compare G1-G6 performance trends across grade levels
                </p>
              </div>
            </div>
          </div>
          <StatisticsActionButtons
            data={statistics}
            loading={loading}
            columns={columns}
            exportOptions={{
              filename: `grade-comparison-${selectedCourseType.toLowerCase()}`,
              sheetName: `${selectedCourseType} Grade Comparison`
            }}
          />
        </div>

        {/* Course Type Tabs */}
        <div className="flex gap-2">
          {courseTypes.map((ct) => (
            <button
              key={ct}
              onClick={() => setSelectedCourseType(ct)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCourseType === ct
                  ? ct === "LT"
                    ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400"
                    : ct === "IT"
                    ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                    : "bg-pink-500/20 text-pink-600 dark:text-pink-400"
                  : "bg-surface-secondary text-text-secondary hover:bg-surface-hover"
              }`}
            >
              {ct}
            </button>
          ))}
        </div>

        {/* Chart Section */}
        <GradeComparisonChart
          data={statistics}
          loading={loading}
          title={`${selectedCourseType} Grade Level Performance`}
          barColor={getCourseColor(selectedCourseType)}
        />

        {/* Results Count */}
        <div className="text-sm text-text-secondary">
          Showing {statistics.length} grade levels for {selectedCourseType} courses
        </div>

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
                    Classes
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary">
                    Students
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary">
                    Term Grade Avg
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary">
                    Max
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary">
                    Min
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary">
                    Std Dev
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary">
                    F.A. Avg
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary">
                    S.A. Avg
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary">
                    Pass Rate
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary">
                    Excellent Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border-subtle">
                      <td className="p-4">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-8 ml-auto" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-10 ml-auto" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-12 ml-auto" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-10 ml-auto" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-10 ml-auto" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-10 ml-auto" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-12 ml-auto" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-12 ml-auto" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : statistics.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="p-8 text-center text-text-tertiary"
                    >
                      No statistics available for {selectedCourseType} courses
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
                      <td className="p-4 text-right text-text-secondary">
                        {stat.class_count}
                      </td>
                      <td className="p-4 text-right text-text-primary">
                        {stat.student_count}
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={
                            stat.term_grade_avg !== null
                              ? stat.term_grade_avg >= 90
                                ? "text-green-600 dark:text-green-400 font-medium"
                                : stat.term_grade_avg >= 80
                                ? "text-blue-600 dark:text-blue-400"
                                : stat.term_grade_avg >= 60
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-red-600 dark:text-red-400"
                              : "text-text-tertiary"
                          }
                        >
                          {formatNumber(stat.term_grade_avg)}
                        </span>
                      </td>
                      <td className="p-4 text-right text-text-secondary">
                        {formatNumber(stat.max)}
                      </td>
                      <td className="p-4 text-right text-text-secondary">
                        {formatNumber(stat.min)}
                      </td>
                      <td className="p-4 text-right text-text-secondary">
                        {formatNumber(stat.std_dev)}
                      </td>
                      <td className="p-4 text-right text-text-secondary">
                        {formatNumber(stat.fa_avg)}
                      </td>
                      <td className="p-4 text-right text-text-secondary">
                        {formatNumber(stat.sa_avg)}
                      </td>
                      <td className="p-4 text-right text-text-secondary">
                        {formatPercentage(stat.pass_rate)}
                      </td>
                      <td className="p-4 text-right text-text-secondary">
                        {formatPercentage(stat.excellent_rate)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
          <p className="text-text-secondary text-sm">
            <strong>Note:</strong> Grade levels follow the format G[1-6]E[1-3],
            where G indicates Grade (1-6) and E indicates English proficiency
            level (E1=highest, E3=lowest). Statistics are aggregated across all
            classes within each grade level.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
