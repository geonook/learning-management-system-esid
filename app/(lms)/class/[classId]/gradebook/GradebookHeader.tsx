"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/auth-context";
import { PageHeader } from "@/components/layout/PageHeader";

interface ClassInfo {
  id: string;
  name: string;
  grade: number;
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
  const { user } = useAuth();
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [isMyClass, setIsMyClass] = useState<boolean | null>(null);

  useEffect(() => {
    async function fetchData() {
      // Fetch class info
      const { data: classData } = await supabase
        .from("classes")
        .select("id, name, grade")
        .eq("id", classId)
        .single();
      if (classData) setClassInfo(classData);

      // Check if this is user's class (via courses table)
      if (user?.id) {
        const { data: courseData } = await supabase
          .from("courses")
          .select("id")
          .eq("class_id", classId)
          .eq("teacher_id", user.id)
          .limit(1);
        setIsMyClass(courseData && courseData.length > 0);
      } else {
        setIsMyClass(false);
      }
    }
    fetchData();
  }, [classId, user?.id]);

  // Build title with course type
  const courseLabel = courseType ? COURSE_TYPE_LABELS[courseType] || courseType : null;
  const title = classInfo
    ? courseLabel
      ? `${classInfo.name} - ${courseLabel} Gradebook`
      : `${classInfo.name} - Gradebook`
    : "Gradebook";

  // Determine breadcrumb path based on whether this is user's class
  const breadcrumbs = classInfo
    ? isMyClass
      ? [
          { label: "My Classes", href: "/dashboard" },
          { label: classInfo.name, href: `/class/${classId}` },
          { label: courseLabel ? `${courseLabel} Gradebook` : "Gradebook" },
        ]
      : [
          { label: "Browse Data", href: "/dashboard" },
          { label: "All Classes", href: "/browse/classes" },
          { label: classInfo.name, href: `/class/${classId}` },
          { label: courseLabel ? `${courseLabel} Gradebook` : "Gradebook" },
        ]
    : [
        { label: "Loading...", href: "/dashboard" },
        { label: "Gradebook" },
      ];

  // Determine back navigation
  const backHref = isMyClass ? `/class/${classId}` : `/class/${classId}`;
  const backLabel = "Back to Class";

  // Build simplified subtitle (course type and teacher shown in toolbar instead)
  const subtitle = classInfo
    ? `Grade ${classInfo.grade} • 2025-2026`
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
