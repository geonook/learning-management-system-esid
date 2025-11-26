"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface MacAppIconProps {
  name: string;
  icon?: ReactNode;
  gradient?: string;
  onClick?: () => void;
  className?: string;
  size?: number;
  children?: ReactNode; // Support custom full-control content
}

export function MacAppIcon({
  name,
  icon,
  gradient,
  onClick,
  className,
  children,
}: MacAppIconProps) {
  // If children are provided, we assume the caller handles the full look (Finder, Calendar)
  // We just provide the motion wrapper and size
  if (children) {
    return (
      <div className="group flex flex-col items-center gap-1 w-full h-full">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClick}
          title={name}
          className={cn(
            "relative w-full h-full flex items-center justify-center rounded-[16px] shadow-md transition-all duration-200",
            className
          )}
        >
          {children}
        </motion.button>
      </div>
    );
  }

  // Standard Icon Style (Mail, Settings, LMS)
  return (
    <div className="group flex flex-col items-center gap-1 w-full h-full">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onClick}
        title={name}
        className={cn(
          "relative w-full h-full flex items-center justify-center rounded-[16px] shadow-md transition-all duration-200",
          "after:absolute after:inset-0 after:rounded-[16px] after:bg-gradient-to-b after:from-white/40 after:to-transparent after:opacity-50", // Glossy shine
          "before:absolute before:inset-0 before:rounded-[16px] before:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]", // Inner border
          gradient,
          className
        )}
      >
        <div className="relative z-10 text-white drop-shadow-md [&>svg]:w-[60%] [&>svg]:h-[60%] flex items-center justify-center w-full h-full">
          {icon}
        </div>
      </motion.button>
    </div>
  );
}
