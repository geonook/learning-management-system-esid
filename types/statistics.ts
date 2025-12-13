/**
 * Statistics & Analytics Types
 *
 * Types for comprehensive grade analysis and performance tracking.
 * Following the exact output format from the specification.
 *
 * Important Notes:
 * - Only Midterm scores exist (no Final yet)
 * - LT vs IT should never be compared directly (different curricula)
 * - Grade Level format: "G1E1", "G1E2", "G1E3", etc.
 */

// ============================================================
// Basic Types
// ============================================================

export type CourseType = 'LT' | 'IT' | 'KCFS';

export type PerformanceLevel = 'excellent' | 'good' | 'average' | 'pass' | 'needs_improvement';

// ============================================================
// Class Statistics Interface (Example 1)
// ============================================================

/**
 * Statistics for a single class and course type
 *
 * Example row:
 * | G1 Achievers | IT | G1E1 | 20 | 94.2 | 99.3 | 84.8 | 3.44 | 96.09 | 93.22 | 100.00% | 85.00% |
 */
export interface ClassStatistics {
  // Basic info
  class_id: string;
  class_name: string;           // e.g., "G1 Achievers"
  subject_type: CourseType;
  grade_level: string;          // e.g., "G1E1", "G2E2" (from classes.level)
  student_count: number;        // e.g., 20

  // Statistical measures
  term_grade_avg: number | null;  // e.g., 94.2
  max: number | null;             // e.g., 99.3
  min: number | null;             // e.g., 84.8
  std_dev: number | null;         // e.g., 3.44
  fa_avg: number | null;          // e.g., 96.09 (Formative Average: FA1-FA8)
  sa_avg: number | null;          // e.g., 93.22 (Summative Average: SA1-SA4)
  pass_rate: number | null;       // e.g., 100.00 (percentage, ≥60)
  excellent_rate: number | null;  // e.g., 85.00 (percentage, ≥90)
}

// ============================================================
// Grade Level Statistics Interface (Examples 2 & 3)
// ============================================================

/**
 * Aggregated statistics for a grade level
 *
 * Example row:
 * | G1E1 | IT | 5 | 99 | 92.37 | 99.3 | 67.4 | 93.05 | 92.1 | 100.00% | 73.70% |
 */
export interface GradeLevelStatistics {
  grade_level: string;          // e.g., "G1E1"
  subject_type: CourseType;
  class_count: number;          // e.g., 5
  student_count: number;        // e.g., 99

  // Statistical measures
  term_grade_avg: number | null;  // e.g., 92.37
  max: number | null;             // e.g., 99.3
  min: number | null;             // e.g., 67.4
  fa_avg: number | null;          // e.g., 93.05
  sa_avg: number | null;          // e.g., 92.1
  pass_rate: number | null;       // e.g., 100.00
  excellent_rate: number | null;  // e.g., 73.70
  std_dev: number | null;         // e.g., 5.93
}

/**
 * Simplified grade level summary (for LT/IT/KCFS summary views)
 *
 * Example row:
 * | G1E1 | 98 | 89.89 | 100.00% | 59.20% | 5.93 |
 */
export interface GradeLevelSummary {
  grade_level: string;          // e.g., "G1E1"
  total_students: number;       // e.g., 98
  grade_avg: number | null;     // e.g., 89.89
  pass_rate: number | null;     // e.g., 100.00
  excellent_rate: number | null; // e.g., 59.20
  std_dev: number | null;       // e.g., 5.93
}

// ============================================================
// Class Ranking Interface (Example 4)
// ============================================================

/**
 * Class ranking within same grade level and course type
 *
 * Example row:
 * | #1 in G1E1 | G1 Navigators | G1E1 | 91.01 | 20 | 100.00% | 70.00% | Excellent | +1.13 |
 */
export interface ClassRanking {
  rank: number;                 // e.g., 1, 2, 3...
  rank_label: string;           // e.g., "#1 in G1E1"
  class_id: string;
  class_name: string;           // e.g., "G1 Navigators"
  grade_level: string;          // e.g., "G1E1"
  term_avg: number | null;      // e.g., 91.01
  student_count: number;        // e.g., 20
  pass_rate: number | null;     // e.g., 100.00
  excellent_rate: number | null; // e.g., 70.00
  performance: PerformanceLevel; // e.g., 'excellent'
  vs_grade_avg: number | null;  // e.g., +1.13 (difference from grade average)
}

/**
 * Grade level average summary (displayed as a separator row in rankings)
 *
 * Example row:
 * | **G1E1 Average** | | G1E1 | **89.88** | **98** | | | | |
 */
export interface GradeLevelAverage {
  grade_level: string;          // e.g., "G1E1"
  term_avg: number;             // e.g., 89.88
  student_count: number;        // e.g., 98
}

// ============================================================
// Student Grade Row Interface (Raw Data)
// ============================================================

/**
 * Individual student grade data
 * Used for "All Student Grades" page
 */
export interface StudentGradeRow {
  student_id: string;
  student_number: string;       // e.g., "S2025001"
  full_name: string;
  class_id: string;
  class_name: string;
  grade_level: string;          // e.g., "G1E1"
  course_type: CourseType;

  // Individual assessment scores
  fa1: number | null;
  fa2: number | null;
  fa3: number | null;
  fa4: number | null;
  fa5: number | null;
  fa6: number | null;
  fa7: number | null;
  fa8: number | null;
  sa1: number | null;
  sa2: number | null;
  sa3: number | null;
  sa4: number | null;
  midterm: number | null;       // Note: No Final yet

  // Calculated fields
  fa_avg: number | null;
  sa_avg: number | null;
  term_grade: number | null;    // Based on FA + SA + Midterm
}

// ============================================================
// Filter and Query Types
// ============================================================

export interface StatisticsFilters {
  grade?: number;               // 1-6
  grade_level?: string;         // e.g., "G1E1"
  course_type?: CourseType;
  class_id?: string;
  search?: string;
  academic_year?: string;       // e.g., "2025-2026"
  term?: 1 | 2 | 3 | 4;         // Term 1-4 (four-term system)
}

export interface RankingFilters {
  grade_level: string;          // Required: e.g., "G1E1"
  course_type: CourseType;      // Required: LT, IT, or KCFS
  metric?: 'term_avg' | 'pass_rate' | 'excellent_rate'; // Default: 'term_avg'
  academic_year?: string;       // e.g., "2025-2026"
  term?: 1 | 2 | 3 | 4;         // Term 1-4 (four-term system)
}

// ============================================================
// Page Data Types
// ============================================================

export interface ClassStatisticsPageData {
  statistics: ClassStatistics[];
  total_classes: number;
  filters_applied: StatisticsFilters;
}

export interface GradeLevelPageData {
  statistics: GradeLevelStatistics[];
  summaries: GradeLevelSummary[];
  course_type: CourseType;
}

export interface RankingPageData {
  rankings: ClassRanking[];
  grade_averages: GradeLevelAverage[];
  filters_applied: RankingFilters;
}

// ============================================================
// Navigation Card Types (for Stats Home Page)
// ============================================================

export interface StatNavCard {
  title: string;
  description: string;
  icon: string;                 // Icon name (e.g., "Users", "School", "Trophy")
  href: string;
  color: string;                // Tailwind color class
}

// ============================================================
// Helper Constants
// ============================================================

/**
 * Performance level thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  excellent: 90,
  good: 80,
  average: 70,
  pass: 60,
} as const;

/**
 * Performance level emoji mapping
 */
export const PERFORMANCE_EMOJI: Record<PerformanceLevel, string> = {
  excellent: '🌟',
  good: '🟢',
  average: '🟡',
  pass: '🟠',
  needs_improvement: '🔴',
};

/**
 * Performance level display names
 */
export const PERFORMANCE_LABELS: Record<PerformanceLevel, string> = {
  excellent: 'Excellent',
  good: 'Good',
  average: 'Average',
  pass: 'Pass',
  needs_improvement: 'Needs Improvement',
};

// ============================================================
// Data Exclusion Rules
// ============================================================

/**
 * Values to exclude from statistics calculations
 * Real 0 scores are included (student took exam but got 0)
 */
export const EXCLUDED_VALUES = [
  null,
  undefined,
  'X',           // Absent marker
  '-',           // Missing marker
  'N/A',         // Not applicable
  '缺考',         // Chinese absent
  'absent',      // English absent
] as const;
