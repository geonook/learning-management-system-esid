/**
 * Course Tasks API
 *
 * CRUD operations for course-level task board (Kanban).
 * Teachers can only access tasks for their own courses.
 * Admin/Office can view all tasks.
 */

import { supabase } from '@/lib/supabase/client';
import type {
  CourseTask,
  CreateCourseTaskInput,
  UpdateCourseTaskInput,
  TaskStatus,
} from '@/types/course-tasks';
import {
  assertPeriodEditableClient,
  getTermFromDate,
} from '@/hooks/usePeriodLock';

/**
 * Helper to get academic year from course
 */
async function getCourseAcademicYear(courseId: string): Promise<string | null> {
  const { data } = await supabase
    .from('courses')
    .select('classes(academic_year)')
    .eq('id', courseId)
    .single();

  // Handle nested join - can be object or array
  const classData = data?.classes;
  if (!classData) return null;
  if (Array.isArray(classData)) {
    return classData[0]?.academic_year || null;
  }
  return (classData as { academic_year: string })?.academic_year || null;
}

/**
 * Check period lock for course-based operations
 */
async function assertCourseEditable(courseId: string): Promise<void> {
  const academicYear = await getCourseAcademicYear(courseId);
  if (!academicYear) return; // If no academic year, skip check

  // Use current date to determine term
  const term = getTermFromDate(new Date());
  await assertPeriodEditableClient({ academicYear, term });
}

/**
 * Get all tasks for a specific course
 */
export async function getCourseTasks(courseId: string): Promise<CourseTask[]> {
  const { data, error } = await supabase
    .from('course_tasks')
    .select('*')
    .eq('course_id', courseId)
    .order('position', { ascending: true });

  if (error) {
    console.error('Error fetching course tasks:', error);
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }

  return data || [];
}

/**
 * Create a new task
 */
export async function createCourseTask(
  input: CreateCourseTaskInput,
  teacherId: string
): Promise<CourseTask> {
  // Period lock check
  await assertCourseEditable(input.course_id);

  // Get the max position for the status column
  const { data: existingTasks } = await supabase
    .from('course_tasks')
    .select('position')
    .eq('course_id', input.course_id)
    .eq('status', input.status || 'todo')
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = existingTasks && existingTasks.length > 0 && existingTasks[0]?.position != null
    ? existingTasks[0].position + 1
    : 0;

  const { data, error } = await supabase
    .from('course_tasks')
    .insert({
      course_id: input.course_id,
      teacher_id: teacherId,
      title: input.title,
      description: input.description || null,
      status: input.status || 'todo',
      due_date: input.due_date || null,
      position: nextPosition,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    throw new Error(`Failed to create task: ${error.message}`);
  }

  return data;
}

/**
 * Update a task
 */
export async function updateCourseTask(
  taskId: string,
  updates: UpdateCourseTaskInput
): Promise<CourseTask> {
  // Get task's course_id for period lock check
  const { data: task } = await supabase
    .from('course_tasks')
    .select('course_id')
    .eq('id', taskId)
    .single();

  if (task?.course_id) {
    await assertCourseEditable(task.course_id);
  }

  const { data, error } = await supabase
    .from('course_tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    throw new Error(`Failed to update task: ${error.message}`);
  }

  return data;
}

/**
 * Delete a task
 */
export async function deleteCourseTask(taskId: string): Promise<void> {
  // Get task's course_id for period lock check
  const { data: task } = await supabase
    .from('course_tasks')
    .select('course_id')
    .eq('id', taskId)
    .single();

  if (task?.course_id) {
    await assertCourseEditable(task.course_id);
  }

  const { error } = await supabase
    .from('course_tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting task:', error);
    throw new Error(`Failed to delete task: ${error.message}`);
  }
}

/**
 * Move a task to a different status column (drag-and-drop)
 */
export async function moveTask(
  taskId: string,
  newStatus: TaskStatus,
  newPosition: number
): Promise<CourseTask> {
  // Get task's course_id for period lock check
  const { data: task } = await supabase
    .from('course_tasks')
    .select('course_id')
    .eq('id', taskId)
    .single();

  if (task?.course_id) {
    await assertCourseEditable(task.course_id);
  }

  const { data, error } = await supabase
    .from('course_tasks')
    .update({
      status: newStatus,
      position: newPosition,
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Error moving task:', error);
    throw new Error(`Failed to move task: ${error.message}`);
  }

  return data;
}

/**
 * Reorder tasks within a column
 * Updates positions for all tasks in the specified status column
 */
export async function reorderTasks(
  courseId: string,
  status: TaskStatus,
  taskIds: string[]
): Promise<void> {
  // Period lock check
  await assertCourseEditable(courseId);

  // Update positions based on array order
  const updates = taskIds.map((id, index) => ({
    id,
    position: index,
    status,
  }));

  // Use Promise.all to update all tasks
  const promises = updates.map(({ id, position }) =>
    supabase
      .from('course_tasks')
      .update({ position })
      .eq('id', id)
  );

  const results = await Promise.all(promises);

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.error('Error reordering tasks:', errors);
    throw new Error('Failed to reorder tasks');
  }
}

/**
 * Get the course ID for a teacher in a specific class
 * Returns null if the teacher doesn't teach this class
 */
export async function getTeacherCourseId(
  classId: string,
  teacherId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('courses')
    .select('id')
    .eq('class_id', classId)
    .eq('teacher_id', teacherId)
    .single();

  if (error) {
    // Teacher might not teach this class
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching course:', error);
    return null;
  }

  return data?.id || null;
}

/**
 * Get all courses for a class (for admin/office to select which course to view)
 */
export async function getClassCourses(classId: string): Promise<Array<{
  id: string;
  course_type: string;
  teacher_id: string | null;
  teacher_name: string | null;
}>> {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      id,
      course_type,
      teacher_id,
      users:teacher_id (
        full_name
      )
    `)
    .eq('class_id', classId)
    .order('course_type');

  if (error) {
    console.error('Error fetching class courses:', error);
    throw new Error(`Failed to fetch courses: ${error.message}`);
  }

  return (data || []).map(course => {
    // Handle the users relation - could be object or array depending on Supabase version
    const usersData = course.users as { full_name: string } | { full_name: string }[] | null;
    let teacherName: string | null = null;
    if (usersData) {
      if (Array.isArray(usersData)) {
        teacherName = usersData[0]?.full_name || null;
      } else {
        teacherName = usersData.full_name || null;
      }
    }
    return {
      id: course.id,
      course_type: course.course_type,
      teacher_id: course.teacher_id,
      teacher_name: teacherName,
    };
  });
}
