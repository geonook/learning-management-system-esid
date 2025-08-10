"use client"

import { useMemo } from "react"
import FilterBar from "@/components/ui/filter-bar"
import StatCard from "@/components/ui/stat-card"
import ChartCard from "@/components/ui/chart-card"
import { AlertCircle, BarChart2, CheckCircle2, CheckSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  getClassDistribution, 
  getScatterData, 
  getUpcomingDeadlines, 
  getRecentAlerts, 
  getKpisTeacher 
} from "@/lib/mock-data"
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
  const kpi = useMemo(() => getKpisTeacher(), [])
  const dist = useMemo(() => getClassDistribution(), [])
  const scatter = useMemo(() => getScatterData(), [])
  const deadlines = useMemo(() => getUpcomingDeadlines(), [])
  const alerts = useMemo(() => getRecentAlerts(), [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Teacher Dashboard</h1>
      </div>
      <FilterBar />

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard
          label="Attendance Rate"
          value={`${kpi.attendanceRate}%`}
          delta="+2.1%"
          icon={<CheckSquare className="w-4 h-4" />}
          tone="success"
        />
        <StatCard
          label="Average Score"
          value={kpi.averageScore}
          delta="+1.4%"
          icon={<BarChart2 className="w-4 h-4" />}
        />
        <StatCard
          label="Pass Rate"
          value={`${kpi.passRate}%`}
          delta="+0.9%"
          icon={<CheckCircle2 className="w-4 h-4" />}
          tone="success"
        />
        <StatCard
          label="Active Alerts (7d)"
          value={kpi.activeAlerts}
          delta="-3"
          icon={<AlertCircle className="w-4 h-4" />}
          tone="warning"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Class Score Distribution" subtitle="English - Current Term">
          <div className="h-[260px]" role="img" aria-label="Histogram of class score distribution">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dist}>
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
                <Scatter data={scatter} fill="#34d399" />
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
            {deadlines.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm border rounded-md p-2">
                <div className="font-medium">{d.title}</div>
                <div className="text-muted-foreground">{d.due_at}</div>
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm border rounded-md p-2">
                <div className="flex-1">{a.message}</div>
                <div className="text-muted-foreground ml-2">{a.when}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}