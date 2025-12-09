/**
 * Course Tasks (Kanban) Types
 *
 * Course-level task board for teachers to manage their class tasks.
 * Each teacher (LT/IT/KCFS) has their own independent task board per class.
 */

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface CourseTask {
  id: string;
  course_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCourseTaskInput {
  course_id: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  due_date?: string;
}

export interface UpdateCourseTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  due_date?: string | null;
  position?: number;
}

export interface TaskColumn {
  id: TaskStatus;
  title: string;
  tasks: CourseTask[];
}

export interface KanbanState {
  todo: CourseTask[];
  in_progress: CourseTask[];
  done: CourseTask[];
}

// Helper function to convert task array to kanban state
export function tasksToKanbanState(tasks: CourseTask[]): KanbanState {
  return {
    todo: tasks.filter(t => t.status === 'todo').sort((a, b) => a.position - b.position),
    in_progress: tasks.filter(t => t.status === 'in_progress').sort((a, b) => a.position - b.position),
    done: tasks.filter(t => t.status === 'done').sort((a, b) => a.position - b.position),
  };
}
