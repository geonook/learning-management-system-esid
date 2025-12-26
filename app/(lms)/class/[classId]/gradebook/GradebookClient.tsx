"use client";

import React, { useState, useTransition } from "react";
import { Spreadsheet, ExtendedGradeRow } from "@/components/gradebook/Spreadsheet";
import { CourseTypeSelector } from "@/components/gradebook/CourseTypeSelector";
import { getGradebookData, CourseType } from "@/lib/actions/gradebook";
import { cn } from "@/lib/utils";
import { Loader2, User, Check, AlertCircle, Users, Lock, AlertTriangle } from "lucide-react";
import { usePeriodLock } from "@/hooks/usePeriodLock";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type SaveStatus = "saved" | "saving" | "error";

interface GradebookClientProps {
  classId: string;
  initialData: ExtendedGradeRow[];
  availableCourseTypes: CourseType[];
  initialCourseType: CourseType | null;
  initialTeacherName?: string | null;
  classGrade?: number; // For KCFS category determination
  academicYear?: string; // For period lock check
}

export function GradebookClient({
  classId,
  initialData,
  availableCourseTypes,
  initialCourseType,
  initialTeacherName,
  classGrade,
  academicYear,
}: GradebookClientProps) {
  const [data, setData] = useState<ExtendedGradeRow[]>(initialData);
  const [currentCourseType, setCurrentCourseType] = useState<CourseType | null>(
    initialCourseType
  );
  const [teacherName, setTeacherName] = useState<string | null>(
    initialTeacherName || null
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");

  // Period lock status - check all terms (1-4) and use the most restrictive
  // For now, we use usePeriodLock without specific term to get overall status
  const { lockInfo, isLoading: isLockLoading } = usePeriodLock({
    academicYear: academicYear || "",
  });
  const { isEditable, status, daysUntilLock, message } = lockInfo;

  const handleCourseTypeChange = (courseType: CourseType) => {
    if (courseType === currentCourseType) return;

    setError(null);
    startTransition(async () => {
      try {
        const result = await getGradebookData(classId, courseType);
        const newData: ExtendedGradeRow[] = result.students.map((s) => ({
          id: s.id,
          studentName: s.full_name,
          studentId: s.student_id,
          scores: s.scores,
          absentFlags: s.absentFlags || {},
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
      {/* Unified Toolbar: Course Selector + Teacher + Student Count + Save Status */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2.5",
          "bg-surface-elevated",
          "border-b border-border-default"
        )}
      >
        {/* Left: Course Type Selector */}
        <CourseTypeSelector
          availableCourseTypes={availableCourseTypes}
          currentCourseType={currentCourseType}
          onChange={handleCourseTypeChange}
        />

        {/* Center: Teacher Info */}
        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4 text-text-tertiary" />
          <span className={cn(
            teacherName ? "text-text-secondary" : "text-text-tertiary italic"
          )}>
            {teacherName || "Unassigned"}
          </span>
        </div>

        {/* Right: Student Count + Save Status */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Users className="w-4 h-4 text-text-tertiary" />
            <span>{data.length} Students</span>
          </div>

          {/* Save Status Indicator */}
          <div className="flex items-center gap-1.5">
            {saveStatus === "saving" && (
              <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-xs">Saving...</span>
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span className="text-xs">Saved</span>
              </span>
            )}
            {saveStatus === "error" && (
              <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="text-xs">Failed</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Period Lock Warning Banner */}
      {!isLockLoading && academicYear && !isEditable && (
        <Alert variant="destructive" className="mx-4 mt-2 rounded-lg">
          <Lock className="h-4 w-4" />
          <AlertTitle>Period Locked</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Period Closing Warning Banner */}
      {!isLockLoading && academicYear && isEditable && status === "closing" && daysUntilLock !== null && (
        <Alert className="mx-4 mt-2 rounded-lg border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">Deadline Approaching</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            {daysUntilLock} days until this period is locked. Please complete your grade entries.
          </AlertDescription>
        </Alert>
      )}

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
            classGrade={classGrade}
            onSaveStatusChange={setSaveStatus}
            disabled={!isEditable}
          />
        </div>
      )}
    </div>
  );
}
