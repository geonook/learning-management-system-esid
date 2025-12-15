"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuthReady } from "@/hooks/useAuthReady";
import { BookOpen, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getGradeBandGradeLevelSummary } from "@/lib/api/gradeband-statistics";
import { getGradeBandDisplay } from "@/lib/utils/gradeband";
import { formatNumber, formatPercentage } from "@/lib/statistics/calculations";
import type { GradeLevelSummary, CourseType } from "@/types/statistics";
import { Skeleton } from "@/components/ui/skeleton";
import { StatisticsActionButtons } from "@/components/statistics/ActionButtons";
import { TrendLineChart, DonutProgressChart, StackedGradeChart } from "@/components/statistics/charts";
import type { ColumnDefinition } from "@/lib/utils/clipboard";
import { GlobalFilterBar, useGlobalFilters } from "@/components/filters";

const courseTypeConfig = {
  LT: {
    name: "Local Teacher (LT)",
    description: "Local Teacher course statistics",
    color: "#06b6d4",
    bgClass: "bg-cyan-500/20",
    textClass: "text-cyan-500 dark:text-cyan-400",
    selectedClass: "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400",
    infoBoxClass: "bg-cyan-500/10 border-cyan-500/20",
  },
  IT: {
    name: "International Teacher (IT)",
    description: "International Teacher course statistics",
    color: "#6366f1",
    bgClass: "bg-indigo-500/20",
    textClass: "text-indigo-500 dark:text-indigo-400",
    selectedClass: "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400",
    infoBoxClass: "bg-indigo-500/10 border-indigo-500/20",
  },
  KCFS: {
    name: "KCFS",
    description: "Kang Chiao Future Skills course statistics",
    color: "#ec4899",
    bgClass: "bg-pink-500/20",
    textClass: "text-pink-500 dark:text-pink-400",
    selectedClass: "bg-pink-500/20 text-pink-600 dark:text-pink-400",
    infoBoxClass: "bg-pink-500/10 border-pink-500/20",
  },
};

export default function GradeBandCourseAnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<GradeLevelSummary[]>([]);
  const [selectedCourseType, setSelectedCourseType] = useState<CourseType>("LT");
  const { academicYear, termForApi } = useGlobalFilters();
  const { isReady, permissions } = useAuthReady();

  // Get grade_band from user permissions
  const gradeBand = permissions?.grade ?? null;
  const gradeBandDisplay = gradeBand ? getGradeBandDisplay(gradeBand) : "";

  const courseTypes: CourseType[] = ["LT", "IT", "KCFS"];
  const config = courseTypeConfig[selectedCourseType];

  useEffect(() => {
    if (!isReady || !gradeBand) return;

    async function fetchData() {
      setLoading(true);
      try {
        const data = await getGradeBandGradeLevelSummary(
          {
            grade_band: gradeBand!,
            academic_year: academicYear,
            term: termForApi,
          },
          selectedCourseType
        );
        setStatistics(data);
      } catch (error) {
        console.error(`Failed to fetch ${selectedCourseType} statistics:`, error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isReady, gradeBand, selectedCourseType, academicYear, termForApi]);

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

  // Show message if no grade band assigned
  if (isReady && !gradeBand) {
    return (
      <AuthGuard requiredRoles={["admin", "head"]}>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link
              href="/head/gradeband"
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-text-secondary" />
            </Link>
            <h1 className="text-2xl font-bold text-text-primary">Course Analysis</h1>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
            <p className="text-text-secondary">
              No grade band assigned. Please contact an administrator.
            </p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRoles={["admin", "head"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/head/gradeband"
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-text-secondary" />
            </Link>
            <div className="flex items-center gap-3">
              <div className={`p-2 ${config.bgClass} rounded-lg`}>
                <BookOpen className={`w-6 h-6 ${config.textClass}`} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">
                  Course Analysis
                </h1>
                <p className="text-sm text-text-secondary">
                  {config.description} for {gradeBandDisplay}
                </p>
              </div>
            </div>
          </div>
          <StatisticsActionButtons
            data={statistics}
            loading={loading}
            columns={columns}
            exportOptions={{
              filename: `gradeband-${selectedCourseType.toLowerCase()}-analysis`,
              sheetName: `${gradeBandDisplay} ${selectedCourseType} Statistics`
            }}
          />
        </div>

        {/* Global Filters (Year + Term) */}
        <GlobalFilterBar showYear showTerm />

        {/* Course Type Tabs */}
        <div className="flex gap-2">
          {courseTypes.map((ct) => (
            <button
              key={ct}
              onClick={() => setSelectedCourseType(ct)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCourseType === ct
                  ? courseTypeConfig[ct].selectedClass
                  : "bg-surface-secondary text-text-secondary hover:bg-surface-hover"
              }`}
            >
              {ct}
            </button>
          ))}
        </div>

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
            <div className={`text-2xl font-bold ${config.textClass}`}>
              {loading ? <Skeleton className="h-8 w-16" /> : formatNumber(overallAvg)}
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrendLineChart
            data={statistics}
            loading={loading}
            title={`${gradeBandDisplay} ${selectedCourseType} Grade Trends`}
            color={config.color}
          />
          <DonutProgressChart
            passRate={overallPassRate}
            excellentRate={overallExcellentRate}
            loading={loading}
            title={`${selectedCourseType} Pass Rate Overview`}
            color={config.color}
          />
        </div>

        <StackedGradeChart
          data={statistics}
          loading={loading}
          title={`${selectedCourseType} Student Distribution by Level`}
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
                  Array.from({ length: 4 }).map((_, i) => (
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
                      No {selectedCourseType} course statistics available for {gradeBandDisplay}
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
        <div className={`${config.infoBoxClass} border rounded-xl p-4`}>
          <p className="text-text-secondary text-sm">
            <strong>{config.name} Courses:</strong> Statistics are aggregated
            for your grade band ({gradeBandDisplay}). Pass rate indicates students
            scoring ≥60, excellent rate indicates students scoring ≥90. Standard
            deviation shows the spread of scores within each grade level.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
