/**
 * NWEA MAP Growth CSV Parser
 * Parses Grade Breakdown Report CSV from NWEA platform
 */

import { z } from 'zod';

// ============================================================
// Types
// ============================================================

export interface MapAssessmentRow {
  student_number: string;
  student_last_name: string | null;
  student_first_name: string | null;
  grade: number;
  school: string | null;
  term_tested: string;
  academic_year: string;
  map_term: 'fall' | 'winter' | 'spring';
  course: 'Reading' | 'Language Usage';
  test_name: string | null;
  rit_score: number;
  rit_score_range: string | null;
  rapid_guessing_percent: number | null;
  lexile_score: string | null;
  lexile_range: string | null;
  goals: MapGoalRow[];
}

export interface MapGoalRow {
  goal_name: string;
  goal_rit_range: string;
}

export interface MapParseResult {
  success: boolean;
  data: MapAssessmentRow[];
  errors: MapParseError[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    byGrade: Record<number, number>;
    byCourse: Record<string, number>;
  };
}

export interface MapParseError {
  row: number;
  field: string;
  value: string;
  message: string;
}

// ============================================================
// Validation Schemas
// ============================================================

const StudentIdSchema = z.string().regex(/^LE\d{5}$/, 'Student ID must be in format LExxxxx');
const GradeSchema = z.number().int().min(3).max(6);
const CourseSchema = z.enum(['Reading', 'Language Usage']);
const RitScoreSchema = z.number().int().min(100).max(400);
const TermTestedSchema = z.string().regex(/^(Fall|Spring)\s+\d{4}-\d{4}$/, 'Term must be in format "Fall YYYY-YYYY" or "Spring YYYY-YYYY"');

// ============================================================
// Column Mappings
// ============================================================

const CSV_COLUMNS = {
  STUDENT_ID: 'Student ID',
  STUDENT_LAST_NAME: 'Student Last Name',
  STUDENT_FIRST_NAME: 'Student First Name',
  TERM_TESTED: 'Term Tested',
  SCHOOL: 'School',
  GRADE: 'Grade',
  COURSE: 'Course',
  RIT_SCORE: 'RIT Score',
  RIT_SCORE_RANGE: 'RIT Score 10 Point Range',
  RAPID_GUESSING: 'Rapid-Guessing %',
  LEXILE_SCORE: 'LexileScore',
  LEXILE_RANGE: 'LexileRange',
  TEST_NAME: 'Test Name',
} as const;

// Goal column mappings: CSV column name -> standardized goal name
const GOAL_COLUMNS: Record<string, { name: string; course: 'Reading' | 'Language Usage' }> = {
  'Language Arts: Informational Text': { name: 'Informational Text', course: 'Reading' },
  'Language Arts: Literary Text': { name: 'Literary Text', course: 'Reading' },
  'Language Arts: Vocabulary': { name: 'Vocabulary', course: 'Reading' },
  'Language Arts: Language: Understand, Edit for Grammar, Usage': { name: 'Grammar and Usage', course: 'Language Usage' },
  'Language Arts: Language: Understand, Edit for Mechanics': { name: 'Mechanics', course: 'Language Usage' },
  'Language Arts: Writing: Write, Revise Texts for Purpose and Audience': { name: 'Writing', course: 'Language Usage' },
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Parse term_tested string to extract academic_year and mapTerm
 * @example "Fall 2025-2026" -> { academicYear: "2025-2026", mapTerm: "fall" }
 */
export function parseTermTested(termTested: string): { academicYear: string; mapTerm: 'fall' | 'winter' | 'spring' } {
  const match = termTested.match(/^(Fall|Winter|Spring)\s+(\d{4}-\d{4})$/i);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid term format: ${termTested}`);
  }

  return {
    mapTerm: match[1].toLowerCase() as 'fall' | 'winter' | 'spring',
    academicYear: match[2],
  };
}

/**
 * Parse CSV line with proper quote handling
 */
function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }

    i++;
  }

  // Add the last field
  result.push(current.trim());
  return result;
}

/**
 * Get column index by name from headers
 */
function getColumnIndex(headers: string[], columnName: string): number {
  const index = headers.findIndex(h => h.trim() === columnName);
  return index;
}

/**
 * Safely get value from row by column index
 */
function getValue(row: string[], index: number): string | null {
  if (index < 0 || index >= row.length) return null;
  const value = row[index];
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Parse integer with fallback
 */
function parseIntSafe(value: string | null): number | null {
  if (value === null) return null;
  const num = parseInt(value, 10);
  return isNaN(num) ? null : num;
}

// ============================================================
// Main Parser
// ============================================================

/**
 * Parse NWEA MAP Grade Breakdown Report CSV
 */
export function parseMapCSV(csvContent: string): MapParseResult {
  const errors: MapParseError[] = [];
  const data: MapAssessmentRow[] = [];
  const stats = {
    total: 0,
    valid: 0,
    invalid: 0,
    byGrade: {} as Record<number, number>,
    byCourse: {} as Record<string, number>,
  };

  // Split into lines and remove empty lines
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');

  if (lines.length < 2) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, field: '', value: '', message: 'CSV file is empty or has no data rows' }],
      stats,
    };
  }

  // Parse headers
  const firstLine = lines[0];
  if (!firstLine) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, field: '', value: '', message: 'CSV file has no header row' }],
      stats,
    };
  }
  const headers = parseCSVLine(firstLine);

  // Build column index map
  const colIndex: Record<string, number> = {};
  for (const [key, colName] of Object.entries(CSV_COLUMNS)) {
    colIndex[key] = getColumnIndex(headers, colName);
  }

  // Build goal column indexes
  const goalIndexes: { index: number; name: string; course: 'Reading' | 'Language Usage' }[] = [];
  for (const [csvCol, goalInfo] of Object.entries(GOAL_COLUMNS)) {
    const index = getColumnIndex(headers, csvCol);
    if (index >= 0) {
      goalIndexes.push({ index, ...goalInfo });
    }
  }

  // Validate required columns exist
  const requiredColumns: (keyof typeof CSV_COLUMNS)[] = ['STUDENT_ID', 'GRADE', 'COURSE', 'RIT_SCORE', 'TERM_TESTED'];
  for (const col of requiredColumns) {
    const idx = colIndex[col];
    if (idx === undefined || idx < 0) {
      errors.push({
        row: 0,
        field: col,
        value: '',
        message: `Required column "${CSV_COLUMNS[col]}" not found in CSV`,
      });
    }
  }

  if (errors.length > 0) {
    return { success: false, data: [], errors, stats };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1; // 1-indexed for user-friendly error messages
    stats.total++;

    const lineContent = lines[i];
    if (!lineContent) continue;

    const row = parseCSVLine(lineContent);
    const rowErrors: MapParseError[] = [];

    // Extract required fields (we've validated these indexes exist above)
    const studentId = getValue(row, colIndex.STUDENT_ID ?? -1);
    const gradeStr = getValue(row, colIndex.GRADE ?? -1);
    const course = getValue(row, colIndex.COURSE ?? -1);
    const ritScoreStr = getValue(row, colIndex.RIT_SCORE ?? -1);
    const termTested = getValue(row, colIndex.TERM_TESTED ?? -1);

    // Validate required fields
    if (!studentId) {
      rowErrors.push({ row: rowNum, field: 'Student ID', value: '', message: 'Student ID is required' });
    } else {
      const result = StudentIdSchema.safeParse(studentId);
      if (!result.success) {
        const errorMessage = result.error.errors[0]?.message ?? 'Invalid Student ID format';
        rowErrors.push({ row: rowNum, field: 'Student ID', value: studentId, message: errorMessage });
      }
    }

    const grade = parseIntSafe(gradeStr);
    if (grade === null) {
      rowErrors.push({ row: rowNum, field: 'Grade', value: gradeStr || '', message: 'Grade is required' });
    } else {
      const result = GradeSchema.safeParse(grade);
      if (!result.success) {
        rowErrors.push({ row: rowNum, field: 'Grade', value: String(grade), message: 'Grade must be between 3 and 6' });
      }
    }

    if (!course) {
      rowErrors.push({ row: rowNum, field: 'Course', value: '', message: 'Course is required' });
    } else {
      const result = CourseSchema.safeParse(course);
      if (!result.success) {
        rowErrors.push({ row: rowNum, field: 'Course', value: course, message: 'Course must be "Reading" or "Language Usage"' });
      }
    }

    const ritScore = parseIntSafe(ritScoreStr);
    if (ritScore === null) {
      rowErrors.push({ row: rowNum, field: 'RIT Score', value: ritScoreStr || '', message: 'RIT Score is required' });
    } else {
      const result = RitScoreSchema.safeParse(ritScore);
      if (!result.success) {
        rowErrors.push({ row: rowNum, field: 'RIT Score', value: String(ritScore), message: 'RIT Score must be between 100 and 400' });
      }
    }

    if (!termTested) {
      rowErrors.push({ row: rowNum, field: 'Term Tested', value: '', message: 'Term Tested is required' });
    } else {
      const result = TermTestedSchema.safeParse(termTested);
      if (!result.success) {
        const errorMessage = result.error.errors[0]?.message ?? 'Invalid Term Tested format';
        rowErrors.push({ row: rowNum, field: 'Term Tested', value: termTested, message: errorMessage });
      }
    }

    // If there are errors, skip this row
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      stats.invalid++;
      continue;
    }

    // Parse term
    let academicYear: string;
    let mapTerm: 'fall' | 'winter' | 'spring';
    try {
      const parsed = parseTermTested(termTested!);
      academicYear = parsed.academicYear;
      mapTerm = parsed.mapTerm;
    } catch (e) {
      errors.push({ row: rowNum, field: 'Term Tested', value: termTested!, message: (e as Error).message });
      stats.invalid++;
      continue;
    }

    // Extract optional fields
    const studentLastName = getValue(row, colIndex.STUDENT_LAST_NAME ?? -1);
    const studentFirstName = getValue(row, colIndex.STUDENT_FIRST_NAME ?? -1);
    const school = getValue(row, colIndex.SCHOOL ?? -1);
    const ritScoreRange = getValue(row, colIndex.RIT_SCORE_RANGE ?? -1);
    const rapidGuessingStr = getValue(row, colIndex.RAPID_GUESSING ?? -1);
    const lexileScore = getValue(row, colIndex.LEXILE_SCORE ?? -1);
    const lexileRange = getValue(row, colIndex.LEXILE_RANGE ?? -1);
    const testName = getValue(row, colIndex.TEST_NAME ?? -1);

    // Extract goals for this course
    const goals: MapGoalRow[] = [];
    for (const goalCol of goalIndexes) {
      // Only include goals that match the current course
      if (goalCol.course === course) {
        const goalValue = getValue(row, goalCol.index);
        if (goalValue) {
          goals.push({
            goal_name: goalCol.name,
            goal_rit_range: goalValue,
          });
        }
      }
    }

    // Build assessment row
    const assessmentRow: MapAssessmentRow = {
      student_number: studentId!,
      student_last_name: studentLastName,
      student_first_name: studentFirstName,
      grade: grade!,
      school,
      term_tested: termTested!,
      academic_year: academicYear,
      map_term: mapTerm,
      course: course as 'Reading' | 'Language Usage',
      test_name: testName,
      rit_score: ritScore!,
      rit_score_range: ritScoreRange,
      rapid_guessing_percent: parseIntSafe(rapidGuessingStr),
      lexile_score: lexileScore,
      lexile_range: lexileRange,
      goals,
    };

    data.push(assessmentRow);
    stats.valid++;

    // Update stats
    stats.byGrade[grade!] = (stats.byGrade[grade!] || 0) + 1;
    stats.byCourse[course!] = (stats.byCourse[course!] || 0) + 1;
  }

  return {
    success: errors.length === 0,
    data,
    errors,
    stats,
  };
}

/**
 * Validate a single MAP assessment row
 */
export function validateMapRow(row: MapAssessmentRow): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate student_number
  const studentIdResult = StudentIdSchema.safeParse(row.student_number);
  if (!studentIdResult.success) {
    errors.push(`Invalid student ID: ${row.student_number}`);
  }

  // Validate grade
  const gradeResult = GradeSchema.safeParse(row.grade);
  if (!gradeResult.success) {
    errors.push(`Invalid grade: ${row.grade} (must be 3-6)`);
  }

  // Validate course
  const courseResult = CourseSchema.safeParse(row.course);
  if (!courseResult.success) {
    errors.push(`Invalid course: ${row.course}`);
  }

  // Validate RIT score
  const ritResult = RitScoreSchema.safeParse(row.rit_score);
  if (!ritResult.success) {
    errors.push(`Invalid RIT score: ${row.rit_score}`);
  }

  // Validate term_tested
  const termResult = TermTestedSchema.safeParse(row.term_tested);
  if (!termResult.success) {
    errors.push(`Invalid term: ${row.term_tested}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a summary report from parse results
 */
export function generateParseReport(result: MapParseResult): string {
  const lines: string[] = [];

  lines.push('='.repeat(50));
  lines.push('NWEA MAP CSV Parse Report');
  lines.push('='.repeat(50));
  lines.push('');
  lines.push(`Total Rows: ${result.stats.total}`);
  lines.push(`Valid Rows: ${result.stats.valid}`);
  lines.push(`Invalid Rows: ${result.stats.invalid}`);
  lines.push('');

  lines.push('By Grade:');
  for (const [grade, count] of Object.entries(result.stats.byGrade).sort()) {
    lines.push(`  G${grade}: ${count} records`);
  }
  lines.push('');

  lines.push('By Course:');
  for (const [course, count] of Object.entries(result.stats.byCourse).sort()) {
    lines.push(`  ${course}: ${count} records`);
  }

  if (result.errors.length > 0) {
    lines.push('');
    lines.push('Errors:');
    for (const error of result.errors.slice(0, 20)) { // Show first 20 errors
      lines.push(`  Row ${error.row}: [${error.field}] ${error.message} (value: "${error.value}")`);
    }
    if (result.errors.length > 20) {
      lines.push(`  ... and ${result.errors.length - 20} more errors`);
    }
  }

  lines.push('');
  lines.push('='.repeat(50));

  return lines.join('\n');
}
