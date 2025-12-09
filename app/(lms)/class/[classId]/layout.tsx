import { ClassContextTabs } from "@/components/os/ClassContextTabs";
import { createClient } from "@/lib/supabase/server";

interface ClassLayoutProps {
  children: React.ReactNode;
  params: {
    classId: string;
  };
}

export default async function ClassLayout({
  children,
  params,
}: ClassLayoutProps) {
  // Use Server Supabase client for Server Components
  const supabase = createClient();
  const { data: classData, error } = await supabase
    .from("classes")
    .select("*")
    .eq("id", params.classId)
    .single();

  if (error || !classData) {
    console.error("Error fetching class:", error);
    throw new Error("Class not found");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          {classData.name}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Grade {classData.grade} • {classData.academic_year}
        </p>
      </div>

      {/* Tabs */}
      <ClassContextTabs classId={params.classId} />

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
    </div>
  );
}
