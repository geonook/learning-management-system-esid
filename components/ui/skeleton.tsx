import { cn } from "@/lib/utils";

// Base Skeleton with optional shimmer effect
function Skeleton({
  className,
  shimmer = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { shimmer?: boolean }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-200/50 dark:bg-white/10",
        shimmer && [
          "relative overflow-hidden",
          "before:absolute before:inset-0 before:-translate-x-full",
          "before:animate-shimmer before:bg-gradient-to-r",
          "before:from-transparent before:via-white/20 before:to-transparent",
          "dark:before:via-white/5",
        ],
        className
      )}
      {...props}
    />
  );
}

// KPI Skeleton (for Dashboard stats)
function SkeletonKPI() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

// Chart Skeleton
function SkeletonChart({ className }: { className?: string }) {
  return <Skeleton className={cn("h-[200px] w-full rounded-xl", className)} />;
}

// List Skeleton
function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Table Skeleton (for Gradebook)
function SkeletonTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {/* Table Header */}
      <div className="flex gap-2">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1" />
        ))}
      </div>
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Card Skeleton
function SkeletonCard() {
  return (
    <div className="p-4 space-y-3">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export {
  Skeleton,
  SkeletonKPI,
  SkeletonChart,
  SkeletonList,
  SkeletonTable,
  SkeletonCard
};
