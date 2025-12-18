"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "./GlassCard";
import { motion } from "framer-motion";

export type WidgetSize = "small" | "medium" | "large" | "wide" | "tall" | "xlarge";

interface WidgetProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: WidgetSize;
  delay?: number;
  icon?: React.ReactNode;
}

const sizeClasses: Record<WidgetSize, string> = {
  small: "col-span-1 row-span-1",
  medium: "col-span-2 row-span-2",
  large: "col-span-2 row-span-2 md:col-span-3 md:row-span-3",
  wide: "col-span-2 row-span-1 md:col-span-4 md:row-span-2",
  tall: "col-span-1 row-span-2",
  xlarge: "col-span-2 row-span-2 md:col-span-4 md:row-span-2",
};

export function Widget({
  title,
  children,
  className,
  size = "small",
  delay = 0,
  icon,
}: WidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: delay * 0.1, ease: "easeOut" }}
      className={cn(sizeClasses[size], className)}
    >
      <GlassCard
        className="h-full w-full flex flex-col p-4 overflow-hidden"
        hoverEffect
      >
        {title && (
          <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-slate-200/50 dark:border-white/10">
            {icon && <div className="text-slate-600 dark:text-white/80">{icon}</div>}
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white/90 tracking-wide uppercase">
              {title}
            </h3>
          </div>
        )}
        <div className="flex-1 overflow-auto scrollbar-hide">{children}</div>
      </GlassCard>
    </motion.div>
  );
}
