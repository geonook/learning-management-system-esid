"use client";

import { Users, TrendingUp, TrendingDown, Minus, Trophy, BarChart3 } from "lucide-react";
import { type StudentRankings as RankingsData } from "@/lib/api/map-student-analytics";

interface StudentPeerComparisonProps {
  data: RankingsData | null;
}

export function StudentPeerComparison({ data }: StudentPeerComparisonProps) {
  if (!data) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Comparison with Peers</h3>
        <div className="text-center py-8 text-text-tertiary">
          <Users className="w-8 h-8 mx-auto mb-2" />
          <p>No comparison data available</p>
        </div>
      </div>
    );
  }

  const { termTested, reading, languageUsage } = data;

  const getDiffIndicator = (diff: number) => {
    if (diff > 0) return { icon: TrendingUp, color: "text-green-600 dark:text-green-400", prefix: "+" };
    if (diff < 0) return { icon: TrendingDown, color: "text-red-600 dark:text-red-400", prefix: "" };
    return { icon: Minus, color: "text-text-tertiary", prefix: "" };
  };

  const getRankPercentile = (rank: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((rank / total) * 100);
  };

  const getRankColor = (percentile: number) => {
    if (percentile <= 10) return "text-green-600 dark:text-green-400";
    if (percentile <= 25) return "text-emerald-600 dark:text-emerald-400";
    if (percentile <= 50) return "text-amber-600 dark:text-amber-400";
    return "text-text-primary";
  };

  const SubjectComparison = ({
    subject,
    subjectData,
  }: {
    subject: string;
    subjectData: NonNullable<RankingsData["reading"]>;
  }) => {
    const classPercentile = getRankPercentile(subjectData.classRank, subjectData.classTotal);
    const gradePercentile = getRankPercentile(subjectData.gradeRank, subjectData.gradeTotal);

    const vsClass = Math.round((subjectData.score - subjectData.classAvg) * 10) / 10;
    const vsGrade = Math.round((subjectData.score - subjectData.gradeAvg) * 10) / 10;
    const vsNorm = subjectData.norm !== null
      ? Math.round((subjectData.score - subjectData.norm) * 10) / 10
      : null;

    const classIndicator = getDiffIndicator(vsClass);
    const gradeIndicator = getDiffIndicator(vsGrade);
    const normIndicator = vsNorm !== null ? getDiffIndicator(vsNorm) : null;

    return (
      <div className="bg-surface-tertiary rounded-lg p-4">
        {/* Subject Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="font-medium text-text-primary">{subject}</span>
          <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
            {subjectData.score}
          </span>
        </div>

        {/* Rankings */}
        <div className="space-y-3 mb-4">
          {/* Class Rank */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Class Rank</span>
            <div className="flex items-center gap-2">
              <span className={`font-medium ${getRankColor(classPercentile)}`}>
                {subjectData.classRank} / {subjectData.classTotal}
              </span>
              {classPercentile <= 10 && <Trophy className="w-4 h-4 text-amber-500" />}
              <span className="text-xs text-text-tertiary">
                (Top {classPercentile}%)
              </span>
            </div>
          </div>

          {/* Grade Rank */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Grade Rank</span>
            <div className="flex items-center gap-2">
              <span className={`font-medium ${getRankColor(gradePercentile)}`}>
                {subjectData.gradeRank} / {subjectData.gradeTotal}
              </span>
              {gradePercentile <= 10 && <Trophy className="w-4 h-4 text-amber-500" />}
              <span className="text-xs text-text-tertiary">
                (Top {gradePercentile}%)
              </span>
            </div>
          </div>
        </div>

        {/* Comparisons */}
        <div className="pt-3 border-t border-border-subtle space-y-2">
          {/* vs Class */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-tertiary">vs Class Avg ({subjectData.classAvg})</span>
            <div className="flex items-center gap-1">
              <classIndicator.icon className={`w-3 h-3 ${classIndicator.color}`} />
              <span className={classIndicator.color}>
                {classIndicator.prefix}{vsClass}
              </span>
            </div>
          </div>

          {/* vs Grade */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-tertiary">vs Grade Avg ({subjectData.gradeAvg})</span>
            <div className="flex items-center gap-1">
              <gradeIndicator.icon className={`w-3 h-3 ${gradeIndicator.color}`} />
              <span className={gradeIndicator.color}>
                {gradeIndicator.prefix}{vsGrade}
              </span>
            </div>
          </div>

          {/* vs Norm */}
          {subjectData.norm !== null && normIndicator && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-tertiary">vs NWEA Norm ({subjectData.norm})</span>
              <div className="flex items-center gap-1">
                <normIndicator.icon className={`w-3 h-3 ${normIndicator.color}`} />
                <span className={normIndicator.color}>
                  {normIndicator.prefix}{vsNorm}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 檢查是否有資料
  const hasData = reading || languageUsage;

  if (!hasData) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Comparison with Peers</h3>
        <div className="text-center py-8 text-text-tertiary">
          <BarChart3 className="w-8 h-8 mx-auto mb-2" />
          <p>No comparison data available for this term</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated rounded-xl border border-border-default p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Comparison with Peers</h3>
        <span className="text-sm text-text-tertiary">{termTested}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reading && (
          <SubjectComparison subject="Reading" subjectData={reading} />
        )}
        {languageUsage && (
          <SubjectComparison subject="Language Usage" subjectData={languageUsage} />
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-border-subtle">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
          <div className="flex items-center gap-1">
            <Trophy className="w-3 h-3 text-amber-500" />
            <span className="text-text-tertiary">Top 10%</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span className="text-text-tertiary">Above Average</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-red-500" />
            <span className="text-text-tertiary">Below Average</span>
          </div>
        </div>
      </div>
    </div>
  );
}
