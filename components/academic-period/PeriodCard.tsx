"use client";

/**
 * PeriodCard Component
 *
 * Displays a single academic period with its status, deadline, and actions.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import {
  Lock,
  Unlock,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Settings2,
} from "lucide-react";
import type { AcademicPeriod } from "@/types/academic-period";
import {
  getPeriodDisplayName,
  getDaysUntilLock,
  isEditableStatus,
  PERIOD_TYPE_NAMES,
} from "@/types/academic-period";
import { cn } from "@/lib/utils";

interface PeriodCardProps {
  period: AcademicPeriod;
  children?: React.ReactNode;
  onLock?: () => void;
  onUnlock?: () => void;
  onSetDeadline?: () => void;
  onConfigureDates?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  depth?: number;
}

export function PeriodCard({
  period,
  children,
  onLock,
  onUnlock,
  onSetDeadline,
  onConfigureDates,
  isExpanded = true,
  onToggleExpand,
  depth = 0,
}: PeriodCardProps) {
  const isEditable = isEditableStatus(period.status);
  const daysUntilLock = getDaysUntilLock(period.lockDeadline);
  const hasChildren = !!children;

  // Format deadline display
  const deadlineDisplay = period.lockDeadline
    ? new Date(period.lockDeadline).toLocaleDateString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : null;

  return (
    <div className={cn("relative", depth > 0 && "ml-6")}>
      {/* Connector line for nested items */}
      {depth > 0 && (
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 -ml-3" />
      )}

      <Card
        className={cn(
          "border transition-colors",
          period.status === "locked" && "bg-red-50/50 border-red-200",
          period.status === "closing" && "bg-amber-50/50 border-amber-200",
          period.status === "preparing" && "bg-slate-50/50 border-slate-200"
        )}
      >
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Expand/Collapse toggle */}
              {hasChildren && onToggleExpand && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={onToggleExpand}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}

              {/* Period info */}
              <div>
                <CardTitle className="text-base font-medium">
                  {getPeriodDisplayName(period)}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {PERIOD_TYPE_NAMES[period.periodType]}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Deadline info */}
              {period.status === "closing" && daysUntilLock !== null && (
                <div className="flex items-center gap-1 text-amber-600 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>{daysUntilLock} days until lock</span>
                </div>
              )}

              {/* Status badge */}
              <StatusBadge status={period.status} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="py-2 px-4 border-t bg-muted/20">
          <div className="flex items-center justify-between">
            {/* Deadline info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {deadlineDisplay && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Deadline: {deadlineDisplay}</span>
                </div>
              )}
              {period.autoLockEnabled && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  Auto-lock
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Configure Dates button - only for year-type periods */}
              {onConfigureDates && period.periodType === "year" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onConfigureDates}
                  className="h-7 text-xs"
                >
                  <Settings2 className="h-3 w-3 mr-1" />
                  Configure Dates
                </Button>
              )}

              {onSetDeadline && isEditable && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSetDeadline}
                  className="h-7 text-xs"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Set Deadline
                </Button>
              )}

              {onLock && isEditable && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onLock}
                  className="h-7 text-xs"
                >
                  <Lock className="h-3 w-3 mr-1" />
                  Lock
                </Button>
              )}

              {onUnlock && !isEditable && period.status !== "archived" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onUnlock}
                  className="h-7 text-xs"
                >
                  <Unlock className="h-3 w-3 mr-1" />
                  Unlock
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nested children */}
      {hasChildren && isExpanded && (
        <div className="mt-2 space-y-2">{children}</div>
      )}
    </div>
  );
}
