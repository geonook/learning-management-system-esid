"use client";

import { History, TrendingUp, ArrowRight } from "lucide-react";
import { type BenchmarkHistoryPoint } from "@/lib/api/map-student-analytics";
import { BENCHMARK_COLORS } from "@/lib/map/benchmarks";

interface StudentBenchmarkHistoryProps {
  data: BenchmarkHistoryPoint[];
  currentGrade: number;
}

export function StudentBenchmarkHistory({ data, currentGrade }: StudentBenchmarkHistoryProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Benchmark History</h3>
        <div className="text-center py-8 text-text-tertiary">
          <History className="w-8 h-8 mx-auto mb-2" />
          <p>No benchmark history available</p>
        </div>
      </div>
    );
  }

  const getBenchmarkColor = (benchmark: string | null) => {
    if (benchmark === "E1") return BENCHMARK_COLORS.E1;
    if (benchmark === "E2") return BENCHMARK_COLORS.E2;
    if (benchmark === "E3") return BENCHMARK_COLORS.E3;
    return "#9ca3af";
  };

  const getBenchmarkBgColor = (benchmark: string | null) => {
    if (benchmark === "E1") return "bg-green-100 dark:bg-green-500/20";
    if (benchmark === "E2") return "bg-amber-100 dark:bg-amber-500/20";
    if (benchmark === "E3") return "bg-red-100 dark:bg-red-500/20";
    return "bg-surface-tertiary";
  };

  // 簡化學期名稱
  const formatTermShort = (term: string) => {
    const match = term.match(/(Fall|Spring)\s+(\d{4})-(\d{4})/);
    if (!match) return term;
    const season = match[1];
    const startYear = match[2];
    if (!season || !startYear) return term;
    const shortYear = startYear.slice(-2);
    return `${season.charAt(0)}${shortYear}`;
  };

  // 計算改善指標
  const getImprovementMessage = () => {
    if (data.length < 2) return null;

    const first = data[0];
    const last = data[data.length - 1];

    if (!first || !last) return null;
    if (!first.benchmark || !last.benchmark) return null;

    const benchmarkOrder = { E3: 0, E2: 1, E1: 2 };
    const firstOrder = benchmarkOrder[first.benchmark as keyof typeof benchmarkOrder] ?? -1;
    const lastOrder = benchmarkOrder[last.benchmark as keyof typeof benchmarkOrder] ?? -1;

    if (lastOrder > firstOrder) {
      return {
        type: "improved" as const,
        message: `Improved from ${first.benchmark} to ${last.benchmark}!`,
      };
    } else if (lastOrder < firstOrder) {
      return {
        type: "declined" as const,
        message: `Dropped from ${first.benchmark} to ${last.benchmark}`,
      };
    } else if (last.average !== null && first.average !== null && last.average > first.average) {
      return {
        type: "growth" as const,
        message: `+${(last.average - first.average).toFixed(1)} points growth`,
      };
    }

    return null;
  };

  const improvement = getImprovementMessage();

  return (
    <div className="bg-surface-elevated rounded-xl border border-border-default p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Benchmark History</h3>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute top-8 left-0 right-0 h-0.5 bg-border-subtle" />

        {/* Timeline Points */}
        <div className="flex justify-between relative">
          {data.map((point, index) => {
            const isLast = index === data.length - 1;
            // G6 沒有 benchmark
            const showBenchmark = point.grade < 6 && point.benchmark;

            return (
              <div key={point.termTested} className="flex flex-col items-center">
                {/* Benchmark Badge */}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                    showBenchmark ? "" : "bg-surface-tertiary"
                  } ${isLast ? "ring-2 ring-purple-500 ring-offset-2 ring-offset-surface-elevated" : ""}`}
                  style={{
                    backgroundColor: showBenchmark ? getBenchmarkColor(point.benchmark) : undefined,
                  }}
                >
                  {showBenchmark ? point.benchmark : "G6"}
                </div>

                {/* Term Label */}
                <div className="mt-2 text-xs text-text-tertiary">
                  {formatTermShort(point.termTested)}
                </div>

                {/* Average Score */}
                <div className="mt-1 text-sm font-medium text-text-primary">
                  {point.average !== null ? point.average : "N/A"}
                </div>

                {/* Grade */}
                <div className="mt-0.5 text-xs text-text-tertiary">
                  G{point.grade}
                </div>
              </div>
            );
          })}
        </div>

        {/* Arrows between points */}
        {data.length > 1 && (
          <div className="absolute top-8 left-0 right-0 flex justify-between px-6 -translate-y-1/2">
            {data.slice(0, -1).map((_, index) => (
              <div key={index} className="flex-1 flex justify-center">
                <ArrowRight className="w-4 h-4 text-text-tertiary" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Improvement Message */}
      {improvement && (
        <div
          className={`mt-6 pt-4 border-t border-border-subtle text-center ${
            improvement.type === "improved"
              ? "text-green-600 dark:text-green-400"
              : improvement.type === "declined"
              ? "text-red-600 dark:text-red-400"
              : "text-purple-600 dark:text-purple-400"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            {improvement.type === "improved" && <TrendingUp className="w-4 h-4" />}
            <span className="text-sm font-medium">{improvement.message}</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-border-subtle">
        <div className="flex justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: BENCHMARK_COLORS.E1 }} />
            <span className="text-text-tertiary">E1 (Above)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: BENCHMARK_COLORS.E2 }} />
            <span className="text-text-tertiary">E2 (On Track)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: BENCHMARK_COLORS.E3 }} />
            <span className="text-text-tertiary">E3 (Below)</span>
          </div>
        </div>
      </div>

      {/* G6 Note */}
      {currentGrade === 6 && (
        <div className="mt-2 text-center text-xs text-text-tertiary">
          Note: G6 students graduate - no benchmark classification
        </div>
      )}
    </div>
  );
}
