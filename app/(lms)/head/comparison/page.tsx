"use client";

import { useState, useEffect, useMemo } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/lib/supabase/auth-context";
import { GitCompare, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlobalFilterBar, useGlobalFilters } from "@/components/filters";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

interface ClassOption {
  id: string;
  name: string;
  grade: number;
}

interface ClassStats {
  classId: string;
  className: string;
  ltAvg: number | null;
  itAvg: number | null;
  kcfsAvg: number | null;
  assessmentBreakdown: { code: string; avg: number | null }[];
}

const ASSESSMENT_CODES = ["FA1", "FA2", "FA3", "FA4", "FA5", "FA6", "FA7", "FA8", "SA1", "SA2", "SA3", "SA4", "MID"];

export default function ClassComparisonPage() {
  const { userPermissions, user } = useAuth();
  const { academicYear, termForApi } = useGlobalFilters();
  const userId = user?.id;

  const [loading, setLoading] = useState(true);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [classAId, setClassAId] = useState<string>("");
  const [classBId, setClassBId] = useState<string>("");
  const [classAStats, setClassAStats] = useState<ClassStats | null>(null);
  const [classBStats, setClassBStats] = useState<ClassStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const gradeBand = userPermissions?.grade || "1";
  const courseType = userPermissions?.track as "LT" | "IT" | "KCFS" || "LT";

  // Parse grade band to grades array
  const grades = useMemo(() => {
    if (gradeBand.includes("-")) {
      const parts = gradeBand.split("-").map(Number);
      const start = parts[0] ?? 1;
      const end = parts[1] ?? start;
      const result: number[] = [];
      for (let i = start; i <= end; i++) {
        result.push(i);
      }
      return result;
    }
    return [Number(gradeBand)];
  }, [gradeBand]);

  // Fetch class options
  useEffect(() => {
    if (!userId) return;

    async function fetchClasses() {
      setLoading(true);
      const supabase = createClient();

      try {
        const { data } = await supabase
          .from("classes")
          .select("id, name, grade")
          .in("grade", grades)
          .eq("is_active", true)
          .eq("academic_year", academicYear)
          .order("grade", { ascending: true })
          .order("name", { ascending: true });

        setClassOptions(data || []);
      } catch (error) {
        console.error("Failed to fetch classes:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchClasses();
  }, [userId, grades, academicYear]);

  // Fetch class stats when selection changes
  useEffect(() => {
    if (!classAId && !classBId) {
      setClassAStats(null);
      setClassBStats(null);
      return;
    }

    async function fetchStats() {
      setLoadingStats(true);
      const supabase = createClient();

      try {
        const fetchClassStats = async (classId: string): Promise<ClassStats | null> => {
          if (!classId) return null;

          const classInfo = classOptions.find(c => c.id === classId);
          if (!classInfo) return null;

          // Get courses for this class
          const { data: courses } = await supabase
            .from("courses")
            .select("id, course_type")
            .eq("class_id", classId)
            .eq("is_active", true)
            .eq("academic_year", academicYear);

          const courseIds = courses?.map(c => c.id) || [];
          const ltCourseIds = courses?.filter(c => c.course_type === "LT").map(c => c.id) || [];
          const itCourseIds = courses?.filter(c => c.course_type === "IT").map(c => c.id) || [];
          const kcfsCourseIds = courses?.filter(c => c.course_type === "KCFS").map(c => c.id) || [];

          if (courseIds.length === 0) {
            return {
              classId,
              className: classInfo.name,
              ltAvg: null,
              itAvg: null,
              kcfsAvg: null,
              assessmentBreakdown: ASSESSMENT_CODES.map(code => ({ code, avg: null })),
            };
          }

          // Get exams for these courses
          let examsQuery = supabase
            .from("exams")
            .select("id, course_id, assessment_code, term")
            .in("course_id", courseIds);

          if (termForApi) {
            examsQuery = examsQuery.eq("term", termForApi);
          }

          const { data: exams } = await examsQuery;
          const examIds = exams?.map(e => e.id) || [];

          if (examIds.length === 0) {
            return {
              classId,
              className: classInfo.name,
              ltAvg: null,
              itAvg: null,
              kcfsAvg: null,
              assessmentBreakdown: ASSESSMENT_CODES.map(code => ({ code, avg: null })),
            };
          }

          // Get scores
          const { data: scores } = await supabase
            .from("scores")
            .select("score, exam_id")
            .in("exam_id", examIds)
            .not("score", "is", null);

          // Create exam to course mapping
          const examToCourse = new Map(exams?.map(e => [e.id, e.course_id]) || []);
          const examToCode = new Map(exams?.map(e => [e.id, e.assessment_code]) || []);

          // Calculate averages by course type
          const calcAvg = (courseIdList: string[]) => {
            const relevantScores = (scores || [])
              .filter(s => {
                const courseId = examToCourse.get(s.exam_id);
                return courseId && courseIdList.includes(courseId) && s.score !== null && s.score > 0;
              })
              .map(s => s.score as number);

            if (relevantScores.length === 0) return null;
            return Math.round((relevantScores.reduce((a, b) => a + b, 0) / relevantScores.length) * 10) / 10;
          };

          // Calculate assessment breakdown
          const assessmentBreakdown = ASSESSMENT_CODES.map(code => {
            const relevantExamIds = exams
              ?.filter(e => e.assessment_code === code)
              .map(e => e.id) || [];

            const relevantScores = (scores || [])
              .filter(s => relevantExamIds.includes(s.exam_id) && s.score !== null && s.score > 0)
              .map(s => s.score as number);

            const avg = relevantScores.length > 0
              ? Math.round((relevantScores.reduce((a, b) => a + b, 0) / relevantScores.length) * 10) / 10
              : null;

            return { code, avg };
          });

          return {
            classId,
            className: classInfo.name,
            ltAvg: calcAvg(ltCourseIds),
            itAvg: calcAvg(itCourseIds),
            kcfsAvg: calcAvg(kcfsCourseIds),
            assessmentBreakdown,
          };
        };

        const [statsA, statsB] = await Promise.all([
          fetchClassStats(classAId),
          fetchClassStats(classBId),
        ]);

        setClassAStats(statsA);
        setClassBStats(statsB);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoadingStats(false);
      }
    }

    fetchStats();
  }, [classAId, classBId, classOptions, academicYear, termForApi]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!classAStats && !classBStats) return [];

    return ASSESSMENT_CODES.map(code => {
      const aBreakdown = classAStats?.assessmentBreakdown.find(b => b.code === code);
      const bBreakdown = classBStats?.assessmentBreakdown.find(b => b.code === code);

      return {
        code,
        [classAStats?.className || "Class A"]: aBreakdown?.avg ?? 0,
        [classBStats?.className || "Class B"]: bBreakdown?.avg ?? 0,
      };
    });
  }, [classAStats, classBStats]);

  const getDiffDisplay = (valA: number | null, valB: number | null) => {
    if (valA === null || valB === null) return { value: "-", color: "text-text-tertiary", icon: Minus };
    const diff = valA - valB;
    if (diff > 0) return { value: `+${diff.toFixed(1)}`, color: "text-green-600 dark:text-green-400", icon: TrendingUp };
    if (diff < 0) return { value: diff.toFixed(1), color: "text-red-600 dark:text-red-400", icon: TrendingDown };
    return { value: "0", color: "text-text-tertiary", icon: Minus };
  };

  return (
    <AuthGuard requiredRoles={["admin", "head"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 dark:bg-violet-500/20 rounded-lg">
            <GitCompare className="w-6 h-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Class Comparison</h1>
            <p className="text-sm text-text-secondary">Compare performance across classes in your grade</p>
          </div>
        </div>

        {/* Global Filter Bar */}
        <GlobalFilterBar showYear showTerm />

        {/* Class Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <label className="text-sm text-text-secondary mb-2 block">Select First Class</label>
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <select
                className="w-full px-4 py-2 bg-surface-secondary border border-border-default rounded-lg text-text-primary"
                value={classAId}
                onChange={(e) => setClassAId(e.target.value)}
              >
                <option value="">Choose a class...</option>
                {classOptions.map((cls) => (
                  <option key={cls.id} value={cls.id} disabled={cls.id === classBId}>
                    {cls.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <label className="text-sm text-text-secondary mb-2 block">Select Second Class</label>
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <select
                className="w-full px-4 py-2 bg-surface-secondary border border-border-default rounded-lg text-text-primary"
                value={classBId}
                onChange={(e) => setClassBId(e.target.value)}
              >
                <option value="">Choose a class...</option>
                {classOptions.map((cls) => (
                  <option key={cls.id} value={cls.id} disabled={cls.id === classAId}>
                    {cls.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Comparison Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">LT Average</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 text-center">
                {loadingStats ? (
                  <Skeleton className="h-7 w-12 mx-auto" />
                ) : (
                  <div className="text-xl font-bold text-text-primary">
                    {classAStats?.ltAvg ?? "-"}
                  </div>
                )}
                <div className="text-xs text-text-tertiary">{classAStats?.className || "Class A"}</div>
              </div>
              <div className="text-border-default">vs</div>
              <div className="flex-1 text-center">
                {loadingStats ? (
                  <Skeleton className="h-7 w-12 mx-auto" />
                ) : (
                  <div className="text-xl font-bold text-text-primary">
                    {classBStats?.ltAvg ?? "-"}
                  </div>
                )}
                <div className="text-xs text-text-tertiary">{classBStats?.className || "Class B"}</div>
              </div>
            </div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">IT Average</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 text-center">
                {loadingStats ? (
                  <Skeleton className="h-7 w-12 mx-auto" />
                ) : (
                  <div className="text-xl font-bold text-text-primary">
                    {classAStats?.itAvg ?? "-"}
                  </div>
                )}
                <div className="text-xs text-text-tertiary">{classAStats?.className || "Class A"}</div>
              </div>
              <div className="text-border-default">vs</div>
              <div className="flex-1 text-center">
                {loadingStats ? (
                  <Skeleton className="h-7 w-12 mx-auto" />
                ) : (
                  <div className="text-xl font-bold text-text-primary">
                    {classBStats?.itAvg ?? "-"}
                  </div>
                )}
                <div className="text-xs text-text-tertiary">{classBStats?.className || "Class B"}</div>
              </div>
            </div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">KCFS Average</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 text-center">
                {loadingStats ? (
                  <Skeleton className="h-7 w-12 mx-auto" />
                ) : (
                  <div className="text-xl font-bold text-text-primary">
                    {classAStats?.kcfsAvg ?? "-"}
                  </div>
                )}
                <div className="text-xs text-text-tertiary">{classAStats?.className || "Class A"}</div>
              </div>
              <div className="text-border-default">vs</div>
              <div className="flex-1 text-center">
                {loadingStats ? (
                  <Skeleton className="h-7 w-12 mx-auto" />
                ) : (
                  <div className="text-xl font-bold text-text-primary">
                    {classBStats?.kcfsAvg ?? "-"}
                  </div>
                )}
                <div className="text-xs text-text-tertiary">{classBStats?.className || "Class B"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Chart */}
        {classAStats && classBStats ? (
          <div className="bg-surface-secondary rounded-xl border border-border-default p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">Assessment Comparison Chart</h3>
            {loadingStats ? (
              <div className="h-64 flex items-center justify-center">
                <Skeleton className="h-48 w-full" />
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                    <XAxis
                      dataKey="code"
                      stroke="rgb(148,163,184)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="rgb(148,163,184)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15,23,42,0.95)",
                        border: "1px solid rgba(148,163,184,0.2)",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                    <Legend />
                    <Bar dataKey={classAStats.className} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={classBStats.className} fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-surface-secondary rounded-xl border border-border-default p-8 text-center">
            <GitCompare className="w-12 h-12 text-border-default mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">Comparison Chart</h3>
            <p className="text-text-tertiary max-w-md mx-auto">
              Select two classes above to see a side-by-side comparison of their performance
              across all assessment types (FA, SA, MID).
            </p>
          </div>
        )}

        {/* Assessment Breakdown */}
        <div className="bg-surface-secondary rounded-xl border border-border-default overflow-hidden">
          <div className="p-4 border-b border-border-default">
            <h3 className="text-lg font-medium text-text-primary">Assessment Breakdown</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-default">
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Assessment</th>
                <th className="text-center p-4 text-sm font-medium text-text-secondary">
                  {classAStats?.className || "Class A"}
                </th>
                <th className="text-center p-4 text-sm font-medium text-text-secondary">
                  {classBStats?.className || "Class B"}
                </th>
                <th className="text-center p-4 text-sm font-medium text-text-secondary">Difference</th>
              </tr>
            </thead>
            <tbody>
              {loadingStats ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-subtle">
                    <td className="p-4"><Skeleton className="h-4 w-12" /></td>
                    <td className="p-4 text-center"><Skeleton className="h-4 w-10 mx-auto" /></td>
                    <td className="p-4 text-center"><Skeleton className="h-4 w-10 mx-auto" /></td>
                    <td className="p-4 text-center"><Skeleton className="h-4 w-12 mx-auto" /></td>
                  </tr>
                ))
              ) : (
                ASSESSMENT_CODES.map((code) => {
                  const aVal = classAStats?.assessmentBreakdown.find(b => b.code === code)?.avg ?? null;
                  const bVal = classBStats?.assessmentBreakdown.find(b => b.code === code)?.avg ?? null;
                  const diff = getDiffDisplay(aVal, bVal);
                  const DiffIcon = diff.icon;

                  return (
                    <tr key={code} className="border-b border-border-subtle hover:bg-surface-hover">
                      <td className="p-4 text-text-primary">{code}</td>
                      <td className="p-4 text-center text-text-secondary">{aVal ?? "-"}</td>
                      <td className="p-4 text-center text-text-secondary">{bVal ?? "-"}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 ${diff.color}`}>
                          <DiffIcon className="w-3 h-3" />
                          {diff.value}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Info */}
        <div className="bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-xl p-4">
          <h3 className="text-violet-700 dark:text-violet-400 font-medium mb-2">About Class Comparison</h3>
          <p className="text-text-secondary text-sm">
            Use this tool to identify performance gaps between classes and inform teaching strategies.
            Comparisons are based on the same assessment periods and scoring criteria.
            {termForApi && ` Currently showing data for Term ${termForApi} only.`}
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
