"use client";

import { useState, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  updateCourseTask,
  deleteCourseTask,
  moveTask,
  reorderTasks,
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
  const [activeTask, setActiveTask] = useState<CourseTask | null>(null);
  const [editingTask, setEditingTask] = useState<CourseTask | null>(null);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // Find which column contains a task
  const findColumnByTaskId = (taskId: string): TaskStatus | null => {
    for (const status of ["todo", "in_progress", "done"] as TaskStatus[]) {
      if (kanban[status].some((t) => t.id === taskId)) {
        return status;
      }
    }
    return null;
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskId = active.id as string;
    const column = findColumnByTaskId(taskId);
    if (column) {
      const task = kanban[column].find((t) => t.id === taskId);
      if (task) {
        setActiveTask(task);
      }
    }
  };

  // Handle drag over (for moving between columns)
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = findColumnByTaskId(activeId);
    // Check if over a column or a task
    let overColumn: TaskStatus | null = null;

    if (["todo", "in_progress", "done"].includes(overId)) {
      overColumn = overId as TaskStatus;
    } else {
      overColumn = findColumnByTaskId(overId);
    }

    if (!activeColumn || !overColumn || activeColumn === overColumn) return;

    // Move task to new column
    setKanban((prev) => {
      const task = prev[activeColumn].find((t) => t.id === activeId);
      if (!task) return prev;

      return {
        ...prev,
        [activeColumn]: prev[activeColumn].filter((t) => t.id !== activeId),
        [overColumn]: [...prev[overColumn], { ...task, status: overColumn }],
      };
    });
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = findColumnByTaskId(activeId);
    let overColumn: TaskStatus | null = null;

    if (["todo", "in_progress", "done"].includes(overId)) {
      overColumn = overId as TaskStatus;
    } else {
      overColumn = findColumnByTaskId(overId);
    }

    if (!activeColumn || !overColumn) return;

    const oldIndex = kanban[activeColumn].findIndex((t) => t.id === activeId);
    const task = kanban[activeColumn][oldIndex];

    if (activeColumn === overColumn) {
      // Reorder within same column
      const overIndex = kanban[overColumn].findIndex((t) => t.id === overId);
      if (oldIndex !== overIndex && overIndex !== -1) {
        setKanban((prev) => {
          const items = [...prev[activeColumn]];
          const removed = items[oldIndex];
          if (!removed) return prev;
          items.splice(oldIndex, 1);
          items.splice(overIndex, 0, removed);
          return { ...prev, [activeColumn]: items };
        });

        // Save to database
        try {
          const newOrder = kanban[activeColumn]
            .filter((t) => t.id !== activeId)
            .map((t) => t.id);
          newOrder.splice(
            kanban[activeColumn].findIndex((t) => t.id === overId),
            0,
            activeId
          );
          await reorderTasks(courseId, activeColumn, newOrder);
        } catch (err) {
          console.error("Failed to reorder tasks:", err);
        }
      }
    } else {
      // Move to different column (already handled in dragOver)
      // Just save to database
      try {
        const newPosition = kanban[overColumn].length - 1;
        await moveTask(activeId, overColumn, newPosition);
      } catch (err) {
        console.error("Failed to move task:", err);
        // Rollback
        if (task) {
          setKanban((prev) => ({
            ...prev,
            [activeColumn]: [...prev[activeColumn], task],
            [overColumn]: prev[overColumn].filter((t) => t.id !== activeId),
          }));
        }
      }
    }
  };

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

  // Move task via button click
  const handleMoveTask = async (taskId: string, fromStatus: TaskStatus, toStatus: TaskStatus) => {
    if (fromStatus === toStatus) return;

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

  // Update task
  const handleUpdateTask = async (updates: {
    title?: string;
    description?: string | null;
    due_date?: string | null;
  }) => {
    if (!editingTask) return;

    const status = editingTask.status;
    const oldTask = editingTask;

    // Optimistic update
    setKanban((prev) => ({
      ...prev,
      [status]: prev[status].map((t) =>
        t.id === editingTask.id ? { ...t, ...updates } : t
      ),
    }));
    setEditingTask(null);

    try {
      await updateCourseTask(editingTask.id, updates);
    } catch (err) {
      // Rollback on error
      console.error("Failed to update task:", err);
      setKanban((prev) => ({
        ...prev,
        [status]: prev[status].map((t) =>
          t.id === oldTask.id ? oldTask : t
        ),
      }));
      setError(err instanceof Error ? err.message : "Failed to update task");
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
          <DndContext
            sensors={readOnly ? [] : sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-3 gap-4">
              {COLUMNS.map((column) => (
                <DroppableColumn
                  key={column.id}
                  column={column}
                  tasks={kanban[column.id]}
                  readOnly={readOnly}
                  onMoveTask={(taskId, toStatus) =>
                    handleMoveTask(taskId, column.id, toStatus)
                  }
                  onDeleteTask={(taskId) => handleDeleteTask(taskId, column.id)}
                  onEditTask={(task) => setEditingTask(task)}
                />
              ))}
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeTask ? (
                <div className="opacity-80">
                  <TaskCardContent task={activeTask} isDragging />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onSave={handleUpdateTask}
          onClose={() => setEditingTask(null)}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}

// Droppable Column Component
interface DroppableColumnProps {
  column: { id: TaskStatus; title: string; icon: React.ReactNode; color: string };
  tasks: CourseTask[];
  readOnly: boolean;
  onMoveTask: (taskId: string, toStatus: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: CourseTask) => void;
}

function DroppableColumn({
  column,
  tasks,
  readOnly,
  onMoveTask,
  onDeleteTask,
  onEditTask,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div className="space-y-2">
      {/* Column Header */}
      <div className="flex items-center gap-2 px-2 py-1.5">
        <span className={column.color}>{column.icon}</span>
        <span className="text-sm font-medium text-text-primary">
          {column.title}
        </span>
        <span className="text-xs text-text-tertiary">
          ({tasks.length})
        </span>
      </div>

      {/* Tasks */}
      <div
        ref={setNodeRef}
        className={cn(
          "space-y-2 min-h-[100px] p-2 rounded-lg transition-colors",
          isOver && "bg-blue-50/50 dark:bg-blue-500/10"
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              readOnly={readOnly}
              onMove={(toStatus) => onMoveTask(task.id, toStatus)}
              onDelete={() => onDeleteTask(task.id)}
              onEdit={() => onEditTask(task)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

// Sortable Task Card
interface SortableTaskCardProps {
  task: CourseTask;
  readOnly: boolean;
  onMove: (toStatus: TaskStatus) => void;
  onDelete: () => void;
  onEdit: () => void;
}

function SortableTaskCard({ task, readOnly, onMove, onDelete, onEdit }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: readOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [showActions, setShowActions] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative p-3 rounded-lg border transition-all",
        "bg-surface-default border-border-subtle",
        "hover:border-border-default hover:shadow-sm",
        isDragging && "opacity-50 shadow-lg"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Drag Handle */}
      {!readOnly && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4 text-text-tertiary" />
        </div>
      )}

      <div onClick={onEdit} className="cursor-pointer">
        <TaskCardContent task={task} />
      </div>

      {/* Actions */}
      {!readOnly && showActions && (
        <div className="absolute right-2 top-2 flex items-center gap-1">
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

// Task Card Content (shared between sortable and overlay)
function TaskCardContent({ task, isDragging }: { task: CourseTask; isDragging?: boolean }) {
  const isOverdue =
    task.due_date &&
    task.status !== "done" &&
    new Date(task.due_date) < new Date();

  return (
    <div className={cn("pl-3", isDragging && "bg-surface-elevated p-3 rounded-lg border border-border-default shadow-lg")}>
      <p className="text-sm text-text-primary leading-snug">{task.title}</p>

      {/* Show description preview if exists */}
      {task.description && (
        <p className="text-xs text-text-tertiary mt-1 line-clamp-2">{task.description}</p>
      )}

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
  );
}

// Task Edit Modal
interface TaskEditModalProps {
  task: CourseTask;
  onSave: (updates: { title?: string; description?: string | null; due_date?: string | null }) => void;
  onClose: () => void;
  readOnly: boolean;
}

function TaskEditModal({ task, onSave, onClose, readOnly }: TaskEditModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [dueDate, setDueDate] = useState(task.due_date || "");

  const handleSave = () => {
    onSave({
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-elevated rounded-xl border border-border-default shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
          <h3 className="text-base font-semibold text-text-primary">
            {readOnly ? "View Task" : "Edit Task"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={readOnly}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border-default bg-surface-default text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Task title..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={readOnly}
              rows={4}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border-default bg-surface-default text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Add a description..."
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Due Date
            </label>
            {readOnly ? (
              <p className="text-sm text-text-primary">
                {dueDate
                  ? new Date(dueDate + "T00:00:00").toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "No due date"}
              </p>
            ) : (
              <EnglishDatePicker
                value={dueDate}
                onChange={setDueDate}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-border-default">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors"
          >
            {readOnly ? "Close" : "Cancel"}
          </button>
          {!readOnly && (
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
