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
import { GlobalFilterBar, useGlobalFilters } from "@/components/filters";
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
  const { userPermissions, user } = useAuth();
  const { academicYear, termForApi } = useGlobalFilters();
  const userId = user?.id;
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
    // Wait for user to be available
    if (!userId) {
      return;
    }

    async function fetchData() {
      if (!userPermissions?.grade) {
        setLoading(false);
        return;
      }

      const supabase = createClient();

      try {
        // 1. Fetch Head Teacher KPIs (pass academicYear to avoid hardcoded year)
        const kpiData = await getHeadTeacherKpis(gradeBand, courseType, academicYear);
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

        // 4. Fetch classes in this grade band (selected academic year)
        const { data: classesData } = await supabase
          .from("classes")
          .select("id, name, grade")
          .in("grade", grades)
          .eq("is_active", true)
          .eq("academic_year", academicYear)
          .order("grade", { ascending: true })
          .order("name", { ascending: true });

        if (!classesData || classesData.length === 0) {
          setClasses([]);
          return;
        }

        const classIds = classesData.map((c) => c.id);

        // 5. BATCH QUERY: Get all students for these classes at once
        const { data: studentsData } = await supabase
          .from("students")
          .select("class_id")
          .in("class_id", classIds)
          .eq("is_active", true);

        // Count students per class
        const studentCountByClass = new Map<string, number>();
        (studentsData || []).forEach((s) => {
          const count = studentCountByClass.get(s.class_id) || 0;
          studentCountByClass.set(s.class_id, count + 1);
        });

        // 6. BATCH QUERY: Get courses for these classes (filtered by course type)
        const { data: coursesData } = await supabase
          .from("courses")
          .select("id, class_id")
          .in("class_id", classIds)
          .eq("is_active", true)
          .eq("academic_year", academicYear)
          .eq("course_type", courseType);  // Filter by head teacher's course type

        const courseIds = coursesData?.map((c) => c.id) || [];
        const courseToClass = new Map<string, string>();
        (coursesData || []).forEach((c) => {
          courseToClass.set(c.id, c.class_id);
        });

        // DEBUG: Log course data
        const courseClassIdSet = new Set(coursesData?.map(c => c.class_id) || []);
        const classesWithoutCourse = classesData.filter(c => !courseClassIdSet.has(c.id));
        console.log('[HeadOverview] Step 6 - coursesData:', {
          count: coursesData?.length || 0,
          courseType,
          classIdsCount: classIds.length,
          courseClassIds: coursesData?.map(c => c.class_id),
          classesWithoutCourse: classesWithoutCourse.map(c => c.name),
        });

        // 7. BATCH QUERY: Get exams for these courses (filtered by term if needed)
        let examsQuery = supabase
          .from("exams")
          .select("id, course_id, term")
          .in("course_id", courseIds);

        if (termForApi) {
          examsQuery = examsQuery.eq("term", termForApi);
        }

        const { data: examsData } = await examsQuery;
        const examIds = examsData?.map((e) => e.id) || [];
        const examToCourse = new Map<string, string>();
        (examsData || []).forEach((e) => {
          examToCourse.set(e.id, e.course_id);
        });

        // DEBUG: Log exam data
        console.log('[HeadOverview] Step 7 - examsData:', {
          examCount: examIds.length,
          courseIdsCount: courseIds.length,
          termFilter: termForApi,
        });

        // 8. BATCH QUERY: Get scores for these exams
        // IMPORTANT: Supabase has a default limit of 1000 rows
        // For G5-6 IT courses, there can be 3500+ scores, so we need to fetch in batches
        let scoresData: { exam_id: string; score: number | null }[] = [];
        if (examIds.length > 0) {
          // Fetch scores using range() instead of limit() to ensure we get all rows
          // range(0, 9999) = first 10000 rows (0-indexed, inclusive)
          const { data, error: scoresError, count } = await supabase
            .from("scores")
            .select("exam_id, score", { count: "exact" })
            .in("exam_id", examIds)
            .not("score", "is", null)
            .range(0, 9999);  // Fetch rows 0-9999 (10000 total)
          scoresData = data || [];

          // DEBUG: Log scores data (v3 - using range() instead of limit())
          console.log('[HeadOverview] Step 8 - scoresData (RANGE=0-9999):', {
            scoresCount: scoresData.length,
            totalCount: count,  // This shows the actual total in database
            examIdsCount: examIds.length,
            error: scoresError?.message,
            expectedMin: 3500,  // G5-6 IT should have 3500+ scores
          });
        }

        // Group scores by class
        const scoresByClass = new Map<string, number[]>();
        let unmappedExamIds = 0;
        let unmappedCourseIds = 0;
        scoresData.forEach((s) => {
          if (s.score === null || s.score <= 0) return;
          const courseId = examToCourse.get(s.exam_id);
          if (!courseId) {
            unmappedExamIds++;
            return;
          }
          const classId = courseToClass.get(courseId);
          if (!classId) {
            unmappedCourseIds++;
            return;
          }

          const scores = scoresByClass.get(classId) || [];
          scores.push(s.score);
          scoresByClass.set(classId, scores);
        });

        // DEBUG: Log grouped scores
        console.log('[HeadOverview] Step 9 - scoresByClass:', {
          classesWithScores: scoresByClass.size,
          totalClasses: classesData.length,
          unmappedExamIds,
          unmappedCourseIds,
          classIdsWithScores: Array.from(scoresByClass.keys()),
        });

        // 9. Build class summaries
        const classSummaries: ClassSummary[] = classesData.map((cls) => {
          const studentCount = studentCountByClass.get(cls.id) || 0;
          const classScores = scoresByClass.get(cls.id) || [];
          const avgScore = classScores.length > 0
            ? Math.round((classScores.reduce((sum, s) => sum + s, 0) / classScores.length) * 10) / 10
            : null;

          return {
            id: cls.id,
            name: cls.name,
            studentCount,
            avgScore,
          };
        });

        setClasses(classSummaries);

      } catch (error) {
        console.error("Failed to fetch head teacher overview:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId, gradeBand, courseType, userPermissions?.grade, academicYear, termForApi]);

  return (
    <AuthGuard requiredRoles={["admin", "head"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <LayoutDashboard className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Grade Overview</h1>
            <p className="text-sm text-text-secondary">
              {getGradeDisplay(gradeBand)} • {courseType} • Performance metrics
            </p>
          </div>
        </div>

        {/* Global Filter Bar */}
        <GlobalFilterBar showYear showTerm />

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Classes</span>
              <GraduationCap className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-text-primary">{kpis.totalClasses}</div>
            )}
            <div className="text-xs text-text-tertiary">in {getGradeDisplay(gradeBand)}</div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Students</span>
              <Users className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-text-primary">{kpis.studentsCount.toLocaleString()}</div>
            )}
            <div className="text-xs text-text-tertiary">total enrolled</div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Avg Score</span>
              <TrendingUp className="w-4 h-4 text-green-500 dark:text-green-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-text-primary">
                {kpis.averageScore > 0 ? kpis.averageScore : "N/A"}
              </div>
            )}
            <div className="text-xs text-text-tertiary">grade average</div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Coverage</span>
              <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-text-primary">
                {kpis.coverageRate > 0 ? `${kpis.coverageRate}%` : "N/A"}
              </div>
            )}
            <div className="text-xs text-text-tertiary">students scored</div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-6">
          {/* Score Distribution */}
          <div className="bg-surface-secondary rounded-xl border border-border-default p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">Score Distribution</h3>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" className="dark:stroke-white/10" />
                    <XAxis
                      dataKey="bucket"
                      stroke="rgb(148,163,184)"
                      className="dark:stroke-white/50"
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="rgb(148,163,184)"
                      className="dark:stroke-white/50"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15,23,42,0.95)",
                        border: "1px solid rgba(148,163,184,0.2)",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      cursor={{ fill: "rgba(148,163,184,0.1)" }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-text-tertiary">
                <p>No score data available yet</p>
              </div>
            )}
          </div>

          {/* Students by Class */}
          <div className="bg-surface-secondary rounded-xl border border-border-default p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">Students by Class</h3>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" className="dark:stroke-white/10" />
                    <XAxis
                      dataKey="name"
                      stroke="rgb(148,163,184)"
                      className="dark:stroke-white/50"
                      fontSize={8}
                      tickLine={false}
                      axisLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis
                      stroke="rgb(148,163,184)"
                      className="dark:stroke-white/50"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15,23,42,0.95)",
                        border: "1px solid rgba(148,163,184,0.2)",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      cursor={{ fill: "rgba(148,163,184,0.1)" }}
                    />
                    <Bar dataKey="students" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-text-tertiary">
                <p>No class data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Class Performance Table */}
        <div className="bg-surface-secondary rounded-xl border border-border-default overflow-hidden">
          <div className="p-4 border-b border-border-default">
            <h3 className="text-lg font-medium text-text-primary">Class Performance</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-default">
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Class</th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Students</th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Avg Score</th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-subtle">
                    <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-10" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-10" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                  </tr>
                ))
              ) : classes.length > 0 ? (
                classes.map((cls) => (
                  <tr key={cls.id} className="border-b border-border-subtle hover:bg-surface-hover">
                    <td className="p-4 text-text-primary font-medium">{cls.name}</td>
                    <td className="p-4 text-text-secondary">{cls.studentCount}</td>
                    <td className="p-4">
                      <span className={
                        cls.avgScore !== null
                          ? cls.avgScore >= 80
                            ? "text-green-600 dark:text-green-400"
                            : cls.avgScore >= 60
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-red-600 dark:text-red-400"
                          : "text-text-tertiary"
                      }>
                        {cls.avgScore !== null ? cls.avgScore : "-"}
                      </span>
                    </td>
                    <td className="p-4">
                      {cls.avgScore !== null ? (
                        cls.avgScore >= 70 ? (
                          <span className="px-2 py-1 bg-green-500/20 text-green-600 dark:text-green-400 text-xs rounded-full">
                            On Track
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs rounded-full">
                            Needs Attention
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-1 bg-surface-elevated text-text-tertiary text-xs rounded-full">
                          No Data
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-text-tertiary">
                    No classes found for {getGradeDisplay(gradeBand)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Info */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <h3 className="text-emerald-600 dark:text-emerald-400 font-medium mb-2">Head Teacher Dashboard</h3>
          <p className="text-text-secondary text-sm">
            This dashboard shows metrics for {getGradeDisplay(gradeBand)} classes in the {courseType} track.
            Data is refreshed in real-time as teachers enter scores. Click on a class to view detailed student performance.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
