"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/auth-context";
import { PageHeader } from "@/components/layout/PageHeader";

interface ClassInfo {
  id: string;
  name: string;
  grade: number;
}

export default function ClassOverviewPage() {
  const params = useParams();
  const { user } = useAuth();
  const classId = params?.classId as string;
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [isMyClass, setIsMyClass] = useState<boolean | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!classId) return;

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

  // Determine breadcrumb path based on whether this is user's class
  const breadcrumbs = classInfo
    ? isMyClass
      ? [
          { label: "My Classes", href: "/dashboard" },
          { label: classInfo.name },
        ]
      : [
          { label: "Browse Data", href: "/dashboard" },
          { label: "All Classes", href: "/browse/classes" },
          { label: classInfo.name },
        ]
    : [
        { label: "Loading...", href: "/dashboard" },
      ];

  // Determine back navigation
  const backHref = isMyClass ? "/dashboard" : "/browse/classes";
  const backLabel = isMyClass ? "Back to Dashboard" : "Back to Classes";

  return (
    <AuthGuard requiredRoles={["admin", "head", "teacher", "office_member"]}>
      <div className="space-y-6">
        <PageHeader
          title={classInfo?.name || "Class Overview"}
          subtitle={classInfo ? `Grade ${classInfo.grade}` : undefined}
          breadcrumbs={breadcrumbs}
          backHref={backHref}
          backLabel={backLabel}
        />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Memos Widget */}
      <div className="bg-surface-elevated backdrop-blur-md rounded-xl p-6 border border-border-default shadow-sm">
        <h2 className="text-lg font-semibold mb-4 text-text-primary">
          Class Memos
        </h2>
        <div className="flex items-center justify-center h-32 border-2 border-dashed border-border-subtle rounded-lg text-text-tertiary">
          No memos yet
        </div>
      </div>

      {/* Recent Activity Widget */}
      <div className="bg-surface-elevated backdrop-blur-md rounded-xl p-6 border border-border-default shadow-sm">
        <h2 className="text-lg font-semibold mb-4 text-text-primary">
          Recent Activity
        </h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />
            <span>Gradebook updated for Math Quiz</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400" />
            <span>Attendance marked for today</span>
          </div>
        </div>
      </div>
    </div>
      </div>
    </AuthGuard>
  );
}
