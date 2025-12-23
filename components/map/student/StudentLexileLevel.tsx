"use client";

import { BookOpen, TrendingUp, TrendingDown } from "lucide-react";
import { type StudentLexileStatus as LexileStatusData } from "@/lib/api/map-student-analytics";

interface StudentLexileLevelProps {
  data: LexileStatusData | null;
}

export function StudentLexileLevel({ data }: StudentLexileLevelProps) {
  if (!data || data.lexileScore === null) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Lexile Reading Level</h3>
        <div className="text-center py-8 text-text-tertiary">
          <BookOpen className="w-8 h-8 mx-auto mb-2" />
          <p>No Lexile data available</p>
        </div>
      </div>
    );
  }

  const { lexileScore, lexileFormatted, band, recommendedRange, growth, termTested } = data;

  // Lexile 進度條範圍 (BR = -100, 最高約 1400)
  const minLexile = -100;
  const maxLexile = 1400;
  const range = maxLexile - minLexile;

  // 計算進度條位置
  const getPosition = (score: number) => {
    const clamped = Math.max(minLexile, Math.min(maxLexile, score));
    return ((clamped - minLexile) / range) * 100;
  };

  const currentPosition = getPosition(lexileScore);

  // 閱讀區間標記
  const lexileBands = [
    { label: "BR", start: -100, end: 0 },
    { label: "200", start: 0, end: 200 },
    { label: "400", start: 200, end: 400 },
    { label: "600", start: 400, end: 600 },
    { label: "800", start: 600, end: 800 },
    { label: "1000", start: 800, end: 1000 },
    { label: "1200+", start: 1000, end: 1400 },
  ];

  return (
    <div className="bg-surface-elevated rounded-xl border border-border-default p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Lexile Reading Level</h3>
        <span className="text-sm text-text-tertiary">{termTested}</span>
      </div>

      {/* Current Lexile */}
      <div className="text-center mb-6">
        <div className="text-3xl font-bold text-text-primary">{lexileFormatted}</div>
        {band && (
          <div
            className="inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: `${band.color}20`,
              color: band.color,
            }}
          >
            {band.label}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="relative h-4 bg-surface-tertiary rounded-full overflow-hidden">
          {/* Background gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to right, #ef4444 0%, #f59e0b 25%, #84cc16 50%, #22c55e 75%, #059669 100%)",
              opacity: 0.3,
            }}
          />

          {/* Current position indicator */}
          <div
            className="absolute top-0 h-full w-1 bg-text-primary rounded-full"
            style={{ left: `calc(${currentPosition}% - 2px)` }}
          >
            <div
              className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-purple-500"
            />
          </div>
        </div>

        {/* Labels */}
        <div className="relative h-5 mt-1">
          {lexileBands.map((b, index) => (
            <span
              key={b.label}
              className="absolute text-xs text-text-tertiary transform -translate-x-1/2"
              style={{ left: `${getPosition(b.start)}%` }}
            >
              {index === 0 ? "BR" : index === lexileBands.length - 1 ? "1200+" : b.label}
            </span>
          ))}
        </div>
      </div>

      {/* Recommended Range */}
      {recommendedRange && (
        <div className="bg-surface-tertiary rounded-lg p-4 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-text-primary">Recommended Book Range</span>
          </div>
          <div className="text-center">
            <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {recommendedRange.minFormatted} - {recommendedRange.maxFormatted}
            </span>
          </div>
          <p className="text-xs text-text-tertiary text-center mt-1">
            Books within this range offer optimal challenge
          </p>
        </div>
      )}

      {/* Growth */}
      {growth && growth.change !== null && (
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Growth from {growth.fromTerm}</span>
            <div className="flex items-center gap-1">
              {growth.change >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
              )}
              <span
                className={`font-medium ${
                  growth.change >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {growth.change >= 0 ? `+${growth.change}L` : `${growth.change}L`}
              </span>
            </div>
          </div>
          {growth.fromScore !== null && (
            <div className="text-xs text-text-tertiary mt-1">
              {growth.fromScore}L → {lexileScore}L
            </div>
          )}
        </div>
      )}

      {/* Band Description */}
      {band?.description && (
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <p className="text-xs text-text-tertiary">{band.description}</p>
        </div>
      )}

      {/* Explanation */}
      <div className="mt-4 pt-3 border-t border-border-subtle text-xs text-text-tertiary space-y-1">
        <p><strong>Lexile</strong>: A measure of text complexity and reading ability (from BR to 1400L+).</p>
        <p><strong>Recommended Range</strong>: Books within 50L below to 100L above the student&apos;s level.</p>
        <p className="italic">Use Lexile scores to match students with appropriately challenging reading materials.</p>
      </div>
    </div>
  );
}
