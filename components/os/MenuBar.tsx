"use client";

import { Wifi, Battery, Search } from "lucide-react";
import { DateTimeDisplay } from "./DateTimeDisplay";
import { Button } from "@/components/ui/button";

interface MenuBarProps {
  onOpenEvents?: () => void;
}

export function MenuBar({ onOpenEvents }: MenuBarProps) {
  return (
    <div className="absolute top-0 left-0 right-0 h-8 bg-white/40 dark:bg-black/40 backdrop-blur-2xl border-b border-white/10 dark:border-white/5 flex items-center justify-between px-2 z-50 select-none">
      {/* Left Side: Logo & Menus */}
      <div className="flex items-center gap-4">
        {/* KCIS Logo */}
        <div className="pl-2 pr-2">
          {/* Use a placeholder or text if image is missing, or ensure image exists */}
          <span className="text-lg"></span>
        </div>

        {/* App Name */}
        <span className="text-[13px] font-bold text-slate-800 dark:text-white hidden sm:block">
          TeacherOS
        </span>

        {/* Menus */}
        <div className="hidden md:flex items-center gap-4 text-[13px] font-medium text-slate-700 dark:text-slate-200">
          <button className="hover:text-black dark:hover:text-white transition-colors">
            File
          </button>
          <button className="hover:text-black dark:hover:text-white transition-colors">
            Edit
          </button>
          <button className="hover:text-black dark:hover:text-white transition-colors">
            View
          </button>
          <button className="hover:text-black dark:hover:text-white transition-colors">
            Window
          </button>
          <button className="hover:text-black dark:hover:text-white transition-colors">
            Help
          </button>
        </div>
      </div>

      {/* Right Side: Status & Clock */}
      <div className="flex items-center gap-3 pr-2">
        {/* Status Icons */}
        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
          <Wifi className="w-4 h-4" />
          <Battery className="w-4 h-4" />
          <Search className="w-4 h-4" />
        </div>

        {/* Control Center Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-white/20 dark:hover:bg-white/10 rounded"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
            <circle
              cx="8"
              cy="6"
              r="2"
              fill="currentColor"
              className="text-slate-700 dark:text-slate-200"
            />
            <circle
              cx="16"
              cy="12"
              r="2"
              fill="currentColor"
              className="text-slate-700 dark:text-slate-200"
            />
            <circle
              cx="8"
              cy="18"
              r="2"
              fill="currentColor"
              className="text-slate-700 dark:text-slate-200"
            />
          </svg>
        </Button>

        {/* Clock */}
        <DateTimeDisplay onViewAll={onOpenEvents} variant="macos" />
      </div>
    </div>
  );
}
