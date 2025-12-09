"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/lib/supabase/auth-context";
import {
  BookOpen,
  Search,
  Download,
  School,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { getClassesProgress } from "@/lib/api/browse-gradebook";
import type { ClassProgress, BrowseGradebookStats, ProgressStatus } from "@/types/browse-gradebook";

export default function BrowseGradebookPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassProgress[]>([]);
  const [stats, setStats] = useState<BrowseGradebookStats>({
    total_classes: 0,
    on_track: 0,
    behind: 0,
    not_started: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProgressStatus | null>(null);
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch data
  useEffect(() => {
    if (!userId) return;

    let isCancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const { data, stats: newStats } = await getClassesProgress({
          grade: gradeFilter || undefined,
          status: statusFilter || undefined,
          search: debouncedSearch || undefined,
        });

        if (!isCancelled) {
          setClasses(data);
          setStats(newStats);
        }
      } catch (error) {
        console.error("Failed to fetch gradebook data:", error);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => {
      isCancelled = true;
    };
  }, [userId, gradeFilter, statusFilter, debouncedSearch]);

  // Progress bar component
  const ProgressBar = ({
    progress,
    teacherName,
    courseType,
  }: {
    progress: number;
    teacherName: string | null;
    courseType: "LT" | "IT" | "KCFS";
  }) => {
    const colorClass =
      courseType === "LT"
        ? "bg-green-500"
        : courseType === "IT"
        ? "bg-blue-500"
        : "bg-purple-500";

    const textColorClass =
      courseType === "LT"
        ? "text-green-600 dark:text-green-400"
        : courseType === "IT"
        ? "text-blue-600 dark:text-blue-400"
        : "text-purple-600 dark:text-purple-400";

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-border-subtle rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${colorClass}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className={`text-sm font-medium w-10 ${textColorClass}`}>
            {progress}%
          </span>
        </div>
        {teacherName && (
          <div className="text-xs text-text-tertiary truncate" title={teacherName}>
            {teacherName}
          </div>
        )}
      </div>
    );
  };

  const getStatusIcon = (status: ProgressStatus) => {
    if (status === "on_track")
      return <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />;
    if (status === "behind")
      return <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
    return <AlertTriangle className="w-4 h-4 text-red-500/50 dark:text-red-400/50" />;
  };

  const getStatusLabel = (status: ProgressStatus) => {
    if (status === "on_track") return "On Track";
    if (status === "behind") return "Behind";
    return "Not Started";
  };

  const getStatusColor = (status: ProgressStatus) => {
    if (status === "on_track") return "text-green-500 dark:text-green-400";
    if (status === "behind") return "text-amber-500 dark:text-amber-400";
    return "text-text-tertiary";
  };

  return (
    <AuthGuard requiredRoles={["admin", "head", "office_member"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <BookOpen className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Browse Gradebook</h1>
              <p className="text-sm text-text-secondary">
                Monitor score entry progress across all classes
              </p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-secondary border border-border-default rounded-lg text-text-secondary hover:bg-surface-hover transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Classes</span>
              <School className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-text-primary">{stats.total_classes}</div>
            )}
            <div className="text-xs text-text-tertiary">total classes</div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">On Track</span>
              <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-green-500 dark:text-green-400">
                {stats.on_track}
              </div>
            )}
            <div className="text-xs text-text-tertiary">all courses ≥80%</div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Behind</span>
              <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-amber-500 dark:text-amber-400">
                {stats.behind}
              </div>
            )}
            <div className="text-xs text-text-tertiary">some progress</div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Not Started</span>
              <AlertTriangle className="w-4 h-4 text-red-500/50 dark:text-red-400/50" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-text-secondary">{stats.not_started}</div>
            )}
            <div className="text-xs text-text-tertiary">no scores entered</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <Input
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-surface-secondary border-border-default text-text-primary placeholder:text-text-tertiary"
            />
          </div>

          {/* Grade Dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-surface-secondary border border-border-default rounded-lg text-text-secondary hover:bg-surface-hover transition-colors"
              onClick={() => setShowGradeDropdown(!showGradeDropdown)}
            >
              {gradeFilter !== null ? `Grade ${gradeFilter}` : "All Grades"}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showGradeDropdown && (
              <div className="absolute top-full mt-2 right-0 bg-surface-elevated border border-border-default rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                <button
                  className="w-full px-4 py-2 text-left text-text-secondary hover:bg-surface-hover text-sm"
                  onClick={() => {
                    setGradeFilter(null);
                    setShowGradeDropdown(false);
                  }}
                >
                  All Grades
                </button>
                {[1, 2, 3, 4, 5, 6].map((grade) => (
                  <button
                    key={grade}
                    className="w-full px-4 py-2 text-left text-text-secondary hover:bg-surface-hover text-sm"
                    onClick={() => {
                      setGradeFilter(grade);
                      setShowGradeDropdown(false);
                    }}
                  >
                    Grade {grade}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-surface-secondary border border-border-default rounded-lg text-text-secondary hover:bg-surface-hover transition-colors"
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            >
              {statusFilter ? getStatusLabel(statusFilter) : "All Status"}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full mt-2 right-0 bg-surface-elevated border border-border-default rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
                <button
                  className="w-full px-4 py-2 text-left text-text-secondary hover:bg-surface-hover text-sm"
                  onClick={() => {
                    setStatusFilter(null);
                    setShowStatusDropdown(false);
                  }}
                >
                  All Status
                </button>
                {(["on_track", "behind", "not_started"] as ProgressStatus[]).map((status) => (
                  <button
                    key={status}
                    className="w-full px-4 py-2 text-left text-text-secondary hover:bg-surface-hover text-sm flex items-center gap-2"
                    onClick={() => {
                      setStatusFilter(status);
                      setShowStatusDropdown(false);
                    }}
                  >
                    {getStatusIcon(status)}
                    {getStatusLabel(status)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Classes Table */}
        <div className="bg-surface-secondary rounded-xl border border-border-default overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-default">
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Class</th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Grade</th>
                <th className="text-center p-4 text-sm font-medium text-text-secondary">
                  <Users className="w-4 h-4 inline mr-1" />
                  Students
                </th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary w-40">
                  <span className="text-green-500">LT</span> Progress
                </th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary w-40">
                  <span className="text-blue-500">IT</span> Progress
                </th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary w-40">
                  <span className="text-purple-500">KCFS</span> Progress
                </th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Status</th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-subtle">
                    <td className="p-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-8" />
                    </td>
                    <td className="p-4 text-center">
                      <Skeleton className="h-4 w-8 mx-auto" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-12" />
                    </td>
                  </tr>
                ))
              ) : classes.length > 0 ? (
                classes.map((cls) => (
                  <tr key={cls.class_id} className="border-b border-border-subtle hover:bg-surface-hover">
                    <td className="p-4 text-text-primary font-medium">{cls.class_name}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-surface-elevated rounded text-text-secondary text-sm">
                        G{cls.grade}
                      </span>
                    </td>
                    <td className="p-4 text-center text-text-secondary">{cls.student_count}</td>
                    <td className="p-4">
                      <ProgressBar
                        progress={cls.lt_progress}
                        teacherName={cls.lt_teacher}
                        courseType="LT"
                      />
                    </td>
                    <td className="p-4">
                      <ProgressBar
                        progress={cls.it_progress}
                        teacherName={cls.it_teacher}
                        courseType="IT"
                      />
                    </td>
                    <td className="p-4">
                      <ProgressBar
                        progress={cls.kcfs_progress}
                        teacherName={cls.kcfs_teacher}
                        courseType="KCFS"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(cls.overall_status)}
                        <span className={`text-sm ${getStatusColor(cls.overall_status)}`}>
                          {getStatusLabel(cls.overall_status)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/class/${cls.class_id}/gradebook`}
                        className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-text-tertiary">
                    No classes found matching your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        {!loading && classes.length > 0 && (
          <div className="text-sm text-text-tertiary text-center">
            Showing {classes.length} of {stats.total_classes} classes
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <h3 className="text-blue-600 dark:text-blue-400 font-medium mb-2">Progress Calculation</h3>
          <p className="text-text-secondary text-sm">
            Progress = (Scores Entered) / (Students × 13 Assessments). Each course has 13 assessment items:
            <strong> FA1-FA8</strong> (8 Formative) +
            <strong> SA1-SA4</strong> (4 Summative) +
            <strong> MID</strong> (1 Midterm).
            A class is &quot;On Track&quot; when all three courses (LT, IT, KCFS) reach ≥80% completion.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
