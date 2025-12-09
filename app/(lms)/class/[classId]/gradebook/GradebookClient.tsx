"use client";

import React, { useState, useTransition } from "react";
import { Spreadsheet } from "@/components/gradebook/Spreadsheet";
import { CourseTypeSelector } from "@/components/gradebook/CourseTypeSelector";
import { GradeRow } from "@/lib/gradebook/FormulaEngine";
import { getGradebookData, CourseType } from "@/lib/actions/gradebook";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface GradebookClientProps {
  classId: string;
  initialData: GradeRow[];
  availableCourseTypes: CourseType[];
  initialCourseType: CourseType | null;
  initialTeacherName?: string | null;
}

export function GradebookClient({
  classId,
  initialData,
  availableCourseTypes,
  initialCourseType,
  initialTeacherName,
}: GradebookClientProps) {
  const [data, setData] = useState<GradeRow[]>(initialData);
  const [currentCourseType, setCurrentCourseType] = useState<CourseType | null>(
    initialCourseType
  );
  const [teacherName, setTeacherName] = useState<string | null>(
    initialTeacherName || null
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCourseTypeChange = (courseType: CourseType) => {
    if (courseType === currentCourseType) return;

    setError(null);
    startTransition(async () => {
      try {
        const result = await getGradebookData(classId, courseType);
        const newData = result.students.map((s) => ({
          id: s.id,
          studentName: s.full_name,
          studentId: s.student_id,
          scores: s.scores,
        }));
        setData(newData);
        setCurrentCourseType(courseType);
        setTeacherName(result.teacherInfo?.teacherName || null);
      } catch (e) {
        console.error("Failed to load gradebook data:", e);
        setError("Failed to load data. Please try again.");
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-surface-primary rounded-xl border border-border-default shadow-sm overflow-hidden">
      {/* Toolbar with Course Type Selector */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3",
          "bg-surface-elevated",
          "border-b border-border-default"
        )}
      >
        <CourseTypeSelector
          availableCourseTypes={availableCourseTypes}
          currentCourseType={currentCourseType}
          onChange={handleCourseTypeChange}
        />

        {/* Current course type and teacher indicator */}
        {currentCourseType && (
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <div className="flex items-center gap-2">
              <span>Viewing:</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded font-medium",
                  currentCourseType === "LT" &&
                    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                  currentCourseType === "IT" &&
                    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                  currentCourseType === "KCFS" &&
                    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                )}
              >
                {currentCourseType === "LT"
                  ? "LT English"
                  : currentCourseType === "IT"
                  ? "IT English"
                  : "KCFS"}
              </span>
            </div>
            {teacherName && (
              <div className="flex items-center gap-2 border-l border-border-default pl-3">
                <span className="text-text-tertiary">Teacher:</span>
                <span className="font-medium text-text-primary">{teacherName}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isPending && (
        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 z-50 flex items-center justify-center">
          <div className="flex items-center gap-2 px-4 py-2 bg-surface-elevated rounded-lg shadow-lg border border-border-default">
            <Loader2 className="w-4 h-4 animate-spin text-accent-blue" />
            <span className="text-sm text-text-primary">
              Loading {currentCourseType} grades...
            </span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error ? (
        <div className="flex-1 flex items-center justify-center text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden relative">
          <Spreadsheet
            classId={classId}
            initialData={data}
            courseType={currentCourseType}
          />
        </div>
      )}

      {/* Status Bar */}
      <div className="h-7 bg-surface-secondary border-t border-border-default flex items-center px-4 text-[11px] text-text-secondary justify-between">
        <span>
          {currentCourseType
            ? `${currentCourseType} Gradebook • ${data.length} Students`
            : "Ready"}
        </span>
        <span className="text-text-tertiary">
          {availableCourseTypes.length > 1
            ? `${availableCourseTypes.length} course types available`
            : ""}
        </span>
      </div>
    </div>
  );
}
