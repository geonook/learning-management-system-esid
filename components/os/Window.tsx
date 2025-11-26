"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { X, Minus, Maximize2 } from "lucide-react";

interface WindowProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  isActive?: boolean;
}

export function Window({
  title,
  children,
  className,
  onClose,
  onMinimize,
  onMaximize,
  isActive = true,
}: WindowProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border border-white/20 shadow-2xl transition-all duration-200",
        "bg-white/70 backdrop-blur-xl dark:bg-black/60",
        isActive ? "ring-1 ring-white/30" : "opacity-90 grayscale-[0.2]",
        className
      )}
    >
      {/* Title Bar */}
      <div className="flex h-10 items-center justify-between border-b border-white/10 px-4 bg-white/10 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className="group flex h-3 w-3 items-center justify-center rounded-full bg-[#FF5F57] hover:bg-[#FF5F57]/80"
          >
            <X className="h-2 w-2 text-black/50 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
          <button
            onClick={onMinimize}
            className="group flex h-3 w-3 items-center justify-center rounded-full bg-[#FEBC2E] hover:bg-[#FEBC2E]/80"
          >
            <Minus className="h-2 w-2 text-black/50 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
          <button
            onClick={onMaximize}
            className="group flex h-3 w-3 items-center justify-center rounded-full bg-[#28C840] hover:bg-[#28C840]/80"
          >
            <Maximize2 className="h-2 w-2 text-black/50 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        </div>
        <div className="text-sm font-medium text-foreground/80">{title}</div>
        <div className="w-14" /> {/* Spacer for centering title */}
      </div>

      {/* Window Content */}
      <div className="flex-1 overflow-auto p-4">{children}</div>
    </div>
  );
}
