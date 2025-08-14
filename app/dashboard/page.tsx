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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  getTeacherKpis,
  getAdminKpis,
  getHeadTeacherKpis,
  getGradeClassSummary,
  getClassDistribution, 
  getScatterData, 
  getUpcomingDeadlines, 
  getRecentAlerts,
  type TeacherKpis,
  type AdminKpis,
  type HeadTeacherKpis,
  type GradeClassSummary,
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

export default function Dashboard() {
  const { user, userPermissions } = useAuth()
  const userRole = userPermissions?.role
  const [loading, setLoading] = useState(true)
  const [teacherKpis, setTeacherKpis] = useState<TeacherKpis>({ 
    attendanceRate: 0, 
    averageScore: 0, 
    passRate: 0, 
    activeAlerts: 0 
  })
  const [adminKpis, setAdminKpis] = useState<AdminKpis>({
    totalExams: 0,
    notDue: 0,
    overdue: 0,
    coverage: 0,
    onTime: 0
  })
  const [headKpis, setHeadKpis] = useState<HeadTeacherKpis>({
    totalClasses: 0,
    averageScore: 0,
    coverageRate: 0,
    activeIssues: 0,
    studentsCount: 0,
    teachersCount: 0
  })
  const [gradeClassSummary, setGradeClassSummary] = useState<GradeClassSummary[]>([])
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
        const [distData, scatterPoints, upcomingDeadlines, recentAlerts] = await Promise.all([
          getClassDistribution(userRole, user.id, userPermissions?.grade || undefined, userPermissions?.track || undefined),
          getScatterData(userRole, user.id),
          getUpcomingDeadlines(userRole, user.id, userPermissions?.grade || undefined, userPermissions?.track || undefined),
          getRecentAlerts(userRole, user.id)
        ])

        // Load role-specific KPIs
        if (userRole === 'teacher') {
          const teacherKpiData = await getTeacherKpis(user.id)
          setTeacherKpis(teacherKpiData)
        } else if (userRole === 'admin') {
          const adminKpiData = await getAdminKpis()
          setAdminKpis(adminKpiData)
        } else if (userRole === 'head' && userPermissions?.grade && userPermissions?.track) {
          const [headKpiData, classSummaryData] = await Promise.all([
            getHeadTeacherKpis(userPermissions.grade, userPermissions.track),
            getGradeClassSummary(userPermissions.grade, userPermissions.track)
          ])
          setHeadKpis(headKpiData)
          setGradeClassSummary(classSummaryData)
        }
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
  }, [user?.id, userRole, userPermissions?.grade, userPermissions?.track])

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
        <h1 className="text-xl font-semibold">
          {userRole === 'admin' ? 'Admin Dashboard' : 
           userRole === 'head' ? 'Head Teacher Dashboard' : 
           'Teacher Dashboard'}
        </h1>
      </div>
      <FilterBar />

      {/* Teacher KPIs */}
      {userRole === 'teacher' && (
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard
            label="Attendance Rate"
            value={`${teacherKpis.attendanceRate}%`}
            delta="+2.1%"
            icon={<CheckSquare className="w-4 h-4" />}
            tone="success"
          />
          <StatCard
            label="Average Score"
            value={teacherKpis.averageScore.toString()}
            delta="+1.4%"
            icon={<BarChart2 className="w-4 h-4" />}
          />
          <StatCard
            label="Pass Rate"
            value={`${teacherKpis.passRate}%`}
            delta="+0.9%"
            icon={<CheckCircle2 className="w-4 h-4" />}
            tone="success"
          />
          <StatCard
            label="Active Alerts (7d)"
            value={teacherKpis.activeAlerts.toString()}
            delta="-3"
            icon={<AlertCircle className="w-4 h-4" />}
            tone="warning"
          />
        </div>
      )}

      {/* Admin KPIs */}
      {userRole === 'admin' && (
        <div className="grid gap-3 md:grid-cols-5">
          <StatCard
            label="Total Exams"
            value={adminKpis.totalExams.toString()}
            delta="+12"
            icon={<BarChart2 className="w-4 h-4" />}
          />
          <StatCard
            label="Due Soon"
            value={adminKpis.notDue.toString()}
            delta="+3"
            icon={<AlertCircle className="w-4 h-4" />}
            tone="warning"
          />
          <StatCard
            label="Overdue"
            value={adminKpis.overdue.toString()}
            delta="-2"
            icon={<AlertCircle className="w-4 h-4" />}
            tone={adminKpis.overdue > 0 ? "danger" : "success"}
          />
          <StatCard
            label="Coverage"
            value={`${adminKpis.coverage}%`}
            delta="+5.2%"
            icon={<CheckCircle2 className="w-4 h-4" />}
            tone="success"
          />
          <StatCard
            label="On Time"
            value={`${adminKpis.onTime}%`}
            delta="+1.8%"
            icon={<CheckSquare className="w-4 h-4" />}
            tone="success"
          />
        </div>
      )}

      {/* Head Teacher KPIs - for specific grade and track management */}
      {userRole === 'head' && (
        <>
          <div className="grid gap-3 md:grid-cols-6">
            <StatCard
              label={`Grade ${userPermissions?.grade} Classes`}
              value={headKpis.totalClasses.toString()}
              delta="+1"
              icon={<BarChart2 className="w-4 h-4" />}
            />
            <StatCard
              label="Total Students"
              value={headKpis.studentsCount.toString()}
              delta="+12"
              icon={<CheckSquare className="w-4 h-4" />}
            />
            <StatCard
              label="Teachers"
              value={headKpis.teachersCount.toString()}
              delta="0"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <StatCard
              label="Average Score"
              value={headKpis.averageScore.toString()}
              delta="+2.1%"
              icon={<BarChart2 className="w-4 h-4" />}
              tone={headKpis.averageScore >= 75 ? "success" : headKpis.averageScore >= 60 ? "warning" : "danger"}
            />
            <StatCard
              label="Coverage Rate"
              value={`${headKpis.coverageRate}%`}
              delta="+3.2%"
              icon={<CheckSquare className="w-4 h-4" />}
              tone={headKpis.coverageRate >= 80 ? "success" : "warning"}
            />
            <StatCard
              label="Active Issues"
              value={headKpis.activeIssues.toString()}
              delta="-1"
              icon={<AlertCircle className="w-4 h-4" />}
              tone={headKpis.activeIssues === 0 ? "success" : "warning"}
            />
          </div>

          {/* Grade Class Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                Grade {userPermissions?.grade} {userPermissions?.track && userPermissions.track.charAt(0).toUpperCase() + userPermissions.track.slice(1)} Classes Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>LT Teacher</TableHead>
                    <TableHead>IT Teacher</TableHead>
                    <TableHead>KCFS Teacher</TableHead>
                    <TableHead>Avg Score</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gradeClassSummary.map((classData) => (
                    <TableRow key={classData.className}>
                      <TableCell className="font-medium">{classData.className}</TableCell>
                      <TableCell>{classData.studentCount}</TableCell>
                      <TableCell>
                        <span className={classData.ltTeacher === 'Unassigned' ? 'text-red-600' : 'text-foreground'}>
                          {classData.ltTeacher || 'Unassigned'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={classData.itTeacher === 'Unassigned' ? 'text-red-600' : 'text-foreground'}>
                          {classData.itTeacher || 'Unassigned'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={classData.kcfsTeacher === 'Unassigned' ? 'text-red-600' : 'text-foreground'}>
                          {classData.kcfsTeacher || 'Unassigned'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className={`font-medium ${
                          classData.avgScore >= 80 ? 'text-green-600' : 
                          classData.avgScore >= 60 ? 'text-yellow-600' : 
                          classData.avgScore > 0 ? 'text-red-600' : 'text-muted-foreground'
                        }`}>
                          {classData.avgScore > 0 ? classData.avgScore : 'No data'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`font-medium ${
                          classData.coverageRate >= 80 ? 'text-green-600' : 
                          classData.coverageRate >= 50 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {classData.coverageRate}%
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{classData.lastActivity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {gradeClassSummary.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No classes found for Grade {userPermissions?.grade} {userPermissions?.track}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

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