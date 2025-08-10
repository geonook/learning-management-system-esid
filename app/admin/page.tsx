"use client"

import FilterBar from "@/components/ui/filter-bar"
import StatCard from "@/components/ui/stat-card"
import ChartCard from "@/components/ui/chart-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  getAdminKpis, 
  getOverdueTable, 
  getTeacherHeatmap, 
  getClassPerformance, 
  getActivityTrend 
} from "@/lib/mock-data"
import { useMemo } from "react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { Download } from "lucide-react"

export default function AdminDashboard() {
  const kpis = useMemo(() => getAdminKpis(), [])
  const overdue = useMemo(() => getOverdueTable(), [])
  const heatmap = useMemo(() => getTeacherHeatmap(), [])
  const performance = useMemo(() => getClassPerformance(), [])
  const trend = useMemo(() => getActivityTrend(), [])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admin Dashboard</h1>
      <FilterBar
        extra={
          <Button variant="secondary" size="sm" className="gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Total Exams (term)" value={kpis.totalExams} delta="+4" />
        <StatCard label="Not Due Yet" value={kpis.notDue} delta="+1" />
        <StatCard label="Overdue & Incomplete" value={kpis.overdue} tone="danger" delta="+2" />
        <StatCard
          label="Weighted Coverage / On-Time"
          value={`${kpis.coverage}% / ${kpis.onTime}%`}
          delta="+3%"
          tone="success"
        />
      </div>

      <div className="grid gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Overdue & Incomplete</CardTitle>
            <Button size="sm" variant="outline">
              Export CSV
            </Button>
          </CardHeader>
          <CardContent className="overflow-auto">
            <Table role="table" aria-label="Overdue & Incomplete table">
              <TableHeader>
                <TableRow>
                  <TableHead>Exam ID</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Coverage %</TableHead>
                  <TableHead>Missing Count</TableHead>
                  <TableHead>Due in…</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdue.map((row) => (
                  <TableRow key={row.examId}>
                    <TableCell>{row.examId}</TableCell>
                    <TableCell>{row.grade}</TableCell>
                    <TableCell>{row.class}</TableCell>
                    <TableCell>{row.track}</TableCell>
                    <TableCell>{row.coverage}</TableCell>
                    <TableCell>{row.missing}</TableCell>
                    <TableCell>{row.dueIn}</TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" variant="secondary">
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        Export CSV
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teacher Progress Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-1" role="grid" aria-label="Teacher x Exams coverage heatmap">
              {heatmap.map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-1">
                  {row.map((value, j) => (
                    <div
                      key={j}
                      className="h-6 rounded"
                      style={{ backgroundColor: `hsl(${(120 * value) / 100} 70% 45%)` }}
                      title={`${value}%`}
                      aria-label={`Teacher ${i + 1} Exam ${j + 1}: ${value}% coverage`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              8 teachers × 12 exams coverage matrix (green = high completion)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Class Performance Overview</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto">
            <Table aria-label="Class performance">
              <TableHeader>
                <TableRow>
                  <TableHead>Grade</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Avg</TableHead>
                  <TableHead>Max</TableHead>
                  <TableHead>Min</TableHead>
                  <TableHead>Pass Rate</TableHead>
                  <TableHead>Students</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performance.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.grade}</TableCell>
                    <TableCell>{row.class}</TableCell>
                    <TableCell>{row.track}</TableCell>
                    <TableCell>{row.avg}</TableCell>
                    <TableCell>{row.max}</TableCell>
                    <TableCell>{row.min}</TableCell>
                    <TableCell>{row.passRate}%</TableCell>
                    <TableCell>{row.n}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <ChartCard title="Activity Trend (14 days)" subtitle="Score entries vs Attendance submissions">
          <div className="h-[260px]" role="img" aria-label="Line chart for activity trend">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="scores" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}