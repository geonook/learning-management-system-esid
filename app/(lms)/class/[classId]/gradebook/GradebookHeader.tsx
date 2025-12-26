"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { usePeriodLock } from "@/hooks/usePeriodLock";

interface ClassInfo {
  id: string;
  name: string;
  grade: number;
  academic_year: string | null;
}

interface GradebookHeaderProps {
  classId: string;
  courseType?: string | null;
}

const COURSE_TYPE_LABELS: Record<string, string> = {
  LT: "LT English",
  IT: "IT English",
  KCFS: "KCFS",
};

export function GradebookHeader({ classId, courseType }: GradebookHeaderProps) {
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);

  useEffect(() => {
    async function fetchData() {
      // Fetch class info only - removed courses query that caused 406 error
      const { data: classData } = await supabase
        .from("classes")
        .select("id, name, grade, academic_year")
        .eq("id", classId)
        .single();
      if (classData) setClassInfo(classData);
    }
    fetchData();
  }, [classId]);

  // Period lock status
  const { lockInfo, isLoading: isLockLoading } = usePeriodLock({
    academicYear: classInfo?.academic_year || "",
  });
  const { status } = lockInfo;

  // Build title with course type
  const courseLabel = courseType ? COURSE_TYPE_LABELS[courseType] || courseType : null;
  const title = classInfo
    ? courseLabel
      ? `${classInfo.name} - ${courseLabel} Gradebook`
      : `${classInfo.name} - Gradebook`
    : "Gradebook";

  // Simplified breadcrumb path - always use Browse Data path
  // (Server Component page.tsx already handles permission validation)
  const breadcrumbs = classInfo
    ? [
        { label: "Browse Data", href: "/dashboard" },
        { label: "All Classes", href: "/browse/classes" },
        { label: classInfo.name, href: `/class/${classId}` },
        { label: courseLabel ? `${courseLabel} Gradebook` : "Gradebook" },
      ]
    : [
        { label: "Loading...", href: "/dashboard" },
        { label: "Gradebook" },
      ];

  // Back navigation
  const backHref = `/class/${classId}`;
  const backLabel = "Back to Class";

  // Build simplified subtitle (course type and teacher shown in toolbar instead)
  // Include lock status when applicable
  const lockStatusText = !isLockLoading && classInfo?.academic_year
    ? status === "locked" || status === "archived"
      ? " • 🔒 Locked"
      : status === "closing"
      ? " • ⚠️ Closing Soon"
      : ""
    : "";

  const subtitle = classInfo
    ? `Grade ${classInfo.grade}${classInfo.academic_year ? ` • ${classInfo.academic_year}` : ""}${lockStatusText}`
    : undefined;

  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
      breadcrumbs={breadcrumbs}
      backHref={backHref}
      backLabel={backLabel}
    />
  );
}
