/**
 * Teacher Timetable API
 *
 * Functions for querying and managing teacher schedules.
 */

import { createClient } from "@/lib/supabase/client";

// ============================================================================
// Types
// ============================================================================

export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday";

export type CourseType = "english" | "homeroom" | "ev" | "kcfs";

export interface TimetablePeriod {
  period_number: number;
  start_time: string;
  end_time: string;
}

export interface TimetableEntry {
  id: string;
  teacher_id: string | null;
  teacher_name: string;
  day: DayOfWeek;
  period: number;
  class_name: string;
  course_type: CourseType;
  course_name: string | null;
  classroom: string | null;
  course_id: string | null;
  class_id: string | null;
  academic_year: string;
}

export interface TimetableEntryWithPeriod extends TimetableEntry {
  start_time: string;
  end_time: string;
}

export interface WeeklyTimetable {
  Monday: Record<number, TimetableEntryWithPeriod>;
  Tuesday: Record<number, TimetableEntryWithPeriod>;
  Wednesday: Record<number, TimetableEntryWithPeriod>;
  Thursday: Record<number, TimetableEntryWithPeriod>;
  Friday: Record<number, TimetableEntryWithPeriod>;
}

export interface TeacherScheduleStats {
  totalPeriods: number;
  uniqueClasses: number;
  englishPeriods: number;
  evPeriods: number;
  daysWithClasses: number;
}

// ============================================================================
// Period Queries
// ============================================================================

/**
 * Get all period definitions
 */
export async function getPeriods(): Promise<TimetablePeriod[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("timetable_periods")
    .select("period_number, start_time, end_time")
    .order("period_number");

  if (error) {
    console.error("Error fetching periods:", error);
    return [];
  }

  return data || [];
}

/**
 * Get period by number
 */
export async function getPeriodByNumber(
  periodNumber: number
): Promise<TimetablePeriod | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("timetable_periods")
    .select("period_number, start_time, end_time")
    .eq("period_number", periodNumber)
    .single();

  if (error) {
    console.error("Error fetching period:", error);
    return null;
  }

  return data;
}

// ============================================================================
// Teacher Schedule Queries
// ============================================================================

/**
 * Get teacher's schedule by email (unique identifier)
 */
export async function getTeacherScheduleByEmail(
  email: string,
  academicYear: string = "2025-2026"
): Promise<WeeklyTimetable> {
  const supabase = createClient();

  const periods = await getPeriods();
  const periodMap = new Map(periods.map((p) => [p.period_number, p]));

  const { data, error } = await supabase
    .from("timetable_entries")
    .select(`
      *,
      course:courses!timetable_entries_course_id_fkey(class_id)
    `)
    .eq("teacher_email", email.toLowerCase())
    .eq("academic_year", academicYear)
    .order("period");

  if (error) {
    console.error("Error fetching teacher schedule by email:", error);
  }

  const weekly: WeeklyTimetable = {
    Monday: {},
    Tuesday: {},
    Wednesday: {},
    Thursday: {},
    Friday: {},
  };

  if (data) {
    for (const entry of data) {
      const period = periodMap.get(entry.period);
      const entryWithPeriod: TimetableEntryWithPeriod = {
        ...entry,
        class_id: entry.course?.class_id || null,
        start_time: period?.start_time || "",
        end_time: period?.end_time || "",
      };
      weekly[entry.day as DayOfWeek][entry.period] = entryWithPeriod;
    }
  }

  return weekly;
}

/**
 * Get schedule statistics for a teacher by email
 */
export async function getTeacherScheduleStatsByEmail(
  email: string,
  academicYear: string = "2025-2026"
): Promise<TeacherScheduleStats> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("timetable_entries")
    .select("day, class_name, course_type")
    .eq("teacher_email", email.toLowerCase())
    .eq("academic_year", academicYear);

  if (error || !data) {
    console.error("Error fetching schedule stats:", error);
    return {
      totalPeriods: 0,
      uniqueClasses: 0,
      englishPeriods: 0,
      evPeriods: 0,
      daysWithClasses: 0,
    };
  }

  const uniqueClasses = new Set(data.map((d) => d.class_name)).size;
  const uniqueDays = new Set(data.map((d) => d.day)).size;

  return {
    totalPeriods: data.length,
    uniqueClasses,
    englishPeriods: data.filter((d) => d.course_type === "english").length,
    evPeriods: data.filter((d) => d.course_type === "ev").length,
    daysWithClasses: uniqueDays,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get current day of week
 */
export function getCurrentDayOfWeek(): DayOfWeek | null {
  const days: DayOfWeek[] = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ];
  const today = new Date().getDay();

  // Sunday = 0, Saturday = 6
  if (today === 0 || today === 6) {
    return null; // Weekend
  }

  return days[today - 1] ?? null;
}

/**
 * Format period time range
 */
export function formatPeriodTime(period: TimetablePeriod): string {
  const formatTime = (time: string) => {
    // time is in format "08:25:00" or "08:25"
    return time.substring(0, 5);
  };
  return `${formatTime(period.start_time)} - ${formatTime(period.end_time)}`;
}

/**
 * Get class display name with course type badge
 */
export function getClassDisplayInfo(entry: TimetableEntry): {
  name: string;
  badge: string;
  badgeColor: string;
} {
  let badge = "";
  let badgeColor = "";

  switch (entry.course_type) {
    case "english":
      badge = "ENG";
      badgeColor = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      break;
    case "ev":
      badge = "EV";
      badgeColor = "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      break;
    default:
      badge = "ENG";
      badgeColor = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  }

  return {
    name: entry.class_name,
    badge,
    badgeColor,
  };
}

// ============================================================================
// Current User's Schedule
// ============================================================================

/**
 * Get current user's schedule (helper for pages)
 * Uses email as the unique identifier for matching
 */
export async function getCurrentUserSchedule(
  userId: string,
  academicYear: string = "2025-2026"
): Promise<{
  weekly: WeeklyTimetable;
  stats: TeacherScheduleStats;
  periods: TimetablePeriod[];
} | null> {
  const supabase = createClient();

  // Get user's email (unique identifier)
  const { data: user } = await supabase
    .from("users")
    .select("email")
    .eq("id", userId)
    .single();

  if (!user?.email) {
    console.error("User email not found for userId:", userId);
    return {
      weekly: { Monday: {}, Tuesday: {}, Wednesday: {}, Thursday: {}, Friday: {} },
      stats: {
        totalPeriods: 0,
        uniqueClasses: 0,
        englishPeriods: 0,
        evPeriods: 0,
        daysWithClasses: 0,
      },
      periods: await getPeriods(),
    };
  }

  // Match by email (unique identifier)
  const weekly = await getTeacherScheduleByEmail(user.email, academicYear);
  const stats = await getTeacherScheduleStatsByEmail(user.email, academicYear);
  const periods = await getPeriods();

  return { weekly, stats, periods };
}
