"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, List, Grid3X3, Loader2 } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuthReady } from "@/hooks/useAuthReady";
import {
  getCurrentUserSchedule,
  getCurrentDayOfWeek,
  type WeeklyTimetable as WeeklyTimetableType,
  type TimetablePeriod,
  type TeacherScheduleStats,
  type DayOfWeek,
  type TimetableEntryWithPeriod,
} from "@/lib/api/timetable";
import { WeeklyTimetable } from "@/components/schedule/WeeklyTimetable";
import { TodaySchedule } from "@/components/schedule/TodaySchedule";
import { cn } from "@/lib/utils";

type ViewMode = "week" | "today";

export default function SchedulePage() {
  const { userId, isReady } = useAuthReady();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [isLoading, setIsLoading] = useState(true);
  const [weekly, setWeekly] = useState<WeeklyTimetableType | null>(null);
  const [periods, setPeriods] = useState<TimetablePeriod[]>([]);
  const [stats, setStats] = useState<TeacherScheduleStats | null>(null);
  const [currentDay, setCurrentDay] = useState<DayOfWeek | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<number | null>(null);

  useEffect(() => {
    if (!isReady || !userId) return;

    const fetchSchedule = async () => {
      setIsLoading(true);
      try {
        const result = await getCurrentUserSchedule(userId);
        if (result) {
          setWeekly(result.weekly);
          setPeriods(result.periods);
          setStats(result.stats);
        }
      } catch (error) {
        console.error("Error fetching schedule:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedule();

    // Set current day
    const day = getCurrentDayOfWeek();
    setCurrentDay(day);

    // Calculate current period based on time
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Period times in minutes
    const periodTimes = [
      { period: 1, start: 8 * 60 + 25, end: 9 * 60 + 5 },
      { period: 2, start: 9 * 60 + 10, end: 9 * 60 + 50 },
      { period: 3, start: 10 * 60 + 20, end: 11 * 60 },
      { period: 4, start: 11 * 60 + 5, end: 11 * 60 + 45 },
      { period: 5, start: 12 * 60 + 55, end: 13 * 60 + 35 },
      { period: 6, start: 13 * 60 + 40, end: 14 * 60 + 20 },
      { period: 7, start: 14 * 60 + 40, end: 15 * 60 + 20 },
      { period: 8, start: 15 * 60 + 25, end: 16 * 60 + 5 },
    ];

    const current = periodTimes.find(
      (p) => currentTime >= p.start && currentTime <= p.end
    );
    setCurrentPeriod(current?.period || null);
  }, [userId, isReady]);

  const handleCellClick = (entry: TimetableEntryWithPeriod) => {
    if (!entry.class_id) return;

    if (entry.course_type === "ev" || entry.course_type === "kcfs") {
      // EV/KCFS 課程：跳轉到課程頁面（無點名功能）
      window.location.href = `/class/${entry.class_id}`;
    } else {
      // English 課程：直接跳轉到點名頁面
      window.location.href = `/class/${entry.class_id}/attendance`;
    }
  };

  const todayClasses =
    weekly && currentDay ? Object.values(weekly[currentDay]) : [];

  return (
    <AuthGuard requiredRoles={["admin", "head", "teacher"]}>
      <div className="p-3 sm:p-4 lg:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              My Schedule
            </h1>
            {currentDay && (
              <p className="text-sm text-text-secondary mt-1">
                Today is {currentDay}
                {currentPeriod && ` · Period ${currentPeriod}`}
              </p>
            )}
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 bg-surface-secondary rounded-lg">
            <button
              onClick={() => setViewMode("week")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                viewMode === "week"
                  ? "bg-surface-primary text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <Grid3X3 className="w-4 h-4" />
              Week
            </button>
            <button
              onClick={() => setViewMode("today")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                viewMode === "today"
                  ? "bg-surface-primary text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <List className="w-4 h-4" />
              Today
            </button>
          </div>
        </div>

        {/* Stats summary - inline with legend */}
        {stats && stats.totalPeriods > 0 && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-text-tertiary">Weekly:</span>
              <span className="font-semibold text-text-primary">{stats.totalPeriods} periods</span>
              <span className="text-text-tertiary">·</span>
              <span className="font-semibold text-text-primary">{stats.uniqueClasses} classes</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                <span className="text-text-secondary">English</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span className="text-text-secondary">KCFS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
                <span className="text-text-secondary">EV</span>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && stats?.totalPeriods === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="w-12 h-12 text-text-tertiary mb-4" />
            <h2 className="text-lg font-medium text-text-primary mb-2">
              No Schedule Found
            </h2>
            <p className="text-sm text-text-secondary max-w-md">
              Your timetable hasn&apos;t been imported yet. Please contact your
              administrator to set up your schedule.
            </p>
          </div>
        )}

        {/* Timetable content */}
        {!isLoading && weekly && stats && stats.totalPeriods > 0 && (
          <div className="bg-surface-primary border border-border-default rounded-lg overflow-hidden">
            {viewMode === "week" ? (
              <WeeklyTimetable
                timetable={weekly}
                periods={periods}
                currentDay={currentDay}
                currentPeriod={currentPeriod}
                onCellClick={handleCellClick}
              />
            ) : (
              <div className="p-4">
                {currentDay ? (
                  <TodaySchedule
                    classes={todayClasses.sort((a, b) => a.period - b.period)}
                    day={currentDay}
                    currentPeriod={currentPeriod}
                    onClassClick={handleCellClick}
                  />
                ) : (
                  <div className="text-center py-8 text-text-secondary">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-text-tertiary" />
                    <p>It&apos;s the weekend! Enjoy your time off.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </AuthGuard>
  );
}
