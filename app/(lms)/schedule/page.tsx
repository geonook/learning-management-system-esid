"use client";

import { Calendar, Clock, Construction } from "lucide-react";

export default function SchedulePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="relative mb-6">
        <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600" />
        <Construction className="w-8 h-8 text-amber-500 absolute -bottom-1 -right-1" />
      </div>

      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
        My Schedule
      </h1>

      <p className="text-slate-500 dark:text-slate-400 text-center max-w-md mb-6">
        The schedule feature is coming soon. You&apos;ll be able to view your class schedule,
        upcoming assessments, and important dates here.
      </p>

      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
        <Clock className="w-4 h-4" />
        <span>Feature in development</span>
      </div>
    </div>
  );
}
