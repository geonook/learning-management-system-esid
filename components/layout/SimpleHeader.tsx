"use client";

import { cn } from "@/lib/utils";

export interface SimpleHeaderProps {
  /** The icon to display (Lucide React component) */
  icon: React.ReactNode;
  /** Background color class for the icon container */
  iconBgColor?: string;
  /** The main title */
  title: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Optional action buttons on the right side */
  actions?: React.ReactNode;
  /** Additional className for the container */
  className?: string;
}

/**
 * SimpleHeader - Compact page header with icon
 *
 * Unified design pattern for all LMS pages:
 * - Left: Colored icon in rounded container
 * - Center: Title + optional subtitle
 * - Right: Optional action buttons
 */
export function SimpleHeader({
  icon,
  iconBgColor = "bg-blue-500/20",
  title,
  subtitle,
  actions,
  className,
}: SimpleHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", iconBgColor)}>
          {icon}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
          {subtitle && (
            <p className="text-sm text-text-secondary">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
