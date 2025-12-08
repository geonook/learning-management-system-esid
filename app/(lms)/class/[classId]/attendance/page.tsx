import { CalendarCheck, Clock, Users } from "lucide-react";

export default function ClassAttendancePage() {
  return (
    <div className="h-full flex flex-col bg-surface-primary rounded-lg border border-border-default shadow-sm overflow-hidden">
      {/* Toolbar placeholder */}
      <div className="h-10 bg-surface-secondary border-b border-border-default flex items-center px-4">
        <span className="text-xs font-medium text-text-secondary">
          Attendance Tracker
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-6 shadow-lg">
          <CalendarCheck className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Attendance Module
        </h2>
        <p className="text-sm text-text-secondary text-center max-w-md mb-8">
          Track daily attendance, view patterns, and generate reports for your class.
        </p>

        {/* Feature preview cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
          <div className="p-4 rounded-lg bg-surface-secondary border border-border-default">
            <CalendarCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-500 mb-2" />
            <h3 className="text-sm font-medium text-text-primary">Daily Check-in</h3>
            <p className="text-xs text-text-secondary mt-1">
              Quick attendance marking
            </p>
          </div>
          <div className="p-4 rounded-lg bg-surface-secondary border border-border-default">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-500 mb-2" />
            <h3 className="text-sm font-medium text-text-primary">Tardiness Tracking</h3>
            <p className="text-xs text-text-secondary mt-1">
              Monitor late arrivals
            </p>
          </div>
          <div className="p-4 rounded-lg bg-surface-secondary border border-border-default">
            <Users className="w-5 h-5 text-purple-600 dark:text-purple-500 mb-2" />
            <h3 className="text-sm font-medium text-text-primary">Reports</h3>
            <p className="text-xs text-text-secondary mt-1">
              Attendance analytics
            </p>
          </div>
        </div>

        <div className="mt-8 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium">
          Coming in Future Update
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-surface-secondary border-t border-border-default flex items-center px-4 text-[10px] text-text-tertiary justify-between">
        <span>Module in Development</span>
        <span>v2.0</span>
      </div>
    </div>
  );
}
