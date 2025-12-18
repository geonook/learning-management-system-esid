"use client";

/**
 * MAP Goal Radar Chart
 *
 * 雷達圖顯示各 Goal Area 的平均分數
 * 支援多個 English Level 的比較 (E1/E2/E3)
 * Reading: Informational Text, Literary Text, Vocabulary
 * Language Usage: Grammar and Usage, Mechanics, Writing
 */

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Info } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GoalPerformanceData } from "@/lib/api/map-analytics";

// English Level 顏色配置
const LEVEL_COLORS: Record<string, string> = {
  E1: "#22c55e", // 綠色
  E2: "#f59e0b", // 橙色
  E3: "#ef4444", // 紅色
  All: "#3b82f6", // 藍色
};

// Goal 短名稱映射
const GOAL_SHORT_NAMES: Record<string, string> = {
  "Informational Text": "Info Text",
  "Literary Text": "Literary",
  "Vocabulary": "Vocab",
  "Grammar and Usage": "Grammar",
  "Mechanics": "Mechanics",
  "Writing": "Writing",
};

interface MapGoalRadarProps {
  data: GoalPerformanceData | null;
  selectedLevels?: string[]; // 預設顯示 ["E1", "E2", "E3"]
  height?: number;
}

export function MapGoalRadar({
  data,
  selectedLevels = ["E1", "E2", "E3"],
  height = 350,
}: MapGoalRadarProps) {
  if (!data || data.byLevel.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-muted-foreground">
        No goal performance data available
      </div>
    );
  }

  // 取得課程的所有 Goal 名稱
  const goalNames = data.allStudents.map((g) => g.goalName);

  // 轉換為 recharts 雷達圖格式
  // [{ goal: "Info Text", E1: 207, E2: 195, E3: 180 }, ...]
  const chartData = goalNames.map((goalName) => {
    const row: Record<string, string | number | null> = {
      goal: GOAL_SHORT_NAMES[goalName] || goalName,
      fullName: goalName,
    };

    // 為每個 Level 添加資料
    for (const levelData of data.byLevel) {
      if (selectedLevels.includes(levelData.englishLevel)) {
        const goal = levelData.goals.find((g) => g.goalName === goalName);
        row[levelData.englishLevel] = goal?.avgMidpoint ?? null;
      }
    }

    return row;
  });

  // 計算 Y 軸範圍
  const allScores: number[] = [];
  data.byLevel.forEach((level) => {
    if (selectedLevels.includes(level.englishLevel)) {
      level.goals.forEach((g) => {
        if (g.avgMidpoint !== null) {
          allScores.push(g.avgMidpoint);
        }
      });
    }
  });

  const minScore = allScores.length > 0 ? Math.min(...allScores) : 150;
  const maxScore = allScores.length > 0 ? Math.max(...allScores) : 250;
  const domain = [
    Math.floor((minScore - 10) / 10) * 10,
    Math.ceil((maxScore + 10) / 10) * 10,
  ];

  // 格式化學期標籤
  const formatTermLabel = (term: string): string => {
    const match = term.match(/^(Fall|Spring)\s+(\d{4})-(\d{4})$/);
    if (!match) return term;
    return `${match[1] === "Fall" ? "F" : "S"} ${match[2]?.slice(2)}-${match[3]?.slice(2)}`;
  };

  const courseTitle = data.course === "Reading" ? "Reading" : "Language Usage";

  return (
    <TooltipProvider>
      <div className="w-full">
        <div className="flex items-center justify-center gap-1 mb-1">
          <h4 className="text-sm font-medium text-center">
            G{data.grade} {courseTitle} Goal Performance
          </h4>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[300px]">
              <div className="text-xs space-y-1">
                <p><strong>Goal Performance Radar:</strong></p>
                <p>
                  Shows average RIT scores across different goal areas for each
                  English proficiency level. Larger areas indicate stronger performance.
                </p>
                <p className="mt-1 text-muted-foreground">
                  Based on goal RIT range midpoint averages.
                </p>
              </div>
            </TooltipContent>
          </UITooltip>
        </div>
        <p className="text-xs text-muted-foreground text-center mb-2">
          {formatTermLabel(data.termTested)}
        </p>

        <ResponsiveContainer width="100%" height={height}>
          <RadarChart data={chartData}>
            <PolarGrid className="stroke-muted" />
            <PolarAngleAxis
              dataKey="goal"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <PolarRadiusAxis
              angle={90}
              domain={domain}
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;

                const data = payload[0]?.payload;
                if (!data) return null;

                return (
                  <div
                    className="rounded-lg border bg-popover p-2 shadow-md"
                    style={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  >
                    <p className="text-xs font-medium mb-1">
                      {data.fullName as string}
                    </p>
                    {payload.map((entry) => {
                      if (entry.dataKey === "goal" || entry.dataKey === "fullName") {
                        return null;
                      }
                      return (
                        <p key={entry.dataKey} className="text-xs" style={{ color: entry.color }}>
                          {entry.dataKey}: {entry.value !== null ? (entry.value as number).toFixed(1) : "-"}
                        </p>
                      );
                    })}
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px" }}
              formatter={(value) => `G${data.grade}${value}`}
            />

            {/* 為每個選定的 Level 繪製雷達線 */}
            {selectedLevels.map((level) => (
              <Radar
                key={level}
                name={level}
                dataKey={level}
                stroke={LEVEL_COLORS[level] || "#666"}
                fill={LEVEL_COLORS[level] || "#666"}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>

        {/* Explanation Box */}
        <div className="mt-3 p-2 bg-muted/50 rounded-md text-xs text-muted-foreground">
          <p className="mb-1">
            <strong>Note:</strong> Each axis represents a specific goal area within the{" "}
            {courseTitle} assessment. Scores are based on the midpoint of each goal&apos;s RIT range.
          </p>
          <p>
            {data.course === "Reading" ? (
              <>
                <strong>Reading Goals:</strong> Informational Text (non-fiction),
                Literary Text (fiction), and Vocabulary.
              </>
            ) : (
              <>
                <strong>Language Usage Goals:</strong> Grammar and Usage, Mechanics
                (punctuation/spelling), and Writing.
              </>
            )}
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}
