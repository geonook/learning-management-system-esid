"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/supabase/auth-context";
import AuthGuard from "@/components/auth/auth-guard";
import {
  AlertCircle,
  BarChart2,
  CheckCircle2,
  CheckSquare,
  Clock,
  Calendar,
  Bell,
} from "lucide-react";
import {
  getTeacherKpis,
  getAdminKpis,
  getHeadTeacherKpis,
  getClassDistribution,
  getScatterData,
  getUpcomingDeadlines,
  getRecentAlerts,
  type TeacherKpis,
  type AdminKpis,
  type HeadTeacherKpis,
  type ClassDistribution,
  type ScatterPoint,
  type UpcomingDeadline,
  type RecentAlert,
} from "@/lib/api/dashboard";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ScatterChart,
  CartesianGrid,
  Scatter,
  YAxis,
} from "recharts";
import { MissionControl } from "@/components/os/MissionControl";
import { Widget } from "@/components/os/Widget";
import { Skeleton, SkeletonKPI, SkeletonList } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { user, userPermissions } = useAuth();
  const userRole = userPermissions?.role;

  // Independent loading states
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingLists, setLoadingLists] = useState(true);

  // Data states
  const [teacherKpis, setTeacherKpis] = useState<TeacherKpis>({
    attendanceRate: null,
    averageScore: 0,
    passRate: 0,
    activeAlerts: null,
  });
  const [adminKpis, setAdminKpis] = useState<AdminKpis>({
    totalExams: 0,
    notDue: 0,
    overdue: 0,
    coverage: 0,
    onTime: null,
  });
  const [headKpis, setHeadKpis] = useState<HeadTeacherKpis>({
    totalClasses: 0,
    averageScore: 0,
    progressRate: 0,
    scoresEntered: 0,
    expectedScores: 0,
    activeIssues: null,
    studentsCount: 0,
    teachersCount: 0,
  });
  const [distribution, setDistribution] = useState<ClassDistribution[]>([]);
  const [scatterData, setScatterData] = useState<ScatterPoint[]>([]);
  const [deadlines, setDeadlines] = useState<UpcomingDeadline[]>([]);
  const [alerts, setAlerts] = useState<RecentAlert[]>([]);

  // Extract primitive values to prevent re-renders from object reference changes
  const userId = user?.id;
  const userGrade = userPermissions?.grade;
  const userTrack = userPermissions?.track;

  // Track if data has been loaded at least once
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    // Skip if user data is not ready yet
    if (!userId || !userRole) {
      // If we've loaded before and auth state changes, don't show loading again
      if (hasLoadedOnce.current) {
        return;
      }
      // Initial load - keep loading states as true
      return;
    }

    // For head teachers, wait until grade and track are loaded
    if (userRole === "head" && (!userGrade || !userTrack)) {
      // If we've loaded before, don't show loading again
      if (hasLoadedOnce.current) {
        return;
      }
      return;
    }

    // Track if component is still mounted to prevent state updates after unmount
    let isCancelled = false;

    // 1. Load KPIs (Fastest)
    const loadKpis = async () => {
      try {
        if (userRole === "teacher") {
          const data = await getTeacherKpis(userId);
          if (!isCancelled) setTeacherKpis(data);
        } else if (userRole === "admin" || userRole === "office_member") {
          const data = await getAdminKpis();
          if (!isCancelled) setAdminKpis(data);
        } else if (userRole === "head" && userGrade && userTrack) {
          const data = await getHeadTeacherKpis(userGrade, userTrack);
          if (!isCancelled) setHeadKpis(data);
        }
      } catch (e) {
        if (!isCancelled) console.error("[Dashboard] Failed to load KPIs", e);
      } finally {
        if (!isCancelled) setLoadingKpis(false);
      }
    };

    // 2. Load Charts (Medium)
    const loadCharts = async () => {
      try {
        const [distData, scatterPoints] = await Promise.all([
          getClassDistribution(
            userRole,
            userId,
            userGrade || undefined,
            userTrack || undefined
          ),
          getScatterData(userRole, userId),
        ]);
        if (!isCancelled) {
          setDistribution(distData);
          setScatterData(scatterPoints);
        }
      } catch (e) {
        if (!isCancelled) console.error("Failed to load charts", e);
      } finally {
        if (!isCancelled) setLoadingCharts(false);
      }
    };

    // 3. Load Lists (Fast/Medium)
    const loadLists = async () => {
      try {
        const [upcomingDeadlines, recentAlerts] = await Promise.all([
          getUpcomingDeadlines(
            userRole,
            userId,
            userGrade || undefined,
            userTrack || undefined
          ),
          getRecentAlerts(userRole, userId),
        ]);
        if (!isCancelled) {
          setDeadlines(upcomingDeadlines);
          setAlerts(recentAlerts);
        }
      } catch (e) {
        if (!isCancelled) console.error("Failed to load lists", e);
      } finally {
        if (!isCancelled) setLoadingLists(false);
      }
    };

    // Mark that we've started loading - prevents loading flash on auth state changes
    hasLoadedOnce.current = true;

    // Trigger all fetches independently
    loadKpis();
    loadCharts();
    loadLists();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isCancelled = true;
    };
  }, [userId, userRole, userGrade, userTrack]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <AuthGuard requiredRoles={["admin", "office_member", "head", "teacher"]}>
      <MissionControl>
        {/* Welcome Widget - Always visible immediately */}
        <Widget
          size="wide"
          className="bg-gradient-to-br from-blue-500/20 to-purple-500/20"
          delay={0}
        >
          <div className="flex h-full flex-col justify-center p-4">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              {getGreeting()},{" "}
              {user?.user_metadata?.full_name?.split(" ")[0] || "Teacher"}
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

        {/* Teacher KPIs */}
        {userRole === "teacher" && (
          <>
            <Widget
              title="Attendance"
              size="small"
              icon={<CheckSquare size={16} />}
              delay={1}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-text-primary">
                    {teacherKpis.attendanceRate !== null ? `${teacherKpis.attendanceRate}%` : "N/A"}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">
                    {teacherKpis.attendanceRate !== null ? "This semester" : "Coming soon"}
                  </div>
                </div>
              )}
            </Widget>
            <Widget
              title="Avg Score"
              size="small"
              icon={<BarChart2 size={16} />}
              delay={2}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-text-primary">
                    {teacherKpis.averageScore}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">
                    Class average
                  </div>
                </div>
              )}
            </Widget>
            <Widget
              title="Pass Rate"
              size="small"
              icon={<CheckCircle2 size={16} />}
              delay={3}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-text-primary">
                    {teacherKpis.passRate}%
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">
                    Above 60 points
                  </div>
                </div>
              )}
            </Widget>
            <Widget
              title="Alerts"
              size="small"
              icon={<AlertCircle size={16} />}
              delay={4}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-text-primary">
                    {teacherKpis.activeAlerts !== null ? teacherKpis.activeAlerts : "N/A"}
                  </div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    {teacherKpis.activeAlerts !== null ? "Requires attention" : "Coming soon"}
                  </div>
                </div>
              )}
            </Widget>
          </>
        )}

        {/* Admin/Office Member KPIs */}
        {(userRole === "admin" || userRole === "office_member") && (
          <>
            <Widget
              title="Total Exams"
              size="small"
              icon={<BarChart2 size={16} />}
              delay={1}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-text-primary">
                    {adminKpis.totalExams}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">This semester</div>
                </div>
              )}
            </Widget>
            <Widget
              title="Coverage"
              size="small"
              icon={<CheckCircle2 size={16} />}
              delay={2}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-text-primary">
                    {adminKpis.coverage}%
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">Score coverage</div>
                </div>
              )}
            </Widget>
            <Widget
              title="On Time"
              size="small"
              icon={<CheckSquare size={16} />}
              delay={3}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-text-primary">
                    {adminKpis.onTime !== null ? `${adminKpis.onTime}%` : "N/A"}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">
                    {adminKpis.onTime !== null ? "Submission rate" : "Coming soon"}
                  </div>
                </div>
              )}
            </Widget>
            <Widget
              title="Overdue"
              size="small"
              icon={<AlertCircle size={16} />}
              delay={4}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {adminKpis.overdue}
                  </div>
                  <div className="text-xs text-red-500 dark:text-red-300 mt-1">Action needed</div>
                </div>
              )}
            </Widget>
          </>
        )}

        {/* Head Teacher KPIs */}
        {userRole === "head" && (
          <>
            <Widget
              title="Classes"
              size="small"
              icon={<BarChart2 size={16} />}
              delay={1}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-text-primary">
                    {headKpis.totalClasses}
                  </div>
                  <div className="text-xs text-text-secondary">Total Classes</div>
                </div>
              )}
            </Widget>
            <Widget
              title="Students"
              size="small"
              icon={<CheckSquare size={16} />}
              delay={2}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-text-primary">
                    {headKpis.studentsCount}
                  </div>
                  <div className="text-xs text-text-secondary">Total Students</div>
                </div>
              )}
            </Widget>
            <Widget
              title="Avg Score"
              size="small"
              icon={<BarChart2 size={16} />}
              delay={3}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-text-primary">
                    {headKpis.averageScore}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1">
                    Grade average
                  </div>
                </div>
              )}
            </Widget>
            <Widget
              title="Issues"
              size="small"
              icon={<AlertCircle size={16} />}
              delay={4}
            >
              {loadingKpis ? (
                <SkeletonKPI />
              ) : (
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">
                    {headKpis.activeIssues !== null ? headKpis.activeIssues : "N/A"}
                  </div>
                  <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    {headKpis.activeIssues !== null ? "Active issues" : "Coming soon"}
                  </div>
                </div>
              )}
            </Widget>
          </>
        )}

        {/* Charts */}
        <Widget
          title="Score Distribution"
          size="medium"
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
          title="Performance Scatter"
          size="medium"
          icon={<BarChart2 size={16} />}
          delay={6}
        >
          {loadingCharts ? (
            <div className="h-full w-full pt-2 relative">
              <Skeleton className="absolute bottom-4 left-4 h-2 w-2 rounded-full" />
              <Skeleton className="absolute top-1/2 left-1/2 h-2 w-2 rounded-full" />
              <Skeleton className="absolute top-1/4 right-1/4 h-2 w-2 rounded-full" />
              <Skeleton className="absolute bottom-1/3 right-1/3 h-2 w-2 rounded-full" />
            </div>
          ) : (
            <div className="h-full w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border-subtle"
                  />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Avg"
                    unit="%"
                    className="text-text-secondary"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Coverage"
                    unit="%"
                    className="text-text-secondary"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--surface-elevated))",
                      border: "1px solid hsl(var(--border-default))",
                      borderRadius: "8px",
                      color: "hsl(var(--text-primary))",
                    }}
                  />
                  <Scatter data={scatterData} fill="#34d399" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </Widget>

        {/* Lists */}
        <Widget
          title="Upcoming Deadlines"
          size="tall"
          icon={<Calendar size={16} />}
          delay={7}
        >
          {loadingLists ? (
            <SkeletonList rows={3} />
          ) : (
            <div className="space-y-3">
              {deadlines.length > 0 ? (
                deadlines.map((d) => (
                  <div
                    key={d.id}
                    className="flex flex-col space-y-1 border-b border-border-default pb-2 last:border-0"
                  >
                    <div className="font-medium text-sm text-text-primary">
                      {d.title}
                    </div>
                    <div className="text-xs text-text-tertiary">{d.due_at}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-text-tertiary text-center py-4">
                  No deadlines
                </div>
              )}
            </div>
          )}
        </Widget>

        <Widget
          title="Recent Alerts"
          size="tall"
          icon={<Bell size={16} />}
          delay={8}
        >
          {loadingLists ? (
            <SkeletonList rows={3} />
          ) : (
            <div className="space-y-3">
              {alerts.length > 0 ? (
                alerts.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-col space-y-1 border-b border-border-default pb-2 last:border-0"
                  >
                    <div className="font-medium text-sm text-text-primary">
                      {a.message}
                    </div>
                    <div className="text-xs text-text-tertiary">{a.when}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-text-tertiary text-center py-4">
                  No alerts
                </div>
              )}
            </div>
          )}
        </Widget>
      </MissionControl>
    </AuthGuard>
  );
}
