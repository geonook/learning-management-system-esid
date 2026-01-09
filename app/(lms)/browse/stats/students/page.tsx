"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Users, ArrowLeft, Search, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getStudentGrades } from "@/lib/api/statistics";
import { formatNumber } from "@/lib/statistics/calculations";
import type { StudentGradeRow, CourseType } from "@/types/statistics";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { StatisticsActionButtons } from "@/components/statistics/ActionButtons";
import type { ColumnDefinition } from "@/lib/utils/clipboard";
import { GlobalFilterBar, useGlobalFilters } from "@/components/filters";

export default function AllStudentGradesPage() {
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<StudentGradeRow[]>([]);
  const [filteredGrades, setFilteredGrades] = useState<StudentGradeRow[]>([]);
  const [selectedCourseType, setSelectedCourseType] = useState<CourseType>("LT");
  const [selectedGrade, setSelectedGrade] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { academicYear, termForApi } = useGlobalFilters();

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data = await getStudentGrades({
          course_type: selectedCourseType,
          grade: selectedGrade,
          academic_year: academicYear,
          term: termForApi,
        });
        setGrades(data);
      } catch (error) {
        console.error("Failed to fetch student grades:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedCourseType, selectedGrade, academicYear, termForApi]);

  // Filter by search
  useEffect(() => {
    if (!debouncedSearch) {
      setFilteredGrades(grades);
    } else {
      const query = debouncedSearch.toLowerCase();
      setFilteredGrades(
        grades.filter(
          (g) =>
            g.full_name.toLowerCase().includes(query) ||
            g.student_number.toLowerCase().includes(query) ||
            g.class_name.toLowerCase().includes(query)
        )
      );
    }
    setPage(1);
  }, [grades, debouncedSearch]);

  // Pagination
  const totalPages = Math.ceil(filteredGrades.length / pageSize);
  const paginatedGrades = filteredGrades.slice((page - 1) * pageSize, page * pageSize);

  const courseTypes: CourseType[] = ["LT", "IT", "KCFS"];
  const gradeOptions: number[] = [1, 2, 3, 4, 5, 6];

  // Column definitions for export (no copy - data is paginated)
  const columns: ColumnDefinition<StudentGradeRow>[] = [
    { key: "student_number", header: "Student ID" },
    { key: "full_name", header: "Name" },
    { key: "class_name", header: "Class" },
    { key: "course_type", header: "Course" },
    { key: "fa_avg", header: "F.A. Avg", format: (v) => formatNumber(v as number | null) },
    { key: "sa_avg", header: "S.A. Avg", format: (v) => formatNumber(v as number | null) },
    { key: "midterm", header: "Midterm", format: (v) => formatNumber(v as number | null) },
    { key: "term_grade", header: "Term Grade", format: (v) => formatNumber(v as number | null) },
  ];

  return (
    <AuthGuard requiredRoles={["admin", "head", "office_member"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/browse/stats"
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-text-secondary" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="w-6 h-6 text-blue-500 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">
                  All Student Grades
                </h1>
                <p className="text-sm text-text-secondary">
                  View individual student grades across all courses
                </p>
              </div>
            </div>
          </div>
          <StatisticsActionButtons
            data={filteredGrades}
            loading={loading}
            columns={columns}
            showCopy={false}
            exportOptions={{
              filename: `student-grades-${selectedCourseType.toLowerCase()}-g${selectedGrade}`,
              sheetName: `G${selectedGrade} ${selectedCourseType} Students`
            }}
          />
        </div>

        {/* Global Filters (Year + Term) */}
        <GlobalFilterBar showYear showTerm compact />

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <Input
            placeholder="Search by name, student ID, or class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-surface-secondary border-border-default text-text-primary placeholder:text-text-tertiary"
          />
        </div>

        {/* Filters - Unified solid button style */}
        <div className="flex flex-wrap gap-6">
          {/* Course Type Filter */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-text-secondary font-medium">Course:</span>
            {courseTypes.map((ct) => (
              <button
                key={ct}
                onClick={() => setSelectedCourseType(ct)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-normal ease-apple ${
                  selectedCourseType === ct
                    ? ct === "LT"
                      ? "bg-emerald-500 text-white dark:text-white"
                      : ct === "IT"
                      ? "bg-blue-500 text-white dark:text-white"
                      : "bg-purple-500 text-white dark:text-white"
                    : "bg-surface-tertiary text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                }`}
              >
                {ct}
              </button>
            ))}
          </div>

          {/* Grade Filter */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-text-secondary font-medium">Grade:</span>
            {gradeOptions.map((grade) => (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-normal ease-apple ${
                  selectedGrade === grade
                    ? "bg-purple-600 dark:bg-purple-500 text-white dark:text-white"
                    : "bg-surface-tertiary text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                }`}
              >
                {`G${grade}`}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-text-secondary">
          Showing {paginatedGrades.length} of {filteredGrades.length} student records
          {` for ${selectedCourseType} courses in Grade ${selectedGrade}`}
        </div>

        {/* Statistics Table */}
        <div className="bg-surface-secondary rounded-xl border border-border-default overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default bg-surface-elevated/50">
                  <th className="text-left p-4 text-sm font-medium text-text-secondary whitespace-nowrap">
                    Student ID
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary whitespace-nowrap">
                    Name
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary whitespace-nowrap">
                    Class
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary whitespace-nowrap">
                    Course
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary whitespace-nowrap">
                    F.A. Avg
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary whitespace-nowrap">
                    S.A. Avg
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary whitespace-nowrap">
                    Midterm
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary whitespace-nowrap">
                    Term Grade
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-border-subtle">
                      <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-12" /></td>
                      <td className="p-4 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                      <td className="p-4 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                      <td className="p-4 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                      <td className="p-4 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                    </tr>
                  ))
                ) : paginatedGrades.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-text-tertiary">
                      {debouncedSearch
                        ? `No students match "${debouncedSearch}"`
                        : "No student grades available"}
                    </td>
                  </tr>
                ) : (
                  paginatedGrades.map((grade, index) => (
                    <tr
                      key={`${grade.student_id}-${grade.course_type}-${index}`}
                      className="border-b border-border-subtle hover:bg-surface-hover transition-colors"
                    >
                      <td className="p-4 text-text-primary font-mono text-sm">
                        {grade.student_number}
                      </td>
                      <td className="p-4 text-text-primary">
                        {grade.full_name}
                      </td>
                      <td className="p-4 text-text-secondary">
                        {grade.class_name}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium ${
                            grade.course_type === "LT"
                              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : grade.course_type === "IT"
                              ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                              : "bg-purple-500/20 text-purple-600 dark:text-purple-400"
                          }`}
                        >
                          {grade.course_type}
                        </span>
                      </td>
                      <td className="p-4 text-right text-text-secondary">
                        {formatNumber(grade.fa_avg)}
                      </td>
                      <td className="p-4 text-right text-text-secondary">
                        {formatNumber(grade.sa_avg)}
                      </td>
                      <td className="p-4 text-right text-text-secondary">
                        {formatNumber(grade.midterm)}
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={
                            grade.term_grade !== null
                              ? grade.term_grade >= 90
                                ? "text-green-600 dark:text-green-400 font-medium"
                                : grade.term_grade >= 80
                                ? "text-blue-600 dark:text-blue-400"
                                : grade.term_grade >= 60
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-red-600 dark:text-red-400"
                              : "text-text-tertiary"
                          }
                        >
                          {formatNumber(grade.term_grade)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filteredGrades.length > pageSize && (
            <div className="flex items-center justify-between p-4 border-t border-border-default">
              <div className="text-sm text-text-tertiary">
                Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredGrades.length)} of {filteredGrades.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg bg-surface-tertiary text-text-secondary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-text-secondary">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg bg-surface-tertiary text-text-secondary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-text-secondary text-sm">
            <strong>Note:</strong> Term Grade is calculated using the formula:
            F.A. Average (15%) + S.A. Average (20%) + Midterm (10%).
            Only numerical scores are included in calculations.
            Each student appears multiple times if enrolled in multiple course types (LT/IT/KCFS).
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
