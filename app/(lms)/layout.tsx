"use client";

import { TeacherOSLayout } from "@/components/os/TeacherOSLayout";

export default function LMSLayout({ children }: { children: React.ReactNode }) {
  return <TeacherOSLayout>{children}</TeacherOSLayout>;
}
