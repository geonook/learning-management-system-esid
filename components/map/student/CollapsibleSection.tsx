"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * 可收合的 Section 區塊
 * 用於 MAP Analysis 頁面的分層架構
 */
export function CollapsibleSection({
  title,
  subtitle,
  icon,
  defaultOpen = true,
  children,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Section Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 px-1 hover:bg-surface-secondary/50 rounded-lg transition-colors group"
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="text-text-tertiary group-hover:text-text-secondary transition-colors">
              {icon}
            </div>
          )}
          <div className="text-left">
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            {subtitle && (
              <p className="text-sm text-text-tertiary">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="text-text-tertiary group-hover:text-text-secondary transition-colors">
          {isOpen ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </div>
      </button>

      {/* Section Content */}
      {isOpen && (
        <div className="space-y-6 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}
