"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/supabase/auth-context"
import AuthGuard from "@/components/auth/auth-guard"
import FilterBar from "@/components/ui/filter-bar"
import StatCard from "@/components/ui/stat-card"
import ChartCard from "@/components/ui/chart-card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { AlertCircle, BarChart2, CheckCircle2, CheckSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  getTeacherKpis,
  getClassDistribution, 
  getScatterData, 
  getUpcomingDeadlines, 
  getRecentAlerts,
  type TeacherKpis,
  type ClassDistribution,
  type ScatterPoint,
  type UpcomingDeadline,
  type RecentAlert
} from "@/lib/api/dashboard"
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
  ZAxis,
} from "recharts"

export default function TeacherDashboard() {
  const { user, userPermissions } = useAuth()
  const userRole = userPermissions?.role
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<TeacherKpis>({ 
    attendanceRate: 0, 
    averageScore: 0, 
    passRate: 0, 
    activeAlerts: 0 
  })
  const [distribution, setDistribution] = useState<ClassDistribution[]>([])
  const [scatterData, setScatterData] = useState<ScatterPoint[]>([])
  const [deadlines, setDeadlines] = useState<UpcomingDeadline[]>([])
  const [alerts, setAlerts] = useState<RecentAlert[]>([])

  useEffect(() => {
    async function loadDashboardData() {
      if (!user?.id || !userRole) return

      try {
        setLoading(true)

        // Load data based on user role
        const [kpiData, distData, scatterPoints, upcomingDeadlines, recentAlerts] = await Promise.all([
          userRole === 'teacher' ? getTeacherKpis(user.id) : 
            Promise.resolve({ attendanceRate: 0, averageScore: 0, passRate: 0, activeAlerts: 0 }),
          getClassDistribution(userRole, user.id),
          getScatterData(userRole, user.id),
          getUpcomingDeadlines(userRole, user.id),
          getRecentAlerts(userRole, user.id)
        ])

        setKpis(kpiData)
        setDistribution(distData)
        setScatterData(scatterPoints)
        setDeadlines(upcomingDeadlines)
        setAlerts(recentAlerts)

      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [user?.id, userRole])

  if (loading) {
    return (
      <AuthGuard requiredRoles={['admin', 'head', 'teacher']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requiredRoles={['admin', 'head', 'teacher']}>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Teacher Dashboard</h1>
      </div>
      <FilterBar />

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard
          label="Attendance Rate"
          value={`${kpis.attendanceRate}%`}
          delta="+2.1%"
          icon={<CheckSquare className="w-4 h-4" />}
          tone="success"
        />
        <StatCard
          label="Average Score"
          value={kpis.averageScore.toString()}
          delta="+1.4%"
          icon={<BarChart2 className="w-4 h-4" />}
        />
        <StatCard
          label="Pass Rate"
          value={`${kpis.passRate}%`}
          delta="+0.9%"
          icon={<CheckCircle2 className="w-4 h-4" />}
          tone="success"
        />
        <StatCard
          label="Active Alerts (7d)"
          value={kpis.activeAlerts.toString()}
          delta="-3"
          icon={<AlertCircle className="w-4 h-4" />}
          tone="warning"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Class Score Distribution" subtitle="English - Current Term">
          <div className="h-[260px]" role="img" aria-label="Histogram of class score distribution">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution}>
                <XAxis dataKey="bucket" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Class vs Grade Scatter" subtitle="x: class avg, y: submission coverage">
          <div className="h-[260px]" role="img" aria-label="Scatter plot class average vs submission coverage">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid />
                <XAxis type="number" dataKey="x" name="Class Avg" unit="%" />
                <YAxis type="number" dataKey="y" name="Coverage" unit="%" />
                <ZAxis type="number" dataKey="z" range={[60, 160]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={scatterData} fill="#34d399" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {deadlines.length > 0 ? deadlines.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm border rounded-md p-2">
                <div className="font-medium">{d.title}</div>
                <div className="text-muted-foreground">{d.due_at}</div>
              </div>
            )) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                No upcoming deadlines
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.length > 0 ? alerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm border rounded-md p-2">
                <div className="flex-1">{a.message}</div>
                <div className="text-muted-foreground ml-2">{a.when}</div>
              </div>
            )) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                No recent alerts
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </AuthGuard>
  )
}