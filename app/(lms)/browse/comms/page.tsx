"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useGlobalFilters, GlobalFilterBar } from "@/components/filters/GlobalFilterBar";
import {
  MessageSquare,
  Search,
  Loader2,
  Phone,
  Mail,
  Users,
  FileText,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAllCommunications,
  getCommunicationStats,
} from "@/lib/api/communications";
import type {
  PaginatedCommunications,
  CommunicationStats,
  CommunicationType,
  Semester,
} from "@/types/communications";
import {
  getCurrentSemester,
  formatContactPeriod,
  formatCommunicationType,
} from "@/types/communications";

type CourseTypeFilter = "All" | "LT" | "IT" | "KCFS";

export default function BrowseCommsPage() {
  const { userId, isReady } = useAuthReady();
  const { academicYear } = useGlobalFilters();
  const [data, setData] = useState<PaginatedCommunications | null>(null);
  const [stats, setStats] = useState<CommunicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [semester, setSemester] = useState<Semester>(getCurrentSemester());
  const [courseType, setCourseType] = useState<CourseTypeFilter>("All");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Single effect for all data fetching - follows Dashboard pattern
  useEffect(() => {
    // Wait for auth to be ready
    if (!isReady || !userId) {
      console.log("[BrowseComms] Auth not ready, waiting...");
      return;
    }

    console.log("[BrowseComms] Fetching data...", { academicYear, semester, courseType, page });

    let isCancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [commsData, statsData] = await Promise.all([
          getAllCommunications({
            academic_year: academicYear,
            semester: semester,
            course_type: courseType === "All" ? undefined : courseType,
            page,
            pageSize,
          }),
          getCommunicationStats(academicYear, semester),
        ]);
        if (!isCancelled) {
          console.log("[BrowseComms] Data received:", commsData?.total);
          setData(commsData);
          setStats(statsData);
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("[BrowseComms] Failed to fetch communications:", err);
          setError(err instanceof Error ? err.message : "Failed to fetch communications");
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [isReady, userId, academicYear, semester, courseType, page, pageSize]);

  // Get communication type icon
  const getTypeIcon = (type: CommunicationType) => {
    switch (type) {
      case "phone_call":
        return <Phone className="w-4 h-4" />;
      case "email":
        return <Mail className="w-4 h-4" />;
      case "in_person":
        return <Users className="w-4 h-4" />;
      case "message":
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // Filter communications by search query
  const filteredComms = data?.communications.filter((comm) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      comm.student.full_name.toLowerCase().includes(query) ||
      comm.teacher.full_name.toLowerCase().includes(query) ||
      comm.content.toLowerCase().includes(query) ||
      (comm.subject && comm.subject.toLowerCase().includes(query))
    );
  }) || [];

  return (
    <AuthGuard requiredRoles={["admin", "head", "office_member"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <MessageSquare className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Browse Communications</h1>
              <p className="text-sm text-text-secondary">
                View all teacher-parent communications ({data?.total || 0} records)
              </p>
            </div>
          </div>
        </div>

        {/* Academic Year Filter */}
        <GlobalFilterBar showYear compact className="mb-2" />

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <Input
              placeholder="Search by student, teacher, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-surface-secondary border-border-default text-text-primary placeholder:text-text-tertiary"
            />
          </div>

          {/* Semester Selector */}
          <Select
            value={semester}
            onValueChange={(value) => setSemester(value as Semester)}
          >
            <SelectTrigger className="w-[140px] bg-surface-secondary border-border-default text-text-primary">
              <SelectValue placeholder="Select semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Fall">Fall</SelectItem>
              <SelectItem value="Spring">Spring</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Course Type Tabs */}
        <div className="flex gap-2">
          {(["All", "LT", "IT", "KCFS"] as CourseTypeFilter[]).map((type) => (
            <button
              key={type}
              onClick={() => setCourseType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                courseType === type
                  ? type === "LT"
                    ? "bg-green-500 text-white"
                    : type === "IT"
                    ? "bg-blue-500 text-white"
                    : type === "KCFS"
                    ? "bg-purple-500 text-white"
                    : "bg-cyan-500 text-white"
                  : "bg-surface-secondary text-text-secondary hover:bg-surface-hover"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="text-2xl font-bold text-text-primary">{stats?.total || 0}</div>
            <div className="text-xs text-text-tertiary">Total Records</div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="text-2xl font-bold text-cyan-500 dark:text-cyan-400">{stats?.this_week || 0}</div>
            <div className="text-xs text-text-tertiary">This Week</div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="text-2xl font-bold text-green-500 dark:text-green-400">
              {stats?.by_type.phone_call || 0}
            </div>
            <div className="text-xs text-text-tertiary">Phone Calls</div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="text-2xl font-bold text-blue-500 dark:text-blue-400">
              {stats?.by_type.email || 0}
            </div>
            <div className="text-xs text-text-tertiary">Emails</div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="text-2xl font-bold text-purple-500 dark:text-purple-400">
              {(stats?.by_type.in_person || 0) +
                (stats?.by_type.message || 0) +
                (stats?.by_type.other || 0)}
            </div>
            <div className="text-xs text-text-tertiary">Other</div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-cyan-500 dark:text-cyan-400 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-500 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredComms.length === 0 && (
          <div className="bg-surface-secondary rounded-xl border border-border-default p-8 text-center">
            <MessageSquare className="w-12 h-12 text-text-tertiary/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No Communications Found</h3>
            <p className="text-text-tertiary max-w-md mx-auto">
              {data?.total === 0
                ? "No communications have been recorded for this semester yet. Teachers can add communications from their class pages."
                : "No communications match your search criteria."}
            </p>
          </div>
        )}

        {/* Communications List */}
        {!loading && !error && filteredComms.length > 0 && (
          <div className="bg-surface-secondary rounded-xl border border-border-default overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Date</th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Type</th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Student</th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Teacher</th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Class</th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Period</th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Content</th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary w-16"></th>
                </tr>
              </thead>
              <tbody>
                {filteredComms.map((comm) => (
                  <tr key={comm.id} className="border-b border-border-subtle hover:bg-surface-hover">
                    <td className="p-4 text-text-secondary text-sm whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {new Date(comm.communication_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div
                        className={`flex items-center gap-2 ${
                          comm.communication_type === "phone_call"
                            ? "text-green-500 dark:text-green-400"
                            : comm.communication_type === "email"
                            ? "text-blue-500 dark:text-blue-400"
                            : "text-purple-500 dark:text-purple-400"
                        }`}
                      >
                        {getTypeIcon(comm.communication_type)}
                        <span className="text-sm">
                          {formatCommunicationType(comm.communication_type)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-text-primary">{comm.student.full_name}</td>
                    <td className="p-4 text-text-secondary">{comm.teacher.full_name}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          comm.course.course_type === "LT"
                            ? "bg-green-500/20 text-green-500 dark:text-green-400"
                            : comm.course.course_type === "IT"
                            ? "bg-blue-500/20 text-blue-500 dark:text-blue-400"
                            : "bg-purple-500/20 text-purple-500 dark:text-purple-400"
                        }`}
                      >
                        {comm.course.class_name} ({comm.course.course_type})
                      </span>
                    </td>
                    <td className="p-4 text-text-tertiary text-sm">
                      {comm.contact_period ? formatContactPeriod(comm.contact_period) : "-"}
                    </td>
                    <td className="p-4 text-text-secondary text-sm max-w-xs truncate">
                      {comm.subject || comm.content.substring(0, 50)}
                      {comm.content.length > 50 && "..."}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/class/${comm.course.class_id}/communications`}
                        className="p-2 rounded-lg hover:bg-surface-hover text-text-tertiary hover:text-text-primary inline-block"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border-default">
                <div className="text-sm text-text-tertiary">
                  Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, data.total)} of {data.total}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 rounded-lg bg-surface-secondary text-text-secondary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-text-secondary">
                    Page {page} of {data.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page === data.totalPages}
                    className="px-3 py-1 rounded-lg bg-surface-secondary text-text-secondary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <h3 className="text-blue-500 dark:text-blue-400 font-medium mb-2">Browse Mode</h3>
          <p className="text-text-secondary text-sm">
            This page shows all teacher-parent communications for oversight purposes.
            To add or edit communications, teachers should access their class communication pages.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
