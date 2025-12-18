"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import {
  BarChart3,
  Users,
  School,
  TrendingUp,
  Trophy,
  BookOpen,
  Globe,
  Star,
  GraduationCap,
  Layers,
  Target,
} from "lucide-react";
import { StatNavCard, QuickStatCard } from "@/components/statistics/StatNavCard";
import { getQuickStats, type QuickStats } from "@/lib/api/statistics";
import { Skeleton } from "@/components/ui/skeleton";
import { GlobalFilterBar, useGlobalFilters } from "@/components/filters";

// Navigation card definitions
const statNavCards = [
  {
    title: "All Student Grades",
    description: "View individual student grades across all courses",
    icon: Users,
    href: "/browse/stats/students",
    color: "bg-blue-500/20 text-blue-500 dark:text-blue-400",
  },
  {
    title: "Class Statistics",
    description: "LT/IT/KCFS statistics per class",
    icon: School,
    href: "/browse/stats/classes",
    color: "bg-green-500/20 text-green-500 dark:text-green-400",
  },
  {
    title: "Grade Level Comparison",
    description: "Compare G1-G6 performance trends",
    icon: TrendingUp,
    href: "/browse/stats/grades",
    color: "bg-purple-500/20 text-purple-500 dark:text-purple-400",
  },
  {
    title: "Class Ranking",
    description: "Same-grade, same-course-type rankings",
    icon: Trophy,
    href: "/browse/stats/ranking",
    color: "bg-amber-500/20 text-amber-500 dark:text-amber-400",
  },
  {
    title: "LT Course Analysis",
    description: "Local Teacher course statistics by grade",
    icon: BookOpen,
    href: "/browse/stats/lt",
    color: "bg-cyan-500/20 text-cyan-500 dark:text-cyan-400",
  },
  {
    title: "IT Course Analysis",
    description: "International Teacher course statistics by grade",
    icon: Globe,
    href: "/browse/stats/it",
    color: "bg-indigo-500/20 text-indigo-500 dark:text-indigo-400",
  },
  {
    title: "KCFS Analysis",
    description: "Future Skills course statistics by grade",
    icon: Star,
    href: "/browse/stats/kcfs",
    color: "bg-pink-500/20 text-pink-500 dark:text-pink-400",
  },
  {
    title: "MAP Growth Analysis",
    description: "NWEA MAP RIT scores, benchmarks, and norm comparison",
    icon: Target,
    href: "/browse/stats/map",
    color: "bg-emerald-500/20 text-emerald-500 dark:text-emerald-400",
  },
];

export default function BrowseStatsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<QuickStats | null>(null);
  const { academicYear } = useGlobalFilters();

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const data = await getQuickStats({ academic_year: academicYear });
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch quick stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [academicYear]);

  return (
    <AuthGuard requiredRoles={["admin", "head", "office_member"]}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <BarChart3 className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">
              Statistics & Analytics
            </h1>
          </div>
          <p className="text-text-secondary">
            Comprehensive grade analysis and performance tracking
          </p>
        </div>

        {/* Global Filters */}
        <GlobalFilterBar showYear showTerm={false} />

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-surface-secondary rounded-xl border border-border-default p-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </>
          ) : (
            <>
              <QuickStatCard
                label="Total Students"
                value={stats?.totalStudents?.toLocaleString() ?? "0"}
                icon={Users}
                color="text-blue-500"
                subtitle="across all grades"
              />
              <QuickStatCard
                label="Total Classes"
                value={stats?.totalClasses?.toLocaleString() ?? "0"}
                icon={School}
                color="text-green-500"
                subtitle="active classes"
              />
              <QuickStatCard
                label="Total Courses"
                value={stats?.totalCourses?.toLocaleString() ?? "0"}
                icon={GraduationCap}
                color="text-purple-500"
                subtitle="LT/IT/KCFS"
              />
              <QuickStatCard
                label="Grade Levels"
                value="G1-G6"
                icon={Layers}
                color="text-amber-500"
                subtitle="6 levels"
              />
            </>
          )}
        </div>

        {/* Navigation Cards */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Analytics Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statNavCards.map((card) => (
              <StatNavCard
                key={card.href}
                title={card.title}
                description={card.description}
                icon={card.icon}
                href={card.href}
                color={card.color}
              />
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <h3 className="text-blue-600 dark:text-blue-400 font-medium mb-2">
            About Statistics
          </h3>
          <p className="text-text-secondary text-sm">
            Statistics are calculated from teacher-entered grades using the standardized formula:
            FA Average (15%) + SA Average (20%) + Midterm (10%). Only numerical scores are included;
            absent markers (X, -, N/A) are excluded from calculations. Real 0 scores are counted.
          </p>
          <p className="text-text-secondary text-sm mt-2">
            <strong>Important:</strong> LT and IT courses follow different curricula and should not be
            directly compared. Rankings are always within the same grade level and course type.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
