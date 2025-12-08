"use client";

import { Calendar, Clock, Construction } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function SchedulePage() {
  return (
    <AuthGuard requiredRoles={["admin", "head", "teacher"]}>
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="relative mb-6">
        <Calendar className="w-16 h-16 text-text-tertiary" />
        <Construction className="w-8 h-8 text-amber-600 dark:text-amber-500 absolute -bottom-1 -right-1" />
      </div>

      <h1 className="text-2xl font-semibold text-text-primary mb-2">
        My Schedule
      </h1>

      <p className="text-text-secondary text-center max-w-md mb-6">
        The schedule feature is coming soon. You&apos;ll be able to view your class schedule,
        upcoming assessments, and important dates here.
      </p>

      <div className="flex items-center gap-2 text-sm text-text-tertiary">
        <Clock className="w-4 h-4" />
        <span>Feature in development</span>
      </div>
    </div>
    </AuthGuard>
  );
}
