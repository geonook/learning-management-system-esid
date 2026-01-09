"use client";

import { useState, useEffect, useMemo } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuthReady } from "@/hooks/useAuthReady";
import { School, Search } from "lucide-react";
import { HeadGradeBandBreadcrumb } from "@/components/ui/breadcrumb";
import { getGradeBandClassStatistics } from "@/lib/api/gradeband-statistics";
import { parseGradeBand, getGradeBandDisplay } from "@/lib/utils/gradeband";
import { formatNumber, formatPercentage } from "@/lib/statistics/calculations";
import type { ClassStatistics, CourseType } from "@/types/statistics";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { StatisticsActionButtons } from "@/components/statistics/ActionButtons";
import { ClassDistributionChart, RankingBarChart } from "@/components/statistics/charts";
import type { ColumnDefinition } from "@/lib/utils/clipboard";
import { GlobalFilterBar, useGlobalFilters } from "@/components/filters";

export default function GradeBandClassStatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<ClassStatistics[]>([]);
  const [filteredStats, setFilteredStats] = useState<ClassStatistics[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedCourseType, setSelectedCourseType] = useState<CourseType>("LT");
  const { academicYear, termForApi } = useGlobalFilters();
  const { isReady, permissions, role } = useAuthReady();

  // Get grade_band and track from user permissions
  const gradeBand = permissions?.grade ?? null;
  const gradeBandDisplay = gradeBand ? getGradeBandDisplay(gradeBand) : "";
  const availableGrades = useMemo(
    () => (gradeBand ? parseGradeBand(gradeBand) : []),
    [gradeBand]
  );

  // Track permission: Head Teachers only see their assigned track
  const headTeacherTrack = permissions?.track as CourseType | null;
  const isAdmin = role === "admin";

  // Filter course types based on permissions
  const courseTypes: CourseType[] = (isAdmin || !headTeacherTrack)
    ? ["LT", "IT", "KCFS"]
    : [headTeacherTrack];

  // Sync selectedCourseType to Head Teacher's track on mount
  useEffect(() => {
    if (headTeacherTrack && !courseTypes.includes(selectedCourseType)) {
      setSelectedCourseType(headTeacherTrack);
    }
  }, [headTeacherTrack, courseTypes, selectedCourseType]);

  // Set default grade when available grades are loaded
  useEffect(() => {
    if (availableGrades.length > 0 && selectedGrade === null) {
      const firstGrade = availableGrades[0];
      if (firstGrade !== undefined) {
        setSelectedGrade(firstGrade);
      }
    }
  }, [availableGrades, selectedGrade]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch data with filters
  useEffect(() => {
    if (!isReady || !gradeBand || selectedGrade === null) return;

    async function fetchData() {
      if (!gradeBand) return;
      setLoading(true);
      try {
        const data = await getGradeBandClassStatistics({
          grade_band: gradeBand,
          course_type: selectedCourseType,
          academic_year: academicYear,
          term: termForApi,
        });
        // Filter by selected grade client-side
        const gradeFiltered = data.filter((s) => {
          const gradeMatch = s.class_name.match(/G(\d+)/);
          return gradeMatch && gradeMatch[1] && parseInt(gradeMatch[1], 10) === selectedGrade;
        });
        setStatistics(gradeFiltered);
      } catch (error) {
        console.error("Failed to fetch class statistics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isReady, gradeBand, selectedGrade, selectedCourseType, academicYear, termForApi]);

  // Filter by search (client-side only for search)
  useEffect(() => {
    if (!debouncedSearch) {
      setFilteredStats(statistics);
    } else {
      const query = debouncedSearch.toLowerCase();
      setFilteredStats(
        statistics.filter(
          (s) =>
            s.class_name.toLowerCase().includes(query) ||
            s.grade_level.toLowerCase().includes(query)
        )
      );
    }
  }, [statistics, debouncedSearch]);

  // Column definitions for copy/export
  const columns: ColumnDefinition<ClassStatistics>[] = [
    { key: "class_name", header: "Class" },
    { key: "subject_type", header: "Course" },
    { key: "grade_level", header: "Level" },
    { key: "student_count", header: "Students" },
    { key: "term_grade_avg", header: "Term Avg", format: (v) => formatNumber(v as number | null) },
    { key: "max", header: "Max", format: (v) => formatNumber(v as number | null) },
    { key: "min", header: "Min", format: (v) => formatNumber(v as number | null) },
    { key: "std_dev", header: "Std Dev", format: (v) => formatNumber(v as number | null) },
    { key: "fa_avg", header: "F.A. Avg", format: (v) => formatNumber(v as number | null) },
    { key: "sa_avg", header: "S.A. Avg", format: (v) => formatNumber(v as number | null) },
    { key: "pass_rate", header: "Pass Rate", format: (v) => formatPercentage(v as number | null) },
    { key: "excellent_rate", header: "Excellent", format: (v) => formatPercentage(v as number | null) },
  ];

  // Show message if no grade band assigned
  if (isReady && !gradeBand) {
    return (
      <AuthGuard requiredRoles={["admin", "head"]}>
        <div className="space-y-6">
          <HeadGradeBandBreadcrumb currentPage="Class Statistics" />
          <h1 className="text-2xl font-bold text-text-primary">Class Statistics</h1>
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
        {/* Breadcrumb */}
        <HeadGradeBandBreadcrumb
          currentPage="Class Statistics"
          gradeBandDisplay={gradeBandDisplay}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <School className="w-6 h-6 text-green-500 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                Class Statistics
              </h1>
              <p className="text-sm text-text-secondary">
                LT/IT/KCFS statistics for {gradeBandDisplay}
              </p>
            </div>
          </div>
          <StatisticsActionButtons
            data={filteredStats}
            loading={loading}
            columns={columns}
            exportOptions={{
              filename: `gradeband-class-statistics-${selectedCourseType.toLowerCase()}-g${selectedGrade}`,
              sheetName: `${gradeBandDisplay} ${selectedCourseType} Classes`
            }}
          />
        </div>

        {/* Global Filters (Year + Term) */}
        <GlobalFilterBar showYear showTerm compact />

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <Input
            placeholder="Search by class name or grade level..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-surface-secondary border-border-default text-text-primary placeholder:text-text-tertiary"
          />
        </div>

        {/* Filters - Unified solid button style */}
        <div className="flex flex-wrap gap-6">
          {/* Course Type Filter */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-text-secondary font-medium">Course:</span>
            {courseTypes.map((ct) => (
              <button
                key={ct}
                onClick={() => setSelectedCourseType(ct)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-normal ease-apple ${
                  selectedCourseType === ct
                    ? ct === "LT"
                      ? "bg-emerald-500 text-white dark:text-white"
                      : ct === "IT"
                      ? "bg-blue-500 text-white dark:text-white"
                      : "bg-purple-500 text-white dark:text-white"
                    : "bg-surface-tertiary text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                }`}
              >
                {ct}
              </button>
            ))}
          </div>

          {/* Grade Filter (only grades in grade band) */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-text-secondary font-medium">Grade:</span>
            {availableGrades.map((grade) => (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-normal ease-apple ${
                  selectedGrade === grade
                    ? "bg-purple-600 dark:bg-purple-500 text-white dark:text-white"
                    : "bg-surface-tertiary text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                }`}
              >
                {`G${grade}`}
              </button>
            ))}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ClassDistributionChart
            data={filteredStats}
            loading={loading}
            title={`G${selectedGrade} ${selectedCourseType} Score Distribution`}
            color={selectedCourseType === "LT" ? "#06b6d4" : selectedCourseType === "IT" ? "#6366f1" : "#ec4899"}
          />
          <RankingBarChart
            data={filteredStats}
            loading={loading}
            title={`G${selectedGrade} ${selectedCourseType} Top Classes`}
            topN={5}
          />
        </div>

        {/* Results Count */}
        <div className="text-sm text-text-secondary">
          Showing {filteredStats.length} class records
          {` for ${selectedCourseType} courses in Grade ${selectedGrade}`}
        </div>

        {/* Statistics Table */}
        <div className="bg-surface-secondary rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default bg-surface-elevated/50">
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">
                    Class
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">
                    Course
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">
                    Level
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary">
                    Students
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary">
                    Term Avg
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
                    Excellent
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-border-subtle">
                      <td className="p-4">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-12" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-12" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-8 ml-auto" />
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
                        <Skeleton className="h-4 w-14 ml-auto" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-14 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredStats.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="p-8 text-center text-text-tertiary"
                    >
                      {debouncedSearch
                        ? `No classes match "${debouncedSearch}"`
                        : "No statistics available"}
                    </td>
                  </tr>
                ) : (
                  filteredStats.map((stat) => (
                    <tr
                      key={`${stat.class_id}-${stat.subject_type}`}
                      className="border-b border-border-subtle hover:bg-surface-hover transition-colors"
                    >
                      <td className="p-4 text-text-primary font-medium">
                        {stat.class_name}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                            stat.subject_type === "LT"
                              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : stat.subject_type === "IT"
                              ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                              : "bg-purple-500/20 text-purple-600 dark:text-purple-400"
                          }`}
                        >
                          {stat.subject_type}
                        </span>
                      </td>
                      <td className="p-4 text-text-secondary">
                        {stat.grade_level}
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
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-text-secondary text-sm">
            <strong>Column Definitions:</strong> Term Avg = weighted average
            (FA 15% + SA 20% + Midterm 10%). F.A. Avg = Formative Assessment average
            (FA1-FA8). S.A. Avg = Summative Assessment average (SA1-SA4). Pass Rate
            = students with ≥60. Excellent = students with ≥90.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
