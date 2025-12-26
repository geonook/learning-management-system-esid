"use client";

import React, { useState, useTransition, useMemo } from "react";
import { Spreadsheet, ExtendedGradeRow } from "@/components/gradebook/Spreadsheet";
import { CourseTypeSelector } from "@/components/gradebook/CourseTypeSelector";
import { TermSelector } from "@/components/gradebook/TermSelector";
import { getGradebookData, CourseType } from "@/lib/actions/gradebook";
import { cn } from "@/lib/utils";
import { Loader2, User, Check, AlertCircle, Users, Lock, AlertTriangle } from "lucide-react";
import { usePeriodLock } from "@/hooks/usePeriodLock";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuthReady } from "@/hooks/useAuthReady";
import type { Term } from "@/types/academic-year";

export type SaveStatus = "saved" | "saving" | "error";

interface GradebookClientProps {
  classId: string;
  initialData: ExtendedGradeRow[];
  availableCourseTypes: CourseType[];
  initialCourseType: CourseType | null;
  initialTeacherName?: string | null;
  initialTeacherId?: string | null; // For permission check
  classGrade?: number; // For KCFS category determination
  academicYear?: string; // For period lock check
}

export function GradebookClient({
  classId,
  initialData,
  availableCourseTypes,
  initialCourseType,
  initialTeacherName,
  initialTeacherId,
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
  const [teacherId, setTeacherId] = useState<string | null>(
    initialTeacherId || null
  );
  const [currentTerm, setCurrentTerm] = useState<Term | "all">("all");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");

  // Get current user info for permission check
  const { userId, role, isReady: isAuthReady } = useAuthReady();

  // Period lock status - now checks specific term when selected
  const { lockInfo, isLoading: isLockLoading } = usePeriodLock({
    academicYear: academicYear || "",
    term: currentTerm !== "all" ? currentTerm : undefined,
  });
  const { isEditable: isPeriodEditable, status, daysUntilLock, message } = lockInfo;

  // Permission check: determine if current user can edit this course
  // - Admin: can edit all
  // - Head: can only edit their track (need to fetch user.track from auth context)
  // - Teacher: can only edit if they are the course teacher
  // - Office Member: read-only only
  const canEdit = useMemo(() => {
    if (!isAuthReady) return false;
    if (!isPeriodEditable) return false;

    // Office Member is always read-only
    if (role === "office_member") return false;

    // Admin can edit all
    if (role === "admin") return true;

    // Teacher: can only edit if they are the course teacher
    if (role === "teacher") {
      return userId === teacherId;
    }

    // Head: can edit (RLS will enforce track restriction)
    // Note: RLS policy already restricts head to their grade + track
    if (role === "head") return true;

    return false;
  }, [isAuthReady, isPeriodEditable, role, userId, teacherId]);

  const handleCourseTypeChange = (courseType: CourseType) => {
    if (courseType === currentCourseType) return;

    setError(null);
    // Reset term to "all" when switching to KCFS (KCFS has no term grouping)
    const termToUse = courseType === "KCFS" ? null : (currentTerm === "all" ? null : currentTerm);
    if (courseType === "KCFS") {
      setCurrentTerm("all");
    }

    startTransition(async () => {
      try {
        const result = await getGradebookData(classId, courseType, termToUse);
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
        setTeacherId(result.teacherInfo?.teacherId || null);
      } catch (e) {
        console.error("Failed to load gradebook data:", e);
        setError("Failed to load data. Please try again.");
      }
    });
  };

  const handleTermChange = (term: Term | "all") => {
    if (term === currentTerm) return;
    setCurrentTerm(term);
    setError(null);

    startTransition(async () => {
      try {
        const result = await getGradebookData(
          classId,
          currentCourseType,
          term === "all" ? null : term
        );
        const newData: ExtendedGradeRow[] = result.students.map((s) => ({
          id: s.id,
          studentName: s.full_name,
          studentId: s.student_id,
          scores: s.scores,
          absentFlags: s.absentFlags || {},
        }));
        setData(newData);
      } catch (e) {
        console.error("Failed to load gradebook data:", e);
        setError("Failed to load term data. Please try again.");
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-surface-primary rounded-xl border border-border-default shadow-sm overflow-hidden">
      {/* Unified Toolbar: Course Selector + Term Selector + Teacher + Student Count + Save Status */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2.5",
          "bg-surface-elevated",
          "border-b border-border-default"
        )}
      >
        {/* Left: Course Type Selector + Term Selector */}
        <div className="flex items-center gap-4">
          <CourseTypeSelector
            availableCourseTypes={availableCourseTypes}
            currentCourseType={currentCourseType}
            onChange={handleCourseTypeChange}
          />

          {/* Term Selector - only show for LT/IT (KCFS has no term grouping) */}
          {currentCourseType !== "KCFS" && (
            <TermSelector
              currentTerm={currentTerm}
              onChange={handleTermChange}
              showAllOption={true}
              academicYear={academicYear}
              compact={true}
            />
          )}
        </div>

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
      {!isLockLoading && academicYear && !isPeriodEditable && (
        <Alert variant="destructive" className="mx-4 mt-2 rounded-lg">
          <Lock className="h-4 w-4" />
          <AlertTitle>Period Locked</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Read-only Warning for Office Members */}
      {isAuthReady && role === "office_member" && isPeriodEditable && (
        <Alert className="mx-4 mt-2 rounded-lg border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <Lock className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 dark:text-blue-200">Read-Only Mode</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            You are viewing grades in read-only mode. Contact an administrator to make changes.
          </AlertDescription>
        </Alert>
      )}

      {/* Not Your Course Warning for Teachers */}
      {isAuthReady && role === "teacher" && isPeriodEditable && userId !== teacherId && teacherId && (
        <Alert className="mx-4 mt-2 rounded-lg border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">Not Your Course</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            This course is assigned to {teacherName || "another teacher"}. You can view but not edit grades.
          </AlertDescription>
        </Alert>
      )}

      {/* Period Closing Warning Banner */}
      {!isLockLoading && academicYear && isPeriodEditable && status === "closing" && daysUntilLock !== null && (
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
            disabled={!canEdit}
          />
        </div>
      )}
    </div>
  );
}
