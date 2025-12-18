"use client";

import { Clock, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecentGradeUpdate } from "@/lib/api/dashboard";

interface RecentGradeUpdatesProps {
  data: RecentGradeUpdate[];
  loading: boolean;
  title?: string;
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

// Get score color based on value
function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-600 dark:text-green-400";
  if (score >= 80) return "text-blue-600 dark:text-blue-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

// Get course type color
function getCourseTypeColor(courseType: string): string {
  switch (courseType) {
    case "LT":
      return "text-cyan-600 dark:text-cyan-400";
    case "IT":
      return "text-indigo-600 dark:text-indigo-400";
    case "KCFS":
      return "text-pink-600 dark:text-pink-400";
    default:
      return "text-gray-600 dark:text-gray-400";
  }
}

export function RecentGradeUpdates({
  data,
  loading,
}: RecentGradeUpdatesProps) {
  if (loading) {
    return (
      <div className="h-full flex flex-col space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-3 w-24 mb-1" />
              <Skeleton className="h-2.5 w-32" />
            </div>
            <Skeleton className="h-5 w-8 flex-shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  const isEmpty = !data || data.length === 0;

  if (isEmpty) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-tertiary">
        <Clock className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">No recent updates</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {data.map((update, index) => (
          <div
            key={update.id || index}
            className="flex items-center gap-2 p-1.5 bg-surface-tertiary/50 rounded-lg hover:bg-surface-hover transition-colors"
          >
            {/* Avatar */}
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <User className="w-3 h-3 text-indigo-500" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-text-primary text-xs truncate">
                  {update.studentName}
                </span>
                <span className="text-text-tertiary text-[10px]">
                  {formatRelativeTime(update.updatedAt)}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-text-secondary">
                <span className="truncate">{update.className}</span>
                <span className="text-text-tertiary">·</span>
                <span className={getCourseTypeColor(update.courseName)}>
                  {update.courseName}
                </span>
                <span className="text-text-tertiary">·</span>
                <span>{update.examCode}</span>
              </div>
            </div>

            {/* Score */}
            <div
              className={`text-sm font-bold ${getScoreColor(update.score)} flex-shrink-0`}
            >
              {update.score}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
