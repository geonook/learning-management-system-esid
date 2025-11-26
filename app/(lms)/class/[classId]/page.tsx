export default function ClassOverviewPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Memos Widget */}
      <div className="bg-white/50 dark:bg-black/20 backdrop-blur-md rounded-xl p-6 border border-white/10 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">
          Class Memos
        </h2>
        <div className="flex items-center justify-center h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-slate-400">
          No memos yet
        </div>
      </div>

      {/* Recent Activity Widget */}
      <div className="bg-white/50 dark:bg-black/20 backdrop-blur-md rounded-xl p-6 border border-white/10 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">
          Recent Activity
        </h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Gradebook updated for Math Quiz</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Attendance marked for today</span>
          </div>
        </div>
      </div>
    </div>
  );
}
