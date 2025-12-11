"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { ChartWrapper } from "./ChartWrapper";

interface ClassStatistics {
  class_name: string;
  term_grade_avg: number | null;
  fa_avg: number | null;
  sa_avg: number | null;
  pass_rate: number | null;
  excellent_rate: number | null;
}

interface RadarComparisonChartProps {
  data: ClassStatistics[];
  loading: boolean;
  title?: string;
  selectedClasses?: string[];
}

export function RadarComparisonChart({
  data,
  loading,
  title = "Multi-Metric Comparison",
  selectedClasses,
}: RadarComparisonChartProps) {
  // Take first 3 classes if none selected
  const classesToShow = selectedClasses?.length
    ? data.filter((d) => selectedClasses.includes(d.class_name))
    : data.slice(0, 3);

  if (classesToShow.length === 0) {
    return (
      <ChartWrapper
        title={title}
        subtitle="Compare classes across multiple metrics"
        loading={loading}
        isEmpty={true}
        height={320}
      >
        <div />
      </ChartWrapper>
    );
  }

  // Build radar data with all metrics
  const metrics = [
    { key: "term_avg", label: "Term Avg" },
    { key: "fa_avg", label: "FA Avg" },
    { key: "sa_avg", label: "SA Avg" },
    { key: "pass_rate", label: "Pass %" },
    { key: "excellent_rate", label: "Excellent %" },
  ];

  const radarData = metrics.map((metric) => {
    const point: Record<string, number | string> = { metric: metric.label };
    classesToShow.forEach((cls) => {
      let value = 0;
      switch (metric.key) {
        case "term_avg":
          value = cls.term_grade_avg ?? 0;
          break;
        case "fa_avg":
          value = cls.fa_avg ?? 0;
          break;
        case "sa_avg":
          value = cls.sa_avg ?? 0;
          break;
        case "pass_rate":
          value = (cls.pass_rate ?? 0) * 100;
          break;
        case "excellent_rate":
          value = (cls.excellent_rate ?? 0) * 100;
          break;
      }
      point[cls.class_name] = value;
    });
    return point;
  });

  const colors = ["#06b6d4", "#8b5cf6", "#f59e0b"];

  return (
    <ChartWrapper
      title={title}
      subtitle="Compare classes across multiple metrics"
      loading={loading}
      isEmpty={radarData.length === 0}
      height={320}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
          <PolarGrid stroke="rgba(148, 163, 184, 0.3)" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "#94a3b8", fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(15, 23, 42, 0.9)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              borderRadius: "8px",
              color: "#f1f5f9",
            }}
            formatter={(value: number) => [`${value.toFixed(1)}`, ""]}
          />
          <Legend
            wrapperStyle={{ paddingTop: 10 }}
            formatter={(value) => (
              <span style={{ color: "#94a3b8" }}>{value}</span>
            )}
          />
          {classesToShow.map((cls, index) => (
            <Radar
              key={cls.class_name}
              name={cls.class_name}
              dataKey={cls.class_name}
              stroke={colors[index % colors.length]}
              fill={colors[index % colors.length]}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
