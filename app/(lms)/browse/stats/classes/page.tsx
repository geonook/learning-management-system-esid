"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { School, ArrowLeft, Search, Download } from "lucide-react";
import Link from "next/link";
import { getClassStatistics } from "@/lib/api/statistics";
import { formatNumber, formatPercentage } from "@/lib/statistics/calculations";
import type { ClassStatistics, CourseType } from "@/types/statistics";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

export default function ClassStatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<ClassStatistics[]>([]);
  const [filteredStats, setFilteredStats] = useState<ClassStatistics[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedCourseType, setSelectedCourseType] = useState<CourseType | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getClassStatistics();
        setStatistics(data);
        setFilteredStats(data);
      } catch (error) {
        console.error("Failed to fetch class statistics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filter effect
  useEffect(() => {
    let result = statistics;

    if (selectedGrade !== null) {
      result = result.filter((s) => {
        // Extract grade number from grade_level (e.g., "G1E1" -> 1)
        const match = s.grade_level.match(/G(\d)/);
        return match && match[1] && parseInt(match[1]) === selectedGrade;
      });
    }

    if (selectedCourseType !== null) {
      result = result.filter((s) => s.subject_type === selectedCourseType);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.class_name.toLowerCase().includes(query) ||
          s.grade_level.toLowerCase().includes(query)
      );
    }

    setFilteredStats(result);
  }, [statistics, selectedGrade, selectedCourseType, searchQuery]);

  const grades = [1, 2, 3, 4, 5, 6];
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
              <div className="p-2 bg-green-500/20 rounded-lg">
                <School className="w-6 h-6 text-green-500 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">
                  Class Statistics
                </h1>
                <p className="text-sm text-text-secondary">
                  LT/IT/KCFS statistics per class
                </p>
              </div>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-secondary border border-border-default rounded-lg text-text-secondary hover:bg-surface-hover transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <Input
              placeholder="Search class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={selectedGrade ?? ""}
            onChange={(e) =>
              setSelectedGrade(e.target.value ? parseInt(e.target.value) : null)
            }
            className="px-4 py-2 bg-surface-secondary border border-border-default rounded-lg text-text-primary"
          >
            <option value="">All Grades</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>

          <select
            value={selectedCourseType ?? ""}
            onChange={(e) =>
              setSelectedCourseType((e.target.value as CourseType) || null)
            }
            className="px-4 py-2 bg-surface-secondary border border-border-default rounded-lg text-text-primary"
          >
            <option value="">All Course Types</option>
            {courseTypes.map((ct) => (
              <option key={ct} value={ct}>
                {ct}
              </option>
            ))}
          </select>
        </div>

        {/* Results Count */}
        <div className="text-sm text-text-secondary">
          Showing {filteredStats.length} of {statistics.length} records
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
                    Subject Type
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">
                    Grade Level
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
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredStats.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="p-8 text-center text-text-tertiary"
                    >
                      No statistics available
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
                              ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400"
                              : stat.subject_type === "IT"
                              ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                              : "bg-pink-500/20 text-pink-600 dark:text-pink-400"
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
            <strong>Column Definitions:</strong> Term Grade Avg = weighted average
            (FA 15% + SA 20% + Midterm 10%). F.A. Avg = Formative Assessment average
            (FA1-FA8). S.A. Avg = Summative Assessment average (SA1-SA4). Pass Rate
            = students with ≥60. Excellent Rate = students with ≥90.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
