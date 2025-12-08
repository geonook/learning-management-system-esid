"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/lib/supabase/auth-context";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  Search,
  ArrowLeft,
  GraduationCap,
  Mail,
  Hash,
  Loader2,
} from "lucide-react";
import Link from "next/link";

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
  email: string | null;
  is_active: boolean;
}

export default function ClassStudentsPage() {
  const params = useParams();
  const classId = params?.classId as string;

  const { user, loading: authLoading } = useAuth();
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (authLoading || !user) return;
    let isCancelled = false;

    async function fetchData() {
      if (!isCancelled) {
        setLoading(true);
        setError(null);
      }

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
          .select("id, student_id, full_name, grade, level, email, is_active")
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

    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchData();
      return;
    }

    // Debounce for search
    const timer = setTimeout(fetchData, 300);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [authLoading, user, classId]);

  // Filter students by search query (client-side for responsiveness)
  const filteredStudents = students.filter((student) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      student.full_name.toLowerCase().includes(query) ||
      student.student_id.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query)
    );
  });

  return (
    <AuthGuard requiredRoles={["admin", "head", "teacher", "office_member"]}>
      <div className="h-full flex flex-col bg-white dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href={`/class/${classId}`}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </Link>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-800 dark:text-white">
                  {loading ? "Loading..." : classInfo?.name || "Class"} - Student Roster
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {loading
                    ? "Loading students..."
                    : `${students.length} student${students.length !== 1 ? "s" : ""} enrolled`}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-64 text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-500">
              <p>{error}</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
                {searchQuery ? "No Students Found" : "No Students Enrolled"}
              </h3>
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center max-w-md">
                {searchQuery
                  ? `No students match "${searchQuery}"`
                  : "This class doesn't have any students yet."}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50 dark:bg-slate-900">
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5" />
                      Student ID
                    </div>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      Name
                    </div>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5" />
                      Level
                    </div>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      Email
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filteredStudents.map((student, index) => (
                  <tr
                    key={student.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-slate-600 dark:text-slate-400">
                        {student.student_id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-medium">
                          {student.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-800 dark:text-white">
                          {student.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {student.level ? (
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            student.level.includes("E1")
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                              : student.level.includes("E2")
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                          }`}
                        >
                          {student.level}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {student.email ? (
                        <a
                          href={`mailto:${student.email}`}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {student.email}
                        </a>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Status Bar */}
        <div className="h-7 bg-gray-50/80 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex items-center px-4 text-[11px] text-gray-500 dark:text-gray-400 justify-between">
          <span>
            {loading
              ? "Loading..."
              : searchQuery
                ? `Showing ${filteredStudents.length} of ${students.length} students`
                : `${students.length} student${students.length !== 1 ? "s" : ""}`}
          </span>
          <span>
            {classInfo ? `G${classInfo.grade} • ${classInfo.name}` : ""}
          </span>
        </div>
      </div>
    </AuthGuard>
  );
}
