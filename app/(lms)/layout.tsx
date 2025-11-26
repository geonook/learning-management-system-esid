"use client";

import { TeacherOSLayout } from "@/components/os/TeacherOSLayout";

export default function LMSLayout({ children }: { children: React.ReactNode }) {
  // return <TeacherOSLayout>{children}</TeacherOSLayout>;
  return (
    <div className="h-screen w-screen bg-white text-black p-10">{children}</div>
  );
}
