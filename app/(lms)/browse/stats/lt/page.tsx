"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { BookOpen, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { getGradeLevelSummary } from "@/lib/api/statistics";
import { formatNumber, formatPercentage } from "@/lib/statistics/calculations";
import type { GradeLevelSummary } from "@/types/statistics";
import { Skeleton } from "@/components/ui/skeleton";

export default function LTAnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<GradeLevelSummary[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getGradeLevelSummary("LT");
        setStatistics(data);
      } catch (error) {
        console.error("Failed to fetch LT statistics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Calculate totals
  const totals = statistics.reduce(
    (acc, stat) => ({
      students: acc.students + stat.total_students,
      grades: [...acc.grades, stat.grade_avg].filter((g): g is number => g !== null),
    }),
    { students: 0, grades: [] as number[] }
  );

  const overallAvg = totals.grades.length > 0
    ? totals.grades.reduce((a, b) => a + b, 0) / totals.grades.length
    : null;

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
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <BookOpen className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">
                  LT Course Analysis
                </h1>
                <p className="text-sm text-text-secondary">
                  Local Teacher (LT) course statistics by grade level
                </p>
              </div>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-secondary border border-border-default rounded-lg text-text-secondary hover:bg-surface-hover transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
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
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
              {loading ? <Skeleton className="h-8 w-16" /> : formatNumber(overallAvg)}
            </div>
          </div>
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
                      No LT course statistics available
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
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
          <p className="text-text-secondary text-sm">
            <strong>LT (Local Teacher) Courses:</strong> These courses are taught
            by local teachers following the domestic curriculum standards. Pass
            rate indicates students scoring ≥60, excellent rate indicates students
            scoring ≥90. Standard deviation shows the spread of scores within each
            grade level.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
