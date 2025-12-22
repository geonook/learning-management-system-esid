"use client";

import { cn } from "@/lib/utils";
import type {
  WeeklyTimetable as WeeklyTimetableType,
  TimetablePeriod,
  TimetableEntryWithPeriod,
  DayOfWeek,
} from "@/lib/api/timetable";
import { TimetableCell } from "./TimetableCell";

interface WeeklyTimetableProps {
  timetable: WeeklyTimetableType;
  periods: TimetablePeriod[];
  currentDay?: DayOfWeek | null;
  currentPeriod?: number | null;
  onCellClick?: (entry: TimetableEntryWithPeriod) => void;
}

const DAYS: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

const DAY_SHORT: Record<DayOfWeek, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
};

export function WeeklyTimetable({
  timetable,
  periods,
  currentDay,
  currentPeriod,
  onCellClick,
}: WeeklyTimetableProps) {
  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  return (
    <div className="overflow-x-auto -mx-px">
      <div className="min-w-[640px]">
        {/* Header row */}
        <div className="grid grid-cols-[72px_repeat(5,1fr)] gap-px bg-border-default">
          {/* Period header */}
          <div className="bg-surface-secondary py-3 px-2 text-center">
            <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
              Period
            </span>
          </div>
          {/* Day headers */}
          {DAYS.map((day) => (
            <div
              key={day}
              className={cn(
                "py-3 px-2 text-center transition-colors",
                currentDay === day
                  ? "bg-primary/10"
                  : "bg-surface-secondary"
              )}
            >
              <span
                className={cn(
                  "text-sm font-semibold",
                  currentDay === day ? "text-primary" : "text-text-primary"
                )}
              >
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{DAY_SHORT[day]}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Body rows */}
        <div className="bg-border-default">
          {periods.map((period) => (
            <div
              key={period.period_number}
              className="grid grid-cols-[72px_repeat(5,1fr)] gap-px"
            >
              {/* Period cell */}
              <div
                className={cn(
                  "bg-surface-secondary py-3 px-2 text-center flex flex-col justify-center relative",
                  currentPeriod === period.period_number && "bg-primary/10"
                )}
              >
                {currentPeriod === period.period_number && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r" />
                )}
                <div className={cn(
                  "text-base font-semibold",
                  currentPeriod === period.period_number ? "text-primary" : "text-text-primary"
                )}>
                  {period.period_number}
                </div>
                <div className={cn(
                  "text-[11px] mt-0.5",
                  currentPeriod === period.period_number ? "text-primary/70" : "text-text-tertiary"
                )}>
                  {formatTime(period.start_time)}
                </div>
              </div>

              {/* Day cells */}
              {DAYS.map((day) => {
                const entry = timetable[day][period.period_number];
                const isCurrentSlot =
                  currentDay === day && currentPeriod === period.period_number;

                return (
                  <div
                    key={`${day}-${period.period_number}`}
                    className={cn(
                      "bg-surface-primary p-1.5 min-h-[64px]",
                      isCurrentSlot && "bg-primary/5"
                    )}
                  >
                    {entry && (
                      <TimetableCell
                        entry={entry}
                        onClick={onCellClick}
                        isActive={isCurrentSlot}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
