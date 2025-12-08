"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { BarChart3, TrendingUp, Download, Users, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getClassDistribution,
  type ClassDistribution,
} from "@/lib/api/dashboard";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface GradeStats {
  grade: number;
  students: number;
  ltAvg: number | null;
  itAvg: number | null;
  kcfsAvg: number | null;
  overall: number | null;
}

interface SchoolStats {
  totalStudents: number;
  schoolAverage: number | null;
  completionRate: number | null;
  atRiskCount: number | null;
}

export default function BrowseStatsPage() {
  const [loading, setLoading] = useState(true);
  const [schoolStats, setSchoolStats] = useState<SchoolStats>({
    totalStudents: 0,
    schoolAverage: null,
    completionRate: null,
    atRiskCount: null,
  });
  const [gradeStats, setGradeStats] = useState<GradeStats[]>([]);
  const [distribution, setDistribution] = useState<ClassDistribution[]>([]);

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();

      try {
        // 1. Fetch total students
        const { count: totalStudents } = await supabase
          .from("students")
          .select("*", { count: "exact" })
          .eq("is_active", true);

        // 2. Fetch all recent scores for average calculation
        // 注意：移除了不存在的 courses join（exams 沒有直接連接到 courses）
        const { data: scores } = await supabase
          .from("scores")
          .select(`
            score,
            student_id,
            exams!inner(
              class_id,
              classes!inner(
                grade,
                is_active
              )
            )
          `)
          .eq("exams.classes.is_active", true)
          .not("score", "is", null)
          .gte("score", 0)
          .lte("score", 100);

        // Calculate school-wide average
        const validScores = (scores || []).map((s) => s.score).filter((s): s is number => s !== null && s > 0);
        const schoolAverage = validScores.length > 0
          ? Math.round((validScores.reduce((sum, s) => sum + s, 0) / validScores.length) * 10) / 10
          : null;

        // 3. Fetch grade-level statistics
        const gradeStatsData: GradeStats[] = [];

        for (let grade = 1; grade <= 6; grade++) {
          // Get students in this grade
          const { count: gradeStudents } = await supabase
            .from("students")
            .select("*", { count: "exact" })
            .eq("grade", grade)
            .eq("is_active", true);

          // Get scores for this grade with course type
          const { data: gradeScores } = await supabase
            .from("scores")
            .select(`
              score,
              exams!inner(
                class_id,
                classes!inner(
                  grade
                )
              )
            `)
            .eq("exams.classes.grade", grade)
            .not("score", "is", null);

          const gradeValidScores = (gradeScores || [])
            .map((s) => s.score)
            .filter((s): s is number => s !== null && s > 0);

          const overall = gradeValidScores.length > 0
            ? Math.round((gradeValidScores.reduce((sum, s) => sum + s, 0) / gradeValidScores.length) * 10) / 10
            : null;

          gradeStatsData.push({
            grade,
            students: gradeStudents || 0,
            ltAvg: null, // TODO: Calculate by course type when data available
            itAvg: null,
            kcfsAvg: null,
            overall,
          });
        }

        // 4. Fetch score distribution
        const distData = await getClassDistribution("admin");

        // 5. Calculate completion rate (students with scores / total students)
        const studentsWithScores = new Set((scores || []).map((s) => s.student_id).filter(Boolean));
        const completionRate = totalStudents && totalStudents > 0
          ? Math.round((studentsWithScores.size / totalStudents) * 100)
          : null;

        setSchoolStats({
          totalStudents: totalStudents || 0,
          schoolAverage,
          completionRate,
          atRiskCount: null, // TODO: Implement at-risk detection
        });
        setGradeStats(gradeStatsData);
        setDistribution(distData);

      } catch (error) {
        console.error("Failed to fetch statistics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <AuthGuard requiredRoles={["admin", "head", "office_member"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <BarChart3 className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Statistics & Analytics</h1>
              <p className="text-sm text-text-secondary">View school-wide performance metrics (read-only)</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-secondary border border-border-default rounded-lg text-text-secondary hover:bg-surface-hover transition-colors">
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">School Average</span>
              <TrendingUp className="w-4 h-4 text-green-500 dark:text-green-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-text-primary">
                {schoolStats.schoolAverage !== null ? schoolStats.schoolAverage : "N/A"}
              </div>
            )}
            <div className="text-xs text-text-tertiary">current semester</div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Completion Rate</span>
              <BarChart3 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-text-primary">
                {schoolStats.completionRate !== null ? `${schoolStats.completionRate}%` : "N/A"}
              </div>
            )}
            <div className="text-xs text-text-tertiary">students with scores</div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Total Students</span>
              <Users className="w-4 h-4 text-purple-500 dark:text-purple-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-text-primary">
                {schoolStats.totalStudents.toLocaleString()}
              </div>
            )}
            <div className="text-xs text-text-tertiary">across all grades</div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">At Risk</span>
              <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {schoolStats.atRiskCount !== null ? schoolStats.atRiskCount : "N/A"}
              </div>
            )}
            <div className="text-xs text-text-tertiary">{schoolStats.atRiskCount !== null ? "need intervention" : "coming soon"}</div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-2 gap-6">
          {/* Score Distribution */}
          <div className="bg-surface-secondary rounded-xl border border-border-default p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">Score Distribution</h3>
            {loading ? (
              <div className="h-64 flex items-end justify-between gap-2 px-4 pb-4">
                <Skeleton className="h-1/3 w-full" />
                <Skeleton className="h-2/3 w-full" />
                <Skeleton className="h-1/2 w-full" />
                <Skeleton className="h-3/4 w-full" />
                <Skeleton className="h-1/4 w-full" />
              </div>
            ) : distribution.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border-subtle" />
                    <XAxis
                      dataKey="bucket"
                      className="stroke-text-secondary"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      className="stroke-text-secondary"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--surface-elevated))",
                        border: "1px solid hsl(var(--border-default))",
                        borderRadius: "8px",
                        color: "hsl(var(--text-primary))",
                      }}
                      cursor={{ fill: "hsl(var(--surface-hover) / 0.5)" }}
                    />
                    <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-text-tertiary">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No score data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Students by Grade */}
          <div className="bg-surface-secondary rounded-xl border border-border-default p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">Students by Grade</h3>
            {loading ? (
              <div className="h-64 flex items-end justify-between gap-2 px-4 pb-4">
                <Skeleton className="h-1/2 w-full" />
                <Skeleton className="h-2/3 w-full" />
                <Skeleton className="h-3/4 w-full" />
                <Skeleton className="h-2/3 w-full" />
                <Skeleton className="h-1/2 w-full" />
                <Skeleton className="h-1/3 w-full" />
              </div>
            ) : gradeStats.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gradeStats.map(g => ({ name: `G${g.grade}`, students: g.students }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border-subtle" />
                    <XAxis
                      dataKey="name"
                      className="stroke-text-secondary"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      className="stroke-text-secondary"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--surface-elevated))",
                        border: "1px solid hsl(var(--border-default))",
                        borderRadius: "8px",
                        color: "hsl(var(--text-primary))",
                      }}
                      cursor={{ fill: "hsl(var(--surface-hover) / 0.5)" }}
                    />
                    <Bar dataKey="students" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-text-tertiary">
                <div className="text-center">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No student data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Grade Breakdown Table */}
        <div className="bg-surface-secondary rounded-xl border border-border-default overflow-hidden">
          <div className="p-4 border-b border-border-default">
            <h3 className="text-lg font-medium text-text-primary">Performance by Grade</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-default">
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Grade</th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Students</th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">LT Avg</th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">IT Avg</th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">KCFS Avg</th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Overall</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-subtle">
                    <td className="p-4"><Skeleton className="h-4 w-8" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-12" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-10" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-10" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-10" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-10" /></td>
                  </tr>
                ))
              ) : (
                gradeStats.map((stat) => (
                  <tr key={stat.grade} className="border-b border-border-subtle hover:bg-surface-hover">
                    <td className="p-4 text-text-primary font-medium">G{stat.grade}</td>
                    <td className="p-4 text-text-primary">{stat.students.toLocaleString()}</td>
                    <td className="p-4 text-text-secondary">{stat.ltAvg !== null ? stat.ltAvg : "-"}</td>
                    <td className="p-4 text-text-secondary">{stat.itAvg !== null ? stat.itAvg : "-"}</td>
                    <td className="p-4 text-text-secondary">{stat.kcfsAvg !== null ? stat.kcfsAvg : "-"}</td>
                    <td className="p-4">
                      <span className={stat.overall !== null ? (stat.overall >= 80 ? "text-green-600 dark:text-green-400" : stat.overall >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400") : "text-text-tertiary"}>
                        {stat.overall !== null ? stat.overall : "-"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <h3 className="text-blue-600 dark:text-blue-400 font-medium mb-2">About Analytics</h3>
          <p className="text-text-secondary text-sm">
            Statistics are calculated from all teacher-entered grades using the standardized formula.
            Data updates in real-time as teachers input scores. LT/IT/KCFS course averages will be available
            once scores are entered with course type associations.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
