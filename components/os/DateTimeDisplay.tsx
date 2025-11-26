"use client";

import { useState, useEffect } from "react";
import { Clock, Calendar as CalendarIcon } from "lucide-react";

/**
 * DateTimeDisplay Component
 * Real-time date and time display in English format
 *
 * Features:
 * - Live clock updating every second
 * - Day of week display (Monday, Tuesday...)
 * - Full date display (November 4, 2025)
 * - Responsive design for mobile/desktop
 * - Glassmorphism design matching dashboard theme
 * - Hydration-safe: prevents SSR/client mismatch
 */
export function DateTimeDisplay({
  onViewAll,
  variant = "default",
}: {
  onViewAll?: () => void;
  variant?: "default" | "macos";
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dayOfWeek = currentTime.toLocaleDateString("en-US", {
    weekday: "short",
  });
  const date = currentTime.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const time = currentTime.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  if (!mounted) {
    return <div className="text-xs font-medium opacity-0">Loading...</div>;
  }

  if (variant === "macos") {
    return (
      <button
        onClick={onViewAll}
        className="flex items-center gap-3 text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-white/20 dark:hover:bg-white/10 px-2 py-0.5 rounded transition-colors outline-none"
      >
        <span>
          {dayOfWeek} {date}
        </span>
        <span>{time}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onViewAll}
      className="flex items-center gap-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white/20 dark:hover:bg-black/20 px-2 py-1 rounded transition-colors outline-none"
    >
      <div className="flex items-center gap-1.5">
        <CalendarIcon className="w-3.5 h-3.5 opacity-70" />
        <span>
          {dayOfWeek} {date}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 opacity-70" />
        <span>{time}</span>
      </div>
    </button>
  );
}
