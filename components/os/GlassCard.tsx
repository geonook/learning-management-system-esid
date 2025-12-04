"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export function GlassCard({
  children,
  className,
  hoverEffect = false,
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/20 bg-white/40 p-6 shadow-lg backdrop-blur-md transition-all duration-200 dark:bg-black/40",
        hoverEffect &&
          "hover:bg-white/50 hover:shadow-xl hover:-translate-y-0.5 dark:hover:bg-black/50 transition-all duration-200 ease-out",
        className
      )}
    >
      {children}
    </div>
  );
}
