"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useGlobalFilters, GlobalFilterBar } from "@/components/filters/GlobalFilterBar";
import { GraduationCap, Search, Loader2, ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  getStudentsWithPagination,
  getLevelStatistics,
  type PaginatedStudents,
} from "@/lib/api/students";
import { SimpleHeader } from "@/components/layout/SimpleHeader";

type GradeFilter = "All" | 1 | 2 | 3 | 4 | 5 | 6;
type LevelFilter = "All" | "E1" | "E2" | "E3";

export default function BrowseStudentsPage() {
  const { userId, isReady } = useAuthReady();
  const { academicYear } = useGlobalFilters();
  const [data, setData] = useState<PaginatedStudents | null>(null);
  const [stats, setStats] = useState<{ total: number; e1: number; e2: number; e3: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<GradeFilter>("All");
  const [selectedLevel, setSelectedLevel] = useState<LevelFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Debounced search state - only search input needs debouncing
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input only
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Single effect for all data fetching - follows Dashboard pattern
  useEffect(() => {
    // Wait for auth to be ready
    if (!isReady || !userId) {
      console.log("[BrowseStudents] Auth not ready, waiting...");
      return;
    }

    console.log("[BrowseStudents] Fetching data...", { selectedGrade, selectedLevel, debouncedSearch, page, academicYear });

    let isCancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const result = await getStudentsWithPagination({
          page,
          pageSize,
          grade: selectedGrade === "All" ? undefined : selectedGrade,
          level: selectedLevel === "All" ? undefined : selectedLevel,
          search: debouncedSearch || undefined,
        });
        if (!isCancelled) {
          console.log("[BrowseStudents] Data received:", result?.total);
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("[BrowseStudents] Failed to fetch students:", err);
          setError(err instanceof Error ? err.message : "Failed to fetch students");
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [isReady, userId, selectedGrade, selectedLevel, debouncedSearch, page, pageSize, academicYear]);

  // Fetch stats only once when user is available
  useEffect(() => {
    if (!userId) return;

    async function fetchStats() {
      try {
        const result = await getLevelStatistics();
        setStats(result);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    }
    fetchStats();
  }, [userId]);

  // Extract level display (e.g., "G1E1" -> "E1")
  const getLevelDisplay = (level: string | null | undefined) => {
    if (!level) return "-";
    const match = level.match(/E[1-3]/);
    return match ? match[0] : level;
  };

  return (
    <AuthGuard requiredRoles={["admin", "head", "office_member"]}>
      <div className="space-y-6">
        {/* Header */}
        <SimpleHeader
          icon={<GraduationCap className="w-6 h-6 text-purple-500 dark:text-purple-400" />}
          iconBgColor="bg-purple-500/20"
          title="Browse Students"
          subtitle={`View all student records (${data?.total || 0} students)`}
        />

        {/* Academic Year Filter - No Term needed for student listing */}
        <GlobalFilterBar showYear showTerm={false} compact className="mb-2" />

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <Input
              placeholder="Search by name or student ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-surface-secondary border-border-default text-text-primary placeholder:text-text-tertiary"
            />
          </div>
        </div>

        {/* Filters Row - Grade and Level on same line */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6">
          {/* Grade Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-text-secondary font-medium">Grade:</span>
            <div className="flex gap-1 sm:gap-2">
              {(["All", 1, 2, 3, 4, 5, 6] as GradeFilter[]).map((grade) => (
                <button
                  key={grade}
                  onClick={() => setSelectedGrade(grade)}
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors duration-normal ease-apple ${
                    selectedGrade === grade
                      ? "bg-purple-600 dark:bg-purple-500 text-white dark:text-white"
                      : "bg-surface-tertiary text-text-secondary hover:bg-surface-hover"
                  }`}
                >
                  {grade === "All" ? "All" : `G${grade}`}
                </button>
              ))}
            </div>
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-text-secondary font-medium">Level:</span>
            <div className="flex gap-1 sm:gap-2">
              {(["All", "E1", "E2", "E3"] as LevelFilter[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors duration-normal ease-apple ${
                    selectedLevel === level
                      ? "bg-purple-600 dark:bg-purple-500 text-white dark:text-white"
                      : "bg-surface-tertiary text-text-secondary hover:bg-surface-hover"
                  }`}
                >
                  {level === "All" ? "All" : level}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && data?.students.length === 0 && (
          <div className="text-center py-12">
            <GraduationCap className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
            <p className="text-text-secondary">No students found</p>
          </div>
        )}

        {/* Students Table */}
        {!loading && !error && data && data.students.length > 0 && (
          <div className="bg-surface-elevated rounded-xl border border-border-default overflow-hidden shadow-sm">
            <div className="table-responsive">
              <table className="min-w-[600px] w-full">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Student ID</th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Name</th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Grade</th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Level</th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Class</th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary w-16"></th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((student) => (
                  <Link
                    key={student.id}
                    href={`/student/${student.id}`}
                    className="contents group"
                  >
                    <tr className="border-b border-border-subtle hover:bg-surface-hover cursor-pointer transition-colors duration-normal ease-apple">
                      <td className="p-4 text-text-primary font-mono text-sm">{student.student_id}</td>
                      <td className="p-4 text-text-primary group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{student.full_name}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs rounded-full">
                          G{student.grade}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          student.level?.includes("E1")
                            ? "bg-green-500/20 text-green-600 dark:text-green-400"
                            : student.level?.includes("E2")
                            ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                            : student.level?.includes("E3")
                            ? "bg-red-500/20 text-red-600 dark:text-red-400"
                            : "bg-surface-tertiary text-text-tertiary"
                        }`}>
                          {getLevelDisplay(student.level)}
                        </span>
                      </td>
                      <td className="p-4 text-text-secondary">{student.class_name || "-"}</td>
                      <td className="p-4 text-right">
                        <ChevronRightIcon className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors inline-block" />
                      </td>
                    </tr>
                  </Link>
                ))}
              </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t border-border-default">
              <div className="text-sm text-text-tertiary">
                Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, data.total)} of {data.total}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg bg-surface-tertiary text-text-secondary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-normal ease-apple"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-text-secondary">
                  Page {page} of {data.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                  className="p-2 rounded-lg bg-surface-tertiary text-text-secondary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-normal ease-apple"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface-elevated rounded-xl border border-border-default p-4 shadow-sm">
            <div className="text-2xl font-bold text-text-primary">{stats?.total || 0}</div>
            <div className="text-xs text-text-tertiary">Total Students</div>
          </div>
          <div className="bg-surface-elevated rounded-xl border border-border-default p-4 shadow-sm">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats?.e1 || 0}</div>
            <div className="text-xs text-text-tertiary">Level E1</div>
          </div>
          <div className="bg-surface-elevated rounded-xl border border-border-default p-4 shadow-sm">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats?.e2 || 0}</div>
            <div className="text-xs text-text-tertiary">Level E2</div>
          </div>
          <div className="bg-surface-elevated rounded-xl border border-border-default p-4 shadow-sm">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats?.e3 || 0}</div>
            <div className="text-xs text-text-tertiary">Level E3</div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
