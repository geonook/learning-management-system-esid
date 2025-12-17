"use client";

import { useState, useEffect, useMemo } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuthReady } from "@/hooks/useAuthReady";
import { Trophy, Download } from "lucide-react";
import { HeadGradeBandBreadcrumb } from "@/components/ui/breadcrumb";
import { getGradeBandClassRanking } from "@/lib/api/gradeband-statistics";
import { parseGradeBand, getGradeBandDisplay } from "@/lib/utils/gradeband";
import {
  formatNumber,
  formatPercentage,
  formatVsAverage,
  getPerformanceEmoji,
} from "@/lib/statistics/calculations";
import type { ClassRanking, GradeLevelAverage, CourseType } from "@/types/statistics";
import { Skeleton } from "@/components/ui/skeleton";
import { GlobalFilterBar, useGlobalFilters } from "@/components/filters";

export default function GradeBandClassRankingPage() {
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState<ClassRanking[]>([]);
  const [gradeAverage, setGradeAverage] = useState<GradeLevelAverage | null>(null);
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

  // Fetch rankings when filters change
  useEffect(() => {
    if (!isReady || !gradeBand || selectedGrade === null) return;

    async function fetchData() {
      if (!gradeBand) return;
      setLoading(true);
      try {
        // Construct grade level string (e.g., "G3" for grade 3)
        const gradeLevelPrefix = `G${selectedGrade}`;

        const result = await getGradeBandClassRanking(
          {
            grade_band: gradeBand,
            course_type: selectedCourseType,
            academic_year: academicYear,
            term: termForApi,
          },
          "term_avg"
        );

        // Filter rankings to only show selected grade
        const filteredRankings = result.rankings.filter((r) =>
          r.class_name.startsWith(gradeLevelPrefix)
        );

        // Re-rank after filtering
        const rerankedRankings = filteredRankings.map((r, idx) => ({
          ...r,
          rank: idx + 1,
        }));

        setRankings(rerankedRankings);
        setGradeAverage(result.gradeAverage);
      } catch (error) {
        console.error("Failed to fetch class rankings:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isReady, gradeBand, selectedGrade, selectedCourseType, academicYear, termForApi]);

  // Show message if no grade band assigned
  if (isReady && !gradeBand) {
    return (
      <AuthGuard requiredRoles={["admin", "head"]}>
        <div className="space-y-6">
          <HeadGradeBandBreadcrumb currentPage="Class Ranking" />
          <h1 className="text-2xl font-bold text-text-primary">Class Ranking</h1>
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
          currentPage="Class Ranking"
          gradeBandDisplay={gradeBandDisplay}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Trophy className="w-6 h-6 text-amber-500 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                Class Ranking
              </h1>
              <p className="text-sm text-text-secondary">
                Class rankings within {gradeBandDisplay}
              </p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-secondary border border-border-default rounded-lg text-text-secondary hover:bg-surface-hover transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>

        {/* Global Filters (Year + Term) */}
        <GlobalFilterBar showYear showTerm />

        {/* Filters */}
        <div className="flex flex-wrap gap-6">
          {/* Grade Filter (only grades in grade band) */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Grade
            </label>
            <div className="flex gap-2">
              {availableGrades.map((grade) => (
                <button
                  key={grade}
                  onClick={() => setSelectedGrade(grade)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedGrade === grade
                      ? "bg-purple-600 dark:bg-purple-500 text-white"
                      : "bg-surface-secondary text-text-secondary hover:bg-surface-hover"
                  }`}
                >
                  {`G${grade}`}
                </button>
              ))}
            </div>
          </div>

          {/* Course Type Filter */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Course Type
            </label>
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
          </div>
        </div>

        {/* Grade Average Summary */}
        {gradeAverage && gradeAverage.term_avg > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                G{selectedGrade} {selectedCourseType} Average
              </span>
              <span className="text-text-secondary ml-2">
                ({gradeAverage.student_count} students)
              </span>
            </div>
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatNumber(gradeAverage.term_avg)}
            </span>
          </div>
        )}

        {/* Rankings Table */}
        <div className="bg-surface-secondary rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default bg-surface-elevated/50">
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">
                    Rank
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">
                    Class
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary">
                    Term Avg
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary">
                    Students
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary">
                    Pass Rate
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary">
                    Excellent Rate
                  </th>
                  <th className="text-center p-4 text-sm font-medium text-text-secondary">
                    Performance
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary">
                    vs Grade Avg
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border-subtle">
                      <td className="p-4">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-4 w-32" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-14 ml-auto" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-10 ml-auto" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </td>
                      <td className="p-4 text-center">
                        <Skeleton className="h-4 w-20 mx-auto" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-14 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : rankings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-8 text-center text-text-tertiary"
                    >
                      No ranking data available for G{selectedGrade} {selectedCourseType}
                    </td>
                  </tr>
                ) : (
                  rankings.map((rank) => (
                    <tr
                      key={rank.class_id}
                      className="border-b border-border-subtle hover:bg-surface-hover transition-colors"
                    >
                      <td className="p-4">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={`text-lg ${
                              rank.rank === 1
                                ? "text-amber-500"
                                : rank.rank === 2
                                ? "text-slate-400"
                                : rank.rank === 3
                                ? "text-amber-700 dark:text-amber-600"
                                : "text-text-secondary"
                            }`}
                          >
                            {rank.rank <= 3 ? ["🥇", "🥈", "🥉"][rank.rank - 1] : `#${rank.rank}`}
                          </span>
                        </span>
                      </td>
                      <td className="p-4 text-text-primary font-medium">
                        {rank.class_name}
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={
                            rank.term_avg !== null
                              ? rank.term_avg >= 90
                                ? "text-green-600 dark:text-green-400 font-medium"
                                : rank.term_avg >= 80
                                ? "text-blue-600 dark:text-blue-400"
                                : rank.term_avg >= 60
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-red-600 dark:text-red-400"
                              : "text-text-tertiary"
                          }
                        >
                          {formatNumber(rank.term_avg)}
                        </span>
                      </td>
                      <td className="p-4 text-right text-text-primary">
                        {rank.student_count}
                      </td>
                      <td className="p-4 text-right text-text-secondary">
                        {formatPercentage(rank.pass_rate)}
                      </td>
                      <td className="p-4 text-right text-text-secondary">
                        {formatPercentage(rank.excellent_rate)}
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1">
                          <span>{getPerformanceEmoji(rank.term_avg)}</span>
                          <span className="text-text-secondary text-sm capitalize">
                            {rank.performance.replace("_", " ")}
                          </span>
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={
                            rank.vs_grade_avg !== null
                              ? rank.vs_grade_avg >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                              : "text-text-tertiary"
                          }
                        >
                          {formatVsAverage(rank.vs_grade_avg)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <p className="text-text-secondary text-sm">
            <strong>Ranking Rules:</strong> Classes are ranked within the same
            grade level and course type only. Rankings are scoped to your
            grade band ({gradeBandDisplay}). The &quot;vs Grade Avg&quot; column shows
            how each class performs relative to the grade level average.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
