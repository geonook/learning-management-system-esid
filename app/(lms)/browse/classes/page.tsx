"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/lib/supabase/auth-context";
import { School, Search, Loader2, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getClassesWithDetails, type ClassWithDetails } from "@/lib/api/classes";
import { PageHeader } from "@/components/layout/PageHeader";

type GradeFilter = "All" | 1 | 2 | 3 | 4 | 5 | 6;

export default function BrowseClassesPage() {
  const { user, loading: authLoading } = useAuth();
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<GradeFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasFetched, setHasFetched] = useState(false);

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getClassesWithDetails({
        grade: selectedGrade === "All" ? undefined : selectedGrade,
        search: searchQuery || undefined,
      });
      setClasses(data);
      setHasFetched(true);
    } catch (err) {
      console.error("Failed to fetch classes:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch classes");
    } finally {
      setLoading(false);
    }
  }, [selectedGrade, searchQuery]);

  // Wait for auth to be ready before fetching
  useEffect(() => {
    if (!authLoading && user) {
      fetchClasses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, selectedGrade]);

  // Debounced search - only when user is authenticated
  useEffect(() => {
    if (!user || searchQuery === "" || !hasFetched) return;
    const timer = setTimeout(() => {
      fetchClasses();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Helper to get teacher name by course type
  const getTeacherName = (courses: ClassWithDetails["courses"], type: "LT" | "IT" | "KCFS") => {
    const course = courses.find((c) => c.course_type === type);
    return course?.teacher?.full_name || "-";
  };

  return (
    <AuthGuard requiredRoles={["admin", "head", "office_member"]}>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Browse Classes"
          subtitle={`View all classes across grades (${classes.length} classes)`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Browse Data", href: "/browse/classes" },
            { label: "All Classes" },
          ]}
          backHref="/dashboard"
          backLabel="Dashboard"
        />

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <Input
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-surface-tertiary border-[rgb(var(--border-default))] text-text-primary placeholder:text-text-tertiary"
            />
          </div>
        </div>

        {/* Grade Tabs */}
        <div className="flex gap-2">
          {(["All", 1, 2, 3, 4, 5, 6] as GradeFilter[]).map((grade) => (
            <button
              key={grade}
              onClick={() => setSelectedGrade(grade)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-normal ease-apple ${
                selectedGrade === grade
                  ? "bg-accent-blue text-white"
                  : "bg-surface-tertiary text-text-secondary hover:bg-[rgb(var(--surface-hover))]"
              }`}
            >
              {grade === "All" ? "All" : `G${grade}`}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && classes.length === 0 && (
          <div className="text-center py-12">
            <School className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
            <p className="text-text-secondary">No classes found</p>
          </div>
        )}

        {/* Classes Grid */}
        {!loading && !error && classes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <Link
                key={cls.id}
                href={`/class/${cls.id}`}
                className="group block"
              >
                <div className="relative bg-surface-elevated rounded-xl border border-[rgb(var(--border-default))] p-6 hover:bg-[rgb(var(--surface-hover))] hover:border-[rgb(var(--border-default))] transition-all duration-normal ease-apple shadow-sm">
                  {/* Hover indicator */}
                  <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity duration-normal ease-apple">
                    <ChevronRight className="w-5 h-5 text-text-tertiary" />
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2 py-1 bg-accent-blue/20 text-accent-blue text-xs rounded-full">
                      G{cls.grade}
                    </span>
                    <span className="text-xs text-text-tertiary mr-6">
                      {cls.student_count} student{cls.student_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-text-primary mb-1 group-hover:text-accent-blue transition-colors duration-normal ease-apple">{cls.name}</h3>
                  <p className="text-sm text-text-secondary mb-4">
                    Level: {cls.level || "N/A"}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
                    <span className="flex items-center gap-1">
                      <span className="text-green-600 dark:text-green-400">LT:</span>
                      <span className="text-text-secondary truncate max-w-[80px]">
                        {getTeacherName(cls.courses, "LT")}
                      </span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span className="text-blue-600 dark:text-blue-400">IT:</span>
                      <span className="text-text-secondary truncate max-w-[80px]">
                        {getTeacherName(cls.courses, "IT")}
                      </span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span className="text-purple-600 dark:text-purple-400">KCFS:</span>
                      <span className="text-text-secondary truncate max-w-[80px]">
                        {getTeacherName(cls.courses, "KCFS")}
                      </span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="bg-accent-blue/10 border border-accent-blue/20 rounded-xl p-4">
          <h3 className="text-accent-blue font-medium mb-2">Browse Mode</h3>
          <p className="text-text-secondary text-sm">
            Click on any class to view its details, gradebook, and student roster.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
