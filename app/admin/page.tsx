"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/supabase/auth-context"
import AuthGuard from "@/components/auth/auth-guard"
import FilterBar from "@/components/ui/filter-bar"
import StatCard from "@/components/ui/stat-card"
import ChartCard from "@/components/ui/chart-card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  getAdminKpis,
  getOverdueTable, 
  getTeacherHeatmap, 
  getClassPerformance, 
  getActivityTrend,
  type AdminKpis,
  type OverdueTableRow,
  type ClassPerformanceRow,
  type ActivityTrendPoint
} from "@/lib/api/dashboard"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { Download, BarChart2, AlertCircle, CheckCircle2, CheckSquare } from "lucide-react"

export default function AdminDashboard() {
  const { user, userPermissions } = useAuth()
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<AdminKpis>({
    totalExams: 0,
    notDue: 0,
    overdue: 0,
    coverage: 0,
    onTime: 0
  })
  const [overdue, setOverdue] = useState<OverdueTableRow[]>([])
  const [heatmap, setHeatmap] = useState<number[][]>([])
  const [performance, setPerformance] = useState<ClassPerformanceRow[]>([])
  const [trend, setTrend] = useState<ActivityTrendPoint[]>([])

  useEffect(() => {
    async function loadAdminData() {
      if (!user?.id || userPermissions?.role !== 'admin') return

      try {
        setLoading(true)

        const [adminKpis, overdueTable, teacherHeatmap, classPerformance, activityTrend] = await Promise.all([
          getAdminKpis(),
          getOverdueTable(),
          getTeacherHeatmap(),
          getClassPerformance(),
          getActivityTrend()
        ])

        setKpis(adminKpis)
        setOverdue(overdueTable)
        setHeatmap(teacherHeatmap)
        setPerformance(classPerformance)
        setTrend(activityTrend)

      } catch (error) {
        console.error('Error loading admin dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAdminData()
  }, [user?.id, userPermissions?.role])

  if (loading) {
    return (
      <AuthGuard requiredRoles={['admin']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requiredRoles={['admin']}>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Admin Dashboard</h1>
      <FilterBar
        extra={
          <Button variant="secondary" size="sm" className="gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
        }
      />

        <div className="grid gap-3 md:grid-cols-5">
          <StatCard 
            label="Total Exams (term)" 
            value={kpis.totalExams.toString()} 
            delta="+4"
            icon={<BarChart2 className="w-4 h-4" />}
          />
          <StatCard 
            label="Due Soon" 
            value={kpis.notDue.toString()} 
            delta="+1"
            icon={<AlertCircle className="w-4 h-4" />}
            tone="warning"
          />
          <StatCard 
            label="Overdue & Incomplete" 
            value={kpis.overdue.toString()} 
            tone="danger" 
            delta="+2"
            icon={<AlertCircle className="w-4 h-4" />}
          />
          <StatCard
            label="Coverage Rate"
            value={`${kpis.coverage}%`}
            delta="+3%"
            tone="success"
            icon={<CheckCircle2 className="w-4 h-4" />}
          />
          <StatCard
            label="On-Time Rate"
            value={`${kpis.onTime}%`}
            delta="+2.5%"
            tone="success"
            icon={<CheckSquare className="w-4 h-4" />}
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
                    <TableCell>
                      <div className="font-medium">{row.examName}</div>
                      <div className="text-xs text-muted-foreground">{row.examId}</div>
                    </TableCell>
                    <TableCell>{row.grade}</TableCell>
                    <TableCell>{row.className}</TableCell>
                    <TableCell>
                      <span className="capitalize">{row.track}</span>
                    </TableCell>
                    <TableCell>
                      <div className={`font-medium ${row.coverage < 50 ? 'text-red-600' : row.coverage < 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {row.coverage}%
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`font-medium ${row.missing > 5 ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {row.missing}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-red-600 font-medium">{row.dueIn}</div>
                    </TableCell>
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
                  <TableRow key={`${row.grade}-${row.className}`}>
                    <TableCell>{row.grade}</TableCell>
                    <TableCell>{row.className}</TableCell>
                    <TableCell>
                      <span className="capitalize">{row.track}</span>
                    </TableCell>
                    <TableCell>
                      <div className={`font-medium ${row.avg >= 80 ? 'text-green-600' : row.avg >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {row.avg}
                      </div>
                    </TableCell>
                    <TableCell>{row.max}</TableCell>
                    <TableCell>{row.min}</TableCell>
                    <TableCell>
                      <div className={`font-medium ${row.passRate >= 90 ? 'text-green-600' : row.passRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {row.passRate}%
                      </div>
                    </TableCell>
                    <TableCell>{row.studentCount}</TableCell>
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
    </AuthGuard>
  )
}