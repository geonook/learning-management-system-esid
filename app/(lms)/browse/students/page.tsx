"use client";

import { useEffect, useState, useCallback } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { GraduationCap, Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  getStudentsWithPagination,
  getLevelStatistics,
  type PaginatedStudents,
} from "@/lib/api/students";

type GradeFilter = "All" | 1 | 2 | 3 | 4 | 5 | 6;
type LevelFilter = "All" | "E1" | "E2" | "E3";

export default function BrowseStudentsPage() {
  const [data, setData] = useState<PaginatedStudents | null>(null);
  const [stats, setStats] = useState<{ total: number; e1: number; e2: number; e3: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<GradeFilter>("All");
  const [selectedLevel, setSelectedLevel] = useState<LevelFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getStudentsWithPagination({
        page,
        pageSize,
        grade: selectedGrade === "All" ? undefined : selectedGrade,
        level: selectedLevel === "All" ? undefined : selectedLevel,
        search: searchQuery || undefined,
      });
      setData(result);
    } catch (err) {
      console.error("Failed to fetch students:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch students");
    } finally {
      setLoading(false);
    }
  }, [page, selectedGrade, selectedLevel, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const result = await getLevelStatistics();
      setStats(result);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedGrade, selectedLevel, searchQuery]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchStudents]);

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <GraduationCap className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Browse Students</h1>
              <p className="text-sm text-white/60">
                View all student records ({data?.total || 0} students)
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search by name or student ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>

        {/* Grade and Level Filters */}
        <div className="flex flex-wrap gap-6">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-white/40">Grade:</span>
            {(["All", 1, 2, 3, 4, 5, 6] as GradeFilter[]).map((grade) => (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedGrade === grade
                    ? "bg-purple-500 text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {grade === "All" ? "All" : `G${grade}`}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-white/40">Level:</span>
            {(["All", "E1", "E2", "E3"] as LevelFilter[]).map((level) => (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedLevel === level
                    ? "bg-purple-500 text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && data?.students.length === 0 && (
          <div className="text-center py-12">
            <GraduationCap className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No students found</p>
          </div>
        )}

        {/* Students Table */}
        {!loading && !error && data && data.students.length > 0 && (
          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-sm font-medium text-white/60">Student ID</th>
                  <th className="text-left p-4 text-sm font-medium text-white/60">Name</th>
                  <th className="text-left p-4 text-sm font-medium text-white/60">Grade</th>
                  <th className="text-left p-4 text-sm font-medium text-white/60">Level</th>
                  <th className="text-left p-4 text-sm font-medium text-white/60">Class</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((student) => (
                  <tr key={student.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white font-mono text-sm">{student.student_id}</td>
                    <td className="p-4 text-white">{student.full_name}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                        G{student.grade}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        student.level?.includes("E1")
                          ? "bg-green-500/20 text-green-400"
                          : student.level?.includes("E2")
                          ? "bg-amber-500/20 text-amber-400"
                          : student.level?.includes("E3")
                          ? "bg-red-500/20 text-red-400"
                          : "bg-white/10 text-white/40"
                      }`}>
                        {getLevelDisplay(student.level)}
                      </span>
                    </td>
                    <td className="p-4 text-white/60">{student.class_name || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t border-white/10">
              <div className="text-sm text-white/40">
                Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, data.total)} of {data.total}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-white/60">
                  Page {page} of {data.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                  className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-white">{stats?.total || 0}</div>
            <div className="text-xs text-white/40">Total Students</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-green-400">{stats?.e1 || 0}</div>
            <div className="text-xs text-white/40">Level E1</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-amber-400">{stats?.e2 || 0}</div>
            <div className="text-xs text-white/40">Level E2</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-red-400">{stats?.e3 || 0}</div>
            <div className="text-xs text-white/40">Level E3</div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
