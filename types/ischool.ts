/**
 * iSchool Export Types
 * Types for exporting LMS grades to iSchool system
 */

import type { Term } from './academic-year'

/**
 * Row data for iSchool export table
 */
export interface ISchoolExportRow {
  /** Student UUID */
  studentId: string
  /** Student ID (學號) e.g., "LE10028" - used for sorting */
  studentNumber: string
  /** Student full name */
  studentName: string
  /** Chinese name (optional) */
  chineseName: string | null
  /** Seat number in class */
  seatNo: number | null
  /** FA average (Term 1/3: FA1-4, Term 2/4: FA5-8) */
  formativeAvg: number | null
  /** SA average (Term 1/3: SA1-2, Term 2/4: SA3-4) */
  summativeAvg: number | null
  /** MID score (Term 1/3) or FINAL score (Term 2/4) */
  examScore: number | null
  /** Teacher comment (only for Term 2/4) */
  teacherComment: string | null
}

/**
 * iSchool comment record from database
 */
export interface ISchoolComment {
  id: string
  student_id: string
  course_id: string
  teacher_id: string
  academic_year: string
  term: 2 | 4  // Only Term 2 and 4 need comments
  comment: string
  created_at: string
  updated_at: string
}

/**
 * Input for upserting iSchool comment
 */
export interface UpsertISchoolCommentInput {
  studentId: string
  courseId: string
  academicYear: string
  term: 2 | 4
  comment: string
}

/**
 * Export field options
 */
export type ISchoolExportField =
  | 'formative'    // FA Avg
  | 'summative'    // SA Avg
  | 'exam'         // MID or FINAL
  | 'comment'      // Teacher Comment (Term 2/4 only)
  | 'all'          // All fields (Tab-separated)

/**
 * Term configuration for iSchool export
 */
export interface ISchoolTermConfig {
  term: Term
  faRange: string[]      // Assessment codes for FA
  saRange: string[]      // Assessment codes for SA
  examCode: 'MID' | 'FINAL'
  hasComments: boolean
}

/**
 * Get term configuration for iSchool export
 */
export function getISchoolTermConfig(term: Term): ISchoolTermConfig {
  switch (term) {
    case 1:
      return {
        term: 1,
        faRange: ['FA1', 'FA2', 'FA3', 'FA4'],
        saRange: ['SA1', 'SA2'],
        examCode: 'MID',
        hasComments: false,
      }
    case 2:
      return {
        term: 2,
        faRange: ['FA5', 'FA6', 'FA7', 'FA8'],
        saRange: ['SA3', 'SA4'],
        examCode: 'FINAL',
        hasComments: true,
      }
    case 3:
      return {
        term: 3,
        faRange: ['FA1', 'FA2', 'FA3', 'FA4'],
        saRange: ['SA1', 'SA2'],
        examCode: 'MID',
        hasComments: false,
      }
    case 4:
      return {
        term: 4,
        faRange: ['FA5', 'FA6', 'FA7', 'FA8'],
        saRange: ['SA3', 'SA4'],
        examCode: 'FINAL',
        hasComments: true,
      }
    default:
      throw new Error(`Invalid term: ${term}`)
  }
}

/**
 * Check if term requires teacher comments
 */
export function termRequiresComments(term: Term): term is 2 | 4 {
  return term === 2 || term === 4
}
