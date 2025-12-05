"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";

interface ClassInfo {
  id: string;
  name: string;
  grade: number;
}

export function GradebookHeader({ classId }: { classId: string }) {
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);

  useEffect(() => {
    async function fetchClassInfo() {
      const { data } = await supabase
        .from("classes")
        .select("id, name, grade")
        .eq("id", classId)
        .single();
      if (data) setClassInfo(data);
    }
    fetchClassInfo();
  }, [classId]);

  const breadcrumbs = classInfo
    ? [
        { label: "My Classes", href: "/dashboard" },
        { label: classInfo.name, href: `/class/${classId}` },
        { label: "Gradebook" },
      ]
    : [
        { label: "My Classes", href: "/dashboard" },
        { label: "Loading...", href: `/class/${classId}` },
        { label: "Gradebook" },
      ];

  return (
    <PageHeader
      title={classInfo ? `${classInfo.name} - Gradebook` : "Gradebook"}
      subtitle={classInfo ? `Grade ${classInfo.grade} • Score Entry` : undefined}
      breadcrumbs={breadcrumbs}
      backHref={`/class/${classId}`}
      backLabel="Back to Class"
    />
  );
}
