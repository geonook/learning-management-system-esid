"use client";

import { TrendingUp, TrendingDown, Minus, Target, AlertTriangle, Star } from "lucide-react";
import { type StudentGoalPerformance as GoalPerformanceData } from "@/lib/api/map-student-analytics";

interface StudentGoalAreasProps {
  data: GoalPerformanceData | null;
}

export function StudentGoalAreas({ data }: StudentGoalAreasProps) {
  if (!data) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Goal Areas Performance</h3>
        <div className="text-center py-8 text-text-tertiary">
          <Target className="w-8 h-8 mx-auto mb-2" />
          <p>No goal area data available</p>
        </div>
      </div>
    );
  }

  const { termTested, reading, languageUsage, strengths, weaknesses } = data;

  const getChangeIndicator = (vsOverall: number | null) => {
    if (vsOverall === null) return { icon: Minus, color: "text-text-tertiary" };
    if (vsOverall > 0) return { icon: TrendingUp, color: "text-green-600 dark:text-green-400" };
    if (vsOverall < 0) return { icon: TrendingDown, color: "text-red-600 dark:text-red-400" };
    return { icon: Minus, color: "text-text-tertiary" };
  };

  const formatChange = (vsOverall: number | null) => {
    if (vsOverall === null) return "N/A";
    if (vsOverall === 0) return "0";
    return vsOverall > 0 ? `+${vsOverall}` : `${vsOverall}`;
  };

  // 計算進度條寬度 (以 Overall RIT 為基準，範圍約 150-250)
  const getProgressWidth = (midpoint: number | null, overallRit: number) => {
    if (midpoint === null) return 50;
    const minRange = overallRit - 30;
    const maxRange = overallRit + 30;
    const clampedMidpoint = Math.max(minRange, Math.min(maxRange, midpoint));
    return ((clampedMidpoint - minRange) / (maxRange - minRange)) * 100;
  };

  const GoalRow = ({
    goalName,
    midpoint,
    vsOverall,
    overallRit,
  }: {
    goalName: string;
    midpoint: number | null;
    vsOverall: number | null;
    overallRit: number;
  }) => {
    const indicator = getChangeIndicator(vsOverall);
    const progressWidth = getProgressWidth(midpoint, overallRit);

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary truncate flex-1">{goalName}</span>
          <div className="flex items-center gap-2 ml-2">
            <span className="font-medium text-text-primary w-8 text-right">
              {midpoint !== null ? midpoint : "N/A"}
            </span>
            <div className="flex items-center gap-1 w-12 justify-end">
              <indicator.icon className={`w-3 h-3 ${indicator.color}`} />
              <span className={`text-xs ${indicator.color}`}>
                {formatChange(vsOverall)}
              </span>
            </div>
          </div>
        </div>
        <div className="h-2 bg-surface-tertiary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              vsOverall !== null && vsOverall > 0
                ? "bg-green-500"
                : vsOverall !== null && vsOverall < 0
                ? "bg-red-400"
                : "bg-purple-500"
            }`}
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-surface-elevated rounded-xl border border-border-default p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Goal Areas Performance</h3>
        <span className="text-sm text-text-tertiary">{termTested}</span>
      </div>

      <div className="space-y-6">
        {/* Reading Goals */}
        {reading && reading.goals.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-text-primary">Reading</span>
              <span className="text-xs text-text-tertiary">(Overall: {reading.overallRit})</span>
            </div>
            <div className="space-y-3">
              {reading.goals.map((goal) => (
                <GoalRow
                  key={goal.goalName}
                  goalName={goal.goalName}
                  midpoint={goal.midpoint}
                  vsOverall={goal.vsOverall}
                  overallRit={reading.overallRit}
                />
              ))}
            </div>
          </div>
        )}

        {/* Language Usage Goals */}
        {languageUsage && languageUsage.goals.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-text-primary">Language Usage</span>
              <span className="text-xs text-text-tertiary">(Overall: {languageUsage.overallRit})</span>
            </div>
            <div className="space-y-3">
              {languageUsage.goals.map((goal) => (
                <GoalRow
                  key={goal.goalName}
                  goalName={goal.goalName}
                  midpoint={goal.midpoint}
                  vsOverall={goal.vsOverall}
                  overallRit={languageUsage.overallRit}
                />
              ))}
            </div>
          </div>
        )}

        {/* Strengths and Weaknesses */}
        {(strengths.length > 0 || weaknesses.length > 0) && (
          <div className="pt-4 border-t border-border-subtle">
            <div className="grid grid-cols-2 gap-4">
              {/* Strengths */}
              {strengths.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">Strengths</span>
                  </div>
                  <ul className="space-y-1">
                    {strengths.map((strength) => (
                      <li key={strength} className="text-xs text-text-secondary">
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {weaknesses.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Needs Improvement</span>
                  </div>
                  <ul className="space-y-1">
                    {weaknesses.map((weakness) => (
                      <li key={weakness} className="text-xs text-text-secondary">
                        {weakness}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!reading && !languageUsage && (
          <div className="text-center py-4 text-text-tertiary text-sm">
            No goal area data available for this term
          </div>
        )}
      </div>
    </div>
  );
}
