"use client";

/**
 * StatusBadge Component
 *
 * Displays the status of an academic period with appropriate colors and icons.
 */

import { Badge } from "@/components/ui/badge";
import {
  FileEdit,
  Lock,
  AlertTriangle,
  Archive,
  Clock,
} from "lucide-react";
import type { PeriodStatus } from "@/types/academic-period";
import { PERIOD_STATUS_NAMES } from "@/types/academic-period";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: PeriodStatus;
  showIcon?: boolean;
  className?: string;
}

const statusConfig: Record<
  PeriodStatus,
  {
    variant: "default" | "secondary" | "destructive" | "outline";
    className: string;
    icon: typeof Lock;
  }
> = {
  preparing: {
    variant: "secondary",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    icon: Clock,
  },
  active: {
    variant: "default",
    className: "bg-green-100 text-green-700 border-green-200",
    icon: FileEdit,
  },
  closing: {
    variant: "default",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    icon: AlertTriangle,
  },
  locked: {
    variant: "destructive",
    className: "bg-red-100 text-red-700 border-red-200",
    icon: Lock,
  },
  archived: {
    variant: "secondary",
    className: "bg-gray-100 text-gray-500 border-gray-200",
    icon: Archive,
  },
};

export function StatusBadge({
  status,
  showIcon = true,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium",
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {PERIOD_STATUS_NAMES[status]}
    </Badge>
  );
}

/**
 * Compact status indicator (just icon)
 */
export function StatusIndicator({
  status,
  className,
}: {
  status: PeriodStatus;
  className?: string;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center w-6 h-6 rounded-full",
        config.className,
        className
      )}
      title={PERIOD_STATUS_NAMES[status]}
    >
      <Icon className="h-3.5 w-3.5" />
    </div>
  );
}
