"use client";

import { TeacherOSLayout } from "@/components/os/TeacherOSLayout";

export default function LMSLayout({ children }: { children: React.ReactNode }) {
  return <TeacherOSLayout>{children}</TeacherOSLayout>;
  // return (
  //   <div className="h-screen w-screen bg-white text-black p-10 overflow-auto">
  //     <h1 className="text-2xl font-bold mb-4">DEBUG_VERSION_2: NO OS LAYOUT</h1>
  //     {children}
  //   </div>
  // );
}
