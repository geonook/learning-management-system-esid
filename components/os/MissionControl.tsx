"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface MissionControlProps {
  children: React.ReactNode;
  className?: string;
}

export function MissionControl({ children, className }: MissionControlProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 auto-rows-[140px] gap-4 p-6 pb-24 overflow-y-auto h-full w-full",
        className
      )}
    >
      {children}
    </div>
  );
}
