"use client";

import { type StudentBenchmarkStatus as BenchmarkStatusData } from "@/lib/api/map-student-analytics";
import { BENCHMARK_COLORS } from "@/lib/map/benchmarks";

interface StudentBenchmarkStatusProps {
  data: BenchmarkStatusData | null;
}

export function StudentBenchmarkStatus({ data }: StudentBenchmarkStatusProps) {
  if (!data) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Benchmark Status</h3>
        <div className="text-center py-8 text-text-tertiary">
          <p>No benchmark data available</p>
        </div>
      </div>
    );
  }

  // G6 沒有 Benchmark 分類
  if (!data.thresholds) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Benchmark Status</h3>
        <div className="text-center py-8 text-text-tertiary">
          <p>G6 students graduate - no benchmark classification</p>
          {data.average !== null && (
            <p className="mt-2 text-lg font-medium text-text-primary">
              Average: {data.average}
            </p>
          )}
        </div>
      </div>
    );
  }

  const { e1Threshold, e2Threshold } = data.thresholds;

  // 計算進度條位置
  const minScore = e2Threshold - 20; // E3 區域起點
  const maxScore = e1Threshold + 20; // E1 區域終點
  const range = maxScore - minScore;
  const e2Position = ((e2Threshold - minScore) / range) * 100;
  const e1Position = ((e1Threshold - minScore) / range) * 100;
  const currentPosition = data.average !== null
    ? Math.min(100, Math.max(0, ((data.average - minScore) / range) * 100))
    : null;

  const getBenchmarkColor = (benchmark: string | null) => {
    if (benchmark === "E1") return BENCHMARK_COLORS.E1;
    if (benchmark === "E2") return BENCHMARK_COLORS.E2;
    if (benchmark === "E3") return BENCHMARK_COLORS.E3;
    return "#9ca3af";
  };

  return (
    <div className="bg-surface-elevated rounded-xl border border-border-default p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Benchmark Status</h3>
        <span className="text-xs text-text-tertiary bg-surface-tertiary px-2 py-1 rounded">
          G{data.nextYearGrade} Standard
        </span>
      </div>

      {/* Current Level and Average */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-text-secondary">Ready for G{data.nextYearGrade}:</span>
          {data.benchmark && (
            <span
              className="px-3 py-1 rounded-full text-white font-medium"
              style={{ backgroundColor: getBenchmarkColor(data.benchmark) }}
            >
              {data.benchmark}
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="text-text-tertiary text-sm">Average: </span>
          <span className="text-xl font-bold text-text-primary">{data.average ?? "N/A"}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-8 rounded-lg overflow-hidden mb-2">
        {/* E3 區域 */}
        <div
          className="absolute top-0 h-full"
          style={{
            left: 0,
            width: `${e2Position}%`,
            backgroundColor: BENCHMARK_COLORS.E3,
            opacity: 0.3,
          }}
        />
        {/* E2 區域 */}
        <div
          className="absolute top-0 h-full"
          style={{
            left: `${e2Position}%`,
            width: `${e1Position - e2Position}%`,
            backgroundColor: BENCHMARK_COLORS.E2,
            opacity: 0.3,
          }}
        />
        {/* E1 區域 */}
        <div
          className="absolute top-0 h-full"
          style={{
            left: `${e1Position}%`,
            width: `${100 - e1Position}%`,
            backgroundColor: BENCHMARK_COLORS.E1,
            opacity: 0.3,
          }}
        />

        {/* Current Position Indicator */}
        {currentPosition !== null && (
          <div
            className="absolute top-0 h-full w-1 bg-text-primary"
            style={{ left: `calc(${currentPosition}% - 2px)` }}
          >
            <div
              className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent"
              style={{ borderTopColor: getBenchmarkColor(data.benchmark) }}
            />
          </div>
        )}
      </div>

      {/* Threshold Labels */}
      <div className="relative h-6 text-xs text-text-tertiary">
        <span className="absolute left-0">E3</span>
        <span className="absolute" style={{ left: `${e2Position}%`, transform: "translateX(-50%)" }}>
          {e2Threshold}
        </span>
        <span className="absolute" style={{ left: `${(e2Position + e1Position) / 2}%`, transform: "translateX(-50%)" }}>
          E2
        </span>
        <span className="absolute" style={{ left: `${e1Position}%`, transform: "translateX(-50%)" }}>
          {e1Threshold}
        </span>
        <span className="absolute right-0">E1</span>
      </div>

      {/* Distance Info */}
      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border-subtle">
        <div className="text-center">
          <div className="text-sm text-text-tertiary">Distance to E1</div>
          <div className={`text-lg font-medium ${data.benchmark === "E1" ? "text-green-600" : "text-text-primary"}`}>
            {data.benchmark === "E1" ? "Achieved!" : data.distanceToE1 !== null ? `+${data.distanceToE1} points` : "N/A"}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-text-tertiary">Buffer from E3</div>
          <div className={`text-lg font-medium ${data.benchmark === "E3" ? "text-red-600" : "text-text-primary"}`}>
            {data.benchmark === "E3" ? "At Risk" : data.distanceToE3 !== null ? `+${data.distanceToE3} points` : "N/A"}
          </div>
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border-subtle text-center text-sm">
        <div>
          <span className="text-text-tertiary">Language Usage: </span>
          <span className="font-medium text-text-primary">{data.languageUsage ?? "N/A"}</span>
        </div>
        <div>
          <span className="text-text-tertiary">Reading: </span>
          <span className="font-medium text-text-primary">{data.reading ?? "N/A"}</span>
        </div>
      </div>
    </div>
  );
}
