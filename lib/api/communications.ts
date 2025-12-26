/**
 * Communications API Functions
 * For parent communication tracking (LT phone calls & IT/KCFS memos)
 */

import { supabase } from "@/lib/supabase/client";
import {
  assertPeriodEditableClient,
  getTermFromDate,
} from "@/hooks/usePeriodLock";
import type {
  Communication,
  CommunicationWithDetails,
  CreateCommunicationInput,
  UpdateCommunicationInput,
  CommunicationFilters,
  PaginatedCommunications,
  LTContactStatus,
  CommunicationStats,
  Semester,
  ContactPeriod,
} from "@/types/communications";

/**
 * Get communications for a specific student
 */
export async function getStudentCommunications(
  studentId: string,
  options?: {
    courseId?: string;
    academicYear?: string;
    semester?: Semester;
  }
): Promise<CommunicationWithDetails[]> {
  let query = supabase
    .from("communications")
    .select(`
      *,
      student:students(id, full_name, student_id),
      teacher:users(id, full_name),
      course:courses(id, course_type, class_id, classes(name))
    `)
    .eq("student_id", studentId)
    .order("communication_date", { ascending: false });

  if (options?.courseId) {
    query = query.eq("course_id", options.courseId);
  }
  if (options?.academicYear) {
    query = query.eq("academic_year", options.academicYear);
  }
  if (options?.semester) {
    query = query.eq("semester", options.semester);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch student communications:", error);
    throw new Error(error.message);
  }

  return transformCommunications(data || []);
}

/**
 * Get communications for a course (all students in a class)
 */
export async function getCourseCommunications(
  courseId: string,
  academicYear: string,
  semester: Semester
): Promise<CommunicationWithDetails[]> {
  const { data, error } = await supabase
    .from("communications")
    .select(`
      *,
      student:students(id, full_name, student_id),
      teacher:users(id, full_name),
      course:courses(id, course_type, class_id, classes(name))
    `)
    .eq("course_id", courseId)
    .eq("academic_year", academicYear)
    .eq("semester", semester)
    .order("communication_date", { ascending: false });

  if (error) {
    console.error("Failed to fetch course communications:", error);
    throw new Error(error.message);
  }

  return transformCommunications(data || []);
}

/**
 * Create a new communication record
 */
export async function createCommunication(
  input: CreateCommunicationInput
): Promise<Communication> {
  // Period lock check
  const commDate = input.communication_date || new Date().toISOString();
  const term = getTermFromDate(commDate);
  await assertPeriodEditableClient({ academicYear: input.academic_year, term });

  // Get current user for teacher_id
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("communications")
    .insert({
      student_id: input.student_id,
      course_id: input.course_id,
      teacher_id: user.id,
      academic_year: input.academic_year,
      semester: input.semester,
      communication_type: input.communication_type,
      contact_period: input.contact_period || null,
      subject: input.subject || null,
      content: input.content,
      communication_date: input.communication_date || new Date().toISOString(),
      is_lt_required: input.is_lt_required || false,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create communication:", error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Update a communication record
 */
export async function updateCommunication(
  id: string,
  input: UpdateCommunicationInput
): Promise<Communication> {
  // First get the record to check period lock
  const { data: existing, error: fetchError } = await supabase
    .from("communications")
    .select("academic_year, communication_date")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    console.error("Failed to fetch communication for update:", fetchError);
    throw new Error(fetchError?.message || "Communication not found");
  }

  // Period lock check
  const term = getTermFromDate(existing.communication_date);
  await assertPeriodEditableClient({ academicYear: existing.academic_year, term });

  const { data, error } = await supabase
    .from("communications")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update communication:", error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Delete a communication record
 */
export async function deleteCommunication(id: string): Promise<void> {
  // First get the record to check period lock
  const { data: existing, error: fetchError } = await supabase
    .from("communications")
    .select("academic_year, communication_date")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    console.error("Failed to fetch communication for delete:", fetchError);
    throw new Error(fetchError?.message || "Communication not found");
  }

  // Period lock check
  const term = getTermFromDate(existing.communication_date);
  await assertPeriodEditableClient({ academicYear: existing.academic_year, term });

  const { error } = await supabase
    .from("communications")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete communication:", error);
    throw new Error(error.message);
  }
}

/**
 * Get LT contact status for a course (shows which students have completed required calls)
 */
export async function getLTContactStatus(
  courseId: string,
  academicYear: string,
  semester: Semester
): Promise<LTContactStatus[]> {
  // First, get all students in the class for this course
  const { data: courseData, error: courseError } = await supabase
    .from("courses")
    .select("class_id, classes(name)")
    .eq("id", courseId)
    .single();

  if (courseError) {
    console.error("Failed to fetch course:", courseError);
    throw new Error(courseError.message);
  }

  const classId = courseData.class_id;
  const classData = courseData.classes;
  const className = Array.isArray(classData)
    ? classData[0]?.name || "Unknown"
    : (classData as { name: string } | null)?.name || "Unknown";

  // Get all students in this class
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, full_name, student_id")
    .eq("class_id", classId)
    .order("full_name");

  if (studentsError) {
    console.error("Failed to fetch students:", studentsError);
    throw new Error(studentsError.message);
  }

  // Get all LT required communications for this course/semester
  const { data: communications, error: commsError } = await supabase
    .from("communications")
    .select("student_id, contact_period, communication_date")
    .eq("course_id", courseId)
    .eq("academic_year", academicYear)
    .eq("semester", semester)
    .eq("is_lt_required", true);

  if (commsError) {
    console.error("Failed to fetch communications:", commsError);
    throw new Error(commsError.message);
  }

  // Build contact status for each student
  const statusByStudent = new Map<string, {
    semester_start: boolean;
    midterm: boolean;
    final: boolean;
    latest_date: string | null;
  }>();

  for (const comm of communications || []) {
    const existing = statusByStudent.get(comm.student_id) || {
      semester_start: false,
      midterm: false,
      final: false,
      latest_date: null,
    };

    if (comm.contact_period === "semester_start") {
      existing.semester_start = true;
    } else if (comm.contact_period === "midterm") {
      existing.midterm = true;
    } else if (comm.contact_period === "final") {
      existing.final = true;
    }

    if (!existing.latest_date || comm.communication_date > existing.latest_date) {
      existing.latest_date = comm.communication_date;
    }

    statusByStudent.set(comm.student_id, existing);
  }

  // Build final status array
  return (students || []).map(student => {
    const status = statusByStudent.get(student.id) || {
      semester_start: false,
      midterm: false,
      final: false,
      latest_date: null,
    };

    const completedCount =
      (status.semester_start ? 1 : 0) +
      (status.midterm ? 1 : 0) +
      (status.final ? 1 : 0);

    return {
      student_id: student.id,
      student_name: student.full_name,
      student_number: student.student_id,
      class_name: className,
      academic_year: academicYear,
      semester: semester,
      semester_start: status.semester_start,
      midterm: status.midterm,
      final: status.final,
      completed_count: completedCount,
      latest_contact_date: status.latest_date,
    };
  });
}

/**
 * Get all communications with filters (for Browse Comms page)
 */
export async function getAllCommunications(
  filters?: CommunicationFilters
): Promise<PaginatedCommunications> {
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 50;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("communications")
    .select(`
      *,
      student:students(id, full_name, student_id),
      teacher:users(id, full_name),
      course:courses(id, course_type, class_id, classes(name, grade))
    `, { count: "exact" });

  // Apply filters
  if (filters?.academic_year) {
    query = query.eq("academic_year", filters.academic_year);
  }
  if (filters?.semester) {
    query = query.eq("semester", filters.semester);
  }
  if (filters?.teacher_id) {
    query = query.eq("teacher_id", filters.teacher_id);
  }
  if (filters?.student_id) {
    query = query.eq("student_id", filters.student_id);
  }
  if (filters?.course_id) {
    query = query.eq("course_id", filters.course_id);
  }
  if (filters?.contact_period) {
    query = query.eq("contact_period", filters.contact_period);
  }
  if (filters?.start_date) {
    query = query.gte("communication_date", filters.start_date);
  }
  if (filters?.end_date) {
    query = query.lte("communication_date", filters.end_date);
  }

  // Order and paginate
  query = query
    .order("communication_date", { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to fetch all communications:", error);
    throw new Error(error.message);
  }

  // Filter by grade and course_type after fetch (not directly supported in query)
  let filteredData = data || [];
  if (filters?.grade) {
    filteredData = filteredData.filter((c) => {
      const course = c.course as { classes?: { grade?: number } };
      return course?.classes?.grade === filters.grade;
    });
  }
  if (filters?.course_type) {
    filteredData = filteredData.filter((c) => {
      const course = c.course as { course_type?: string };
      return course?.course_type === filters.course_type;
    });
  }

  const total = count || 0;

  return {
    communications: transformCommunications(filteredData),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get communication statistics
 */
export async function getCommunicationStats(
  academicYear?: string,
  semester?: Semester
): Promise<CommunicationStats> {
  let query = supabase
    .from("communications")
    .select("*");

  if (academicYear) {
    query = query.eq("academic_year", academicYear);
  }
  if (semester) {
    query = query.eq("semester", semester);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch communication stats:", error);
    throw new Error(error.message);
  }

  const communications = data || [];

  // Calculate stats
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const thisWeek = communications.filter(
    (c) => new Date(c.communication_date) >= weekAgo
  ).length;

  const byType: Record<string, number> = {
    phone_call: 0,
    email: 0,
    in_person: 0,
    message: 0,
    other: 0,
  };
  for (const c of communications) {
    byType[c.communication_type] = (byType[c.communication_type] || 0) + 1;
  }

  // Calculate LT completion rate
  const ltCommunications = communications.filter((c) => c.is_lt_required);
  const ltCompletionRate = ltCommunications.length > 0 ? null : null; // Would need more complex calculation

  return {
    total: communications.length,
    this_week: thisWeek,
    by_type: byType as Record<"phone_call" | "email" | "in_person" | "message" | "other", number>,
    lt_completion_rate: ltCompletionRate,
    pending_lt_calls: 0, // Would need more complex calculation
  };
}

// Helper function to transform raw data to typed format
function transformCommunications(data: unknown[]): CommunicationWithDetails[] {
  return data.map((item) => {
    const raw = item as Record<string, unknown>;
    const student = raw.student as { id: string; full_name: string; student_id: string } | null;
    const teacher = raw.teacher as { id: string; full_name: string } | null;
    const course = raw.course as {
      id: string;
      course_type: 'LT' | 'IT' | 'KCFS';
      class_id: string;
      classes?: { name: string } | { name: string }[];
    } | null;

    // Handle nested classes
    const classData = course?.classes;
    const className = Array.isArray(classData)
      ? classData[0]?.name || "Unknown"
      : classData?.name || "Unknown";

    return {
      id: raw.id as string,
      student_id: raw.student_id as string,
      course_id: raw.course_id as string,
      teacher_id: raw.teacher_id as string,
      academic_year: raw.academic_year as string,
      semester: raw.semester as Semester,
      communication_type: raw.communication_type as CommunicationWithDetails["communication_type"],
      contact_period: raw.contact_period as ContactPeriod | null,
      subject: raw.subject as string | null,
      content: raw.content as string,
      communication_date: raw.communication_date as string,
      is_lt_required: raw.is_lt_required as boolean,
      created_at: raw.created_at as string,
      updated_at: raw.updated_at as string,
      student: student || { id: "", full_name: "Unknown", student_id: "" },
      teacher: teacher || { id: "", full_name: "Unknown" },
      course: {
        id: course?.id || "",
        course_type: course?.course_type || "LT",
        class_id: course?.class_id || "",
        class_name: className,
      },
    };
  });
}
