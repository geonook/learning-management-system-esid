"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  GraduationCap, 
  Users, 
  FileBarChart, 
  CalendarDays,
  TrendingUp,
  BookOpen
} from "lucide-react"

const quickStats = [
  {
    label: "Total Students",
    value: "324",
    change: "+12",
    icon: Users,
    color: "text-blue-600"
  },
  {
    label: "Active Classes", 
    value: "18",
    change: "+2",
    icon: GraduationCap,
    color: "text-green-600"
  },
  {
    label: "Assessments Due",
    value: "7",
    change: "-3",
    icon: FileBarChart,
    color: "text-orange-600"
  },
  {
    label: "Attendance Rate",
    value: "94%",
    change: "+2%", 
    icon: TrendingUp,
    color: "text-purple-600"
  }
]

const quickActions = [
  {
    title: "View Dashboard",
    description: "Check your daily overview and analytics",
    href: "/dashboard",
    icon: TrendingUp,
    primary: true
  },
  {
    title: "Manage Scores", 
    description: "Enter and review student grades",
    href: "/scores",
    icon: FileBarChart
  },
  {
    title: "Take Attendance",
    description: "Mark today's attendance records", 
    href: "/attendance/today",
    icon: CalendarDays
  },
  {
    title: "Student Records",
    description: "View and manage student information",
    href: "/students", 
    icon: Users
  }
]

export default function HomePage() {
  const router = useRouter()
  const role = useAppStore((s) => s.role)
  const { grade, klass, track } = useAppStore((s) => s.selections)

  // Auto-redirect admin users to admin dashboard
  useEffect(() => {
    if (role === "admin") {
      router.push("/admin")
    }
  }, [role, router])

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Learning Management System</h1>
            <p className="text-lg text-muted-foreground">
              English Subject Information Dashboard
            </p>
          </div>
        </div>
        
        {role && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Logged in as:</span>
            <Badge variant="default" className="capitalize">{role}</Badge>
            <span className="text-sm text-muted-foreground">•</span>
            <Badge variant="secondary">Grade {grade} - {klass} ({track})</Badge>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <Badge variant="secondary" className="text-xs">
                        {stat.change}
                      </Badge>
                    </div>
                  </div>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Card 
                key={action.href}
                className="cursor-pointer transition-colors hover:bg-accent"
                onClick={() => router.push(action.href)}
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-primary" />
                    {action.primary && (
                      <Badge variant="default" className="text-xs">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-sm">{action.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {action.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest updates from your classes and students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                time: "2 hours ago",
                action: "New assignment scores entered",
                detail: "FA5 Assessment - Grade 7A (24 students)"
              },
              {
                time: "5 hours ago", 
                action: "Attendance recorded",
                detail: "Today's attendance - 94% present rate"
              },
              {
                time: "1 day ago",
                action: "Report generated",
                detail: "Weekly performance summary exported"
              }
            ].map((activity, index) => (
              <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
                <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">{activity.detail}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" size="sm" className="w-full">
              View All Activity
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}