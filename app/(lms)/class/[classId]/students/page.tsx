"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuthReady } from "@/hooks/useAuthReady";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  Search,
  Loader2,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { SimpleHeader } from "@/components/layout/SimpleHeader";

interface ClassInfo {
  id: string;
  name: string;
  grade: number;
  level: string | null;
}

interface StudentRow {
  id: string;
  student_id: string;
  full_name: string;
  grade: number;
  level: string | null;
  is_active: boolean;
}

// 動態生成學生 email：{student_id}@stu.kcislk.ntpc.edu.tw
const getStudentEmail = (studentId: string) =>
  `${studentId.toLowerCase()}@stu.kcislk.ntpc.edu.tw`;

// Extract level display (e.g., "G5E2" -> "E2")
const getLevelDisplay = (level: string | null | undefined) => {
  if (!level) return "-";
  const match = level.match(/E[1-3]/);
  return match ? match[0] : level;
};

export default function ClassStudentsPage() {
  const params = useParams();
  const classId = params?.classId as string;

  const { userId } = useAuthReady();
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!userId) return;
    let isCancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        // Fetch class info
        const { data: classData, error: classError } = await supabase
          .from("classes")
          .select("id, name, grade, level")
          .eq("id", classId)
          .single();

        if (classError) throw new Error(`Failed to fetch class: ${classError.message}`);

        // Fetch students in this class
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("id, student_id, full_name, grade, level, is_active")
          .eq("class_id", classId)
          .eq("is_active", true)
          .order("full_name");

        if (studentsError) throw new Error(`Failed to fetch students: ${studentsError.message}`);

        if (!isCancelled) {
          setClassInfo(classData);
          setStudents(studentsData || []);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch class students:", err);
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Failed to load data");
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [userId, classId]);

  // Filter students by search query (client-side for responsiveness)
  const filteredStudents = students.filter((student) => {
    if (!debouncedSearch) return true;
    const query = debouncedSearch.toLowerCase();
    return (
      student.full_name.toLowerCase().includes(query) ||
      student.student_id.toLowerCase().includes(query) ||
      getStudentEmail(student.student_id).includes(query)
    );
  });

  return (
    <AuthGuard requiredRoles={["admin", "head", "teacher", "office_member"]}>
      <div className="space-y-6">
        {/* Header */}
        <SimpleHeader
          icon={<Users className="w-6 h-6 text-purple-500 dark:text-purple-400" />}
          iconBgColor="bg-purple-500/20"
          title={loading ? "Loading..." : `${classInfo?.name || "Class"} - Student Roster`}
          subtitle={`${students.length} student${students.length !== 1 ? "s" : ""} enrolled`}
        />

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <Input
              placeholder="Search by name, student ID, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-surface-secondary border-border-default text-text-primary placeholder:text-text-tertiary"
            />
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
        {!loading && !error && filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
            <p className="text-text-secondary">
              {debouncedSearch ? `No students match "${debouncedSearch}"` : "No students enrolled"}
            </p>
          </div>
        )}

        {/* Students Table */}
        {!loading && !error && filteredStudents.length > 0 && (
          <div className="bg-surface-elevated rounded-xl border border-border-default overflow-hidden shadow-sm">
            <div className="table-responsive">
            <table className="min-w-[600px] w-full">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Student ID</th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Name</th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Level</th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Email</th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary w-16"></th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <Link
                    key={student.id}
                    href={`/student/${student.id}`}
                    className="contents group"
                  >
                    <tr className="border-b border-border-subtle hover:bg-surface-hover cursor-pointer transition-colors duration-normal ease-apple">
                      <td className="p-4 text-text-primary font-mono text-sm">{student.student_id}</td>
                      <td className="p-4 text-text-primary group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {student.full_name}
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
                      <td className="p-4">
                        <a
                          href={`mailto:${getStudentEmail(student.student_id)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {getStudentEmail(student.student_id)}
                        </a>
                      </td>
                      <td className="p-4 text-right">
                        <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors inline-block" />
                      </td>
                    </tr>
                  </Link>
                ))}
              </tbody>
            </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border-default">
              <div className="text-sm text-text-tertiary">
                {debouncedSearch
                  ? `Showing ${filteredStudents.length} of ${students.length} students`
                  : `${students.length} student${students.length !== 1 ? "s" : ""}`}
              </div>
              <div className="text-sm text-text-tertiary">
                {classInfo ? `G${classInfo.grade} • ${classInfo.name}` : ""}
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
