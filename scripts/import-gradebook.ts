#!/usr/bin/env npx tsx
/**
 * Gradebook Import Script for LMS-ESID
 * Import Term 1 (Midterm) or Term 2 (Final) gradebook data from CSV
 *
 * CSV Structure (22 columns):
 * Grade Level | Subject Type | Class | Student ID | Student No | Student Name |
 * Term Grade | F.A. Avg | S.A. Avg | Midterm/Final | F.A.1-8 | S.A.1-4 | Teacher's email
 *
 * Usage:
 *   npx tsx scripts/import-gradebook.ts --file=gradebook.csv
 *   npx tsx scripts/import-gradebook.ts --file=gradebook.csv --term=1
 *   npx tsx scripts/import-gradebook.ts --file=gradebook.csv --dry-run
 *
 * @created 2025-12-08
 */

import * as fs from "fs";
import * as path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Check for --staging flag to use staging environment
const useStaging = process.argv.includes("--staging");

// Staging environment credentials
const STAGING_URL = "https://kqvpcoolgyhjqleekmee.supabase.co";
const STAGING_KEY = "sb_secret_486qCO_C4zYGZZ7u_WXBUw_fZlUnt4N";

// Production environment (from .env.local or environment)
const PROD_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://piwbooidofbaqklhijup.supabase.co";
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// System user IDs for created_by field
const STAGING_SYSTEM_USER_ID = "8af71399-8cb4-4212-9799-2cbb238a1bd4"; // Staging admin
const PROD_SYSTEM_USER_ID = "ecb4dc7d-c6d1-4466-b67a-35261340fef0"; // Production admin (陳則宏tsehungchen)

// ============================================================
// Types
// ============================================================

interface ExamEntry {
  classId: string;
  courseId: string;
  name: string;
  assessmentCode: string;
}

interface ImportStats {
  totalRows: number;
  validRows: number;
  skippedRows: number;
  examsCreated: number;
  examsExisting: number;
  scoresImported: number;
  scoresSkipped: number;
  errors: string[];
  warnings: string[];
}

// ============================================================
// Configuration
// ============================================================

// Select environment based on --staging flag
const SUPABASE_URL = useStaging ? STAGING_URL : PROD_URL;
const SUPABASE_SERVICE_KEY = useStaging ? STAGING_KEY : PROD_KEY;

// Batch sizes for Supabase operations
const EXAM_BATCH_SIZE = 50; // Exams per batch
const SCORE_BATCH_SIZE = 500; // Scores per batch (Supabase limit is ~1000)

// CSV column indices (0-based)
const COL = {
  GRADE_LEVEL: 0,
  SUBJECT_TYPE: 1,
  CLASS: 2,
  STUDENT_ID: 3,
  STUDENT_NO: 4,
  STUDENT_NAME: 5,
  TERM_GRADE: 6,
  FA_AVG: 7,
  SA_AVG: 8,
  MIDTERM_OR_FINAL: 9,
  FA1: 10,
  FA2: 11,
  FA3: 12,
  FA4: 13,
  FA5: 14,
  FA6: 15,
  FA7: 16,
  FA8: 17,
  SA1: 18,
  SA2: 19,
  SA3: 20,
  SA4: 21,
  TEACHER_EMAIL: 22,
};

// Assessment code mapping
const SCORE_COLUMNS = [
  { colIndex: COL.MIDTERM_OR_FINAL, code: "DYNAMIC" }, // MID or FINAL based on term
  { colIndex: COL.FA1, code: "FA1" },
  { colIndex: COL.FA2, code: "FA2" },
  { colIndex: COL.FA3, code: "FA3" },
  { colIndex: COL.FA4, code: "FA4" },
  { colIndex: COL.FA5, code: "FA5" },
  { colIndex: COL.FA6, code: "FA6" },
  { colIndex: COL.FA7, code: "FA7" },
  { colIndex: COL.FA8, code: "FA8" },
  { colIndex: COL.SA1, code: "SA1" },
  { colIndex: COL.SA2, code: "SA2" },
  { colIndex: COL.SA3, code: "SA3" },
  { colIndex: COL.SA4, code: "SA4" },
];

// ============================================================
// CLI Argument Parsing
// ============================================================

interface Args {
  file: string;
  term?: 1 | 2;
  grade?: number; // Filter by grade (1-6)
  dryRun: boolean;
  verbose: boolean;
  help: boolean;
  staging: boolean;
}

function parseArgs(): Args {
  const args: Args = {
    file: "",
    term: undefined,
    grade: undefined,
    dryRun: false,
    verbose: false,
    help: false,
    staging: false,
  };

  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--verbose" || arg === "-v") {
      args.verbose = true;
    } else if (arg === "--staging") {
      args.staging = true;
    } else if (arg.startsWith("--file=")) {
      args.file = arg.substring(7);
    } else if (arg.startsWith("--term=")) {
      const termValue = parseInt(arg.substring(7), 10);
      if (termValue === 1 || termValue === 2) {
        args.term = termValue;
      }
    } else if (arg.startsWith("--grade=")) {
      const gradeValue = parseInt(arg.substring(8), 10);
      if (gradeValue >= 1 && gradeValue <= 6) {
        args.grade = gradeValue;
      }
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
📚 Gradebook Import Script for LMS-ESID

Usage:
  npx tsx scripts/import-gradebook.ts --file=<csv_path> [options]

Options:
  --file=<path>    Path to the CSV file (required)
  --term=<1|2>     Term number: 1 for Midterm, 2 for Final (auto-detected if not specified)
  --grade=<1-6>    Filter by grade (G1-G6). Useful for batch importing by grade.
  --staging        Use staging environment instead of production
  --dry-run        Validate only, don't import data
  --verbose, -v    Show detailed output
  --help, -h       Show this help message

CSV Format (22 columns):
  Grade Level | Subject Type | Class | Student ID | Student No | Student Name |
  Term Grade | F.A. Avg | S.A. Avg | Midterm/Final | F.A.1-8 | S.A.1-4 | Teacher's email

Examples:
  # Import all grades to staging
  npx tsx scripts/import-gradebook.ts --file=gradebook.csv --staging

  # Import only G5 to staging (for batch importing)
  npx tsx scripts/import-gradebook.ts --file=gradebook.csv --staging --grade=5

  # Import G1-G6 one by one (recommended for large datasets)
  for g in 1 2 3 4 5 6; do
    npx tsx scripts/import-gradebook.ts --file=gradebook.csv --staging --grade=$g
  done

  # Dry run for G3
  npx tsx scripts/import-gradebook.ts --file=gradebook.csv --staging --grade=3 --dry-run
`);
}

// ============================================================
// CSV Parser
// ============================================================

function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    throw new Error("CSV file is empty");
  }

  // Parse headers (first line)
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length > 0 && row.some((cell) => cell.trim() !== "")) {
      rows.push(row);
    }
  }

  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === "," || char === "\t") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }

  result.push(current.trim());
  return result;
}

// ============================================================
// Term Detection
// ============================================================

function detectTerm(headers: string[]): 1 | 2 {
  // Column 9 (0-indexed) should be either "Midterm" or "Final"
  const col9Header = headers[COL.MIDTERM_OR_FINAL]?.toLowerCase().trim();

  if (col9Header === "midterm") {
    return 1;
  } else if (col9Header === "final") {
    return 2;
  }

  // Fallback: check if any header contains "midterm" or "final"
  const headersLower = headers.map((h) => h.toLowerCase());
  if (headersLower.some((h) => h.includes("midterm"))) {
    return 1;
  } else if (headersLower.some((h) => h.includes("final"))) {
    return 2;
  }

  throw new Error(
    'Cannot detect term from CSV headers. Column 10 should be "Midterm" or "Final".'
  );
}

// ============================================================
// Data Lookup Helpers
// ============================================================

async function loadLookupData(supabase: SupabaseClient): Promise<{
  classMap: Map<string, { id: string; grade: number; level: string }>;
  courseMap: Map<string, string>; // key: "classId:courseType" -> courseId
  studentMap: Map<string, { id: string; classId: string | null }>;
}> {
  console.log("\n📦 Loading lookup data from database...");

  // Load classes
  const { data: classes, error: classError } = await supabase
    .from("classes")
    .select("id, name, grade, level")
    .eq("academic_year", "2025-2026")
    .eq("is_active", true);

  if (classError) throw new Error(`Failed to load classes: ${classError.message}`);

  const classMap = new Map<string, { id: string; grade: number; level: string }>();
  for (const cls of classes || []) {
    classMap.set(cls.name, { id: cls.id, grade: cls.grade, level: cls.level || "" });
  }
  console.log(`   ✅ Loaded ${classMap.size} classes`);

  // Load courses
  const { data: courses, error: courseError } = await supabase
    .from("courses")
    .select("id, class_id, course_type");

  if (courseError) throw new Error(`Failed to load courses: ${courseError.message}`);

  const courseMap = new Map<string, string>();
  for (const course of courses || []) {
    const key = `${course.class_id}:${course.course_type}`;
    courseMap.set(key, course.id);
  }
  console.log(`   ✅ Loaded ${courseMap.size} courses`);

  // Load students (paginated to handle >1000 records)
  const studentMap = new Map<string, { id: string; classId: string | null }>();
  let studentOffset = 0;
  const studentPageSize = 1000;

  while (true) {
    const { data: students, error: studentError } = await supabase
      .from("students")
      .select("id, student_id, class_id")
      .range(studentOffset, studentOffset + studentPageSize - 1);

    if (studentError) throw new Error(`Failed to load students: ${studentError.message}`);

    if (!students || students.length === 0) break;

    for (const student of students) {
      studentMap.set(student.student_id, { id: student.id, classId: student.class_id });
    }

    if (students.length < studentPageSize) break;
    studentOffset += studentPageSize;
  }

  console.log(`   ✅ Loaded ${studentMap.size} students`);

  return { classMap, courseMap, studentMap };
}

// ============================================================
// Main Import Logic
// ============================================================

async function importGradebook(
  supabase: SupabaseClient,
  csvPath: string,
  term: 1 | 2,
  gradeFilter: number | undefined,
  dryRun: boolean,
  verbose: boolean
): Promise<ImportStats> {
  const stats: ImportStats = {
    totalRows: 0,
    validRows: 0,
    skippedRows: 0,
    examsCreated: 0,
    examsExisting: 0,
    scoresImported: 0,
    scoresSkipped: 0,
    errors: [],
    warnings: [],
  };

  const termName = term === 1 ? "Midterm" : "Final";
  const gradeFilterStr = gradeFilter ? `G${gradeFilter}` : "All";
  const midtermFinalCode = term === 1 ? "MID" : "FINAL";
  const semester = "25Fall";

  console.log(`\n📋 Import Configuration:`);
  console.log(`   Term: ${term} (${termName})`);
  console.log(`   Grade Filter: ${gradeFilterStr}`);
  console.log(`   Semester: ${semester}`);
  console.log(`   Dry Run: ${dryRun}`);

  // Load lookup data
  const { classMap, courseMap, studentMap } = await loadLookupData(supabase);

  // Read and parse CSV
  console.log(`\n📄 Reading CSV file: ${csvPath}`);
  const content = fs.readFileSync(csvPath, "utf-8");
  const { headers, rows } = parseCSV(content);
  stats.totalRows = rows.length;
  console.log(`   Total rows: ${stats.totalRows}`);

  if (verbose) {
    console.log(`   Headers: ${headers.slice(0, 10).join(", ")}...`);
  }

  // Track exams to create (deduped)
  const examMap = new Map<string, ExamEntry>(); // key: "classId:courseId:assessmentCode"

  // Track scores to import
  const scoresToImport: {
    studentId: string;
    studentDbId: string;
    examKey: string;
    assessmentCode: string;
    score: number;
  }[] = [];

  // Process each row
  console.log(`\n🔄 Processing rows...`);

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const rowNum = rowIndex + 2; // +2 for 1-based + header row

    // Extract row data
    const className = row[COL.CLASS]?.trim();
    const subjectType = row[COL.SUBJECT_TYPE]?.trim().toUpperCase();
    const studentIdStr = row[COL.STUDENT_ID]?.trim();
    const gradeLevel = row[COL.GRADE_LEVEL]?.trim().toUpperCase();

    // Validate required fields
    if (!className || !subjectType || !studentIdStr) {
      stats.skippedRows++;
      stats.warnings.push(`Row ${rowNum}: Missing required fields (class, subject type, or student ID)`);
      continue;
    }

    // Apply grade filter if specified
    if (gradeFilter) {
      // Extract grade number from className (e.g., "G5 Discoverers" -> 5)
      const classGradeMatch = className.match(/^G(\d)/);
      const classGrade = classGradeMatch ? parseInt(classGradeMatch[1], 10) : 0;
      if (classGrade !== gradeFilter) {
        stats.skippedRows++;
        continue; // Silently skip rows not matching grade filter
      }
    }

    // Validate subject type
    if (subjectType !== "LT" && subjectType !== "IT") {
      stats.skippedRows++;
      stats.warnings.push(`Row ${rowNum}: Invalid subject type "${subjectType}" (must be LT or IT)`);
      continue;
    }

    // Find class
    const classInfo = classMap.get(className);
    if (!classInfo) {
      stats.skippedRows++;
      stats.errors.push(`Row ${rowNum}: Class not found: "${className}"`);
      continue;
    }

    // Find course
    const courseKey = `${classInfo.id}:${subjectType}`;
    const courseId = courseMap.get(courseKey);
    if (!courseId) {
      stats.skippedRows++;
      stats.errors.push(`Row ${rowNum}: Course not found for class "${className}" and type "${subjectType}"`);
      continue;
    }

    // Find student
    const studentInfo = studentMap.get(studentIdStr);
    if (!studentInfo) {
      stats.skippedRows++;
      stats.errors.push(`Row ${rowNum}: Student not found: "${studentIdStr}"`);
      continue;
    }

    // Validate level matches (warning only)
    if (classInfo.level && gradeLevel && classInfo.level !== gradeLevel) {
      stats.warnings.push(
        `Row ${rowNum}: Level mismatch - CSV: ${gradeLevel}, DB: ${classInfo.level} (student: ${studentIdStr})`
      );
    }

    stats.validRows++;

    // Process score columns
    for (const { colIndex, code } of SCORE_COLUMNS) {
      const actualCode = code === "DYNAMIC" ? midtermFinalCode : code;
      const scoreStr = row[colIndex]?.trim();

      // Skip empty or invalid scores
      if (!scoreStr) continue;
      const score = parseFloat(scoreStr);
      if (isNaN(score) || score <= 0) continue;

      // Create exam entry
      const examName = `${subjectType} ${actualCode} ${termName} ${semester}`;
      const examKey = `${classInfo.id}:${courseId}:${actualCode}`;

      if (!examMap.has(examKey)) {
        examMap.set(examKey, {
          classId: classInfo.id,
          courseId: courseId,
          name: examName,
          assessmentCode: actualCode,
        });
      }

      // Add score entry
      scoresToImport.push({
        studentId: studentIdStr,
        studentDbId: studentInfo.id,
        examKey,
        assessmentCode: actualCode,
        score,
      });
    }
  }

  console.log(`\n📊 Processing Summary:`);
  console.log(`   Valid rows: ${stats.validRows}`);
  console.log(`   Skipped rows: ${stats.skippedRows}`);
  console.log(`   Unique exams to create: ${examMap.size}`);
  console.log(`   Scores to import: ${scoresToImport.length}`);

  if (dryRun) {
    console.log(`\n🔍 DRY RUN - No data will be written`);

    // Show sample of exams
    console.log(`\n📝 Sample exams (first 5):`);
    let examCount = 0;
    for (const exam of examMap.values()) {
      if (examCount >= 5) break;
      console.log(`   - ${exam.name} (${exam.assessmentCode})`);
      examCount++;
    }

    // Show sample of scores
    console.log(`\n📝 Sample scores (first 10):`);
    for (let i = 0; i < Math.min(10, scoresToImport.length); i++) {
      const s = scoresToImport[i];
      console.log(`   - ${s.studentId}: ${s.score}`);
    }

    return stats;
  }

  // Create exams in batches
  console.log(`\n🏗️ Creating exams...`);
  const examIdMap = new Map<string, string>(); // examKey -> examId

  // First, load all existing exams for the courses involved
  const courseIds = [...new Set([...examMap.values()].map((e) => e.courseId))];
  console.log(`   Loading existing exams for ${courseIds.length} courses...`);

  // Load all exams with pagination (Supabase default limit is 1000)
  let allExistingExams: { id: string; course_id: string; name: string }[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data: pageExams, error: loadExamsError } = await supabase
      .from("exams")
      .select("id, course_id, name")
      .in("course_id", courseIds)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (loadExamsError) {
      throw new Error(`Failed to load existing exams: ${loadExamsError.message}`);
    }

    if (!pageExams || pageExams.length === 0) {
      break;
    }

    allExistingExams = allExistingExams.concat(pageExams);

    if (pageExams.length < pageSize) {
      break;
    }
    page++;
  }

  const existingExams = allExistingExams;

  // Build a lookup for existing exams (key: courseId:name)
  const existingExamLookup = new Map<string, string>();
  for (const exam of existingExams || []) {
    const key = `${exam.course_id}:${exam.name}`;
    existingExamLookup.set(key, exam.id);
  }
  console.log(`   Found ${existingExamLookup.size} existing exams`);

  // Separate exams into existing and new
  const examsToCreate: { key: string; exam: ExamEntry }[] = [];

  for (const [examKey, exam] of examMap) {
    const lookupKey = `${exam.courseId}:${exam.name}`;
    const existingId = existingExamLookup.get(lookupKey);

    if (existingId) {
      examIdMap.set(examKey, existingId);
      stats.examsExisting++;
    } else {
      examsToCreate.push({ key: examKey, exam });
    }
  }

  console.log(`   Exams to create: ${examsToCreate.length}`);
  console.log(`   Exams existing: ${stats.examsExisting}`);

  // Create new exams in batches
  if (examsToCreate.length > 0) {
    const examBatches: { key: string; exam: ExamEntry }[][] = [];
    for (let i = 0; i < examsToCreate.length; i += EXAM_BATCH_SIZE) {
      examBatches.push(examsToCreate.slice(i, i + EXAM_BATCH_SIZE));
    }

    console.log(`   Creating in ${examBatches.length} batches (${EXAM_BATCH_SIZE} per batch)...`);

    for (let batchIndex = 0; batchIndex < examBatches.length; batchIndex++) {
      const batch = examBatches[batchIndex];

      // Note: Production schema uses course_id (not class_id) for exams
      // Select appropriate admin user ID based on environment
      const SYSTEM_USER_ID = useStaging ? STAGING_SYSTEM_USER_ID : PROD_SYSTEM_USER_ID;
      const insertData = batch.map(({ exam }) => ({
        course_id: exam.courseId,
        name: exam.name,
        exam_date: new Date().toISOString().split("T")[0],
        created_by: SYSTEM_USER_ID,
      }));

      const { data: newExams, error: createError } = await supabase
        .from("exams")
        .insert(insertData)
        .select("id, course_id, name");

      if (createError) {
        stats.errors.push(`Exam batch ${batchIndex + 1} failed: ${createError.message}`);
        // Try to create individually for this batch
        for (const { key, exam } of batch) {
          const { data: singleExam, error: singleError } = await supabase
            .from("exams")
            .insert({
              course_id: exam.courseId,
              name: exam.name,
              exam_date: new Date().toISOString().split("T")[0],
              created_by: SYSTEM_USER_ID,
            })
            .select("id")
            .single();

          if (singleError) {
            stats.errors.push(`Failed to create exam "${exam.name}": ${singleError.message}`);
          } else if (singleExam) {
            examIdMap.set(key, singleExam.id);
            stats.examsCreated++;
          }
        }
      } else if (newExams) {
        // Map created exams back to their keys
        for (const newExam of newExams) {
          const matchingEntry = batch.find(
            ({ exam }) =>
              exam.courseId === newExam.course_id &&
              exam.name === newExam.name
          );
          if (matchingEntry) {
            examIdMap.set(matchingEntry.key, newExam.id);
            stats.examsCreated++;
          }
        }
      }

      // Progress indicator
      if ((batchIndex + 1) % 5 === 0 || batchIndex === examBatches.length - 1) {
        console.log(`   Progress: ${batchIndex + 1}/${examBatches.length} exam batches`);
      }

      // Small delay between batches to avoid rate limiting
      if (batchIndex < examBatches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  console.log(`   ✅ Created: ${stats.examsCreated}`);
  console.log(`   ⏭️ Existing: ${stats.examsExisting}`);

  // Import scores in batches
  console.log(`\n📥 Importing scores...`);

  // Prepare all scores with resolved exam IDs
  // Note: Schema requires assessment_code and entered_by
  // Select appropriate admin user ID based on environment
  const SCORES_SYSTEM_USER_ID = useStaging ? STAGING_SYSTEM_USER_ID : PROD_SYSTEM_USER_ID;
  const resolvedScores: {
    exam_id: string;
    student_id: string;
    assessment_code: string;
    score: number;
    entered_by: string;
  }[] = [];

  for (const scoreEntry of scoresToImport) {
    const examId = examIdMap.get(scoreEntry.examKey);
    if (!examId) {
      stats.scoresSkipped++;
      continue;
    }

    resolvedScores.push({
      exam_id: examId,
      student_id: scoreEntry.studentDbId,
      assessment_code: scoreEntry.assessmentCode,
      score: scoreEntry.score,
      entered_by: SCORES_SYSTEM_USER_ID,
    });
  }

  console.log(`   Scores to import: ${resolvedScores.length}`);
  console.log(`   Scores skipped (no exam): ${stats.scoresSkipped}`);

  // Split into batches
  const scoreBatches: { exam_id: string; student_id: string; score: number }[][] = [];
  for (let i = 0; i < resolvedScores.length; i += SCORE_BATCH_SIZE) {
    scoreBatches.push(resolvedScores.slice(i, i + SCORE_BATCH_SIZE));
  }

  console.log(`   Importing in ${scoreBatches.length} batches (${SCORE_BATCH_SIZE} per batch)...`);

  for (let i = 0; i < scoreBatches.length; i++) {
    const batch = scoreBatches[i];

    const { error: upsertError } = await supabase
      .from("scores")
      .upsert(batch, {
        onConflict: "student_id,exam_id,assessment_code",
        ignoreDuplicates: false,
      });

    if (upsertError) {
      stats.errors.push(`Score batch ${i + 1} failed: ${upsertError.message}`);
      // Log more details for debugging
      console.error(`   ❌ Batch ${i + 1} error: ${upsertError.message}`);
    } else {
      stats.scoresImported += batch.length;
    }

    // Progress indicator
    if ((i + 1) % 10 === 0 || i === scoreBatches.length - 1) {
      console.log(`   Progress: ${i + 1}/${scoreBatches.length} batches (${stats.scoresImported} imported)`);
    }

    // Small delay between batches to avoid rate limiting
    if (i < scoreBatches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  console.log(`   ✅ Imported: ${stats.scoresImported}`);
  console.log(`   ⏭️ Skipped: ${stats.scoresSkipped}`);

  return stats;
}

// ============================================================
// Main Entry Point
// ============================================================

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.file) {
    console.error("❌ Error: --file parameter is required");
    printHelp();
    process.exit(1);
  }

  // Validate file exists
  const csvPath = path.resolve(args.file);
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Error: File not found: ${csvPath}`);
    process.exit(1);
  }

  // Validate environment
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ Error: Missing environment variables");
    console.error("   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║           📚 LMS Gradebook Import Script                   ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  // Show environment info
  const envName = useStaging ? "🧪 STAGING" : "🚀 PRODUCTION";
  console.log(`\n🌐 Environment: ${envName}`);
  console.log(`   URL: ${SUPABASE_URL}`);
  if (args.grade) {
    console.log(`   Grade Filter: G${args.grade}`);
  }

  // Create Supabase client with service role
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Detect term from CSV if not specified
    let term = args.term;
    if (!term) {
      console.log("\n🔍 Detecting term from CSV headers...");
      const content = fs.readFileSync(csvPath, "utf-8");
      const { headers } = parseCSV(content);
      term = detectTerm(headers);
      console.log(`   Detected: Term ${term} (${term === 1 ? "Midterm" : "Final"})`);
    }

    // Run import
    const stats = await importGradebook(
      supabase,
      csvPath,
      term,
      args.grade,
      args.dryRun,
      args.verbose
    );

    // Print final report
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║                    📊 Import Report                        ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log(`
    Total Rows:      ${stats.totalRows}
    Valid Rows:      ${stats.validRows}
    Skipped Rows:    ${stats.skippedRows}

    Exams Created:   ${stats.examsCreated}
    Exams Existing:  ${stats.examsExisting}

    Scores Imported: ${stats.scoresImported}
    Scores Skipped:  ${stats.scoresSkipped}

    Errors:          ${stats.errors.length}
    Warnings:        ${stats.warnings.length}
    `);

    if (stats.errors.length > 0) {
      console.log("\n❌ Errors:");
      for (const err of stats.errors.slice(0, 20)) {
        console.log(`   ${err}`);
      }
      if (stats.errors.length > 20) {
        console.log(`   ... and ${stats.errors.length - 20} more errors`);
      }
    }

    if (stats.warnings.length > 0 && args.verbose) {
      console.log("\n⚠️ Warnings:");
      for (const warn of stats.warnings.slice(0, 20)) {
        console.log(`   ${warn}`);
      }
      if (stats.warnings.length > 20) {
        console.log(`   ... and ${stats.warnings.length - 20} more warnings`);
      }
    }

    if (args.dryRun) {
      console.log("\n✅ Dry run completed. No data was written.");
    } else {
      console.log("\n✅ Import completed successfully!");
    }

    process.exit(stats.errors.length > 0 ? 1 : 0);
  } catch (error) {
    console.error("\n❌ Fatal error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
