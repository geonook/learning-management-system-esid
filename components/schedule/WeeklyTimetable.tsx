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
    // time format: "08:25:00" or "08:25"
    return time.substring(0, 5);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-20 p-2 border border-border-default bg-surface-secondary text-text-secondary font-medium">
              Period
            </th>
            {DAYS.map((day) => (
              <th
                key={day}
                className={cn(
                  "p-2 border border-border-default font-medium text-center",
                  currentDay === day
                    ? "bg-primary/10 text-primary"
                    : "bg-surface-secondary text-text-secondary"
                )}
              >
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{DAY_SHORT[day]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => (
            <tr key={period.period_number}>
              {/* Period number and time */}
              <td
                className={cn(
                  "p-2 border border-border-default bg-surface-secondary text-center",
                  currentPeriod === period.period_number
                    ? "bg-primary/10"
                    : ""
                )}
              >
                <div className="font-medium text-text-primary">
                  {period.period_number}
                </div>
                <div className="text-xs text-text-tertiary">
                  {formatTime(period.start_time)}
                </div>
              </td>

              {/* Day cells */}
              {DAYS.map((day) => {
                const entry = timetable[day][period.period_number];
                const isCurrentSlot =
                  currentDay === day && currentPeriod === period.period_number;

                return (
                  <td
                    key={`${day}-${period.period_number}`}
                    className={cn(
                      "p-1 border border-border-default",
                      isCurrentSlot ? "bg-primary/5 ring-2 ring-primary ring-inset" : ""
                    )}
                  >
                    {entry ? (
                      <TimetableCell
                        entry={entry}
                        onClick={onCellClick}
                        isActive={isCurrentSlot}
                      />
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
