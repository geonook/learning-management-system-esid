/**
 * Browse Gradebook Types
 *
 * Types for class-based gradebook progress monitoring.
 * Each class shows LT/IT/KCFS course progress.
 */

export type ProgressStatus = 'on_track' | 'behind' | 'not_started';

export interface CourseProgress {
  course_id: string;
  course_type: 'LT' | 'IT' | 'KCFS';
  teacher_id: string | null;
  teacher_name: string | null;
  scores_entered: number;
  expected_scores: number;
  progress: number; // 0-100
}

export interface ClassProgress {
  class_id: string;
  class_name: string;
  grade: number;
  student_count: number;
  lt_progress: number;
  it_progress: number;
  kcfs_progress: number;
  lt_teacher: string | null;
  it_teacher: string | null;
  kcfs_teacher: string | null;
  overall_status: ProgressStatus;
}

export interface BrowseGradebookStats {
  total_classes: number;
  on_track: number;
  behind: number;
  not_started: number;
}

export interface BrowseGradebookFilters {
  grade?: number;
  status?: ProgressStatus;
  search?: string;
}

// Number of assessment items per course
// FA1-FA8 (8) + SA1-SA4 (4) + MID (1) = 13 items
export const ASSESSMENT_COUNT = 13;
