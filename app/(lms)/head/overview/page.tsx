"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/lib/supabase/auth-context";
import { LayoutDashboard, TrendingUp, Users, GraduationCap, AlertTriangle } from "lucide-react";
import {
  getHeadTeacherKpis,
  getClassDistribution,
  type HeadTeacherKpis,
  type ClassDistribution,
} from "@/lib/api/dashboard";
import { createClient } from "@/lib/supabase/client";
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

interface ClassSummary {
  id: string;
  name: string;
  studentCount: number;
  avgScore: number | null;
}

export default function GradeOverviewPage() {
  const { userPermissions, loading: authLoading, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<HeadTeacherKpis>({
    totalClasses: 0,
    averageScore: 0,
    coverageRate: 0,
    activeIssues: null,
    studentsCount: 0,
    teachersCount: 0,
  });
  const [distribution, setDistribution] = useState<ClassDistribution[]>([]);
  const [classes, setClasses] = useState<ClassSummary[]>([]);

  const gradeBand = userPermissions?.grade || "1";
  const courseType = userPermissions?.track as "LT" | "IT" | "KCFS" || "LT";

  // Parse grade band to display string
  const getGradeDisplay = (band: string) => {
    if (band.includes("-")) {
      return `G${band}`;
    }
    return `G${band}`;
  };

  useEffect(() => {
    // Wait for auth to be ready before fetching
    if (authLoading || !user) {
      return;
    }

    async function fetchData() {
      if (!userPermissions?.grade) {
        setLoading(false);
        return;
      }

      const supabase = createClient();

      try {
        // 1. Fetch Head Teacher KPIs
        const kpiData = await getHeadTeacherKpis(gradeBand, courseType);
        setKpis(kpiData);

        // 2. Fetch score distribution for this grade band
        const distData = await getClassDistribution(
          "head",
          undefined,
          gradeBand,
          courseType
        );
        setDistribution(distData);

        // 3. Parse grades from grade band
        let grades: number[] = [];
        if (gradeBand.includes("-")) {
          const parts = gradeBand.split("-").map(Number);
          const start = parts[0] ?? 1;
          const end = parts[1] ?? start;
          for (let i = start; i <= end; i++) {
            grades.push(i);
          }
        } else {
          grades = [Number(gradeBand)];
        }

        // 4. Fetch classes in this grade band
        const { data: classesData } = await supabase
          .from("classes")
          .select("id, name, grade")
          .in("grade", grades)
          .eq("is_active", true)
          .order("grade", { ascending: true })
          .order("name", { ascending: true });

        // 5. For each class, get student count and average score
        const classSummaries: ClassSummary[] = [];

        for (const cls of classesData || []) {
          // Get student count
          const { count: studentCount } = await supabase
            .from("students")
            .select("*", { count: "exact" })
            .eq("class_id", cls.id)
            .eq("is_active", true);

          // Get average score for this class
          const { data: scores } = await supabase
            .from("scores")
            .select(`
              score,
              exams!inner(
                class_id
              )
            `)
            .eq("exams.class_id", cls.id)
            .not("score", "is", null);

          const validScores = (scores || [])
            .map((s) => s.score)
            .filter((s): s is number => s !== null && s > 0);

          const avgScore = validScores.length > 0
            ? Math.round((validScores.reduce((sum, s) => sum + s, 0) / validScores.length) * 10) / 10
            : null;

          classSummaries.push({
            id: cls.id,
            name: cls.name,
            studentCount: studentCount || 0,
            avgScore,
          });
        }

        setClasses(classSummaries);

      } catch (error) {
        console.error("Failed to fetch head teacher overview:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [authLoading, user, gradeBand, courseType, userPermissions?.grade]);

  return (
    <AuthGuard requiredRoles={["admin", "head"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <LayoutDashboard className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Grade Overview</h1>
            <p className="text-sm text-white/60">
              {getGradeDisplay(gradeBand)} • {courseType} • Performance metrics
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Classes</span>
              <GraduationCap className="w-4 h-4 text-emerald-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-white">{kpis.totalClasses}</div>
            )}
            <div className="text-xs text-white/40">in {getGradeDisplay(gradeBand)}</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Students</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-white">{kpis.studentsCount.toLocaleString()}</div>
            )}
            <div className="text-xs text-white/40">total enrolled</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Avg Score</span>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-white">
                {kpis.averageScore > 0 ? kpis.averageScore : "N/A"}
              </div>
            )}
            <div className="text-xs text-white/40">grade average</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Coverage</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-white">
                {kpis.coverageRate > 0 ? `${kpis.coverageRate}%` : "N/A"}
              </div>
            )}
            <div className="text-xs text-white/40">students scored</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-6">
          {/* Score Distribution */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Score Distribution</h3>
            {loading ? (
              <div className="h-48 flex items-end justify-between gap-2 px-4 pb-4">
                <Skeleton className="h-1/3 w-full" />
                <Skeleton className="h-2/3 w-full" />
                <Skeleton className="h-1/2 w-full" />
                <Skeleton className="h-3/4 w-full" />
                <Skeleton className="h-1/4 w-full" />
              </div>
            ) : distribution.some(d => d.count > 0) ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="bucket"
                      stroke="rgba(255,255,255,0.5)"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.5)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.8)",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      cursor={{ fill: "rgba(255,255,255,0.1)" }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-white/40">
                <p>No score data available yet</p>
              </div>
            )}
          </div>

          {/* Students by Class */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Students by Class</h3>
            {loading ? (
              <div className="h-48 flex items-end justify-between gap-1 px-2 pb-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-1/2 w-full" />
                ))}
              </div>
            ) : classes.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classes.slice(0, 14).map(c => ({ name: c.name.replace(/^G\d\s/, ''), students: c.studentCount }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="name"
                      stroke="rgba(255,255,255,0.5)"
                      fontSize={8}
                      tickLine={false}
                      axisLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.5)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.8)",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      cursor={{ fill: "rgba(255,255,255,0.1)" }}
                    />
                    <Bar dataKey="students" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-white/40">
                <p>No class data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Class Performance Table */}
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-lg font-medium text-white">Class Performance</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-sm font-medium text-white/60">Class</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Students</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Avg Score</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-10" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-10" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                  </tr>
                ))
              ) : classes.length > 0 ? (
                classes.map((cls) => (
                  <tr key={cls.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white font-medium">{cls.name}</td>
                    <td className="p-4 text-white/80">{cls.studentCount}</td>
                    <td className="p-4">
                      <span className={
                        cls.avgScore !== null
                          ? cls.avgScore >= 80
                            ? "text-green-400"
                            : cls.avgScore >= 60
                            ? "text-amber-400"
                            : "text-red-400"
                          : "text-white/40"
                      }>
                        {cls.avgScore !== null ? cls.avgScore : "-"}
                      </span>
                    </td>
                    <td className="p-4">
                      {cls.avgScore !== null ? (
                        cls.avgScore >= 70 ? (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                            On Track
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                            Needs Attention
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-1 bg-white/10 text-white/40 text-xs rounded-full">
                          No Data
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-white/40">
                    No classes found for {getGradeDisplay(gradeBand)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Info */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <h3 className="text-emerald-400 font-medium mb-2">Head Teacher Dashboard</h3>
          <p className="text-white/60 text-sm">
            This dashboard shows metrics for {getGradeDisplay(gradeBand)} classes in the {courseType} track.
            Data is refreshed in real-time as teachers enter scores. Click on a class to view detailed student performance.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
