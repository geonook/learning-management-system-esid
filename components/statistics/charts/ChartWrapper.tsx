"use client";

import { ReactNode } from "react";
import { AlertCircle, BarChart3, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartWrapperProps {
  title: string;
  subtitle?: string;
  loading: boolean;
  error?: string | null;
  isEmpty: boolean;
  minDataPoints?: number;
  height?: number;
  onRetry?: () => void;
  children: ReactNode;
}

export function ChartWrapper({
  title,
  subtitle,
  loading,
  error,
  isEmpty,
  minDataPoints = 1,
  height = 300,
  onRetry,
  children,
}: ChartWrapperProps) {
  // Loading state
  if (loading) {
    return (
      <div className="bg-surface-secondary rounded-xl border border-border-default p-6">
        <div className="mb-4">
          <Skeleton className="h-6 w-48" />
          {subtitle && <Skeleton className="h-4 w-32 mt-1" />}
        </div>
        <Skeleton className="w-full" style={{ height }} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-surface-secondary rounded-xl border border-border-default p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          {subtitle && (
            <p className="text-sm text-text-secondary">{subtitle}</p>
          )}
        </div>
        <div
          className="flex flex-col items-center justify-center"
          style={{ height }}
        >
          <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
          <p className="text-text-secondary text-sm mb-3">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 bg-surface-tertiary hover:bg-surface-hover rounded-lg text-text-secondary transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <div className="bg-surface-secondary rounded-xl border border-border-default p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          {subtitle && (
            <p className="text-sm text-text-secondary">{subtitle}</p>
          )}
        </div>
        <div
          className="flex flex-col items-center justify-center"
          style={{ height }}
        >
          <BarChart3 className="w-12 h-12 text-text-tertiary mb-3" />
          <p className="text-text-tertiary text-sm">No data available</p>
          <p className="text-text-tertiary text-xs mt-1">
            {minDataPoints > 1
              ? `Requires at least ${minDataPoints} data points`
              : "Add some data to see the chart"}
          </p>
        </div>
      </div>
    );
  }

  // Normal state with chart
  return (
    <div className="bg-surface-secondary rounded-xl border border-border-default p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        {subtitle && (
          <p className="text-sm text-text-secondary">{subtitle}</p>
        )}
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}
