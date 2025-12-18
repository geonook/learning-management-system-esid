"use client";

/**
 * MAP Student Section Component
 * Complete MAP assessment display for a student detail page
 * Features: Term selector, assessment history, growth trend chart
 */

import { useEffect, useState, useMemo } from "react";
import {
  Loader2,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  PenTool,
  ChevronDown,
  History,
  Calendar,
} from "lucide-react";
import { MapScoreCard } from "./MapScoreCard";
import { MapGrowthChart } from "./MapGrowthChart";
import {
  getStudentMapHistory,
  getStudentMapHistoryByNumber,
  getGrowthTrend,
  calculateGrowth,
  formatTermLabel,
  getRitScoreColor,
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
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [readingGrowth, setReadingGrowth] = useState<MapGrowthData | null>(null);
  const [languageUsageGrowth, setLanguageUsageGrowth] = useState<MapGrowthData | null>(null);
  const [readingTrend, setReadingTrend] = useState<MapTrendPoint[]>([]);
  const [languageUsageTrend, setLanguageUsageTrend] = useState<MapTrendPoint[]>([]);

  // Only show for G3-G6 students
  const isMapGrade = grade >= 3 && grade <= 6;

  // Get unique terms sorted by date (newest first)
  const availableTerms = useMemo(() => {
    const termSet = new Set<string>();
    assessments.forEach((a) => termSet.add(a.term_tested));
    return Array.from(termSet).sort((a, b) => {
      // Parse term for sorting: "Fall 2025-2026" -> year + season
      const getTermOrder = (term: string) => {
        const match = term.match(/(Fall|Spring)\s+(\d{4})-(\d{4})/);
        if (!match) return 0;
        const [, season, startYear] = match;
        const yearNum = parseInt(startYear || "0");
        const seasonNum = season === "Spring" ? 1 : 0; // Spring comes after Fall in academic year
        return yearNum * 10 + seasonNum;
      };
      return getTermOrder(b) - getTermOrder(a); // Descending (newest first)
    });
  }, [assessments]);

  // Get assessments for selected term
  const selectedAssessments = useMemo(() => {
    if (!selectedTerm) return { reading: null, languageUsage: null };
    const reading = assessments.find(
      (a) => a.term_tested === selectedTerm && a.course === "Reading"
    );
    const languageUsage = assessments.find(
      (a) => a.term_tested === selectedTerm && a.course === "Language Usage"
    );
    return { reading: reading ?? null, languageUsage: languageUsage ?? null };
  }, [assessments, selectedTerm]);

  // Assessment history grouped by term
  const historyByTerm = useMemo(() => {
    const grouped: Record<
      string,
      { reading: MapAssessmentWithGoals | null; languageUsage: MapAssessmentWithGoals | null }
    > = {};
    for (const term of availableTerms) {
      grouped[term] = {
        reading: assessments.find((a) => a.term_tested === term && a.course === "Reading") ?? null,
        languageUsage:
          assessments.find((a) => a.term_tested === term && a.course === "Language Usage") ?? null,
      };
    }
    return grouped;
  }, [assessments, availableTerms]);

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

  // Set default selected term when data loads
  useEffect(() => {
    if (availableTerms.length > 0 && !selectedTerm) {
      setSelectedTerm(availableTerms[0] ?? null);
    }
  }, [availableTerms, selectedTerm]);

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
      {/* Header with Term Selector */}
      <div className="p-4 border-b border-border-default">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold text-text-primary">MAP Growth Assessment</h2>
          </div>
          <div className="flex items-center gap-3">
            {/* History Toggle */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                showHistory
                  ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                  : "bg-surface-tertiary text-text-secondary hover:text-text-primary"
              }`}
            >
              <History className="w-4 h-4" />
              <span>History</span>
            </button>

            {/* Term Selector */}
            <div className="relative">
              <select
                value={selectedTerm || ""}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 bg-surface-tertiary border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 cursor-pointer"
              >
                {availableTerms.map((term) => (
                  <option key={term} value={term}>
                    {formatTermLabel(term)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
            </div>
          </div>
        </div>
        <p className="text-sm text-text-tertiary mt-1">
          {assessments.length} assessment(s) across {availableTerms.length} term(s)
        </p>
      </div>

      {/* Score Cards for Selected Term */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <MapScoreCard
          course="Reading"
          assessment={selectedAssessments.reading}
          growth={readingGrowth}
          showGoals={true}
        />
        <MapScoreCard
          course="Language Usage"
          assessment={selectedAssessments.languageUsage}
          growth={languageUsageGrowth}
          showGoals={true}
        />
      </div>

      {/* Assessment History Table */}
      {showHistory && (
        <div className="px-4 pb-4">
          <div className="bg-surface-default rounded-xl border border-border-default overflow-hidden">
            <div className="p-3 border-b border-border-default bg-surface-tertiary flex items-center gap-2">
              <Calendar className="w-4 h-4 text-text-secondary" />
              <h3 className="text-sm font-medium text-text-primary">Assessment History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wide">
                      Term
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-text-tertiary uppercase tracking-wide">
                      <div className="flex items-center justify-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                        Reading RIT
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-text-tertiary uppercase tracking-wide">
                      Lexile
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-text-tertiary uppercase tracking-wide">
                      <div className="flex items-center justify-center gap-1">
                        <PenTool className="w-3.5 h-3.5 text-purple-500" />
                        Lang Usage RIT
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {availableTerms.map((term) => {
                    const termData = historyByTerm[term];
                    const isSelected = term === selectedTerm;
                    return (
                      <tr
                        key={term}
                        onClick={() => setSelectedTerm(term)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-green-50 dark:bg-green-500/10"
                            : "hover:bg-surface-hover"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span
                            className={`text-sm font-medium ${
                              isSelected
                                ? "text-green-700 dark:text-green-400"
                                : "text-text-primary"
                            }`}
                          >
                            {formatTermLabel(term)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {termData?.reading ? (
                            <span
                              className={`text-lg font-bold ${getRitScoreColor(
                                termData.reading.rit_score,
                                grade
                              )}`}
                            >
                              {termData.reading.rit_score}
                            </span>
                          ) : (
                            <span className="text-text-tertiary">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-text-secondary">
                          {termData?.reading?.lexile_score || "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {termData?.languageUsage ? (
                            <span
                              className={`text-lg font-bold ${getRitScoreColor(
                                termData.languageUsage.rit_score,
                                grade
                              )}`}
                            >
                              {termData.languageUsage.rit_score}
                            </span>
                          ) : (
                            <span className="text-text-tertiary">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Growth Trend Chart */}
      {(readingTrend.length > 1 || languageUsageTrend.length > 1) && (
        <div className="px-4 pb-4">
          <div className="bg-surface-default rounded-xl border border-border-default p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-text-secondary" />
              <h3 className="text-sm font-medium text-text-primary">Growth Trend</h3>
            </div>
            <MapGrowthChart
              readingTrend={readingTrend}
              languageUsageTrend={languageUsageTrend}
              height={200}
            />
          </div>
        </div>
      )}
    </div>
  );
}
