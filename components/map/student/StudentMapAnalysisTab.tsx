"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import {
  getStudentMapAnalytics,
  getStudentProgressHistory,
  type StudentMapAnalytics,
  type ProgressHistoryPoint,
} from "@/lib/api/map-student-analytics";
import { StudentBenchmarkStatus } from "./StudentBenchmarkStatus";
import { StudentGrowthIndex } from "./StudentGrowthIndex";
import { StudentGoalAreas } from "./StudentGoalAreas";
import { StudentLexileLevel } from "./StudentLexileLevel";
import { StudentBenchmarkHistory } from "./StudentBenchmarkHistory";
import { StudentPeerComparison } from "./StudentPeerComparison";
import { StudentProgressCharts } from "./StudentProgressChart";
import { StudentAssessmentTables } from "./StudentAssessmentTable";

interface StudentMapAnalysisTabProps {
  studentId: string;
  studentNumber: string;
  grade: number;
  classId: string | null;
}

export function StudentMapAnalysisTab({
  studentId,
  studentNumber,
  grade,
  classId,
}: StudentMapAnalysisTabProps) {
  const [analytics, setAnalytics] = useState<StudentMapAnalytics | null>(null);
  const [progressHistory, setProgressHistory] = useState<ProgressHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      try {
        // Fetch both analytics and progress history in parallel
        const [analyticsData, historyData] = await Promise.all([
          getStudentMapAnalytics(studentId, studentNumber, grade, classId),
          getStudentProgressHistory(studentNumber, grade),
        ]);
        setAnalytics(analyticsData);
        setProgressHistory(historyData);
      } catch (err) {
        console.error("Failed to fetch MAP analytics:", err);
        setError(err instanceof Error ? err.message : "Failed to load MAP analytics");
      } finally {
        setLoading(false);
      }
    }

    if (studentNumber && grade >= 3 && grade <= 6) {
      fetchAnalytics();
    } else {
      setLoading(false);
      setError("MAP analysis is only available for G3-G6 students");
    }
  }, [studentId, studentNumber, grade, classId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-500 dark:text-purple-400 animate-spin" />
        <span className="ml-3 text-text-secondary">Loading MAP analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default p-8 text-center">
        <AlertCircle className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
        <h3 className="text-lg font-medium text-text-primary mb-2">No MAP Data Available</h3>
        <p className="text-text-secondary">
          This student does not have any MAP assessment data recorded.
        </p>
      </div>
    );
  }

  const {
    benchmarkStatus,
    growthIndex,
    goalPerformance,
    lexileStatus,
    benchmarkHistory,
    rankings,
  } = analytics;

  // 檢查是否有任何資料
  const hasAnyData =
    benchmarkStatus ||
    growthIndex ||
    goalPerformance ||
    lexileStatus ||
    benchmarkHistory.length > 0 ||
    rankings ||
    progressHistory.length > 0;

  if (!hasAnyData) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default p-8 text-center">
        <AlertCircle className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
        <h3 className="text-lg font-medium text-text-primary mb-2">No MAP Data Available</h3>
        <p className="text-text-secondary">
          This student does not have any MAP assessment data recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Score Summary Cards (Future: add ScoreSummaryCards here) */}

      {/* Section 2: Growth Over Time Charts */}
      {progressHistory.length > 0 && (
        <StudentProgressCharts data={progressHistory} />
      )}

      {/* Section 3: Assessment History Tables */}
      {progressHistory.length > 0 && (
        <StudentAssessmentTables data={progressHistory} />
      )}

      {/* Section 4: Growth & Achievement Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StudentGrowthIndex data={growthIndex} />
        <StudentBenchmarkStatus data={benchmarkStatus} />
      </div>

      {/* Section 5: Instructional Areas (Goal Performance) */}
      <StudentGoalAreas data={goalPerformance} />

      {/* Section 6: Additional Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StudentLexileLevel data={lexileStatus} />
        <StudentPeerComparison data={rankings} />
        <StudentBenchmarkHistory data={benchmarkHistory} currentGrade={grade} />
      </div>
    </div>
  );
}
