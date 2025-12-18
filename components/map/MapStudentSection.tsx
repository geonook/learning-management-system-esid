"use client";

/**
 * MAP Student Section Component
 * Complete MAP assessment display for a student detail page
 */

import { useEffect, useState } from "react";
import { Loader2, Target, TrendingUp } from "lucide-react";
import { MapScoreCard } from "./MapScoreCard";
import { MapGrowthChart } from "./MapGrowthChart";
import {
  getStudentMapHistory,
  getStudentMapHistoryByNumber,
  getGrowthTrend,
  calculateGrowth,
  type MapAssessmentWithGoals,
  type MapGrowthData,
  type MapTrendPoint,
} from "@/lib/api/map-assessments";

interface MapStudentSectionProps {
  studentId?: string; // UUID from students table
  studentNumber?: string; // Student ID like "LE12001"
  grade: number;
}

export function MapStudentSection({ studentId, studentNumber, grade }: MapStudentSectionProps) {
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<MapAssessmentWithGoals[]>([]);
  const [latestReading, setLatestReading] = useState<MapAssessmentWithGoals | null>(null);
  const [latestLanguageUsage, setLatestLanguageUsage] = useState<MapAssessmentWithGoals | null>(null);
  const [readingGrowth, setReadingGrowth] = useState<MapGrowthData | null>(null);
  const [languageUsageGrowth, setLanguageUsageGrowth] = useState<MapGrowthData | null>(null);
  const [readingTrend, setReadingTrend] = useState<MapTrendPoint[]>([]);
  const [languageUsageTrend, setLanguageUsageTrend] = useState<MapTrendPoint[]>([]);

  // Only show for G3-G6 students
  const isMapGrade = grade >= 3 && grade <= 6;

  useEffect(() => {
    if (!isMapGrade) {
      setLoading(false);
      return;
    }

    async function fetchMapData() {
      setLoading(true);
      try {
        let data: MapAssessmentWithGoals[];

        if (studentId) {
          data = await getStudentMapHistory(studentId);
        } else if (studentNumber) {
          data = await getStudentMapHistoryByNumber(studentNumber);
        } else {
          setLoading(false);
          return;
        }

        setAssessments(data);

        // Get latest assessments for each course
        const readingAssessments = data.filter((a) => a.course === "Reading");
        const languageUsageAssessments = data.filter((a) => a.course === "Language Usage");

        const latestR = readingAssessments.length > 0 ? readingAssessments[readingAssessments.length - 1] : null;
        const latestLU = languageUsageAssessments.length > 0 ? languageUsageAssessments[languageUsageAssessments.length - 1] : null;

        setLatestReading(latestR ?? null);
        setLatestLanguageUsage(latestLU ?? null);

        // Calculate growth
        setReadingGrowth(calculateGrowth(data, "Reading"));
        setLanguageUsageGrowth(calculateGrowth(data, "Language Usage"));

        // Get trend data
        setReadingTrend(getGrowthTrend(data, "Reading"));
        setLanguageUsageTrend(getGrowthTrend(data, "Language Usage"));
      } catch (error) {
        console.error("Failed to fetch MAP data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMapData();
  }, [studentId, studentNumber, grade, isMapGrade]);

  // Don't render for non-MAP grades
  if (!isMapGrade) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default shadow-sm">
        <div className="p-4 border-b border-border-default flex items-center gap-2">
          <Target className="w-5 h-5 text-green-500" />
          <h2 className="text-lg font-semibold text-text-primary">MAP Growth Assessment</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
        </div>
      </div>
    );
  }

  // No data state
  if (assessments.length === 0) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default shadow-sm">
        <div className="p-4 border-b border-border-default flex items-center gap-2">
          <Target className="w-5 h-5 text-green-500" />
          <h2 className="text-lg font-semibold text-text-primary">MAP Growth Assessment</h2>
        </div>
        <div className="p-8 text-center">
          <Target className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
          <p className="text-text-secondary">No MAP assessment data available</p>
          <p className="text-sm text-text-tertiary mt-1">
            MAP assessments are conducted in Fall and Spring terms for G3-G6 students.
          </p>
        </div>
      </div>
    );
  }

  // Has data
  return (
    <div className="bg-surface-elevated rounded-xl border border-border-default shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-border-default flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-green-500" />
          <h2 className="text-lg font-semibold text-text-primary">MAP Growth Assessment</h2>
        </div>
        <span className="text-sm text-text-tertiary">{assessments.length} assessment(s)</span>
      </div>

      {/* Score Cards */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <MapScoreCard
          course="Reading"
          assessment={latestReading}
          growth={readingGrowth}
          showGoals={true}
        />
        <MapScoreCard
          course="Language Usage"
          assessment={latestLanguageUsage}
          growth={languageUsageGrowth}
          showGoals={true}
        />
      </div>

      {/* Growth Trend Chart */}
      {(readingTrend.length > 1 || languageUsageTrend.length > 1) && (
        <div className="px-4 pb-4">
          <div className="bg-surface-tertiary rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-text-secondary" />
              <h3 className="text-sm font-medium text-text-primary">Growth Trend</h3>
            </div>
            <MapGrowthChart
              readingTrend={readingTrend}
              languageUsageTrend={languageUsageTrend}
              height={180}
            />
          </div>
        </div>
      )}
    </div>
  );
}
