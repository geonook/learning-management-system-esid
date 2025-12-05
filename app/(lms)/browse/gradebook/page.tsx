"use client";

import { useState, useEffect, useMemo } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { BookOpen, Search, Download, FileSpreadsheet, Calendar, CheckCircle, Clock, AlertTriangle, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface ExamWithDetails {
  id: string;
  name: string;
  exam_date: string | null;
  class_id: string;
  course_id: string | null;
  max_score: number;
  created_at: string;
  class_name: string;
  class_grade: number;
  course_type: string | null;
  scores_entered: number;
  total_students: number;
  completion_rate: number;
}

export default function BrowseGradebookPage() {
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<ExamWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [courseTypeFilter, setCourseTypeFilter] = useState<string | null>(null);
  const [assessmentTypeFilter, setAssessmentTypeFilter] = useState<string>("all");
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  useEffect(() => {
    async function fetchExams() {
      try {
        const supabase = createClient();

        // Get all exams with class info
        // Note: exams.course_id may not have FK to courses table, so we fetch courses separately
        const { data: examsData, error: examsError } = await supabase
          .from("exams")
          .select(`
            id,
            name,
            exam_date,
            class_id,
            course_id,
            max_score,
            created_at,
            classes!inner (
              name,
              grade
            )
          `)
          .order("exam_date", { ascending: false });

        // Fetch course types separately if course_ids exist
        const courseIds = (examsData || [])
          .map(e => e.course_id)
          .filter((id): id is string => id !== null);

        let courseTypeMap: Record<string, string> = {};
        if (courseIds.length > 0) {
          const { data: coursesData } = await supabase
            .from("courses")
            .select("id, course_type")
            .in("id", courseIds);

          coursesData?.forEach(c => {
            courseTypeMap[c.id] = c.course_type;
          });
        }

        if (examsError) {
          console.error("Error fetching exams:", examsError);
          return;
        }

        // Get student counts per class
        const { data: studentCounts } = await supabase
          .from("students")
          .select("class_id")
          .eq("is_active", true);

        const classStudentCounts: Record<string, number> = {};
        studentCounts?.forEach((s) => {
          classStudentCounts[s.class_id] = (classStudentCounts[s.class_id] || 0) + 1;
        });

        // Get score counts per exam
        const examIds = (examsData || []).map((e) => e.id);
        const { data: scoreCounts } = await supabase
          .from("scores")
          .select("exam_id, score")
          .in("exam_id", examIds)
          .not("score", "is", null);

        const examScoreCounts: Record<string, number> = {};
        scoreCounts?.forEach((s) => {
          if (s.score !== null && s.score > 0) {
            examScoreCounts[s.exam_id] = (examScoreCounts[s.exam_id] || 0) + 1;
          }
        });

        // Transform data
        const examsWithDetails: ExamWithDetails[] = (examsData || []).map((exam) => {
          const classData = exam.classes as unknown as { name: string; grade: number };
          const totalStudents = classStudentCounts[exam.class_id] || 0;
          const scoresEntered = examScoreCounts[exam.id] || 0;
          const completionRate = totalStudents > 0 ? Math.round((scoresEntered / totalStudents) * 100) : 0;

          return {
            id: exam.id,
            name: exam.name,
            exam_date: exam.exam_date,
            class_id: exam.class_id,
            course_id: exam.course_id,
            max_score: exam.max_score,
            created_at: exam.created_at,
            class_name: classData?.name || "Unknown",
            class_grade: classData?.grade || 0,
            course_type: exam.course_id ? courseTypeMap[exam.course_id] || null : null,
            scores_entered: scoresEntered,
            total_students: totalStudents,
            completion_rate: completionRate,
          };
        });

        setExams(examsWithDetails);
      } catch (error) {
        console.error("Failed to fetch exams:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchExams();
  }, []);

  // Filter exams
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!exam.name.toLowerCase().includes(query) && !exam.class_name.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Grade filter
      if (gradeFilter !== null && exam.class_grade !== gradeFilter) {
        return false;
      }

      // Course type filter
      if (courseTypeFilter && exam.course_type !== courseTypeFilter) {
        return false;
      }

      // Assessment type filter
      if (assessmentTypeFilter !== "all") {
        const name = exam.name.toUpperCase();
        if (assessmentTypeFilter === "formative" && !name.match(/^FA\d/)) {
          return false;
        }
        if (assessmentTypeFilter === "summative" && !name.match(/^SA\d/)) {
          return false;
        }
        if (assessmentTypeFilter === "final" && !name.includes("FINAL")) {
          return false;
        }
      }

      return true;
    });
  }, [exams, searchQuery, gradeFilter, courseTypeFilter, assessmentTypeFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = exams.length;
    const completed = exams.filter((e) => e.completion_rate >= 90).length;
    const inProgress = exams.filter((e) => e.completion_rate > 0 && e.completion_rate < 90).length;
    const notStarted = exams.filter((e) => e.completion_rate === 0).length;
    const avgCompletion = exams.length > 0
      ? Math.round(exams.reduce((sum, e) => sum + e.completion_rate, 0) / exams.length)
      : 0;
    return { total, completed, inProgress, notStarted, avgCompletion };
  }, [exams]);

  const getStatusIcon = (rate: number) => {
    if (rate >= 90) return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (rate > 0) return <Clock className="w-4 h-4 text-amber-400" />;
    return <AlertTriangle className="w-4 h-4 text-red-400/50" />;
  };

  const getStatusColor = (rate: number) => {
    if (rate >= 90) return "text-green-400";
    if (rate >= 50) return "text-amber-400";
    if (rate > 0) return "text-amber-400";
    return "text-white/40";
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
              <h1 className="text-2xl font-bold text-white">Browse Gradebook</h1>
              <p className="text-sm text-white/60">View all assessments and score entry progress</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Assessments</span>
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-white">{stats.total}</div>
            )}
            <div className="text-xs text-white/40">total exams</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Completed</span>
              <CheckCircle className="w-4 h-4 text-green-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
            )}
            <div className="text-xs text-white/40">≥90% entered</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">In Progress</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-amber-400">{stats.inProgress}</div>
            )}
            <div className="text-xs text-white/40">partial entry</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Not Started</span>
              <AlertTriangle className="w-4 h-4 text-red-400/50" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-white/60">{stats.notStarted}</div>
            )}
            <div className="text-xs text-white/40">no scores</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Avg Progress</span>
              <Calendar className="w-4 h-4 text-blue-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-white">{stats.avgCompletion}%</div>
            )}
            <div className="text-xs text-white/40">completion</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search assessments or classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>

          {/* Grade Dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors"
              onClick={() => setShowGradeDropdown(!showGradeDropdown)}
            >
              {gradeFilter !== null ? `Grade ${gradeFilter}` : "All Grades"}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showGradeDropdown && (
              <div className="absolute top-full mt-2 right-0 bg-slate-800 border border-white/10 rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                <button
                  className="w-full px-4 py-2 text-left text-white/70 hover:bg-white/10 text-sm"
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
                    className="w-full px-4 py-2 text-left text-white/70 hover:bg-white/10 text-sm"
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

          {/* Course Type Dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors"
              onClick={() => setShowTypeDropdown(!showTypeDropdown)}
            >
              {courseTypeFilter || "All Types"}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showTypeDropdown && (
              <div className="absolute top-full mt-2 right-0 bg-slate-800 border border-white/10 rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                <button
                  className="w-full px-4 py-2 text-left text-white/70 hover:bg-white/10 text-sm"
                  onClick={() => {
                    setCourseTypeFilter(null);
                    setShowTypeDropdown(false);
                  }}
                >
                  All Types
                </button>
                {["LT", "IT", "KCFS"].map((type) => (
                  <button
                    key={type}
                    className="w-full px-4 py-2 text-left text-white/70 hover:bg-white/10 text-sm"
                    onClick={() => {
                      setCourseTypeFilter(type);
                      setShowTypeDropdown(false);
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Assessment Type Tabs */}
        <div className="flex gap-2">
          {[
            { key: "all", label: "All" },
            { key: "formative", label: "Formative (FA)" },
            { key: "summative", label: "Summative (SA)" },
            { key: "final", label: "Final" },
          ].map((type) => (
            <button
              key={type.key}
              onClick={() => setAssessmentTypeFilter(type.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                assessmentTypeFilter === type.key
                  ? "bg-amber-500 text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Exams Table */}
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-sm font-medium text-white/60">Assessment</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Class</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Type</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Date</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Progress</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Status</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="p-4">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-12" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-12" />
                    </td>
                  </tr>
                ))
              ) : filteredExams.length > 0 ? (
                filteredExams.map((exam) => (
                  <tr key={exam.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white font-medium">{exam.name}</td>
                    <td className="p-4">
                      <div className="text-white/80">{exam.class_name}</div>
                      <div className="text-white/40 text-xs">G{exam.class_grade}</div>
                    </td>
                    <td className="p-4">
                      {exam.course_type ? (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          exam.course_type === "LT"
                            ? "bg-blue-500/20 text-blue-400"
                            : exam.course_type === "IT"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-purple-500/20 text-purple-400"
                        }`}>
                          {exam.course_type}
                        </span>
                      ) : (
                        <span className="text-white/40">-</span>
                      )}
                    </td>
                    <td className="p-4 text-white/60">{formatDate(exam.exam_date)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden max-w-[80px]">
                          <div
                            className={`h-full rounded-full ${
                              exam.completion_rate >= 90
                                ? "bg-green-500"
                                : exam.completion_rate >= 50
                                ? "bg-amber-500"
                                : exam.completion_rate > 0
                                ? "bg-amber-500"
                                : "bg-white/20"
                            }`}
                            style={{ width: `${exam.completion_rate}%` }}
                          />
                        </div>
                        <span className={`text-sm ${getStatusColor(exam.completion_rate)}`}>
                          {exam.scores_entered}/{exam.total_students}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(exam.completion_rate)}
                        <span className={`text-sm ${getStatusColor(exam.completion_rate)}`}>
                          {exam.completion_rate}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/class/${exam.class_id}/gradebook`}
                        className="text-amber-400 hover:text-amber-300 text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-white/40">
                    {exams.length === 0
                      ? "No assessments found in the system"
                      : "No assessments match your filters"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        {!loading && filteredExams.length > 0 && (
          <div className="text-sm text-white/40 text-center">
            Showing {filteredExams.length} of {exams.length} assessments
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <h3 className="text-blue-400 font-medium mb-2">Assessment Types</h3>
          <p className="text-white/60 text-sm">
            <strong>FA1-FA8:</strong> Formative Assessments (15% weight) •
            <strong> SA1-SA4:</strong> Summative Assessments (20% weight) •
            <strong> FINAL:</strong> Final Exam (10% weight).
            Semester = (F×0.15 + S×0.20 + Final×0.10) ÷ 0.45
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}
