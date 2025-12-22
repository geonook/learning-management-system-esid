/**
 * Attendance & Behavior API
 *
 * Functions for managing attendance records and behavior tracking.
 */

import { createClient } from "@/lib/supabase/client";

// ============================================================================
// Types
// ============================================================================

export type AttendanceStatus = "P" | "L" | "A" | "S";

export interface AttendanceRecord {
  id: string;
  student_id: string;
  course_id: string;
  recorded_by: string;
  date: string;
  period: number;
  status: AttendanceStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceWithStudent extends AttendanceRecord {
  student: {
    id: string;
    full_name: string;
    student_id: string | null;
  };
}

export interface BehaviorTag {
  id: string;
  name: string;
  name_zh: string | null;
  type: "positive" | "negative";
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface StudentBehavior {
  id: string;
  student_id: string;
  course_id: string;
  tag_id: string;
  recorded_by: string;
  date: string;
  period: number | null;
  note: string | null;
  created_at: string;
  tag?: BehaviorTag;
}

export interface AttendanceInput {
  student_id: string;
  course_id: string;
  date: string;
  period?: number;
  status: AttendanceStatus;
  note?: string;
}

export interface AttendanceSummary {
  present: number;
  late: number;
  absent: number;
  sick: number;
  total: number;
  presentRate: number;
}

// ============================================================================
// Attendance Queries
// ============================================================================

/**
 * Get attendance records for a course on a specific date
 */
export async function getAttendanceByDate(
  courseId: string,
  date: string,
  period: number = 0
): Promise<AttendanceWithStudent[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("attendance")
    .select(
      `
      *,
      student:students!inner(
        id,
        full_name,
        student_id
      )
    `
    )
    .eq("course_id", courseId)
    .eq("date", date)
    .eq("period", period)
    .order("student(full_name)");

  if (error) {
    console.error("Error fetching attendance:", error);
    return [];
  }

  return (data || []) as AttendanceWithStudent[];
}

/**
 * Get attendance records for a student in a course
 */
export async function getStudentAttendance(
  studentId: string,
  courseId: string,
  startDate?: string,
  endDate?: string
): Promise<AttendanceRecord[]> {
  const supabase = createClient();

  let query = supabase
    .from("attendance")
    .select("*")
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .order("date", { ascending: false });

  if (startDate) {
    query = query.gte("date", startDate);
  }
  if (endDate) {
    query = query.lte("date", endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching student attendance:", error);
    return [];
  }

  return data || [];
}

/**
 * Get attendance summary for a course on a specific date
 */
export async function getAttendanceSummary(
  courseId: string,
  date: string,
  period: number = 0
): Promise<AttendanceSummary> {
  const records = await getAttendanceByDate(courseId, date, period);

  const summary: AttendanceSummary = {
    present: 0,
    late: 0,
    absent: 0,
    sick: 0,
    total: records.length,
    presentRate: 0,
  };

  for (const record of records) {
    switch (record.status) {
      case "P":
        summary.present++;
        break;
      case "L":
        summary.late++;
        break;
      case "A":
        summary.absent++;
        break;
      case "S":
        summary.sick++;
        break;
    }
  }

  summary.presentRate =
    summary.total > 0
      ? Math.round(((summary.present + summary.late) / summary.total) * 100)
      : 0;

  return summary;
}

// ============================================================================
// Attendance Mutations
// ============================================================================

/**
 * Save attendance record (upsert)
 */
export async function saveAttendance(
  input: AttendanceInput,
  recordedBy: string
): Promise<AttendanceRecord | null> {
  const supabase = createClient();

  const record = {
    student_id: input.student_id,
    course_id: input.course_id,
    date: input.date,
    period: input.period ?? 0,
    status: input.status,
    note: input.note || null,
    recorded_by: recordedBy,
  };

  const { data, error } = await supabase
    .from("attendance")
    .upsert(record, {
      onConflict: "student_id,course_id,date,period",
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving attendance:", error);
    return null;
  }

  return data;
}

/**
 * Save multiple attendance records (batch upsert)
 */
export async function saveAttendanceBatch(
  inputs: AttendanceInput[],
  recordedBy: string
): Promise<{ success: number; failed: number }> {
  const supabase = createClient();

  const records = inputs.map((input) => ({
    student_id: input.student_id,
    course_id: input.course_id,
    date: input.date,
    period: input.period ?? 0,
    status: input.status,
    note: input.note || null,
    recorded_by: recordedBy,
  }));

  const { data, error } = await supabase
    .from("attendance")
    .upsert(records, {
      onConflict: "student_id,course_id,date,period",
    })
    .select();

  if (error) {
    console.error("Error saving attendance batch:", error);
    return { success: 0, failed: records.length };
  }

  return { success: data?.length || 0, failed: records.length - (data?.length || 0) };
}

/**
 * Delete attendance record
 */
export async function deleteAttendance(id: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase.from("attendance").delete().eq("id", id);

  if (error) {
    console.error("Error deleting attendance:", error);
    return false;
  }

  return true;
}

// ============================================================================
// Behavior Tag Queries
// ============================================================================

/**
 * Get all active behavior tags
 */
export async function getBehaviorTags(): Promise<BehaviorTag[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("behavior_tags")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    console.error("Error fetching behavior tags:", error);
    return [];
  }

  return data || [];
}

/**
 * Get behavior tags by type
 */
export async function getBehaviorTagsByType(
  type: "positive" | "negative"
): Promise<BehaviorTag[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("behavior_tags")
    .select("*")
    .eq("is_active", true)
    .eq("type", type)
    .order("sort_order");

  if (error) {
    console.error("Error fetching behavior tags:", error);
    return [];
  }

  return data || [];
}

// ============================================================================
// Student Behavior Queries
// ============================================================================

/**
 * Get behaviors for a student in a course
 */
export async function getStudentBehaviors(
  studentId: string,
  courseId: string,
  startDate?: string,
  endDate?: string
): Promise<StudentBehavior[]> {
  const supabase = createClient();

  let query = supabase
    .from("student_behaviors")
    .select(
      `
      *,
      tag:behavior_tags(*)
    `
    )
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .order("date", { ascending: false });

  if (startDate) {
    query = query.gte("date", startDate);
  }
  if (endDate) {
    query = query.lte("date", endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching student behaviors:", error);
    return [];
  }

  return (data || []) as StudentBehavior[];
}

/**
 * Get behaviors for a course on a specific date
 */
export async function getBehaviorsByDate(
  courseId: string,
  date: string
): Promise<(StudentBehavior & { student: { full_name: string } })[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("student_behaviors")
    .select(
      `
      *,
      tag:behavior_tags(*),
      student:students!inner(full_name)
    `
    )
    .eq("course_id", courseId)
    .eq("date", date)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching behaviors by date:", error);
    return [];
  }

  return (data || []) as (StudentBehavior & { student: { full_name: string } })[];
}

// ============================================================================
// Student Behavior Mutations
// ============================================================================

/**
 * Add a behavior record for a student
 */
export async function addBehavior(
  studentId: string,
  tagId: string,
  courseId: string,
  date: string,
  recordedBy: string,
  period?: number,
  note?: string
): Promise<StudentBehavior | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("student_behaviors")
    .insert({
      student_id: studentId,
      tag_id: tagId,
      course_id: courseId,
      date,
      period: period || null,
      note: note || null,
      recorded_by: recordedBy,
    })
    .select(
      `
      *,
      tag:behavior_tags(*)
    `
    )
    .single();

  if (error) {
    console.error("Error adding behavior:", error);
    return null;
  }

  return data as StudentBehavior;
}

/**
 * Delete a behavior record
 */
export async function deleteBehavior(id: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase.from("student_behaviors").delete().eq("id", id);

  if (error) {
    console.error("Error deleting behavior:", error);
    return false;
  }

  return true;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get status display info
 */
export function getStatusDisplay(status: AttendanceStatus): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (status) {
    case "P":
      return {
        label: "Present",
        color: "text-green-700 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900/30",
      };
    case "L":
      return {
        label: "Late",
        color: "text-yellow-700 dark:text-yellow-400",
        bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
      };
    case "A":
      return {
        label: "Absent",
        color: "text-red-700 dark:text-red-400",
        bgColor: "bg-red-100 dark:bg-red-900/30",
      };
    case "S":
      return {
        label: "Sick",
        color: "text-blue-700 dark:text-blue-400",
        bgColor: "bg-blue-100 dark:bg-blue-900/30",
      };
  }
}

/**
 * Format date for display
 */
export function formatAttendanceDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
