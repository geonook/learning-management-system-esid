"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Trophy, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { getClassRanking, getAvailableGradeLevels } from "@/lib/api/statistics";
import {
  formatNumber,
  formatPercentage,
  formatVsAverage,
  getPerformanceEmoji,
} from "@/lib/statistics/calculations";
import type { ClassRanking, GradeLevelAverage, CourseType } from "@/types/statistics";
import { Skeleton } from "@/components/ui/skeleton";
import { GlobalFilterBar, useGlobalFilters } from "@/components/filters";

export default function ClassRankingPage() {
  const [loading, setLoading] = useState(true);
  const [loadingGradeLevels, setLoadingGradeLevels] = useState(true);
  const [rankings, setRankings] = useState<ClassRanking[]>([]);
  const [gradeAverage, setGradeAverage] = useState<GradeLevelAverage | null>(null);
  const [gradeLevels, setGradeLevels] = useState<string[]>([]);
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>("");
  const [selectedCourseType, setSelectedCourseType] = useState<CourseType>("LT");
  const { academicYear, termForApi } = useGlobalFilters();

  // Fetch available grade levels on mount
  useEffect(() => {
    async function fetchGradeLevels() {
      try {
        const levels = await getAvailableGradeLevels();
        setGradeLevels(levels);
        if (levels.length > 0 && levels[0]) {
          setSelectedGradeLevel(levels[0]);
        }
      } catch (error) {
        console.error("Failed to fetch grade levels:", error);
      } finally {
        setLoadingGradeLevels(false);
      }
    }

    fetchGradeLevels();
  }, []);

  // Fetch rankings when filters change
  useEffect(() => {
    if (!selectedGradeLevel) return;

    async function fetchData() {
      setLoading(true);
      try {
        const result = await getClassRanking({
          grade_level: selectedGradeLevel,
          course_type: selectedCourseType,
          metric: "term_avg",
          academic_year: academicYear,
          term: termForApi,
        });
        setRankings(result.rankings);
        setGradeAverage(result.gradeAverage);
      } catch (error) {
        console.error("Failed to fetch class rankings:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedGradeLevel, selectedCourseType, academicYear, termForApi]);

  const courseTypes: CourseType[] = ["LT", "IT", "KCFS"];

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
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Trophy className="w-6 h-6 text-amber-500 dark:text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">
                  Class Ranking
                </h1>
                <p className="text-sm text-text-secondary">
                  Same-grade, same-course-type class comparisons
                </p>
              </div>
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
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Grade Level
            </label>
            <select
              value={selectedGradeLevel}
              onChange={(e) => setSelectedGradeLevel(e.target.value)}
              disabled={loadingGradeLevels}
              className="px-4 py-2 bg-surface-secondary border border-border-default rounded-lg text-text-primary min-w-[140px]"
            >
              {loadingGradeLevels ? (
                <option>Loading...</option>
              ) : (
                gradeLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Course Type
            </label>
            <div className="flex gap-2">
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
          </div>
        </div>

        {/* Grade Average Summary */}
        {gradeAverage && gradeAverage.term_avg > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {selectedGradeLevel} Average
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
                      No ranking data available for {selectedGradeLevel} {selectedCourseType}
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
            grade level and course type only. LT, IT, and KCFS courses follow
            different curricula and cannot be compared directly. The &quot;vs Grade
            Avg&quot; column shows how each class performs relative to the grade level
            average.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
