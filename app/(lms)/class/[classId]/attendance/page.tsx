import { CalendarCheck, Clock, Users } from "lucide-react";

export default function ClassAttendancePage() {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-black/20 rounded-lg border border-white/10 shadow-sm overflow-hidden">
      {/* Toolbar placeholder */}
      <div className="h-10 bg-[#f8f8f8] dark:bg-black/30 border-b border-[#e5e5e5] dark:border-white/10 flex items-center px-4">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Attendance Tracker
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-6 shadow-lg">
          <CalendarCheck className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
          Attendance Module
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md mb-8">
          Track daily attendance, view patterns, and generate reports for your class.
        </p>

        {/* Feature preview cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <CalendarCheck className="w-5 h-5 text-emerald-500 mb-2" />
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Daily Check-in</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Quick attendance marking
            </p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <Clock className="w-5 h-5 text-blue-500 mb-2" />
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Tardiness Tracking</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Monitor late arrivals
            </p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <Users className="w-5 h-5 text-purple-500 mb-2" />
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Reports</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Attendance analytics
            </p>
          </div>
        </div>

        <div className="mt-8 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium">
          Coming in Future Update
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-[#f3f3f3] dark:bg-black/40 border-t border-[#d1d1d1] dark:border-white/10 flex items-center px-4 text-[10px] text-gray-600 dark:text-gray-400 justify-between">
        <span>Module in Development</span>
        <span>v2.0</span>
      </div>
    </div>
  );
}
