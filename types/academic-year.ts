/**
 * Academic Year and Term Types
 *
 * Four-term system structure:
 *
 * Academic Year 2025-2026
 * ├── 2025 Fall (Semester 1)
 * │   ├── Term 1 - Midterm (FA1-FA4, SA1-SA2, MID)
 * │   └── Term 2 - Final (FA5-FA8, SA3-SA4, FINAL)
 * │
 * └── 2026 Spring (Semester 2)
 *     ├── Term 3 - Midterm (FA1-FA4, SA1-SA2, MID)
 *     └── Term 4 - Final (FA5-FA8, SA3-SA4, FINAL)
 */

// ============================================================
// Core Types
// ============================================================

/**
 * Term (1-4) - Four-term academic system
 *
 * Term 1: Fall Midterm (2025 Fall Midterm)
 * Term 2: Fall Final (2025 Fall Final)
 * Term 3: Spring Midterm (2026 Spring Midterm)
 * Term 4: Spring Final (2026 Spring Final)
 */
export type Term = 1 | 2 | 3 | 4;

/**
 * Semester (1-2) - Derived from Term
 *
 * Semester 1 (Fall): Term 1-2
 * Semester 2 (Spring): Term 3-4
 */
export type Semester = 1 | 2;

/**
 * Academic Year format: YYYY-YYYY (e.g., "2025-2026")
 */
export type AcademicYear = string;

// ============================================================
// Constants
// ============================================================

/**
 * Term to Semester mapping
 */
export const TERM_TO_SEMESTER: Record<Term, Semester> = {
  1: 1, // Fall Midterm → Semester 1
  2: 1, // Fall Final → Semester 1
  3: 2, // Spring Midterm → Semester 2
  4: 2, // Spring Final → Semester 2
};

/**
 * Term display names
 */
export const TERM_NAMES: Record<Term, string> = {
  1: 'Fall Midterm',
  2: 'Fall Final',
  3: 'Spring Midterm',
  4: 'Spring Final',
};

/**
 * Short term names (for compact UI)
 */
export const TERM_NAMES_SHORT: Record<Term, string> = {
  1: 'T1',
  2: 'T2',
  3: 'T3',
  4: 'T4',
};

/**
 * Semester display names
 */
export const SEMESTER_NAMES: Record<Semester, string> = {
  1: 'Fall Semester',
  2: 'Spring Semester',
};

/**
 * Assessment codes by term
 */
export const TERM_ASSESSMENT_CODES: Record<Term, string[]> = {
  1: ['FA1', 'FA2', 'FA3', 'FA4', 'SA1', 'SA2', 'MID'],
  2: ['FA5', 'FA6', 'FA7', 'FA8', 'SA3', 'SA4', 'FINAL'],
  3: ['FA1', 'FA2', 'FA3', 'FA4', 'SA1', 'SA2', 'MID'],
  4: ['FA5', 'FA6', 'FA7', 'FA8', 'SA3', 'SA4', 'FINAL'],
};

/**
 * All terms in order
 */
export const ALL_TERMS: Term[] = [1, 2, 3, 4];

/**
 * All semesters in order
 */
export const ALL_SEMESTERS: Semester[] = [1, 2];

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get semester from term
 */
export function getSemesterFromTerm(term: Term): Semester {
  return TERM_TO_SEMESTER[term];
}

/**
 * Get terms for a semester
 */
export function getTermsForSemester(semester: Semester): Term[] {
  return semester === 1 ? [1, 2] : [3, 4];
}

/**
 * Get term display name
 */
export function getTermName(term: Term): string {
  return TERM_NAMES[term];
}

/**
 * Get semester display name
 */
export function getSemesterName(semester: Semester): string {
  return SEMESTER_NAMES[semester];
}

/**
 * Check if a term is in a specific semester
 */
export function isTermInSemester(term: Term, semester: Semester): boolean {
  return getSemesterFromTerm(term) === semester;
}

/**
 * Get assessment codes for a specific term
 */
export function getAssessmentCodesForTerm(term: Term): string[] {
  return TERM_ASSESSMENT_CODES[term];
}

/**
 * Parse academic year string to start and end years
 * Example: "2025-2026" → { startYear: 2025, endYear: 2026 }
 */
export function parseAcademicYear(academicYear: string): {
  startYear: number;
  endYear: number;
} | null {
  const match = academicYear.match(/^(\d{4})-(\d{4})$/);
  if (!match || !match[1] || !match[2]) return null;

  return {
    startYear: parseInt(match[1], 10),
    endYear: parseInt(match[2], 10),
  };
}

/**
 * Format academic year from start year
 * Example: 2025 → "2025-2026"
 */
export function formatAcademicYear(startYear: number): string {
  return `${startYear}-${startYear + 1}`;
}

/**
 * Get current academic year based on date
 * Academic year starts in Fall (August/September)
 */
export function getCurrentAcademicYear(date: Date = new Date()): string {
  const month = date.getMonth(); // 0-11
  const year = date.getFullYear();

  // If August (7) or later, use current year as start
  // Otherwise, use previous year as start
  const startYear = month >= 7 ? year : year - 1;

  return formatAcademicYear(startYear);
}

/**
 * Get current term based on date
 * Approximate calendar mapping:
 * - Term 1: August - October (Fall Midterm)
 * - Term 2: November - January (Fall Final)
 * - Term 3: February - April (Spring Midterm)
 * - Term 4: May - July (Spring Final)
 */
export function getCurrentTerm(date: Date = new Date()): Term {
  const month = date.getMonth(); // 0-11

  // August (7), September (8), October (9) → Term 1
  if (month >= 7 && month <= 9) return 1;

  // November (10), December (11), January (0) → Term 2
  if (month >= 10 || month === 0) return 2;

  // February (1), March (2), April (3) → Term 3
  if (month >= 1 && month <= 3) return 3;

  // May (4), June (5), July (6) → Term 4
  return 4;
}

// ============================================================
// Filter Types
// ============================================================

/**
 * Academic term filter for queries
 */
export interface AcademicTermFilter {
  academicYear?: AcademicYear;
  term?: Term;
  semester?: Semester;
}

/**
 * Term selection option for UI
 */
export interface TermOption {
  value: Term | 'all';
  label: string;
}

/**
 * Get term options for select/dropdown
 */
export function getTermOptions(includeAll = true): TermOption[] {
  const options: TermOption[] = ALL_TERMS.map((term) => ({
    value: term,
    label: TERM_NAMES[term],
  }));

  if (includeAll) {
    return [{ value: 'all', label: 'All Terms' }, ...options];
  }

  return options;
}
