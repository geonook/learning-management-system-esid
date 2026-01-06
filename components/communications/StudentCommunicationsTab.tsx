"use client";

import { useState, useEffect } from "react";
import {
  Phone,
  Mail,
  Users,
  MessageSquare,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getStudentCommunicationsPaginated,
  getStudentCommunicationYears,
} from "@/lib/api/communications";
import type {
  CommunicationWithDetails,
  PaginatedCommunications,
  CommunicationType,
  ContactPeriod,
  Semester,
} from "@/types/communications";

interface StudentCommunicationsTabProps {
  studentId: string;
  studentName: string;
}

const COMMUNICATION_TYPE_ICONS: Record<CommunicationType, React.ElementType> = {
  phone_call: Phone,
  email: Mail,
  in_person: Users,
  message: MessageSquare,
  other: FileText,
};

const COMMUNICATION_TYPE_LABELS: Record<CommunicationType, string> = {
  phone_call: "Phone Call",
  email: "Email",
  in_person: "In Person",
  message: "Message",
  other: "Other",
};

const CONTACT_PERIOD_LABELS: Record<ContactPeriod, string> = {
  semester_start: "Semester Start",
  midterm: "Midterm",
  final: "Final",
  ad_hoc: "Ad Hoc",
};

const COURSE_TYPE_COLORS: Record<string, string> = {
  LT: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  IT: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  KCFS: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
};

export function StudentCommunicationsTab({
  studentId,
  studentName,
}: StudentCommunicationsTabProps) {
  const [communications, setCommunications] = useState<PaginatedCommunications | null>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedCourseType, setSelectedCourseType] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch available years on mount
  useEffect(() => {
    async function fetchYears() {
      try {
        const years = await getStudentCommunicationYears(studentId);
        setAvailableYears(years);
      } catch (err) {
        console.error("Failed to fetch years:", err);
      }
    }
    fetchYears();
  }, [studentId]);

  // Fetch communications when filters change
  useEffect(() => {
    async function fetchCommunications() {
      setLoading(true);
      setError(null);
      try {
        const result = await getStudentCommunicationsPaginated(studentId, {
          page: currentPage,
          pageSize: 20,
          academicYear: selectedYear === "all" ? undefined : selectedYear,
          courseType:
            selectedCourseType === "all"
              ? undefined
              : (selectedCourseType as "LT" | "IT" | "KCFS"),
        });
        setCommunications(result);
      } catch (err) {
        console.error("Failed to fetch communications:", err);
        setError(err instanceof Error ? err.message : "Failed to load communications");
      } finally {
        setLoading(false);
      }
    }
    fetchCommunications();
  }, [studentId, selectedYear, selectedCourseType, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, selectedCourseType]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No date";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTeacherName = (comm: CommunicationWithDetails) => {
    const teacher = comm.teacher as {
      id: string;
      full_name: string;
      display_name?: string;
    };
    return teacher?.display_name || teacher?.full_name || "Unknown Teacher";
  };

  if (loading && !communications) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-500 dark:text-purple-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4">
        <p className="text-red-700 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="bg-surface-elevated rounded-xl border border-border-default p-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Communications History
          </h2>
          <div className="flex items-center gap-3">
            {/* Academic Year Filter */}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Academic Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Course Type Filter */}
            <Select value={selectedCourseType} onValueChange={setSelectedCourseType}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Course Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="LT">LT</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
                <SelectItem value="KCFS">KCFS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Communications list */}
      <div className="bg-surface-elevated rounded-xl border border-border-default shadow-sm overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-surface-elevated/80 flex items-center justify-center z-10">
            <Loader2 className="w-6 h-6 text-purple-500 dark:text-purple-400 animate-spin" />
          </div>
        )}

        {communications && communications.communications.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
            <p className="text-text-secondary">No communication records found</p>
            <p className="text-sm text-text-tertiary mt-1">
              {selectedYear !== "all" || selectedCourseType !== "all"
                ? "Try adjusting your filters"
                : `No communications have been recorded for ${studentName}`}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border-subtle">
              {communications?.communications.map((comm) => {
                const IconComponent = COMMUNICATION_TYPE_ICONS[comm.communication_type];
                return (
                  <div
                    key={comm.id}
                    className="p-4 hover:bg-surface-hover transition-colors duration-normal ease-apple"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 flex-wrap">
                        <IconComponent className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                        <span className="text-sm text-text-secondary flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(comm.communication_date)}
                        </span>
                        <Badge
                          className={
                            COURSE_TYPE_COLORS[comm.course?.course_type || ""] ||
                            "bg-surface-tertiary text-text-tertiary"
                          }
                        >
                          {comm.course?.course_type || "N/A"}
                        </Badge>
                        <Badge variant="outline">
                          {COMMUNICATION_TYPE_LABELS[comm.communication_type]}
                        </Badge>
                        {comm.contact_period && (
                          <Badge variant="secondary">
                            {CONTACT_PERIOD_LABELS[comm.contact_period]}
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-text-tertiary">
                        {getTeacherName(comm)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="mt-3">
                      {comm.content ? (
                        <p className="text-text-primary whitespace-pre-wrap">
                          {comm.content}
                        </p>
                      ) : (
                        <p className="italic text-text-tertiary">No content</p>
                      )}
                    </div>

                    {/* Parent Response (subject field) */}
                    {comm.subject && (
                      <div className="mt-3 pt-3 border-t border-border-subtle">
                        <p className="text-sm text-text-secondary">
                          <span className="font-medium">Parent Response:</span>{" "}
                          {comm.subject}
                        </p>
                      </div>
                    )}

                    {/* Class info */}
                    {comm.course?.class_name && (
                      <div className="mt-2 text-xs text-text-tertiary">
                        Class: {comm.course.class_name} | {comm.academic_year}{" "}
                        {comm.semester === "fall" ? "Fall" : "Spring"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {communications && communications.totalPages > 1 && (
              <div className="p-4 border-t border-border-default flex items-center justify-between">
                <div className="text-sm text-text-secondary">
                  Showing {(currentPage - 1) * 20 + 1} -{" "}
                  {Math.min(currentPage * 20, communications.total)} of{" "}
                  {communications.total} records
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </Button>
                  <span className="text-sm text-text-secondary px-2">
                    Page {currentPage} of {communications.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(communications.totalPages, p + 1)
                      )
                    }
                    disabled={currentPage === communications.totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
