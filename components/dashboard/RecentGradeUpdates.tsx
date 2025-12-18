"use client";

import { Clock, User, School, BookOpen } from "lucide-react";
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
  title = "Recent Grade Updates",
}: RecentGradeUpdatesProps) {
  if (loading) {
    return (
      <div className="bg-surface-secondary rounded-xl border border-border-default p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-text-secondary" />
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = !data || data.length === 0;

  return (
    <div className="bg-surface-secondary rounded-xl border border-border-default p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-text-secondary" />
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
      </div>

      {isEmpty ? (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-tertiary text-sm">No recent updates</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[350px] overflow-y-auto">
          {data.map((update, index) => (
            <div
              key={update.id || index}
              className="flex items-start gap-3 p-3 bg-surface-tertiary rounded-lg hover:bg-surface-hover transition-colors"
            >
              {/* Avatar placeholder */}
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-indigo-500" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-text-primary text-sm truncate">
                    {update.studentName}
                  </span>
                  <span className="text-text-tertiary text-xs">
                    {formatRelativeTime(update.updatedAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
                  <div className="flex items-center gap-1">
                    <School className="w-3 h-3" />
                    <span>{update.className}</span>
                  </div>
                  <span className="text-text-tertiary">|</span>
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    <span className={getCourseTypeColor(update.courseName)}>
                      {update.courseName}
                    </span>
                  </div>
                  <span className="text-text-tertiary">|</span>
                  <span>{update.examCode}</span>
                </div>
              </div>

              {/* Score */}
              <div
                className={`text-lg font-bold ${getScoreColor(update.score)} flex-shrink-0`}
              >
                {update.score}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
