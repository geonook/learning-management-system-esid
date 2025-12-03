"use client";

import { useEffect, useState, useCallback } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/lib/supabase/auth-context";
import { School, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getClassesWithDetails, type ClassWithDetails } from "@/lib/api/classes";

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <School className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Browse Classes</h1>
              <p className="text-sm text-white/60">
                View all classes across grades ({classes.length} classes)
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>

        {/* Grade Tabs */}
        <div className="flex gap-2">
          {(["All", 1, 2, 3, 4, 5, 6] as GradeFilter[]).map((grade) => (
            <button
              key={grade}
              onClick={() => setSelectedGrade(grade)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedGrade === grade
                  ? "bg-blue-500 text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {grade === "All" ? "All" : `G${grade}`}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && classes.length === 0 && (
          <div className="text-center py-12">
            <School className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No classes found</p>
          </div>
        )}

        {/* Classes Grid */}
        {!loading && !error && classes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="bg-white/5 rounded-xl border border-white/10 p-6 hover:bg-white/[0.07] transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                    G{cls.grade}
                  </span>
                  <span className="text-xs text-white/40">
                    {cls.student_count} student{cls.student_count !== 1 ? "s" : ""}
                  </span>
                </div>
                <h3 className="text-lg font-medium text-white mb-1">{cls.name}</h3>
                <p className="text-sm text-white/50 mb-4">
                  Level: {cls.level || "N/A"}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/40">
                  <span className="flex items-center gap-1">
                    <span className="text-green-400">LT:</span>
                    <span className="text-white/60 truncate max-w-[80px]">
                      {getTeacherName(cls.courses, "LT")}
                    </span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="text-blue-400">IT:</span>
                    <span className="text-white/60 truncate max-w-[80px]">
                      {getTeacherName(cls.courses, "IT")}
                    </span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="text-purple-400">KCFS:</span>
                    <span className="text-white/60 truncate max-w-[80px]">
                      {getTeacherName(cls.courses, "KCFS")}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <h3 className="text-blue-400 font-medium mb-2">Read-Only Access</h3>
          <p className="text-white/60 text-sm">
            You have view-only access to class information. Contact an administrator
            if you need to make changes.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
