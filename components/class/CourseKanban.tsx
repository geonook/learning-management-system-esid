"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Calendar,
  Trash2,
  GripVertical,
  CheckCircle2,
  Circle,
  Clock,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CourseTask, TaskStatus, KanbanState } from "@/types/course-tasks";
import { tasksToKanbanState } from "@/types/course-tasks";
import {
  getCourseTasks,
  createCourseTask,
  deleteCourseTask,
  moveTask,
} from "@/lib/api/course-tasks";

// English Date Picker Component
function EnglishDatePicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Format date for display in English
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleClick = () => {
    inputRef.current?.showPicker();
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border-default bg-surface-elevated text-text-primary hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
      >
        <Calendar className="w-4 h-4 text-text-secondary" />
        <span className={value ? "text-text-primary" : "text-text-tertiary"}>
          {value ? formatDisplayDate(value) : "Due date"}
        </span>
      </button>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
        tabIndex={-1}
      />
    </div>
  );
}

interface CourseKanbanProps {
  courseId: string;
  className: string;
  teacherId: string;
  readOnly?: boolean;
}

const COLUMNS: { id: TaskStatus; title: string; icon: React.ReactNode; color: string }[] = [
  {
    id: "todo",
    title: "To Do",
    icon: <Circle className="w-4 h-4" />,
    color: "text-slate-500 dark:text-slate-400",
  },
  {
    id: "in_progress",
    title: "In Progress",
    icon: <Clock className="w-4 h-4" />,
    color: "text-blue-500 dark:text-blue-400",
  },
  {
    id: "done",
    title: "Done",
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-emerald-500 dark:text-emerald-400",
  },
];

export function CourseKanban({
  courseId,
  className,
  teacherId,
  readOnly = false,
}: CourseKanbanProps) {
  const [kanban, setKanban] = useState<KanbanState>({
    todo: [],
    in_progress: [],
    done: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  // Fetch tasks on mount
  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true);
        const tasks = await getCourseTasks(courseId);
        setKanban(tasksToKanbanState(tasks));
      } catch (err) {
        console.error("Failed to fetch tasks:", err);
        setError(err instanceof Error ? err.message : "Failed to load tasks");
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, [courseId]);

  // Add new task
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const task = await createCourseTask(
        {
          course_id: courseId,
          title: newTaskTitle.trim(),
          due_date: newTaskDueDate || undefined,
          status: "todo",
        },
        teacherId
      );

      setKanban((prev) => ({
        ...prev,
        todo: [...prev.todo, task],
      }));
      setNewTaskTitle("");
      setNewTaskDueDate("");
      setIsAddingTask(false);
    } catch (err) {
      console.error("Failed to add task:", err);
      setError(err instanceof Error ? err.message : "Failed to add task");
    }
  };

  // Move task to different column
  const handleMoveTask = async (taskId: string, fromStatus: TaskStatus, toStatus: TaskStatus) => {
    if (fromStatus === toStatus) return;

    // Find the task
    const task = kanban[fromStatus].find((t) => t.id === taskId);
    if (!task) return;

    // Optimistic update
    setKanban((prev) => ({
      ...prev,
      [fromStatus]: prev[fromStatus].filter((t) => t.id !== taskId),
      [toStatus]: [...prev[toStatus], { ...task, status: toStatus }],
    }));

    try {
      await moveTask(taskId, toStatus, kanban[toStatus].length);
    } catch (err) {
      // Rollback on error
      console.error("Failed to move task:", err);
      setKanban((prev) => ({
        ...prev,
        [fromStatus]: [...prev[fromStatus], task],
        [toStatus]: prev[toStatus].filter((t) => t.id !== taskId),
      }));
      setError(err instanceof Error ? err.message : "Failed to move task");
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string, status: TaskStatus) => {
    const task = kanban[status].find((t) => t.id === taskId);
    if (!task) return;

    // Optimistic update
    setKanban((prev) => ({
      ...prev,
      [status]: prev[status].filter((t) => t.id !== taskId),
    }));

    try {
      await deleteCourseTask(taskId);
    } catch (err) {
      // Rollback on error
      console.error("Failed to delete task:", err);
      setKanban((prev) => ({
        ...prev,
        [status]: [...prev[status], task],
      }));
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  };

  if (loading) {
    return (
      <div className="bg-surface-elevated rounded-xl p-6 border border-border-default">
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-surface-hover rounded mb-4" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-surface-hover rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface-elevated rounded-xl p-6 border border-red-500/30">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  const totalTasks = kanban.todo.length + kanban.in_progress.length + kanban.done.length;

  return (
    <div className="bg-surface-elevated rounded-xl border border-border-default overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-primary">
          {className}&apos;s Tasks
        </h2>
        {!readOnly && (
          <button
            onClick={() => setIsAddingTask(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        )}
      </div>

      {/* Add Task Form */}
      {isAddingTask && (
        <div className="px-4 py-3 border-b border-border-default bg-surface-secondary">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Task title..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-border-default bg-surface-elevated text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <EnglishDatePicker
              value={newTaskDueDate}
              onChange={setNewTaskDueDate}
            />
            <button
              onClick={handleAddTask}
              disabled={!newTaskTitle.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => {
                setIsAddingTask(false);
                setNewTaskTitle("");
                setNewTaskDueDate("");
              }}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="p-4">
        {totalTasks === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
            <Circle className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm">No tasks yet</p>
            {!readOnly && (
              <button
                onClick={() => setIsAddingTask(true)}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Create your first task
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {COLUMNS.map((column) => (
              <div key={column.id} className="space-y-2">
                {/* Column Header */}
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <span className={column.color}>{column.icon}</span>
                  <span className="text-sm font-medium text-text-primary">
                    {column.title}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    ({kanban[column.id].length})
                  </span>
                </div>

                {/* Tasks */}
                <div className="space-y-2 min-h-[100px]">
                  {kanban[column.id].map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      readOnly={readOnly}
                      onMove={(toStatus) => handleMoveTask(task.id, column.id, toStatus)}
                      onDelete={() => handleDeleteTask(task.id, column.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: CourseTask;
  readOnly: boolean;
  onMove: (toStatus: TaskStatus) => void;
  onDelete: () => void;
}

function TaskCard({ task, readOnly, onMove, onDelete }: TaskCardProps) {
  const [showActions, setShowActions] = useState(false);

  const isOverdue =
    task.due_date &&
    task.status !== "done" &&
    new Date(task.due_date) < new Date();

  return (
    <div
      className={cn(
        "group relative p-3 rounded-lg border transition-all",
        "bg-surface-default border-border-subtle",
        "hover:border-border-default hover:shadow-sm"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Drag Handle (placeholder for future drag-and-drop) */}
      <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 cursor-grab">
        <GripVertical className="w-4 h-4 text-text-tertiary" />
      </div>

      {/* Content */}
      <div className="pl-3">
        <p className="text-sm text-text-primary leading-snug">{task.title}</p>

        {/* Due Date */}
        {task.due_date && (
          <div
            className={cn(
              "flex items-center gap-1 mt-2 text-xs",
              isOverdue
                ? "text-red-500 dark:text-red-400"
                : task.status === "done"
                  ? "text-text-tertiary line-through"
                  : "text-text-secondary"
            )}
          >
            <Calendar className="w-3 h-3" />
            {new Date(task.due_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
            {isOverdue && <span className="font-medium ml-1">Overdue</span>}
          </div>
        )}
      </div>

      {/* Actions */}
      {!readOnly && showActions && (
        <div className="absolute right-2 top-2 flex items-center gap-1">
          {/* Move buttons */}
          {task.status !== "todo" && (
            <button
              onClick={() => onMove("todo")}
              className="p-1 rounded hover:bg-surface-hover"
              title="Move to To Do"
            >
              <Circle className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}
          {task.status !== "in_progress" && (
            <button
              onClick={() => onMove("in_progress")}
              className="p-1 rounded hover:bg-surface-hover"
              title="Move to In Progress"
            >
              <Clock className="w-3.5 h-3.5 text-blue-500" />
            </button>
          )}
          {task.status !== "done" && (
            <button
              onClick={() => onMove("done")}
              className="p-1 rounded hover:bg-surface-hover"
              title="Mark as Done"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </button>
          )}
          {/* Delete */}
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      )}
    </div>
  );
}
