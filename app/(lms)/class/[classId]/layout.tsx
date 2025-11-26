import { ClassContextTabs } from "@/components/os/ClassContextTabs";
import { getClass } from "@/lib/api/classes";

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
  const classData = await getClass(params.classId);

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
