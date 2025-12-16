"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuthReady } from "@/hooks/useAuthReady";
import {
  BarChart3,
  Users,
  School,
  TrendingUp,
  Trophy,
  BookOpen,
  GraduationCap,
  Percent,
} from "lucide-react";
import { StatNavCard, QuickStatCard } from "@/components/statistics/StatNavCard";
import {
  getGradeBandQuickStats,
  type GradeBandQuickStats,
} from "@/lib/api/gradeband-statistics";
import { getGradeBandDisplay, parseCourseType } from "@/lib/utils/gradeband";
import { Skeleton } from "@/components/ui/skeleton";
import { GlobalFilterBar, useGlobalFilters } from "@/components/filters";
import { ScopeIndicator } from "@/components/ui/scope-indicator";

export default function GradeBandManagementPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GradeBandQuickStats | null>(null);
  const { academicYear, term } = useGlobalFilters();
  const { isReady, permissions } = useAuthReady();

  // Get grade_band from user permissions
  const gradeBand = permissions?.grade ?? null;
  const courseType = permissions?.track ?? null;
  const gradeBandDisplay = gradeBand ? getGradeBandDisplay(gradeBand) : "";

  // Navigation cards - scoped to grade band
  const statNavCards = [
    {
      title: "All Student Grades",
      description: `View individual student grades in ${gradeBandDisplay}`,
      icon: Users,
      href: "/head/gradeband/students",
      color: "bg-blue-500/20 text-blue-500 dark:text-blue-400",
    },
    {
      title: "Class Statistics",
      description: `LT/IT/KCFS statistics for ${gradeBandDisplay} classes`,
      icon: School,
      href: "/head/gradeband/classes",
      color: "bg-green-500/20 text-green-500 dark:text-green-400",
    },
    {
      title: "Grade Level Comparison",
      description: `Compare grade levels within ${gradeBandDisplay}`,
      icon: TrendingUp,
      href: "/head/gradeband/grades",
      color: "bg-purple-500/20 text-purple-500 dark:text-purple-400",
    },
    {
      title: "Class Ranking",
      description: "Same-grade, same-course-type rankings",
      icon: Trophy,
      href: "/head/gradeband/ranking",
      color: "bg-amber-500/20 text-amber-500 dark:text-amber-400",
    },
    {
      title: "Course Analysis",
      description: `LT/IT/KCFS course analysis for ${gradeBandDisplay}`,
      icon: BookOpen,
      href: "/head/gradeband/courses",
      color: "bg-cyan-500/20 text-cyan-500 dark:text-cyan-400",
    },
  ];

  useEffect(() => {
    if (!isReady || !gradeBand) return;

    async function fetchStats() {
      setLoading(true);
      try {
        const termForApi = term === "all" ? undefined : (Number(term) as 1 | 2 | 3 | 4);
        const data = await getGradeBandQuickStats({
          academic_year: academicYear,
          term: termForApi,
          grade_band: gradeBand!,
          course_type: courseType as "LT" | "IT" | "KCFS" | undefined,
        });
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch quick stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [isReady, gradeBand, courseType, academicYear, term]);

  // Show message if no grade band assigned
  if (isReady && !gradeBand) {
    return (
      <AuthGuard requiredRoles={["admin", "head"]}>
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <BarChart3 className="w-6 h-6 text-amber-500 dark:text-amber-400" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary">
                GradeBand Statistics
              </h1>
            </div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
            <h3 className="text-amber-600 dark:text-amber-400 font-medium mb-2">
              No Grade Band Assigned
            </h3>
            <p className="text-text-secondary">
              You don&apos;t have a grade band assigned to your account. Please contact an administrator
              to assign you to a grade band (e.g., G1-2, G3-4, or G5-6).
            </p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRoles={["admin", "head"]}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <BarChart3 className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">
              GradeBand Statistics
            </h1>
            {gradeBandDisplay && (
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full text-sm font-medium">
                {gradeBandDisplay}
              </span>
            )}
          </div>
          <p className="text-text-secondary">
            Statistics and analytics for your grade band
            {courseType && ` (${courseType} track)`}
          </p>
        </div>

        {/* Global Filters */}
        <GlobalFilterBar showYear showTerm />

        {/* Scope Indicator */}
        {gradeBand && (
          <ScopeIndicator
            gradeBand={gradeBand}
            courseType={courseType as "LT" | "IT" | "KCFS" | null}
            academicYear={academicYear}
            term={term === "all" ? "all" : Number(term)}
          />
        )}

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
                label="Students"
                value={stats?.totalStudents?.toLocaleString() ?? "0"}
                icon={Users}
                color="text-blue-500"
                subtitle={`in ${gradeBandDisplay}`}
              />
              <QuickStatCard
                label="Classes"
                value={stats?.totalClasses?.toLocaleString() ?? "0"}
                icon={School}
                color="text-green-500"
                subtitle="active classes"
              />
              <QuickStatCard
                label="Average Score"
                value={stats?.overallAverage?.toFixed(1) ?? "-"}
                icon={GraduationCap}
                color="text-purple-500"
                subtitle="all courses"
              />
              <QuickStatCard
                label="Completion"
                value={stats?.completionRate ? `${stats.completionRate.toFixed(0)}%` : "-"}
                icon={Percent}
                color="text-amber-500"
                subtitle="grades entered"
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
            About GradeBand Statistics
          </h3>
          <p className="text-text-secondary text-sm">
            This module provides statistics for your assigned grade band ({gradeBandDisplay}).
            All data is filtered to show only classes and students within your jurisdiction.
          </p>
          <p className="text-text-secondary text-sm mt-2">
            <strong>Formula:</strong> FA Average (15%) + SA Average (20%) + Midterm (10%).
            Only numerical scores are included; absent markers are excluded.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
