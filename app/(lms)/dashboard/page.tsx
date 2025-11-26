"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/supabase/auth-context";
import AuthGuard from "@/components/auth/auth-guard";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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
  YAxis,
  Tooltip,
  ScatterChart,
  CartesianGrid,
  Scatter,
} from "recharts";
import { MissionControl } from "@/components/os/MissionControl";
import { Widget } from "@/components/os/Widget";

export default function Dashboard() {
  const { user, userPermissions } = useAuth();
  const userRole = userPermissions?.role;
  const [loading, setLoading] = useState(true);
  const [teacherKpis, setTeacherKpis] = useState<TeacherKpis>({
    attendanceRate: 0,
    averageScore: 0,
    passRate: 0,
    activeAlerts: 0,
  });
  const [adminKpis, setAdminKpis] = useState<AdminKpis>({
    totalExams: 0,
    notDue: 0,
    overdue: 0,
    coverage: 0,
    onTime: 0,
  });
  const [headKpis, setHeadKpis] = useState<HeadTeacherKpis>({
    totalClasses: 0,
    averageScore: 0,
    coverageRate: 0,
    activeIssues: 0,
    studentsCount: 0,
    teachersCount: 0,
  });
  const [distribution, setDistribution] = useState<ClassDistribution[]>([]);
  const [scatterData, setScatterData] = useState<ScatterPoint[]>([]);
  const [deadlines, setDeadlines] = useState<UpcomingDeadline[]>([]);
  const [alerts, setAlerts] = useState<RecentAlert[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      if (!user?.id || !userRole) return;

      try {
        setLoading(true);

        // Load data based on user role
        const [distData, scatterPoints, upcomingDeadlines, recentAlerts] =
          await Promise.all([
            getClassDistribution(
              userRole,
              user.id,
              userPermissions?.grade || undefined,
              userPermissions?.track || undefined
            ),
            getScatterData(userRole, user.id),
            getUpcomingDeadlines(
              userRole,
              user.id,
              userPermissions?.grade || undefined,
              userPermissions?.track || undefined
            ),
            getRecentAlerts(userRole, user.id),
          ]);

        // Load role-specific KPIs
        if (userRole === "teacher") {
          const teacherKpiData = await getTeacherKpis(user.id);
          setTeacherKpis(teacherKpiData);
        } else if (userRole === "admin" || userRole === "office_member") {
          const adminKpiData = await getAdminKpis();
          setAdminKpis(adminKpiData);
        } else if (
          userRole === "head" &&
          userPermissions?.grade &&
          userPermissions?.track
        ) {
          const [headKpiData] = await Promise.all([
            getHeadTeacherKpis(userPermissions.grade, userPermissions.track),
            // getGradeClassSummary(userPermissions.grade, userPermissions.track)
          ]);
          setHeadKpis(headKpiData);
          // setGradeClassSummary(classSummaryData)
        }
        setDistribution(distData);
        setScatterData(scatterPoints);
        setDeadlines(upcomingDeadlines);
        setAlerts(recentAlerts);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user?.id, userRole, userPermissions?.grade, userPermissions?.track]);

  if (loading) {
    return (
      <AuthGuard requiredRoles={["admin", "office_member", "head", "teacher"]}>
        <div className="flex h-screen w-full items-center justify-center bg-black/20 backdrop-blur-sm">
          <LoadingSpinner size="lg" />
        </div>
      </AuthGuard>
    );
  }

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
            <h1 className="text-3xl font-bold text-white mb-2">
              {getGreeting()},{" "}
              {user?.user_metadata?.full_name?.split(" ")[0] || "Teacher"}
            </h1>
            <p className="text-white/70 text-lg">
              Here&apos;s what&apos;s happening in your classes today.
            </p>
            <div className="mt-6 flex space-x-6">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm text-white/80">System Online</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-white/60" />
                <span className="text-sm text-white/80">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
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
              <div className="flex h-full flex-col items-center justify-center">
                <div className="text-3xl font-bold text-white">
                  {teacherKpis.attendanceRate}%
                </div>
                <div className="text-xs text-green-400 mt-1">
                  +2.1% vs last week
                </div>
              </div>
            </Widget>
            <Widget
              title="Avg Score"
              size="small"
              icon={<BarChart2 size={16} />}
              delay={2}
            >
              <div className="flex h-full flex-col items-center justify-center">
                <div className="text-3xl font-bold text-white">
                  {teacherKpis.averageScore}
                </div>
                <div className="text-xs text-green-400 mt-1">
                  +1.4% vs last term
                </div>
              </div>
            </Widget>
            <Widget
              title="Pass Rate"
              size="small"
              icon={<CheckCircle2 size={16} />}
              delay={3}
            >
              <div className="flex h-full flex-col items-center justify-center">
                <div className="text-3xl font-bold text-white">
                  {teacherKpis.passRate}%
                </div>
                <div className="text-xs text-green-400 mt-1">
                  +0.9% improvement
                </div>
              </div>
            </Widget>
            <Widget
              title="Alerts"
              size="small"
              icon={<AlertCircle size={16} />}
              delay={4}
            >
              <div className="flex h-full flex-col items-center justify-center">
                <div className="text-3xl font-bold text-white">
                  {teacherKpis.activeAlerts}
                </div>
                <div className="text-xs text-yellow-400 mt-1">
                  Requires attention
                </div>
              </div>
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
              <div className="flex h-full flex-col items-center justify-center">
                <div className="text-3xl font-bold text-white">
                  {adminKpis.totalExams}
                </div>
                <div className="text-xs text-green-400 mt-1">+12 new</div>
              </div>
            </Widget>
            <Widget
              title="Coverage"
              size="small"
              icon={<CheckCircle2 size={16} />}
              delay={2}
            >
              <div className="flex h-full flex-col items-center justify-center">
                <div className="text-3xl font-bold text-white">
                  {adminKpis.coverage}%
                </div>
                <div className="text-xs text-green-400 mt-1">On track</div>
              </div>
            </Widget>
            <Widget
              title="On Time"
              size="small"
              icon={<CheckSquare size={16} />}
              delay={3}
            >
              <div className="flex h-full flex-col items-center justify-center">
                <div className="text-3xl font-bold text-white">
                  {adminKpis.onTime}%
                </div>
                <div className="text-xs text-green-400 mt-1">
                  Submission rate
                </div>
              </div>
            </Widget>
            <Widget
              title="Overdue"
              size="small"
              icon={<AlertCircle size={16} />}
              delay={4}
            >
              <div className="flex h-full flex-col items-center justify-center">
                <div className="text-3xl font-bold text-red-400">
                  {adminKpis.overdue}
                </div>
                <div className="text-xs text-red-300 mt-1">Action needed</div>
              </div>
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
              <div className="flex h-full flex-col items-center justify-center">
                <div className="text-3xl font-bold text-white">
                  {headKpis.totalClasses}
                </div>
                <div className="text-xs text-white/60">Total Classes</div>
              </div>
            </Widget>
            <Widget
              title="Students"
              size="small"
              icon={<CheckSquare size={16} />}
              delay={2}
            >
              <div className="flex h-full flex-col items-center justify-center">
                <div className="text-3xl font-bold text-white">
                  {headKpis.studentsCount}
                </div>
                <div className="text-xs text-white/60">Total Students</div>
              </div>
            </Widget>
            <Widget
              title="Avg Score"
              size="small"
              icon={<BarChart2 size={16} />}
              delay={3}
            >
              <div className="flex h-full flex-col items-center justify-center">
                <div className="text-3xl font-bold text-white">
                  {headKpis.averageScore}
                </div>
                <div className="text-xs text-green-400 mt-1">Above target</div>
              </div>
            </Widget>
            <Widget
              title="Issues"
              size="small"
              icon={<AlertCircle size={16} />}
              delay={4}
            >
              <div className="flex h-full flex-col items-center justify-center">
                <div className="text-3xl font-bold text-yellow-400">
                  {headKpis.activeIssues}
                </div>
                <div className="text-xs text-yellow-300 mt-1">
                  Active issues
                </div>
              </div>
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
          <div className="h-full w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution}>
                <XAxis
                  dataKey="bucket"
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
                <Bar dataKey="count" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Widget>

        <Widget
          title="Performance Scatter"
          size="medium"
          icon={<BarChart2 size={16} />}
          delay={6}
        >
          <div className="h-full w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Avg"
                  unit="%"
                  stroke="rgba(255,255,255,0.5)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Coverage"
                  unit="%"
                  stroke="rgba(255,255,255,0.5)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.8)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Scatter data={scatterData} fill="#34d399" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Widget>

        {/* Lists */}
        <Widget
          title="Upcoming Deadlines"
          size="tall"
          icon={<Calendar size={16} />}
          delay={7}
        >
          <div className="space-y-3">
            {deadlines.length > 0 ? (
              deadlines.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-col space-y-1 border-b border-white/10 pb-2 last:border-0"
                >
                  <div className="font-medium text-sm text-white">
                    {d.title}
                  </div>
                  <div className="text-xs text-white/50">{d.due_at}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-white/50 text-center py-4">
                No deadlines
              </div>
            )}
          </div>
        </Widget>

        <Widget
          title="Recent Alerts"
          size="tall"
          icon={<Bell size={16} />}
          delay={8}
        >
          <div className="space-y-3">
            {alerts.length > 0 ? (
              alerts.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col space-y-1 border-b border-white/10 pb-2 last:border-0"
                >
                  <div className="font-medium text-sm text-white">
                    {a.message}
                  </div>
                  <div className="text-xs text-white/50">{a.when}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-white/50 text-center py-4">
                No alerts
              </div>
            )}
          </div>
        </Widget>
      </MissionControl>
    </AuthGuard>
  );
}
