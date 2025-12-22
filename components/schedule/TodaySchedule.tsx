"use client";

import { cn } from "@/lib/utils";
import type {
  TimetableEntryWithPeriod,
  DayOfWeek,
} from "@/lib/api/timetable";
import { Clock, MapPin, ChevronRight } from "lucide-react";
import Link from "next/link";

interface TodayScheduleProps {
  classes: TimetableEntryWithPeriod[];
  day: DayOfWeek;
  currentPeriod?: number | null;
  onClassClick?: (entry: TimetableEntryWithPeriod) => void;
}

const COURSE_TYPE_COLORS: Record<string, string> = {
  english: "bg-blue-500",
  ev: "bg-purple-500",
};

export function TodaySchedule({
  classes,
  day,
  currentPeriod,
  onClassClick,
}: TodayScheduleProps) {
  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  if (classes.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        No classes scheduled for {day}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {classes.map((entry) => {
        const isCurrentClass = currentPeriod === entry.period;
        const isPastClass = currentPeriod != null && entry.period < currentPeriod;

        return (
          <button
            key={`${entry.day}-${entry.period}`}
            onClick={() => onClassClick?.(entry)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg border transition-all",
              "hover:shadow-md hover:border-primary/50",
              isCurrentClass
                ? "bg-primary/5 border-primary"
                : isPastClass
                ? "bg-surface-secondary/50 border-border-default opacity-60"
                : "bg-surface-primary border-border-default"
            )}
          >
            {/* Period indicator */}
            <div
              className={cn(
                "w-1 h-12 rounded-full",
                COURSE_TYPE_COLORS[entry.course_type] || COURSE_TYPE_COLORS.english
              )}
            />

            {/* Time */}
            <div className="w-16 text-center">
              <div className="text-lg font-semibold text-text-primary">
                P{entry.period}
              </div>
              <div className="text-xs text-text-tertiary">
                {formatTime(entry.start_time)}
              </div>
            </div>

            {/* Class info */}
            <div className="flex-1 text-left">
              <div className="font-medium text-text-primary">
                {entry.class_name}
              </div>
              <div className="flex items-center gap-3 text-xs text-text-secondary mt-0.5">
                {entry.classroom && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {entry.classroom}
                  </span>
                )}
              </div>
            </div>

            {/* Current indicator or arrow */}
            {isCurrentClass ? (
              <div className="flex items-center gap-1 text-xs font-medium text-primary">
                <Clock className="w-4 h-4" />
                Now
              </div>
            ) : (
              <ChevronRight className="w-4 h-4 text-text-tertiary" />
            )}
          </button>
        );
      })}
    </div>
  );
}

interface TodayScheduleCardProps {
  classes: TimetableEntryWithPeriod[];
  day: DayOfWeek;
  currentPeriod?: number | null;
}

export function TodayScheduleCard({
  classes,
  day,
  currentPeriod,
}: TodayScheduleCardProps) {
  const upcomingClasses = classes.filter(
    (c) => currentPeriod == null || c.period >= currentPeriod
  );
  const displayClasses = upcomingClasses.slice(0, 3);

  return (
    <div className="bg-surface-primary rounded-lg border border-border-default p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text-primary">Today&apos;s Schedule</h3>
        <span className="text-sm text-text-secondary">{day}</span>
      </div>

      {displayClasses.length === 0 ? (
        <p className="text-sm text-text-secondary">No more classes today</p>
      ) : (
        <div className="space-y-2">
          {displayClasses.map((entry) => (
            <div
              key={`${entry.day}-${entry.period}`}
              className={cn(
                "flex items-center gap-2 p-2 rounded",
                currentPeriod === entry.period
                  ? "bg-primary/10"
                  : "bg-surface-secondary"
              )}
            >
              <div
                className={cn(
                  "w-1 h-8 rounded-full",
                  COURSE_TYPE_COLORS[entry.course_type] || COURSE_TYPE_COLORS.english
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text-primary truncate">
                  {entry.class_name}
                </div>
                <div className="text-xs text-text-tertiary">
                  P{entry.period} · {entry.start_time.substring(0, 5)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {upcomingClasses.length > 3 && (
        <Link
          href="/schedule"
          className="block mt-3 text-sm text-primary hover:underline text-center"
        >
          View all {upcomingClasses.length} classes
        </Link>
      )}
    </div>
  );
}
