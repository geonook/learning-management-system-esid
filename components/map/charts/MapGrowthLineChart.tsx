"use client";

/**
 * MAP Growth Line Chart (v1.65.0)
 *
 * 提供兩種視圖切換：
 * 1. 時間趨勢 (Trend): X 軸為學期，比較各 Level 的長期趨勢
 * 2. Level 比較 (Compare): X 軸為 Level，比較 Fall vs Spring 的差異
 *
 * Clean Chart Layout:
 * - Full-width line chart with end-point labels
 * - Minimal footer (norm indicator only)
 * - Enhanced tooltip and animations
 *
 * X-axis: Terms (FA 24-25, SP 24-25, FA 25-26)
 * Y-axis: RIT Score
 * Lines: English Levels (E1, E2, E3, All)
 */

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
} from "recharts";
import type { MapAnalyticsChartData } from "@/lib/api/map-analytics";
import {
  getNorm,
  getNormAverage,
  parseTermTested,
  type Course,
} from "@/lib/map/norms";
import { ENGLISH_LEVEL_COLORS, NWEA_COLORS } from "@/lib/map/colors";
import { formatTermStats, calculateYAxisRange } from "@/lib/map/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapLevelCompareChart } from "./MapLevelCompareChart";

type ViewMode = "trend" | "compare";

interface MapGrowthLineChartProps {
  data: MapAnalyticsChartData;
  showNorm?: boolean;
  height?: number;
  /** 預設視圖模式 */
  defaultViewMode?: ViewMode;
}

// Custom Label for Line End Points
interface EndLabelProps {
  x?: string | number;
  y?: string | number;
  value?: number | string | null;
  index?: number;
  dataLength: number;
  level: string;
  color: string;
}

function EndLabel({
  x,
  y,
  value,
  index,
  dataLength,
  level,
  color,
}: EndLabelProps) {
  // Only show label on the last data point
  if (index !== dataLength - 1 || value === null || value === undefined)
    return null;

  const xPos = typeof x === "number" ? x : parseFloat(x ?? "0");
  const yPos = typeof y === "number" ? y : parseFloat(y ?? "0");
  const numValue = typeof value === "number" ? value : parseFloat(value);

  if (isNaN(numValue)) return null;

  return (
    <text
      x={xPos + 8}
      y={yPos}
      dy={4}
      fill={color}
      fontSize={11}
      fontWeight={500}
    >
      {level} ({numValue.toFixed(1)})
    </text>
  );
}

/**
 * 檢查是否有足夠資料顯示 Level 比較視圖
 * 需要至少一個學年有 Fall 或 Spring 資料
 */
function hasCompareData(terms: string[]): boolean {
  const yearMap = new Map<string, { fall: boolean; spring: boolean }>();

  terms.forEach((term) => {
    const parsed = parseTermTested(term);
    if (!parsed) return;

    const year = parsed.academicYear;
    if (!yearMap.has(year)) {
      yearMap.set(year, { fall: false, spring: false });
    }

    const entry = yearMap.get(year)!;
    if (parsed.mapTerm === "fall") entry.fall = true;
    if (parsed.mapTerm === "spring") entry.spring = true;
  });

  // 至少有一個學年有 Fall 或 Spring
  return Array.from(yearMap.values()).some((y) => y.fall || y.spring);
}

export function MapGrowthLineChart({
  data,
  showNorm = true,
  height = 300,
  defaultViewMode = "trend",
}: MapGrowthLineChartProps) {
  // 檢查是否可以顯示 Level 比較
  const canShowCompare = useMemo(
    () => hasCompareData(data?.terms || []),
    [data?.terms]
  );

  // 視圖模式狀態
  const [viewMode, setViewMode] = useState<ViewMode>(
    canShowCompare ? defaultViewMode : "trend"
  );

  if (!data || data.terms.length === 0 || data.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No data available
      </div>
    );
  }

  // Get all English Levels
  const levels = useMemo(() => data.data.map((d) => d.level), [data]);

  // Transform data: X-axis = Terms, Lines = English Levels
  const chartData = useMemo(() => {
    return data.terms.map((term, termIdx) => {
      const row: Record<string, string | number | null> = {
        term,
        termShort: formatTermStats(term),
      };
      data.data.forEach((levelData) => {
        row[levelData.level] = levelData.scores[termIdx] ?? null;
      });
      return row;
    });
  }, [data]);

  // Calculate Y-axis range
  const { minY: yMin, maxY: yMax } = useMemo(() => {
    const allScores = data.data.flatMap((d) => d.scores);
    return calculateYAxisRange(allScores, {
      minFloor: 100,
      minPadding: 10,
      maxPadding: 15,
    });
  }, [data]);

  // Get norm value for reference line
  const getNormValue = (term: string): number | null => {
    const parsed = parseTermTested(term);
    if (!parsed) return null;

    if (data.course === "Average") {
      return getNormAverage(parsed.academicYear, data.grade, parsed.mapTerm);
    }
    return getNorm(
      parsed.academicYear,
      data.grade,
      parsed.mapTerm,
      data.course as Course
    );
  };

  // Course title
  const courseTitle =
    data.course === "Language Usage"
      ? "Language Usage"
      : data.course === "Reading"
        ? "Reading"
        : "Average";

  // Get latest norm value
  const latestNorm = useMemo(() => {
    if (data.terms.length === 0) return null;
    const latestTerm = data.terms[data.terms.length - 1];
    return latestTerm ? getNormValue(latestTerm) : null;
  }, [data.terms]);

  // Get Level color
  const getLevelColor = (level: string) => {
    return (
      ENGLISH_LEVEL_COLORS[level] ?? { color: "#94a3b8", stroke: "#94a3b8" }
    );
  };

  // 如果是 Level 比較模式，直接渲染 MapLevelCompareChart
  if (viewMode === "compare" && canShowCompare) {
    return (
      <div className="w-full">
        {/* View Mode Tabs */}
        <div className="flex items-center justify-center mb-3">
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewMode)}
          >
            <TabsList className="h-7">
              <TabsTrigger value="trend" className="text-xs px-3 py-1">
                Time Trend
              </TabsTrigger>
              <TabsTrigger value="compare" className="text-xs px-3 py-1">
                Level Compare
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <MapLevelCompareChart data={data} showNorm={showNorm} height={height} />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* View Mode Tabs */}
      {canShowCompare && (
        <div className="flex items-center justify-center mb-2">
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewMode)}
          >
            <TabsList className="h-7">
              <TabsTrigger value="trend" className="text-xs px-3 py-1">
                Time Trend
              </TabsTrigger>
              <TabsTrigger value="compare" className="text-xs px-3 py-1">
                Level Compare
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      <h4 className="text-sm font-medium mb-3 text-center">
        G{data.grade} MAP {courseTitle}
      </h4>

      {/* Full-width Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 80, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={NWEA_COLORS.gridLine} />
          <XAxis
            dataKey="termShort"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            width={40}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              return (
                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                  <p className="font-medium text-sm mb-2">{label}</p>
                  <div className="space-y-1">
                    {payload.map((entry) => (
                      <div
                        key={entry.name}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-muted-foreground">
                          {entry.name}:
                        </span>
                        <span className="font-mono font-medium">
                          {typeof entry.value === "number"
                            ? entry.value.toFixed(1)
                            : "N/A"}
                        </span>
                      </div>
                    ))}
                    {showNorm && latestNorm !== null && (
                      <div className="flex items-center gap-2 text-xs pt-1 border-t border-border mt-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: NWEA_COLORS.norm }}
                        />
                        <span className="text-muted-foreground">Norm:</span>
                        <span className="font-mono font-medium">
                          {latestNorm.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
          />

          {/* Draw lines for each English Level */}
          {levels.map((level) => {
            const colors = getLevelColor(level);
            return (
              <Line
                key={level}
                type="monotone"
                dataKey={level}
                name={level}
                stroke={colors.stroke}
                strokeWidth={2.5}
                dot={{
                  fill: colors.color,
                  strokeWidth: 2,
                  r: 5,
                  stroke: "#fff",
                }}
                activeDot={{ r: 7, stroke: colors.color, strokeWidth: 2 }}
                connectNulls
                animationDuration={800}
                animationEasing="ease-out"
              >
                <LabelList
                  content={(props) => (
                    <EndLabel
                      {...props}
                      dataLength={chartData.length}
                      level={level}
                      color={colors.color}
                    />
                  )}
                />
              </Line>
            );
          })}

          {/* Norm reference line */}
          {showNorm && latestNorm !== null && (
            <ReferenceLine
              y={latestNorm}
              stroke={NWEA_COLORS.norm}
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Norm indicator */}
      {showNorm && latestNorm !== null && (
        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
          <span className="inline-block w-4 border-t-2 border-dashed border-gray-400" />
          <span>Norm: {latestNorm.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}
