"use client";

import { useEffect, useState, useRef } from "react";
import { useAuthReady } from "@/hooks/useAuthReady";
import AuthGuard from "@/components/auth/auth-guard";
import {
  AlertTriangle,
  BarChart2,
  Users,
  School,
  GraduationCap,
  BookOpen,
  Percent,
  Clock,
  Lock,
} from "lucide-react";
import {
  getTeacherDashboardKpis,
  getHeadTeacherDashboardKpis,
  getAdminDashboardKpis,
  getClassDistribution,
  getClassCompletionProgress,
  getSchoolCompletionProgress,
  getScoreHeatmapData,
  type TeacherDashboardKpis,
  type HeadTeacherDashboardKpis,
  type AdminDashboardKpis,
  type ClassDistribution,
  type ClassCompletionItem,
  type SchoolCompletionProgress,
  type HeatmapCell,
} from "@/lib/api/dashboard";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
} from "recharts";
import { MissionControl } from "@/components/os/MissionControl";
import { Widget } from "@/components/os/Widget";
import { Skeleton, SkeletonKPI } from "@/components/ui/skeleton";
import { ScoreHeatmap, ClassCompletionBars, CompletionDonut } from "@/components/statistics/charts";
import { useGlobalFilters } from "@/components/filters";
import { useClosingPeriods } from "@/hooks/usePeriodLock";
import { TERM_DETAILS } from "@/types/academic-period";

export default function Dashboard() {
  const { userId, role: userRole, permissions: userPermissions, fullName } = useAuthReady();
  const { academicYear, termForApi } = useGlobalFilters();
  const { closingPeriods, isLoading: isLoadingClosingPeriods } = useClosingPeriods();

  // Independent loading states
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);

  // Teacher data states
  const [teacherKpis, setTeacherKpis] = useState<TeacherDashboardKpis>({
    classes: 0,
    students: 0,
    progress: 0,
    avgScore: null,
  });
  const [distribution, setDistribution] = useState<ClassDistribution[]>([]);
  const [classCompletion, setClassCompletion] = useState<ClassCompletionItem[]>([]);

  // Head Teacher data states
  const [headKpis, setHeadKpis] = useState<HeadTeacherDashboardKpis>({
    classes: 0,
    students: 0,
    avgScore: null,
    atRisk: 0,
  });
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>([]);

  // Admin data states
  const [adminKpis, setAdminKpis] = useState<AdminDashboardKpis>({
    classes: 0,
    students: 0,
    teachers: 0,
    courses: 0,
  });
  const [schoolProgress, setSchoolProgress] = useState<SchoolCompletionProgress>({
    entered: 0,
    expected: 0,
    percentage: 0,
  });

  // Extract primitive values
  const userGrade = userPermissions?.grade;

  // Track if data has been loaded at least once
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    if (!userId || !userRole) {
      if (hasLoadedOnce.current) return;
      return;
    }

    // For head teachers, wait until grade is loaded
    if (userRole === "head" && !userGrade) {
      if (hasLoadedOnce.current) return;
      return;
    }

    let isCancelled = false;

    // 1. Load KPIs
    const loadKpis = async () => {
      try {
        if (userRole === "teacher") {
          const data = await getTeacherDashboardKpis(userId, academicYear, termForApi);
          if (!isCancelled) setTeacherKpis(data);
        } else if (userRole === "head") {
          const data = await getHeadTeacherDashboardKpis(userId, academicYear, termForApi);
          if (!isCancelled) setHeadKpis(data);
        } else if (userRole === "admin" || userRole === "office_member") {
          const data = await getAdminDashboardKpis(academicYear);
          if (!isCancelled) setAdminKpis(data);
        }
      } catch (e) {
        if (!isCancelled) console.error("[Dashboard] Failed to load KPIs", e);
      } finally {
        if (!isCancelled) setLoadingKpis(false);
      }
    };

    // 2. Load Charts
    const loadCharts = async () => {
      try {
        if (userRole === "teacher") {
          // Teacher: Score Distribution + Class Completion Bars
          const [distData, completionData] = await Promise.all([
            getClassDistribution(userRole, userId),
            getClassCompletionProgress(userId, academicYear, termForApi),
          ]);
          if (!isCancelled) {
            setDistribution(distData);
            setClassCompletion(completionData);
          }
        } else if (userRole === "head") {
          // Head Teacher: Score Heatmap + Class Completion Bars
          const [heatmap, completionData] = await Promise.all([
            getScoreHeatmapData(academicYear, termForApi, userGrade || undefined),
            getClassCompletionProgress(userId, academicYear, termForApi),
          ]);
          if (!isCancelled) {
            setHeatmapData(heatmap);
            setClassCompletion(completionData);
          }
        } else if (userRole === "admin" || userRole === "office_member") {
          // Admin/Office: Score Heatmap + School Completion Donut
          const [heatmap, progress] = await Promise.all([
            getScoreHeatmapData(academicYear, termForApi),
            getSchoolCompletionProgress(academicYear, termForApi),
          ]);
          if (!isCancelled) {
            setHeatmapData(heatmap);
            setSchoolProgress(progress);
          }
        }
      } catch (e) {
        if (!isCancelled) console.error("Failed to load charts", e);
      } finally {
        if (!isCancelled) setLoadingCharts(false);
      }
    };

    hasLoadedOnce.current = true;

    loadKpis();
    loadCharts();

    return () => {
      isCancelled = true;
    };
  }, [userId, userRole, userGrade, academicYear, termForApi]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <AuthGuard requiredRoles={["admin", "office_member", "head", "teacher"]}>
      <MissionControl>
        {/* Welcome Widget */}
        <Widget
          size="wide"
          className="bg-gradient-to-br from-blue-500/20 to-purple-500/20"
          delay={0}
        >
          <div className="flex h-full flex-col justify-center p-4">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              {getGreeting()},{" "}
              {fullName?.split(" ")[0] || "Teacher"}
            </h1>
            <p className="text-text-secondary text-lg">
              Here&apos;s what&apos;s happening in your classes today.
            </p>
            <div className="mt-6 flex items-center space-x-2">
              <Clock className="h-4 w-4 text-text-secondary" />
              <span className="text-sm text-text-primary">
                {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
        </Widget>

        {/* Deadline Warning Widget - Only show if there are closing periods */}
        {!isLoadingClosingPeriods && closingPeriods.length > 0 && (
          <Widget
            title="Deadline Alerts"
            size="medium"
            icon={<Lock size={16} />}
            className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-200 dark:border-amber-800"
            delay={0.5}
          >
            <div className="h-full flex flex-col justify-center p-2 space-y-2">
              {closingPeriods.slice(0, 3).map((period) => {
                const termDetail = period.term ? TERM_DETAILS[period.term] : null;
                const termLabel = termDetail
                  ? `Term ${period.term} (${termDetail.semester} ${termDetail.type})`
                  : period.semester
                  ? `Semester ${period.semester}`
                  : "Year";

                return (
                  <div
                    key={period.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        {termLabel}
                      </span>
                    </div>
                    <span className={`text-sm font-bold ${
                      period.daysUntilLock <= 3
                        ? "text-red-600 dark:text-red-400"
                        : period.daysUntilLock <= 7
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-text-secondary"
                    }`}>
                      {period.daysUntilLock} days
                    </span>
                  </div>
                );
              })}
              {closingPeriods.length > 3 && (
                <div className="text-xs text-text-tertiary text-center">
                  +{closingPeriods.length - 3} more deadlines
                </div>
              )}
            </div>
          </Widget>
        )}

        {/* ==================== TEACHER KPIs ==================== */}
        {userRole === "teacher" && (
          <>
            <Widget
              title="Classes"
              size="small"
              icon={<School size={16} />}
              delay={1}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-text-primary">
                    {teacherKpis.classes}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">Teaching</div>
                </div>
              )}
            </Widget>
            <Widget
              title="Students"
              size="small"
              icon={<Users size={16} />}
              delay={2}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-text-primary">
                    {teacherKpis.students}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">Total</div>
                </div>
              )}
            </Widget>
            <Widget
              title="Progress"
              size="small"
              icon={<Percent size={16} />}
              delay={3}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className={`text-3xl font-bold ${
                    teacherKpis.progress >= 70
                      ? "text-green-600 dark:text-green-400"
                      : teacherKpis.progress >= 50
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400"
                  }`}>
                    {teacherKpis.progress}%
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">Grade Entry</div>
                </div>
              )}
            </Widget>
            <Widget
              title="Avg Score"
              size="small"
              icon={<BarChart2 size={16} />}
              delay={4}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-text-primary">
                    {teacherKpis.avgScore !== null ? teacherKpis.avgScore : "-"}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">Class Avg</div>
                </div>
              )}
            </Widget>
          </>
        )}

        {/* ==================== HEAD TEACHER KPIs ==================== */}
        {userRole === "head" && (
          <>
            <Widget
              title="Classes"
              size="small"
              icon={<School size={16} />}
              delay={1}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-text-primary">
                    {headKpis.classes}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">Teaching</div>
                </div>
              )}
            </Widget>
            <Widget
              title="Students"
              size="small"
              icon={<Users size={16} />}
              delay={2}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-text-primary">
                    {headKpis.students}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">Total</div>
                </div>
              )}
            </Widget>
            <Widget
              title="Avg Score"
              size="small"
              icon={<GraduationCap size={16} />}
              delay={3}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-text-primary">
                    {headKpis.avgScore !== null ? headKpis.avgScore : "-"}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">Class Avg</div>
                </div>
              )}
            </Widget>
            <Widget
              title="At Risk"
              size="small"
              icon={<AlertTriangle size={16} />}
              delay={4}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className={`text-3xl font-bold ${
                    headKpis.atRisk > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                  }`}>
                    {headKpis.atRisk}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">
                    {headKpis.atRisk > 0 ? "Needs attention" : "All good"}
                  </div>
                </div>
              )}
            </Widget>
          </>
        )}

        {/* ==================== ADMIN/OFFICE KPIs ==================== */}
        {(userRole === "admin" || userRole === "office_member") && (
          <>
            <Widget
              title="Classes"
              size="small"
              icon={<School size={16} />}
              delay={1}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-text-primary">
                    {adminKpis.classes}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">Total</div>
                </div>
              )}
            </Widget>
            <Widget
              title="Students"
              size="small"
              icon={<Users size={16} />}
              delay={2}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-text-primary">
                    {adminKpis.students.toLocaleString()}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">Total</div>
                </div>
              )}
            </Widget>
            <Widget
              title="Teachers"
              size="small"
              icon={<GraduationCap size={16} />}
              delay={3}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-text-primary">
                    {adminKpis.teachers}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">Active</div>
                </div>
              )}
            </Widget>
            <Widget
              title="Courses"
              size="small"
              icon={<BookOpen size={16} />}
              delay={4}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-text-primary">
                    {adminKpis.courses}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">Total</div>
                </div>
              )}
            </Widget>
          </>
        )}

        {/* ==================== CHARTS ==================== */}

        {/* Teacher Charts: Score Distribution + Class Completion Bars */}
        {userRole === "teacher" && (
          <>
            <Widget
              title="Score Distribution"
              size="xlarge"
              icon={<BarChart2 size={16} />}
              delay={5}
            >
              {loadingCharts ? (
                <div className="h-full w-full pt-2 flex items-end justify-between gap-2 px-4 pb-4">
                  <Skeleton className="h-1/3 w-full" />
                  <Skeleton className="h-2/3 w-full" />
                  <Skeleton className="h-1/2 w-full" />
                  <Skeleton className="h-3/4 w-full" />
                  <Skeleton className="h-1/4 w-full" />
                </div>
              ) : (
                <div className="h-full w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distribution}>
                      <XAxis
                        dataKey="bucket"
                        className="text-text-secondary"
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
                        cursor={{ fill: "hsl(var(--surface-secondary))" }}
                      />
                      <Bar dataKey="count" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Widget>
            <Widget
              title="Class Completion"
              size="medium"
              icon={<Percent size={16} />}
              delay={6}
            >
              <ClassCompletionBars
                data={classCompletion}
                loading={loadingCharts}
                title=""
                subtitle=""
              />
            </Widget>
          </>
        )}

        {/* Head Teacher Charts: Score Heatmap + Class Completion Bars */}
        {userRole === "head" && (
          <>
            <Widget
              title="Score Heatmap"
              size="xlarge"
              icon={<BarChart2 size={16} />}
              delay={5}
            >
              <ScoreHeatmap
                data={heatmapData}
                loading={loadingCharts}
                title=""
                subtitle=""
              />
            </Widget>
            <Widget
              title="Class Completion"
              size="medium"
              icon={<Percent size={16} />}
              delay={6}
            >
              <ClassCompletionBars
                data={classCompletion}
                loading={loadingCharts}
                title=""
                subtitle=""
              />
            </Widget>
          </>
        )}

        {/* Admin/Office Charts: Score Heatmap + School Completion Donut */}
        {(userRole === "admin" || userRole === "office_member") && (
          <>
            <Widget
              title="Score Heatmap"
              size="xlarge"
              icon={<BarChart2 size={16} />}
              delay={5}
            >
              <ScoreHeatmap
                data={heatmapData}
                loading={loadingCharts}
                title=""
                subtitle=""
              />
            </Widget>
            <Widget
              title="Grade Entry Progress"
              size="medium"
              icon={<Percent size={16} />}
              delay={6}
            >
              <CompletionDonut
                data={schoolProgress}
                loading={loadingCharts}
                title=""
                subtitle=""
              />
            </Widget>
          </>
        )}

      </MissionControl>
    </AuthGuard>
  );
}
