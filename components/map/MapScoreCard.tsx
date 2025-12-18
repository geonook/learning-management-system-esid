"use client";

/**
 * MAP Score Card Component
 * Displays latest MAP assessment score for a course (Reading or Language Usage)
 */

import { Target, TrendingUp, TrendingDown, Minus, BookOpen, PenTool } from "lucide-react";
import type { MapAssessmentWithGoals, MapGrowthData } from "@/lib/api/map-assessments";
import { formatGrowth, getGrowthColor, getRitScoreColor } from "@/lib/api/map-assessments";

interface MapScoreCardProps {
  course: "Reading" | "Language Usage";
  assessment: MapAssessmentWithGoals | null;
  growth: MapGrowthData | null;
  showGoals?: boolean;
}

export function MapScoreCard({ course, assessment, growth, showGoals = true }: MapScoreCardProps) {
  const isReading = course === "Reading";
  const Icon = isReading ? BookOpen : PenTool;
  const cardColor = isReading
    ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20"
    : "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20";
  const iconBg = isReading
    ? "bg-blue-100 dark:bg-blue-500/20"
    : "bg-purple-100 dark:bg-purple-500/20";
  const iconColor = isReading
    ? "text-blue-500 dark:text-blue-400"
    : "text-purple-500 dark:text-purple-400";

  if (!assessment) {
    return (
      <div className={`rounded-xl border p-5 ${cardColor}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <h3 className="font-semibold text-text-primary">{course}</h3>
        </div>
        <div className="text-center py-6">
          <Target className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
          <p className="text-text-tertiary text-sm">No MAP data available</p>
        </div>
      </div>
    );
  }

  const GrowthIcon = growth
    ? growth.growth > 0
      ? TrendingUp
      : growth.growth < 0
        ? TrendingDown
        : Minus
    : null;

  return (
    <div className={`rounded-xl border p-5 ${cardColor}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">{course}</h3>
            <p className="text-xs text-text-tertiary">{assessment.term_tested}</p>
          </div>
        </div>
        {growth && GrowthIcon && (
          <div className={`flex items-center gap-1 ${getGrowthColor(growth.growth)}`}>
            <GrowthIcon className="w-4 h-4" />
            <span className="font-medium text-sm">{formatGrowth(growth.growth)}</span>
          </div>
        )}
      </div>

      {/* RIT Score */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span
            className={`text-4xl font-bold ${getRitScoreColor(assessment.rit_score, assessment.grade)}`}
          >
            {assessment.rit_score}
          </span>
          <span className="text-text-secondary text-sm">RIT</span>
        </div>
        {assessment.rit_score_range && (
          <p className="text-xs text-text-tertiary mt-1">Range: {assessment.rit_score_range}</p>
        )}
      </div>

      {/* Lexile Score (Reading only) */}
      {isReading && assessment.lexile_score && (
        <div className="mb-4 p-3 bg-white/50 dark:bg-white/5 rounded-lg">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold text-text-primary">{assessment.lexile_score}</span>
            <span className="text-xs text-text-tertiary">Lexile</span>
          </div>
          {assessment.lexile_range && (
            <p className="text-xs text-text-tertiary">Range: {assessment.lexile_range}</p>
          )}
        </div>
      )}

      {/* Goal Areas */}
      {showGoals && assessment.goals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Goal Areas</p>
          <div className="space-y-1.5">
            {assessment.goals.map((goal) => (
              <div
                key={goal.goal_name}
                className="flex items-center justify-between text-sm bg-white/50 dark:bg-white/5 rounded-md px-3 py-2"
              >
                <span className="text-text-secondary">{goal.goal_name}</span>
                <span className="font-mono text-text-primary">{goal.goal_rit_range || "-"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
