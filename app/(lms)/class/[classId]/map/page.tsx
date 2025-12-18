"use client";

/**
 * Class MAP Scores Page
 * View MAP assessment scores for all students in a class
 * Available for G3-G6 classes only
 */

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/auth-guard";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/auth-context";
import {
  Target,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  PenTool,
  Users,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import {
  formatTermLabel,
  getRitScoreColor,
  getGrowthColor,
  formatGrowth,
} from "@/lib/api/map-assessments";

interface ClassInfo {
  id: string;
  name: string;
  grade: number;
}

interface StudentWithMap {
  id: string;
  student_id: string;
  full_name: string;
  reading_rit: number | null;
  reading_lexile: string | null;
  reading_term: string | null;
  language_usage_rit: number | null;
  language_usage_term: string | null;
}

interface ClassMapStats {
  studentCount: number;
  readingAvg: number | null;
  readingMin: number | null;
  readingMax: number | null;
  languageUsageAvg: number | null;
  languageUsageMin: number | null;
  languageUsageMax: number | null;
  latestTerm: string | null;
}

export default function ClassMapPage() {
  const params = useParams();
  const { user, userPermissions } = useAuth();
  const classId = params?.classId as string;

  const [loading, setLoading] = useState(true);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<StudentWithMap[]>([]);
  const [isValidGrade, setIsValidGrade] = useState(true);
  const [isMyClass, setIsMyClass] = useState<boolean | null>(null);

  const isAdminOrOffice =
    userPermissions?.role === "admin" || userPermissions?.role === "office_member";

  useEffect(() => {
    async function fetchData() {
      if (!classId || !user?.id) return;
      setLoading(true);

      try {
        // Fetch class info
        const { data: classData } = await supabase
          .from("classes")
          .select("id, name, grade")
          .eq("id", classId)
          .single();

        if (!classData) {
          setLoading(false);
          return;
        }

        setClassInfo(classData);

        // Check if this is a valid MAP grade (G3-G6)
        if (classData.grade < 3 || classData.grade > 6) {
          setIsValidGrade(false);
          setLoading(false);
          return;
        }

        // Check if user teaches this class
        const { data: courseData } = await supabase
          .from("courses")
          .select("id")
          .eq("class_id", classId)
          .eq("teacher_id", user.id)
          .maybeSingle();

        setIsMyClass(!!courseData || isAdminOrOffice);

        // Fetch students in this class with their MAP scores
        const { data: studentsData } = await supabase
          .from("students")
          .select("id, student_id, full_name")
          .eq("class_id", classId)
          .eq("is_active", true)
          .order("full_name");

        if (!studentsData || studentsData.length === 0) {
          setStudents([]);
          setLoading(false);
          return;
        }

        // Get student IDs for MAP lookup
        const studentNumbers = studentsData.map((s) => s.student_id);

        // Fetch MAP assessments for these students
        const { data: mapData } = await supabase
          .from("map_assessments")
          .select("*")
          .in("student_number", studentNumbers)
          .order("term_tested", { ascending: false });

        // Build student map data (latest assessment per course)
        const studentMap = new Map<
          string,
          {
            reading_rit: number | null;
            reading_lexile: string | null;
            reading_term: string | null;
            language_usage_rit: number | null;
            language_usage_term: string | null;
          }
        >();

        for (const assessment of mapData || []) {
          const existing = studentMap.get(assessment.student_number) || {
            reading_rit: null,
            reading_lexile: null,
            reading_term: null,
            language_usage_rit: null,
            language_usage_term: null,
          };

          // Only update if we don't have a score for this course yet (first = latest)
          if (assessment.course === "Reading" && existing.reading_rit === null) {
            existing.reading_rit = assessment.rit_score;
            existing.reading_lexile = assessment.lexile_score;
            existing.reading_term = assessment.term_tested;
          } else if (
            assessment.course === "Language Usage" &&
            existing.language_usage_rit === null
          ) {
            existing.language_usage_rit = assessment.rit_score;
            existing.language_usage_term = assessment.term_tested;
          }

          studentMap.set(assessment.student_number, existing);
        }

        // Combine student data with MAP scores
        const studentsWithMap: StudentWithMap[] = studentsData.map((student) => {
          const mapScores = studentMap.get(student.student_id);
          return {
            id: student.id,
            student_id: student.student_id,
            full_name: student.full_name,
            reading_rit: mapScores?.reading_rit ?? null,
            reading_lexile: mapScores?.reading_lexile ?? null,
            reading_term: mapScores?.reading_term ?? null,
            language_usage_rit: mapScores?.language_usage_rit ?? null,
            language_usage_term: mapScores?.language_usage_term ?? null,
          };
        });

        setStudents(studentsWithMap);
      } catch (error) {
        console.error("Failed to fetch class MAP data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [classId, user?.id, isAdminOrOffice]);

  // Calculate class statistics
  const stats: ClassMapStats | null = useMemo(() => {
    if (students.length === 0) return null;

    const readingScores = students
      .filter((s) => s.reading_rit !== null)
      .map((s) => s.reading_rit as number);
    const languageUsageScores = students
      .filter((s) => s.language_usage_rit !== null)
      .map((s) => s.language_usage_rit as number);

    const terms = students
      .flatMap((s) => [s.reading_term, s.language_usage_term])
      .filter((t): t is string => t !== null);
    const latestTerm: string | null = terms.length > 0 ? (terms[0] ?? null) : null;

    return {
      studentCount: students.length,
      readingAvg:
        readingScores.length > 0
          ? Math.round((readingScores.reduce((a, b) => a + b, 0) / readingScores.length) * 10) / 10
          : null,
      readingMin: readingScores.length > 0 ? Math.min(...readingScores) : null,
      readingMax: readingScores.length > 0 ? Math.max(...readingScores) : null,
      languageUsageAvg:
        languageUsageScores.length > 0
          ? Math.round(
              (languageUsageScores.reduce((a, b) => a + b, 0) / languageUsageScores.length) * 10
            ) / 10
          : null,
      languageUsageMin: languageUsageScores.length > 0 ? Math.min(...languageUsageScores) : null,
      languageUsageMax: languageUsageScores.length > 0 ? Math.max(...languageUsageScores) : null,
      latestTerm,
    };
  }, [students]);

  // Breadcrumbs
  const breadcrumbs = classInfo
    ? isMyClass
      ? [
          { label: "My Classes", href: "/dashboard" },
          { label: classInfo.name, href: `/class/${classId}` },
          { label: "MAP Scores" },
        ]
      : [
          { label: "Browse Data", href: "/dashboard" },
          { label: "All Classes", href: "/browse/classes" },
          { label: classInfo.name, href: `/class/${classId}` },
          { label: "MAP Scores" },
        ]
    : [{ label: "Loading..." }];

  return (
    <AuthGuard requiredRoles={["admin", "head", "teacher", "office_member"]}>
      <div className="space-y-6">
        <PageHeader
          title={classInfo ? `${classInfo.name} - MAP Scores` : "MAP Scores"}
          subtitle={classInfo ? `Grade ${classInfo.grade} • NWEA MAP Growth Assessment` : undefined}
          breadcrumbs={breadcrumbs}
          backHref={`/class/${classId}`}
          backLabel="Back to Class"
        />

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
          </div>
        )}

        {/* Invalid Grade Notice */}
        {!loading && !isValidGrade && (
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-400 mb-2">
              MAP Assessments Not Available
            </h3>
            <p className="text-amber-600 dark:text-amber-400/80">
              NWEA MAP Growth assessments are only conducted for G3-G6 students.
              {classInfo && ` This is a Grade ${classInfo.grade} class.`}
            </p>
          </div>
        )}

        {/* Class Statistics */}
        {!loading && isValidGrade && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-elevated rounded-xl border border-border-default p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-text-tertiary" />
                <span className="text-xs text-text-tertiary">Students</span>
              </div>
              <p className="text-2xl font-bold text-text-primary">{stats.studentCount}</p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-blue-600 dark:text-blue-400">Reading Avg</span>
              </div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {stats.readingAvg ?? "-"}
              </p>
              {stats.readingMin !== null && (
                <p className="text-xs text-blue-500/70 mt-1">
                  Range: {stats.readingMin} - {stats.readingMax}
                </p>
              )}
            </div>

            <div className="bg-purple-50 dark:bg-purple-500/10 rounded-xl border border-purple-200 dark:border-purple-500/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <PenTool className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-purple-600 dark:text-purple-400">Language Usage Avg</span>
              </div>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                {stats.languageUsageAvg ?? "-"}
              </p>
              {stats.languageUsageMin !== null && (
                <p className="text-xs text-purple-500/70 mt-1">
                  Range: {stats.languageUsageMin} - {stats.languageUsageMax}
                </p>
              )}
            </div>

            <div className="bg-surface-elevated rounded-xl border border-border-default p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-text-tertiary" />
                <span className="text-xs text-text-tertiary">Latest Term</span>
              </div>
              <p className="text-lg font-semibold text-text-primary">
                {stats.latestTerm ? formatTermLabel(stats.latestTerm) : "-"}
              </p>
            </div>
          </div>
        )}

        {/* Students Table */}
        {!loading && isValidGrade && (
          <div className="bg-surface-elevated rounded-xl border border-border-default shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border-default flex items-center gap-2">
              <Target className="w-5 h-5 text-green-500" />
              <span className="font-medium text-text-primary">Student MAP Scores</span>
            </div>

            {students.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                <p className="text-text-secondary">No students found in this class</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-subtle bg-surface-tertiary">
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wide">
                        Student
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-text-tertiary uppercase tracking-wide">
                        <div className="flex items-center justify-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                          Reading RIT
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wide">
                        Lexile
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-text-tertiary uppercase tracking-wide">
                        <div className="flex items-center justify-center gap-1">
                          <PenTool className="w-3.5 h-3.5 text-purple-500" />
                          Lang Usage RIT
                        </div>
                      </th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {students.map((student) => (
                      <Link
                        key={student.id}
                        href={`/student/${student.id}`}
                        className="contents group"
                      >
                        <tr className="hover:bg-surface-hover transition-colors duration-normal cursor-pointer">
                          <td className="px-4 py-3">
                            <span className="font-medium text-text-primary group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                              {student.full_name}
                            </span>
                            <p className="text-xs text-text-tertiary font-mono">{student.student_id}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {student.reading_rit !== null ? (
                              <span
                                className={`text-lg font-bold ${getRitScoreColor(
                                  student.reading_rit,
                                  classInfo?.grade || 5
                                )}`}
                              >
                                {student.reading_rit}
                              </span>
                            ) : (
                              <span className="text-text-tertiary">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary">
                            {student.reading_lexile || "-"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {student.language_usage_rit !== null ? (
                              <span
                                className={`text-lg font-bold ${getRitScoreColor(
                                  student.language_usage_rit,
                                  classInfo?.grade || 5
                                )}`}
                              >
                                {student.language_usage_rit}
                              </span>
                            ) : (
                              <span className="text-text-tertiary">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors inline-block" />
                          </td>
                        </tr>
                      </Link>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
