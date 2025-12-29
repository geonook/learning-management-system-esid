"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthReady } from "@/hooks/useAuthReady";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Save, Loader2, Users } from "lucide-react";
import { AttendanceStatusGroup } from "./AttendanceStatusButton";
import { BehaviorTagPicker, BehaviorTagBadge } from "./BehaviorTagPicker";
import {
  getAttendanceByDate,
  saveAttendanceBatch,
  addBehavior,
  deleteBehavior,
  getBehaviorsByDate,
  type AttendanceStatus,
  type AttendanceWithStudent,
  type BehaviorTag,
  type StudentBehavior,
} from "@/lib/api/attendance";
import { createClient } from "@/lib/supabase/client";

interface Student {
  id: string;
  full_name: string;
  student_id: string | null;
}

interface AttendanceSheetProps {
  courseId: string;
  courseName: string;
  className: string;
  readOnly?: boolean;
}

interface StudentRow {
  student: Student;
  status: AttendanceStatus | null;
  behaviors: StudentBehavior[];
}

export function AttendanceSheet({
  courseId,
  courseName,
  className,
  readOnly = false,
}: AttendanceSheetProps) {
  const { userId, isReady } = useAuthReady();
  const [date, setDate] = useState(() => {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    return dateStr ?? "";
  });
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load students and attendance data
  const loadData = useCallback(async () => {
    if (!isReady || !date) return;

    setLoading(true);
    const supabase = createClient();

    // Get enrolled students from student_courses table
    const { data: enrollments } = await supabase
      .from("student_courses")
      .select(
        `
        student:students!inner(
          id,
          full_name,
          student_id
        )
      `
      )
      .eq("course_id", courseId)
      .eq("is_active", true)
      .order("student(full_name)");

    // Get existing attendance for this date
    const existingAttendance = await getAttendanceByDate(courseId, date);
    const attendanceMap = new Map<string, AttendanceStatus>();
    for (const record of existingAttendance) {
      attendanceMap.set(record.student_id, record.status);
    }

    // Get behaviors for this date
    const behaviors = await getBehaviorsByDate(courseId, date);
    const behaviorMap = new Map<string, StudentBehavior[]>();
    for (const behavior of behaviors) {
      const existing = behaviorMap.get(behavior.student_id) || [];
      existing.push(behavior);
      behaviorMap.set(behavior.student_id, existing);
    }

    // Build student rows - handle nested student object from Supabase
    interface EnrollmentWithStudent {
      student: {
        id: string;
        full_name: string;
        student_id: string | null;
      };
    }

    const rows: StudentRow[] = (enrollments || []).map((e) => {
      const enrollment = e as unknown as EnrollmentWithStudent;
      const student = enrollment.student;
      return {
        student,
        status: attendanceMap.get(student.id) || null,
        behaviors: behaviorMap.get(student.id) || [],
      };
    });

    setStudents(rows);
    setLoading(false);
    setHasChanges(false);
  }, [courseId, date, isReady]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update student status
  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setStudents((prev) =>
      prev.map((row) =>
        row.student.id === studentId ? { ...row, status } : row
      )
    );
    setHasChanges(true);
  };

  // Add behavior to student
  const handleAddBehavior = async (studentId: string, tag: BehaviorTag) => {
    if (!userId || !date) return;

    const behavior = await addBehavior(
      studentId,
      tag.id,
      courseId,
      date,
      userId
    );

    if (behavior) {
      setStudents((prev) =>
        prev.map((row) =>
          row.student.id === studentId
            ? { ...row, behaviors: [...row.behaviors, behavior] }
            : row
        )
      );
    }
  };

  // Remove behavior from student
  const handleRemoveBehavior = async (
    studentId: string,
    behaviorId: string
  ) => {
    const success = await deleteBehavior(behaviorId);

    if (success) {
      setStudents((prev) =>
        prev.map((row) =>
          row.student.id === studentId
            ? {
                ...row,
                behaviors: row.behaviors.filter((b) => b.id !== behaviorId),
              }
            : row
        )
      );
    }
  };

  // Save all attendance
  const handleSave = async () => {
    if (!userId || !date) return;

    setSaving(true);

    const inputs = students
      .filter((row) => row.status !== null)
      .map((row) => ({
        student_id: row.student.id,
        course_id: courseId,
        date: date,
        status: row.status!,
      }));

    await saveAttendanceBatch(inputs, userId);

    setSaving(false);
    setHasChanges(false);
  };

  // Mark all present
  const markAllPresent = () => {
    setStudents((prev) =>
      prev.map((row) => ({
        ...row,
        status: row.status === null ? "P" : row.status,
      }))
    );
    setHasChanges(true);
  };

  // Calculate stats
  const stats = {
    total: students.length,
    present: students.filter((s) => s.status === "P").length,
    late: students.filter((s) => s.status === "L").length,
    absent: students.filter((s) => s.status === "A").length,
    sick: students.filter((s) => s.status === "S").length,
    unmarked: students.filter((s) => s.status === null).length,
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{courseName}</CardTitle>
              <p className="text-sm text-muted-foreground">{className}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="px-2 py-1 border rounded-md text-sm bg-background"
                />
              </div>
              {!readOnly && (
                <>
                  <Button onClick={markAllPresent} variant="outline" size="sm">
                    <Users className="w-4 h-4 mr-1" />
                    All Present
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    size="sm"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-1" />
                    )}
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-2">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.present}
          </div>
          <div className="text-xs text-green-600/70 dark:text-green-400/70">
            Present
          </div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats.late}
          </div>
          <div className="text-xs text-yellow-600/70 dark:text-yellow-400/70">
            Late
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {stats.absent}
          </div>
          <div className="text-xs text-red-600/70 dark:text-red-400/70">
            Absent
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.sick}
          </div>
          <div className="text-xs text-blue-600/70 dark:text-blue-400/70">
            Sick
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
            {stats.unmarked}
          </div>
          <div className="text-xs text-gray-500">Unmarked</div>
        </div>
      </div>

      {/* Student List */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y dark:divide-gray-800">
            {students.map((row) => (
              <div
                key={row.student.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {row.student.full_name}
                  </div>
                  {row.student.student_id && (
                    <div className="text-sm text-muted-foreground">
                      #{row.student.student_id}
                    </div>
                  )}
                  {/* Behavior badges */}
                  {row.behaviors.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {row.behaviors.map((behavior) =>
                        behavior.tag ? (
                          <BehaviorTagBadge
                            key={behavior.id}
                            tag={behavior.tag}
                            onRemove={readOnly ? undefined : () =>
                              handleRemoveBehavior(row.student.id, behavior.id)
                            }
                          />
                        ) : null
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!readOnly && (
                    <BehaviorTagPicker
                      onSelect={(tag) => handleAddBehavior(row.student.id, tag)}
                    />
                  )}
                  <AttendanceStatusGroup
                    value={row.status}
                    onChange={(status) => updateStatus(row.student.id, status)}
                    size="sm"
                    disabled={readOnly}
                  />
                </div>
              </div>
            ))}
          </div>

          {students.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No students enrolled in this course
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
