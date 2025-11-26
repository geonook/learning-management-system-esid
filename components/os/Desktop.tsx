"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface DesktopProps {
  children: React.ReactNode;
  className?: string;
}

export function Desktop({ children, className }: DesktopProps) {
  return (
    <div
      className={cn(
        "relative h-screen w-screen overflow-hidden bg-cover bg-center transition-all duration-500",
        "bg-[url('https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop')] dark:bg-[url('https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2070&auto=format&fit=crop')]",
        className
      )}
    >
      {/* Overlay for better text contrast if needed */}
      <div className="absolute inset-0 bg-background/20 backdrop-blur-[2px]" />

      {/* Desktop Content */}
      <div className="relative z-10 h-full w-full p-4 pt-12 pb-24">
        {children}
      </div>
    </div>
  );
}
