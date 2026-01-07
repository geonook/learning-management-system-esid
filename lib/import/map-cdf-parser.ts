/**
 * NWEA MAP Combined Data File (CDF) Parser
 * Parses the complete CDF CSV from NWEA platform with all official fields
 *
 * CDF contains 140+ columns including:
 * - Official percentile and achievement quintile
 * - Growth projections and actual growth data
 * - Conditional growth index
 * - Projected proficiency (ACT/SAT/MAP)
 * - Goal performance with adjectives
 */

import { z } from 'zod';
import { MAP_IMPORT_LIMITS } from '@/lib/config/import';

// ============================================================
// Types
// ============================================================

export interface MapCDFGoalRow {
  goal_name: string;
  goal_rit_score: number | null;
  goal_std_err: number | null;
  goal_range: string | null;
  goal_adjective: string | null;  // Low/LoAvg/Avg/HiAvg/High
}

export interface ProjectedProficiency {
  study: string;
  level: string;
}

export interface MapCDFAssessmentRow {
  // Basic student info
  student_number: string;
  student_last_name: string | null;
  student_first_name: string | null;
  grade: number;
  school: string | null;

  // Term info
  term_tested: string;           // "Fall 2025-2026"
  academic_year: string;         // "2025-2026"
  map_term: 'fall' | 'winter' | 'spring';
  course: 'Reading' | 'Language Usage';
  test_name: string | null;

  // Core scores
  rit_score: number;
  rit_score_range: string | null;
  test_standard_error: number | null;

  // Official metrics (from CDF)
  test_percentile: number | null;
  achievement_quintile: string | null;  // Low/LoAvg/Avg/HiAvg/High
  percent_correct: number | null;
  rapid_guessing_percent: number | null;

  // Test metadata
  test_start_date: string | null;  // YYYY-MM-DD format
  test_duration_minutes: number | null;

  // Lexile
  lexile_score: string | null;
  lexile_range: string | null;  // "min-max"

  // Growth data (Fall to Spring)
  projected_growth: number | null;
  observed_growth: number | null;
  observed_growth_se: number | null;
  met_projected_growth: string | null;  // "Yes" | "No"
  conditional_growth_index: number | null;
  conditional_growth_percentile: number | null;
  growth_quintile: string | null;
  typical_growth: number | null;

  // Growth data (Fall to Fall) - Year-over-Year
  fall_to_fall_projected_growth: number | null;
  fall_to_fall_observed_growth: number | null;
  fall_to_fall_observed_growth_se: number | null;
  fall_to_fall_met_projected_growth: string | null;  // "Yes" | "No" | "Yes*" | "No*"
  fall_to_fall_conditional_growth_index: number | null;
  fall_to_fall_conditional_growth_percentile: number | null;
  fall_to_fall_growth_quintile: string | null;

  // Projected Proficiency
  projected_proficiency: ProjectedProficiency[];

  // Goals
  goals: MapCDFGoalRow[];
}

export interface MapCDFParseResult {
  success: boolean;
  data: MapCDFAssessmentRow[];
  errors: MapCDFParseError[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    byGrade: Record<number, number>;
    byCourse: Record<string, number>;
    byTerm: Record<string, number>;
  };
}

export interface MapCDFParseError {
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
const TermNameSchema = z.string().regex(/^(Fall|Winter|Spring)\s+\d{4}-\d{4}$/, 'Term must be in format "Fall YYYY-YYYY"');

// ============================================================
// Column Mappings (CDF specific)
// ============================================================

const CDF_COLUMNS = {
  // Basic student info
  TERM_NAME: 'TermName',
  STUDENT_ID: 'StudentID',
  STUDENT_LAST_NAME: 'StudentLastName',
  STUDENT_FIRST_NAME: 'StudentFirstName',
  GRADE: 'Grade',
  SCHOOL: 'SchoolName',

  // Course/Test info
  COURSE: 'Course',
  TEST_NAME: 'TestName',

  // Core scores
  RIT_SCORE: 'TestRITScore',
  STANDARD_ERROR: 'TestStandardError',
  TEST_PERCENTILE: 'TestPercentile',
  ACHIEVEMENT_QUINTILE: 'AchievementQuintile',
  PERCENT_CORRECT: 'PercentCorrect',
  RAPID_GUESSING: 'RapidGuessingPercentage',

  // Test metadata
  TEST_START_DATE: 'TestStartDate',
  TEST_DURATION: 'TestDurationMinutes',

  // Lexile
  LEXILE_SCORE: 'LexileScore',
  LEXILE_MIN: 'LexileMin',
  LEXILE_MAX: 'LexileMax',

  // Growth (Fall to Spring)
  F2S_PROJECTED_GROWTH: 'FallToSpringProjectedGrowth',
  F2S_OBSERVED_GROWTH: 'FallToSpringObservedGrowth',
  F2S_OBSERVED_GROWTH_SE: 'FallToSpringObservedGrowthSE',
  F2S_MET_PROJECTED: 'FallToSpringMetProjectedGrowth',
  F2S_CONDITIONAL_GROWTH_INDEX: 'FallToSpringConditionalGrowthIndex',
  F2S_CONDITIONAL_GROWTH_PERCENTILE: 'FallToSpringConditionalGrowthPercentile',
  F2S_GROWTH_QUINTILE: 'FallToSpringGrowthQuintile',
  TYPICAL_F2S_GROWTH: 'TypicalFallToSpringGrowth',

  // Growth (Fall to Fall) - Year-over-Year
  F2F_PROJECTED_GROWTH: 'FallToFallProjectedGrowth',
  F2F_OBSERVED_GROWTH: 'FallToFallObservedGrowth',
  F2F_OBSERVED_GROWTH_SE: 'FallToFallObservedGrowthSE',
  F2F_MET_PROJECTED: 'FallToFallMetProjectedGrowth',
  F2F_CONDITIONAL_GROWTH_INDEX: 'FallToFallConditionalGrowthIndex',
  F2F_CONDITIONAL_GROWTH_PERCENTILE: 'FallToFallConditionalGrowthPercentile',
  F2F_GROWTH_QUINTILE: 'FallToFallGrowthQuintile',
} as const;

// Goal columns pattern: Goal1Name, Goal1RitScore, Goal1StdErr, Goal1Range, Goal1Adjective
const MAX_GOALS = MAP_IMPORT_LIMITS.MAX_GOALS;

// Projected Proficiency columns pattern: ProjectedProficiencyStudy1, ProjectedProficiencyLevel1
const MAX_PROJECTED_PROFICIENCY = MAP_IMPORT_LIMITS.MAX_PROJECTED_PROFICIENCY;

// ============================================================
// Helper Functions
// ============================================================

/**
 * Parse TermName to extract academic_year and mapTerm
 * @example "Fall 2025-2026" -> { academicYear: "2025-2026", mapTerm: "fall" }
 */
export function parseTermName(termName: string): { academicYear: string; mapTerm: 'fall' | 'winter' | 'spring' } {
  const match = termName.match(/^(Fall|Winter|Spring)\s+(\d{4}-\d{4})$/i);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid term format: ${termName}`);
  }

  return {
    mapTerm: match[1].toLowerCase() as 'fall' | 'winter' | 'spring',
    academicYear: match[2],
  };
}

/**
 * Parse date from CDF format (MM/DD/YYYY) to ISO format (YYYY-MM-DD)
 */
function parseDateToISO(dateStr: string | null): string | null {
  if (!dateStr) return null;

  // Try MM/DD/YYYY format
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match && match[1] && match[2] && match[3]) {
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    return `${match[3]}-${month}-${day}`;
  }

  // Return as-is if already in ISO format
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }

  return null;
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
        current += '"';
        i += 2;
        continue;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }

    i++;
  }

  result.push(current.trim());
  return result;
}

/**
 * Get column index by name from headers
 */
function getColumnIndex(headers: string[], columnName: string): number {
  return headers.findIndex(h => h.trim() === columnName);
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

/**
 * Parse float with fallback
 */
function parseFloatSafe(value: string | null): number | null {
  if (value === null) return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

/**
 * Build RIT score range string from value
 */
function buildRitRange(ritScore: number): string {
  const lower = Math.floor(ritScore / 10) * 10;
  return `${lower}-${lower + 10}`;
}

// ============================================================
// Main Parser
// ============================================================

/**
 * Parse NWEA MAP Combined Data File (CDF) CSV
 */
export function parseMapCDF(csvContent: string): MapCDFParseResult {
  const errors: MapCDFParseError[] = [];
  const data: MapCDFAssessmentRow[] = [];
  const stats = {
    total: 0,
    valid: 0,
    invalid: 0,
    byGrade: {} as Record<number, number>,
    byCourse: {} as Record<string, number>,
    byTerm: {} as Record<string, number>,
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
  for (const [key, colName] of Object.entries(CDF_COLUMNS)) {
    colIndex[key] = getColumnIndex(headers, colName);
  }

  // Build goal column indexes
  const goalIndexes: { name: number; rit: number; stdErr: number; range: number; adj: number }[] = [];
  for (let i = 1; i <= MAX_GOALS; i++) {
    goalIndexes.push({
      name: getColumnIndex(headers, `Goal${i}Name`),
      rit: getColumnIndex(headers, `Goal${i}RitScore`),
      stdErr: getColumnIndex(headers, `Goal${i}StdErr`),
      range: getColumnIndex(headers, `Goal${i}Range`),
      adj: getColumnIndex(headers, `Goal${i}Adjective`),
    });
  }

  // Build projected proficiency column indexes
  const ppIndexes: { study: number; level: number }[] = [];
  for (let i = 1; i <= MAX_PROJECTED_PROFICIENCY; i++) {
    ppIndexes.push({
      study: getColumnIndex(headers, `ProjectedProficiencyStudy${i}`),
      level: getColumnIndex(headers, `ProjectedProficiencyLevel${i}`),
    });
  }

  // Validate required columns exist
  const requiredColumns: (keyof typeof CDF_COLUMNS)[] = ['STUDENT_ID', 'GRADE', 'COURSE', 'RIT_SCORE', 'TERM_NAME'];
  for (const col of requiredColumns) {
    const idx = colIndex[col];
    if (idx === undefined || idx < 0) {
      errors.push({
        row: 0,
        field: col,
        value: '',
        message: `Required column "${CDF_COLUMNS[col]}" not found in CSV`,
      });
    }
  }

  if (errors.length > 0) {
    return { success: false, data: [], errors, stats };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    stats.total++;

    const lineContent = lines[i];
    if (!lineContent) continue;

    const row = parseCSVLine(lineContent);
    const rowErrors: MapCDFParseError[] = [];

    // Extract required fields
    const studentId = getValue(row, colIndex.STUDENT_ID ?? -1);
    const gradeStr = getValue(row, colIndex.GRADE ?? -1);
    const course = getValue(row, colIndex.COURSE ?? -1);
    const ritScoreStr = getValue(row, colIndex.RIT_SCORE ?? -1);
    const termName = getValue(row, colIndex.TERM_NAME ?? -1);

    // Validate required fields
    if (!studentId) {
      rowErrors.push({ row: rowNum, field: 'StudentID', value: '', message: 'Student ID is required' });
    } else {
      const result = StudentIdSchema.safeParse(studentId);
      if (!result.success) {
        rowErrors.push({ row: rowNum, field: 'StudentID', value: studentId, message: 'Invalid Student ID format' });
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

    if (!termName) {
      rowErrors.push({ row: rowNum, field: 'TermName', value: '', message: 'TermName is required' });
    } else {
      const result = TermNameSchema.safeParse(termName);
      if (!result.success) {
        rowErrors.push({ row: rowNum, field: 'TermName', value: termName, message: 'Invalid term format' });
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
      const parsed = parseTermName(termName!);
      academicYear = parsed.academicYear;
      mapTerm = parsed.mapTerm;
    } catch (e) {
      errors.push({ row: rowNum, field: 'TermName', value: termName!, message: (e as Error).message });
      stats.invalid++;
      continue;
    }

    // Extract optional fields
    const studentLastName = getValue(row, colIndex.STUDENT_LAST_NAME ?? -1);
    const studentFirstName = getValue(row, colIndex.STUDENT_FIRST_NAME ?? -1);
    const school = getValue(row, colIndex.SCHOOL ?? -1);
    const testName = getValue(row, colIndex.TEST_NAME ?? -1);

    // Extract official metrics
    const testPercentile = parseIntSafe(getValue(row, colIndex.TEST_PERCENTILE ?? -1));
    const achievementQuintile = getValue(row, colIndex.ACHIEVEMENT_QUINTILE ?? -1);
    const percentCorrect = parseFloatSafe(getValue(row, colIndex.PERCENT_CORRECT ?? -1));
    const rapidGuessingPercent = parseFloatSafe(getValue(row, colIndex.RAPID_GUESSING ?? -1));
    const testStandardError = parseFloatSafe(getValue(row, colIndex.STANDARD_ERROR ?? -1));

    // Extract test metadata
    const testStartDate = parseDateToISO(getValue(row, colIndex.TEST_START_DATE ?? -1));
    const testDuration = parseIntSafe(getValue(row, colIndex.TEST_DURATION ?? -1));

    // Extract Lexile
    const lexileScore = getValue(row, colIndex.LEXILE_SCORE ?? -1);
    const lexileMin = getValue(row, colIndex.LEXILE_MIN ?? -1);
    const lexileMax = getValue(row, colIndex.LEXILE_MAX ?? -1);
    const lexileRange = lexileMin && lexileMax ? `${lexileMin}-${lexileMax}` : null;

    // Extract Growth data (Fall to Spring)
    const projectedGrowth = parseIntSafe(getValue(row, colIndex.F2S_PROJECTED_GROWTH ?? -1));
    const observedGrowth = parseIntSafe(getValue(row, colIndex.F2S_OBSERVED_GROWTH ?? -1));
    const observedGrowthSe = parseFloatSafe(getValue(row, colIndex.F2S_OBSERVED_GROWTH_SE ?? -1));
    const metProjectedGrowth = getValue(row, colIndex.F2S_MET_PROJECTED ?? -1);
    const conditionalGrowthIndex = parseFloatSafe(getValue(row, colIndex.F2S_CONDITIONAL_GROWTH_INDEX ?? -1));
    const conditionalGrowthPercentile = parseIntSafe(getValue(row, colIndex.F2S_CONDITIONAL_GROWTH_PERCENTILE ?? -1));
    const growthQuintile = getValue(row, colIndex.F2S_GROWTH_QUINTILE ?? -1);
    const typicalGrowth = parseIntSafe(getValue(row, colIndex.TYPICAL_F2S_GROWTH ?? -1));

    // Extract Growth data (Fall to Fall) - Year-over-Year
    const f2fProjectedGrowth = parseIntSafe(getValue(row, colIndex.F2F_PROJECTED_GROWTH ?? -1));
    const f2fObservedGrowth = parseIntSafe(getValue(row, colIndex.F2F_OBSERVED_GROWTH ?? -1));
    const f2fObservedGrowthSe = parseFloatSafe(getValue(row, colIndex.F2F_OBSERVED_GROWTH_SE ?? -1));
    const f2fMetProjectedGrowth = getValue(row, colIndex.F2F_MET_PROJECTED ?? -1);
    const f2fConditionalGrowthIndex = parseFloatSafe(getValue(row, colIndex.F2F_CONDITIONAL_GROWTH_INDEX ?? -1));
    const f2fConditionalGrowthPercentile = parseIntSafe(getValue(row, colIndex.F2F_CONDITIONAL_GROWTH_PERCENTILE ?? -1));
    const f2fGrowthQuintile = getValue(row, colIndex.F2F_GROWTH_QUINTILE ?? -1);

    // Extract Goals
    const goals: MapCDFGoalRow[] = [];
    for (const goalIdx of goalIndexes) {
      const goalName = getValue(row, goalIdx.name);
      if (goalName) {
        goals.push({
          goal_name: goalName,
          goal_rit_score: parseIntSafe(getValue(row, goalIdx.rit)),
          goal_std_err: parseFloatSafe(getValue(row, goalIdx.stdErr)),
          goal_range: getValue(row, goalIdx.range),
          goal_adjective: getValue(row, goalIdx.adj),
        });
      }
    }

    // Extract Projected Proficiency
    const projectedProficiency: ProjectedProficiency[] = [];
    for (const ppIdx of ppIndexes) {
      const study = getValue(row, ppIdx.study);
      const level = getValue(row, ppIdx.level);
      if (study && level) {
        projectedProficiency.push({ study, level });
      }
    }

    // Build assessment row
    const assessmentRow: MapCDFAssessmentRow = {
      student_number: studentId!,
      student_last_name: studentLastName,
      student_first_name: studentFirstName,
      grade: grade!,
      school,

      term_tested: termName!,
      academic_year: academicYear,
      map_term: mapTerm,
      course: course as 'Reading' | 'Language Usage',
      test_name: testName,

      rit_score: ritScore!,
      rit_score_range: buildRitRange(ritScore!),
      test_standard_error: testStandardError,

      test_percentile: testPercentile,
      achievement_quintile: achievementQuintile,
      percent_correct: percentCorrect,
      rapid_guessing_percent: rapidGuessingPercent ? Math.round(rapidGuessingPercent) : null,

      test_start_date: testStartDate,
      test_duration_minutes: testDuration,

      lexile_score: lexileScore,
      lexile_range: lexileRange,

      projected_growth: projectedGrowth,
      observed_growth: observedGrowth,
      observed_growth_se: observedGrowthSe,
      met_projected_growth: metProjectedGrowth,
      conditional_growth_index: conditionalGrowthIndex,
      conditional_growth_percentile: conditionalGrowthPercentile,
      growth_quintile: growthQuintile,
      typical_growth: typicalGrowth,

      // Fall to Fall (Year-over-Year)
      fall_to_fall_projected_growth: f2fProjectedGrowth,
      fall_to_fall_observed_growth: f2fObservedGrowth,
      fall_to_fall_observed_growth_se: f2fObservedGrowthSe,
      fall_to_fall_met_projected_growth: f2fMetProjectedGrowth,
      fall_to_fall_conditional_growth_index: f2fConditionalGrowthIndex,
      fall_to_fall_conditional_growth_percentile: f2fConditionalGrowthPercentile,
      fall_to_fall_growth_quintile: f2fGrowthQuintile,

      projected_proficiency: projectedProficiency,
      goals,
    };

    data.push(assessmentRow);
    stats.valid++;

    // Update stats
    stats.byGrade[grade!] = (stats.byGrade[grade!] || 0) + 1;
    stats.byCourse[course!] = (stats.byCourse[course!] || 0) + 1;
    stats.byTerm[termName!] = (stats.byTerm[termName!] || 0) + 1;
  }

  return {
    success: errors.length === 0,
    data,
    errors,
    stats,
  };
}

/**
 * Generate a summary report from parse results
 */
export function generateCDFParseReport(result: MapCDFParseResult): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('NWEA MAP CDF Parse Report');
  lines.push('='.repeat(60));
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
  lines.push('');

  lines.push('By Term:');
  for (const [term, count] of Object.entries(result.stats.byTerm).sort()) {
    lines.push(`  ${term}: ${count} records`);
  }

  if (result.errors.length > 0) {
    lines.push('');
    lines.push('Errors:');
    for (const error of result.errors.slice(0, 20)) {
      lines.push(`  Row ${error.row}: [${error.field}] ${error.message} (value: "${error.value}")`);
    }
    if (result.errors.length > 20) {
      lines.push(`  ... and ${result.errors.length - 20} more errors`);
    }
  }

  lines.push('');
  lines.push('='.repeat(60));

  return lines.join('\n');
}
