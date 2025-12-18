"use client";

/**
 * Browse MAP Scores Page
 * View and filter MAP assessment scores across students
 */

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/auth-guard";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Target,
  Loader2,
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  getMapAssessments,
  getAvailableMapTerms,
  formatTermLabel,
  getRitScoreColor,
  getGrowthColor,
  formatGrowth,
  type MapAssessment,
} from "@/lib/api/map-assessments";

const GRADES = [3, 4, 5, 6];
const COURSES = ["Reading", "Language Usage"] as const;
const PAGE_SIZE = 50;

export default function BrowseMapPage() {
  // State
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<MapAssessment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);

  // Filters
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<"Reading" | "Language Usage" | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Load available terms on mount
  useEffect(() => {
    async function loadTerms() {
      const terms = await getAvailableMapTerms();
      setAvailableTerms(terms);
      // Set default term to most recent
      if (terms.length > 0 && !selectedTerm) {
        setSelectedTerm(terms[0] ?? null);
      }
    }
    loadTerms();
  }, [selectedTerm]);

  // Load assessments when filters change
  useEffect(() => {
    async function loadAssessments() {
      setLoading(true);
      try {
        const { data, count } = await getMapAssessments({
          grade: selectedGrade ?? undefined,
          course: selectedCourse ?? undefined,
          termTested: selectedTerm ?? undefined,
          search: searchQuery || undefined,
          limit: PAGE_SIZE,
          offset: (currentPage - 1) * PAGE_SIZE,
        });
        setAssessments(data);
        setTotalCount(count);
      } catch (error) {
        console.error("Failed to load MAP assessments:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAssessments();
  }, [selectedGrade, selectedCourse, selectedTerm, searchQuery, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGrade, selectedCourse, selectedTerm, searchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Statistics summary
  const stats = useMemo(() => {
    if (assessments.length === 0) return null;

    const scores = assessments.map((a) => a.rit_score);
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const min = Math.min(...scores);
    const max = Math.max(...scores);

    return {
      count: assessments.length,
      avg: Math.round(avg * 10) / 10,
      min,
      max,
    };
  }, [assessments]);

  const breadcrumbs = [
    { label: "Browse Data", href: "/dashboard" },
    { label: "MAP Scores" },
  ];

  return (
    <AuthGuard requiredRoles={["admin", "head", "office_member", "teacher"]}>
      <div className="space-y-6">
        <PageHeader
          title="MAP Growth Scores"
          subtitle="Browse NWEA MAP assessment scores for G3-G6 students"
          breadcrumbs={breadcrumbs}
          backHref="/dashboard"
          backLabel="Back to Dashboard"
        />

        {/* Filters */}
        <div className="bg-surface-elevated rounded-xl border border-border-default p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-text-secondary" />
            <span className="text-sm font-medium text-text-primary">Filters</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Grade Filter */}
            <div>
              <label className="block text-xs text-text-tertiary mb-1.5">Grade</label>
              <select
                value={selectedGrade ?? ""}
                onChange={(e) => setSelectedGrade(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 bg-surface-default border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                <option value="">All Grades</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Course Filter */}
            <div>
              <label className="block text-xs text-text-tertiary mb-1.5">Course</label>
              <select
                value={selectedCourse ?? ""}
                onChange={(e) =>
                  setSelectedCourse(
                    e.target.value ? (e.target.value as "Reading" | "Language Usage") : null
                  )
                }
                className="w-full px-3 py-2 bg-surface-default border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                <option value="">All Courses</option>
                {COURSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Term Filter */}
            <div>
              <label className="block text-xs text-text-tertiary mb-1.5">Term</label>
              <select
                value={selectedTerm ?? ""}
                onChange={(e) => setSelectedTerm(e.target.value || null)}
                className="w-full px-3 py-2 bg-surface-default border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                <option value="">All Terms</option>
                {availableTerms.map((term) => (
                  <option key={term} value={term}>
                    {formatTermLabel(term)}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs text-text-tertiary mb-1.5">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Student ID or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-surface-default border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-surface-elevated rounded-xl border border-border-default p-4 shadow-sm">
              <p className="text-xs text-text-tertiary mb-1">Results</p>
              <p className="text-2xl font-bold text-text-primary">{totalCount}</p>
            </div>
            <div className="bg-surface-elevated rounded-xl border border-border-default p-4 shadow-sm">
              <p className="text-xs text-text-tertiary mb-1">Average RIT</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.avg}</p>
            </div>
            <div className="bg-surface-elevated rounded-xl border border-border-default p-4 shadow-sm">
              <p className="text-xs text-text-tertiary mb-1">Min RIT</p>
              <p className="text-2xl font-bold text-text-primary">{stats.min}</p>
            </div>
            <div className="bg-surface-elevated rounded-xl border border-border-default p-4 shadow-sm">
              <p className="text-xs text-text-tertiary mb-1">Max RIT</p>
              <p className="text-2xl font-bold text-text-primary">{stats.max}</p>
            </div>
          </div>
        )}

        {/* Results Table */}
        <div className="bg-surface-elevated rounded-xl border border-border-default shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-500" />
              <span className="font-medium text-text-primary">Assessment Results</span>
              <span className="text-sm text-text-tertiary">({totalCount} total)</span>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
            </div>
          )}

          {/* Empty State */}
          {!loading && assessments.length === 0 && (
            <div className="py-12 text-center">
              <Target className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
              <p className="text-text-secondary">No MAP assessments found</p>
              <p className="text-sm text-text-tertiary mt-1">
                Try adjusting your filters or search query
              </p>
            </div>
          )}

          {/* Table */}
          {!loading && assessments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-tertiary">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wide">
                      Student
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wide">
                      Grade
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wide">
                      Course
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wide">
                      Term
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-tertiary uppercase tracking-wide">
                      RIT Score
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wide">
                      Lexile
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-tertiary uppercase tracking-wide">
                      Guessing
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {assessments.map((assessment) => (
                    <tr
                      key={assessment.id}
                      className="hover:bg-surface-hover transition-colors duration-normal"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={
                            assessment.student_id
                              ? `/student/${assessment.student_id}`
                              : "#"
                          }
                          className={`font-medium ${
                            assessment.student_id
                              ? "text-purple-600 dark:text-purple-400 hover:underline"
                              : "text-text-primary"
                          }`}
                        >
                          {assessment.student_first_name || assessment.student_last_name
                            ? `${assessment.student_first_name || ""} ${assessment.student_last_name || ""}`.trim()
                            : assessment.student_number}
                        </Link>
                        <p className="text-xs text-text-tertiary font-mono">
                          {assessment.student_number}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-surface-tertiary text-text-secondary">
                          G{assessment.grade}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            assessment.course === "Reading"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                              : "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400"
                          }`}
                        >
                          {assessment.course}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {formatTermLabel(assessment.term_tested)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-lg font-bold ${getRitScoreColor(
                            assessment.rit_score,
                            assessment.grade
                          )}`}
                        >
                          {assessment.rit_score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {assessment.lexile_score || "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {assessment.rapid_guessing_percent !== null ? (
                          <span
                            className={
                              assessment.rapid_guessing_percent > 10
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-text-secondary"
                            }
                          >
                            {assessment.rapid_guessing_percent}%
                          </span>
                        ) : (
                          <span className="text-text-tertiary">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-border-default flex items-center justify-between">
              <p className="text-sm text-text-tertiary">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-text-secondary" />
                </button>
                <span className="text-sm text-text-primary">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-text-secondary" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
