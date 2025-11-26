"use client";

import React, { useState, useEffect } from "react";
import { Apple, Wifi, Battery, Search, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export function MenuBar() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex h-8 items-center justify-between px-4 text-xs font-medium text-white shadow-sm backdrop-blur-md bg-black/20 border-b border-white/10">
      <div className="flex items-center space-x-4">
        <button className="hover:bg-white/20 p-1 rounded">
          <Apple className="h-4 w-4 fill-current" />
        </button>
        <span className="font-bold hidden sm:inline-block">TeacherOS</span>
        <div className="hidden md:flex space-x-4">
          <button className="hover:bg-white/20 px-2 py-0.5 rounded">
            File
          </button>
          <button className="hover:bg-white/20 px-2 py-0.5 rounded">
            Edit
          </button>
          <button className="hover:bg-white/20 px-2 py-0.5 rounded">
            View
          </button>
          <button className="hover:bg-white/20 px-2 py-0.5 rounded">
            Window
          </button>
          <button className="hover:bg-white/20 px-2 py-0.5 rounded">
            Help
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button className="hover:bg-white/20 p-1 rounded">
          <Battery className="h-4 w-4" />
        </button>
        <button className="hover:bg-white/20 p-1 rounded">
          <Wifi className="h-4 w-4" />
        </button>
        <button className="hover:bg-white/20 p-1 rounded">
          <Search className="h-4 w-4" />
        </button>
        <button className="hover:bg-white/20 p-1 rounded">
          <Bell className="h-4 w-4" />
        </button>
        <span className="hover:bg-white/20 px-2 py-0.5 rounded cursor-default min-w-[140px] text-center">
          {time}
        </span>
      </div>
    </div>
  );
}
