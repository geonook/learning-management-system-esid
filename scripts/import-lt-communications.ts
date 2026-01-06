#!/usr/bin/env npx tsx
/**
 * LT (Local Teacher) Communication Records Import Script
 * Import historical communication records from CSV
 *
 * CSV Source: 中師電聯記錄簿
 *
 * Features:
 * - Uses student number to match student, course, and teacher from system
 * - Skips inactive students (is_active=false)
 * - Supports dry-run mode for preview
 * - Batch insert for performance
 *
 * Usage:
 *   npx tsx scripts/import-lt-communications.ts --file="data/communications.csv" --parse-only
 *   npx tsx scripts/import-lt-communications.ts --file="data/communications.csv" --staging --dry-run
 *   npx tsx scripts/import-lt-communications.ts --file="data/communications.csv" --staging
 *   npx tsx scripts/import-lt-communications.ts --file="data/communications.csv"
 *
 * @created 2026-01-06
 */

import * as fs from "fs";
import * as path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Environment Configuration
// ============================================================

const useStaging = process.argv.includes("--staging");

// Staging environment
const STAGING_URL = "https://kqvpcoolgyhjqleekmee.supabase.co";

// Production environment
const PROD_URL = "https://piwbooidofbaqklhijup.supabase.co";

// Use environment variable for service role key
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const SUPABASE_URL = useStaging ? STAGING_URL : PROD_URL;
const SUPABASE_SERVICE_KEY = SERVICE_KEY;

// Batch size for insert operations
const BATCH_SIZE = 100;

// ============================================================
// Types
// ============================================================

interface CSVRow {
  ID: string;
  "Student ID": string;
  "Chinese Name": string;
  "English Name": string;
  "English Class": string;
  Date: string;
  Semester: string;
  Term: string;
  "Contact Type": string;
  "Teacher Content": string;
  "Parent Response": string;
  "Contact Method": string;
  Teacher: string;
  Status: string;
  Source: string;
}

interface StudentMatch {
  id: string;
  student_id: string;
  class_id: string | null;
}

interface CourseMatch {
  course_id: string;
  teacher_id: string | null;
}

interface CommunicationInsert {
  student_id: string;
  course_id: string | null;
  teacher_id: string | null;
  academic_year: string;
  semester: "fall" | "spring";
  communication_type: "phone_call" | "email" | "in_person" | "message" | "other";
  contact_period: "semester_start" | "midterm" | "final" | "ad_hoc" | null;
  subject: string | null;
  content: string | null;
  communication_date: string | null;
  is_lt_required: boolean;
}

interface ImportStats {
  totalRows: number;
  validRows: number;
  inserted: number;
  skippedInactive: number;
  skippedNoStudent: number;
  errors: string[];
  warnings: string[];
  unmatchedStudentIds: Set<string>;
  missingCourses: Set<string>;
}

// ============================================================
// CLI Argument Parsing
// ============================================================

function parseArgs(): {
  filePath: string;
  dryRun: boolean;
  verbose: boolean;
  parseOnly: boolean;
} {
  const args = process.argv.slice(2);
  let filePath = "";
  let dryRun = false;
  let verbose = false;
  let parseOnly = false;

  for (const arg of args) {
    if (arg.startsWith("--file=")) {
      filePath = arg.replace("--file=", "");
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--verbose") {
      verbose = true;
    } else if (arg === "--parse-only") {
      parseOnly = true;
    }
  }

  return { filePath, dryRun, verbose, parseOnly };
}

// ============================================================
// CSV Parsing (using project's own parser)
// ============================================================

// CSV line parser with proper quote handling
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
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
      current = "";
    } else {
      current += char;
    }

    i++;
  }

  // Add the last field
  result.push(current.trim());
  return result;
}

function parseCSV(content: string): { rows: CSVRow[]; errors: string[] } {
  const errors: string[] = [];
  const rows: CSVRow[] = [];

  try {
    const lines = content.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      errors.push("CSV file must have at least a header row and one data row");
      return { rows, errors };
    }

    // Parse header
    const headerLine = lines[0]!;
    const headers = parseCSVLine(headerLine, ",");

    // Map headers to indices
    const headerMap: Record<string, number> = {};
    headers.forEach((h, i) => {
      headerMap[h.trim()] = i;
    });

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!;
      if (!line.trim()) continue;

      const values = parseCSVLine(line, ",");

      const row: CSVRow = {
        ID: values[headerMap["ID"] ?? -1] || "",
        "Student ID": values[headerMap["Student ID"] ?? -1] || "",
        "Chinese Name": values[headerMap["Chinese Name"] ?? -1] || "",
        "English Name": values[headerMap["English Name"] ?? -1] || "",
        "English Class": values[headerMap["English Class"] ?? -1] || "",
        Date: values[headerMap["Date"] ?? -1] || "",
        Semester: values[headerMap["Semester"] ?? -1] || "",
        Term: values[headerMap["Term"] ?? -1] || "",
        "Contact Type": values[headerMap["Contact Type"] ?? -1] || "",
        "Teacher Content": values[headerMap["Teacher Content"] ?? -1] || "",
        "Parent Response": values[headerMap["Parent Response"] ?? -1] || "",
        "Contact Method": values[headerMap["Contact Method"] ?? -1] || "",
        Teacher: values[headerMap["Teacher"] ?? -1] || "",
        Status: values[headerMap["Status"] ?? -1] || "",
        Source: values[headerMap["Source"] ?? -1] || "",
      };

      rows.push(row);
    }

    return { rows, errors };
  } catch (error) {
    errors.push(`CSV parse error: ${(error as Error).message}`);
    return { rows: [], errors };
  }
}

// ============================================================
// Field Mapping Functions
// ============================================================

function mapSemester(semester: string): "fall" | "spring" {
  return semester.toLowerCase() === "fall" ? "fall" : "spring";
}

function mapTerm(term: string): "semester_start" | "midterm" | "final" | "ad_hoc" | null {
  switch (term) {
    case "Term 0":
      return "semester_start";
    case "Term 1":
      return "midterm";
    case "Term 2":
      return "final";
    default:
      return "ad_hoc";
  }
}

function mapContactMethod(method: string): "phone_call" | "email" | "in_person" | "message" | "other" {
  const normalized = method.toLowerCase().trim();
  if (normalized.includes("phone")) return "phone_call";
  if (normalized.includes("line")) return "message";
  if (normalized.includes("email")) return "email";
  if (normalized.includes("in person") || normalized.includes("in_person")) return "in_person";
  return "other";
}

// Default dates for each term when date is missing or invalid
const DEFAULT_DATE = "2025-09-01T00:00:00.000Z";
const TERM_DEFAULT_DATES: Record<string, string> = {
  "Term 0": "2025-09-01T00:00:00.000Z",
  "Term 1": "2025-10-29T00:00:00.000Z",
  "Term 2": "2025-12-25T00:00:00.000Z",
};

function formatDate(dateStr: string, term: string): string {
  if (!dateStr || dateStr.trim() === "") {
    // Use default date based on term, fallback to DEFAULT_DATE
    return TERM_DEFAULT_DATES[term] || DEFAULT_DATE;
  }

  // Try to parse the date
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    // Invalid date, use default based on term
    return TERM_DEFAULT_DATES[term] || DEFAULT_DATE;
  }

  // Validate year is within reasonable range (2020-2030)
  const year = date.getFullYear();
  if (year < 2020 || year > 2030) {
    // Year out of range (e.g., 20025), use default based on term
    return TERM_DEFAULT_DATES[term] || DEFAULT_DATE;
  }

  return date.toISOString();
}

// ============================================================
// Database Loading Functions
// ============================================================

async function loadStudentMap(supabase: SupabaseClient): Promise<Map<string, StudentMatch>> {
  console.log("📚 Loading active students from database...");

  const { data, error } = await supabase
    .from("students")
    .select("id, student_id, class_id")
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to load students: ${error.message}`);
  }

  const studentMap = new Map<string, StudentMatch>();
  for (const student of data || []) {
    studentMap.set(student.student_id, {
      id: student.id,
      student_id: student.student_id,
      class_id: student.class_id,
    });
  }

  console.log(`   Found ${studentMap.size} active students`);
  return studentMap;
}

async function loadCourseMap(supabase: SupabaseClient): Promise<Map<string, CourseMatch>> {
  console.log("📚 Loading LT courses from database...");

  const { data, error } = await supabase
    .from("courses")
    .select("id, class_id, teacher_id")
    .eq("academic_year", "2025-2026")
    .eq("course_type", "LT");

  if (error) {
    throw new Error(`Failed to load courses: ${error.message}`);
  }

  const courseMap = new Map<string, CourseMatch>();
  for (const course of data || []) {
    courseMap.set(course.class_id, {
      course_id: course.id,
      teacher_id: course.teacher_id,
    });
  }

  console.log(`   Found ${courseMap.size} LT courses for 2025-2026`);
  return courseMap;
}

// ============================================================
// Data Transformation
// ============================================================

function transformRows(
  rows: CSVRow[],
  studentMap: Map<string, StudentMatch>,
  courseMap: Map<string, CourseMatch>,
  stats: ImportStats,
  verbose: boolean
): CommunicationInsert[] {
  const records: CommunicationInsert[] = [];

  for (const row of rows) {
    const studentNumber = row["Student ID"]?.trim();

    if (!studentNumber) {
      stats.warnings.push(`Row missing Student ID: ${row.ID}`);
      continue;
    }

    // Find student (only active students are in the map)
    const student = studentMap.get(studentNumber);

    if (!student) {
      stats.skippedNoStudent++;
      stats.unmatchedStudentIds.add(studentNumber);
      if (verbose) {
        console.log(`   ⚠️  Student not found or inactive: ${studentNumber}`);
      }
      continue;
    }

    // Find course and teacher based on student's current class
    let courseId: string | null = null;
    let teacherId: string | null = null;

    if (student.class_id) {
      const course = courseMap.get(student.class_id);
      if (course) {
        courseId = course.course_id;
        teacherId = course.teacher_id;
      } else {
        stats.missingCourses.add(studentNumber);
        if (verbose) {
          console.log(`   ⚠️  No LT course for class: ${student.class_id} (student: ${studentNumber})`);
        }
      }
    }

    // Build record
    const record: CommunicationInsert = {
      student_id: student.id,
      course_id: courseId,
      teacher_id: teacherId,
      academic_year: "2025-2026",
      semester: mapSemester(row.Semester || "Fall"),
      communication_type: mapContactMethod(row["Contact Method"] || ""),
      contact_period: mapTerm(row.Term || ""),
      subject: row["Parent Response"]?.trim() || null,
      content: row["Teacher Content"]?.trim() || null,
      communication_date: formatDate(row.Date, row.Term),
      is_lt_required: row["Contact Type"] === "Scheduled Contact",
    };

    records.push(record);
    stats.validRows++;
  }

  return records;
}

// ============================================================
// Database Insert
// ============================================================

async function batchInsert(
  supabase: SupabaseClient,
  records: CommunicationInsert[],
  dryRun: boolean,
  verbose: boolean,
  stats: ImportStats
): Promise<void> {
  console.log(`\n🔄 Inserting ${records.length} records in batches of ${BATCH_SIZE}...`);

  const totalBatches = Math.ceil(records.length / BATCH_SIZE);

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    if (dryRun) {
      if (verbose) {
        console.log(`   [DRY-RUN] Batch ${batchNum}/${totalBatches}: ${batch.length} records`);
      }
      stats.inserted += batch.length;
      continue;
    }

    try {
      const { error } = await supabase.from("communications").insert(batch);

      if (error) {
        stats.errors.push(`Batch ${batchNum}: ${error.message}`);
        console.error(`   ❌ Batch ${batchNum} failed: ${error.message}`);
      } else {
        stats.inserted += batch.length;
        if (verbose || batchNum % 10 === 0) {
          console.log(`   ✅ Batch ${batchNum}/${totalBatches}: ${batch.length} inserted`);
        }
      }
    } catch (e) {
      stats.errors.push(`Batch ${batchNum}: ${(e as Error).message}`);
      console.error(`   ❌ Batch ${batchNum} exception: ${(e as Error).message}`);
    }

    // Small delay to prevent rate limiting
    await new Promise((r) => setTimeout(r, 50));
  }
}

// ============================================================
// Report Generation
// ============================================================

function printParseReport(rows: CSVRow[], errors: string[]): void {
  console.log("\n" + "=".repeat(60));
  console.log("CSV Parse Report");
  console.log("=".repeat(60));
  console.log(`Total Rows:     ${rows.length}`);

  if (rows.length > 0) {
    // Count by semester
    const bySemester: Record<string, number> = {};
    const byTerm: Record<string, number> = {};
    const byMethod: Record<string, number> = {};

    for (const row of rows) {
      const semester = row.Semester || "Unknown";
      const term = row.Term || "Unknown";
      const method = row["Contact Method"] || "Unknown";

      bySemester[semester] = (bySemester[semester] || 0) + 1;
      byTerm[term] = (byTerm[term] || 0) + 1;
      byMethod[method] = (byMethod[method] || 0) + 1;
    }

    console.log("\nBy Semester:");
    for (const [key, count] of Object.entries(bySemester)) {
      console.log(`  ${key}: ${count}`);
    }

    console.log("\nBy Term:");
    for (const [key, count] of Object.entries(byTerm)) {
      console.log(`  ${key}: ${count}`);
    }

    console.log("\nBy Contact Method:");
    for (const [key, count] of Object.entries(byMethod).slice(0, 10)) {
      console.log(`  ${key}: ${count}`);
    }
  }

  if (errors.length > 0) {
    console.log("\nParse Errors:");
    for (const error of errors) {
      console.log(`  ❌ ${error}`);
    }
  }

  console.log("=".repeat(60));
}

function printImportReport(stats: ImportStats, dryRun: boolean): void {
  console.log("\n" + "=".repeat(60));
  console.log(dryRun ? "LT Communications Import Report (DRY RUN)" : "LT Communications Import Report");
  console.log("=".repeat(60));
  console.log("");
  console.log(`Total CSV Rows:        ${stats.totalRows}`);
  console.log(`Valid Records:         ${stats.validRows}`);
  console.log(`Inserted:              ${stats.inserted}`);
  console.log("");
  console.log(`Skipped (inactive):    ${stats.skippedNoStudent}`);

  if (stats.unmatchedStudentIds.size > 0) {
    console.log(`\nUnmatched Student IDs (${stats.unmatchedStudentIds.size}):`);
    const ids = Array.from(stats.unmatchedStudentIds).slice(0, 20);
    for (const id of ids) {
      console.log(`  - ${id}`);
    }
    if (stats.unmatchedStudentIds.size > 20) {
      console.log(`  ... and ${stats.unmatchedStudentIds.size - 20} more`);
    }
  }

  if (stats.missingCourses.size > 0) {
    console.log(`\nStudents without LT course (${stats.missingCourses.size}):`);
    const ids = Array.from(stats.missingCourses).slice(0, 10);
    for (const id of ids) {
      console.log(`  - ${id}`);
    }
    if (stats.missingCourses.size > 10) {
      console.log(`  ... and ${stats.missingCourses.size - 10} more`);
    }
  }

  if (stats.errors.length > 0) {
    console.log("\nErrors:");
    for (const error of stats.errors.slice(0, 10)) {
      console.log(`  ❌ ${error}`);
    }
    if (stats.errors.length > 10) {
      console.log(`  ... and ${stats.errors.length - 10} more errors`);
    }
  }

  if (stats.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of stats.warnings.slice(0, 10)) {
      console.log(`  ⚠️  ${warning}`);
    }
    if (stats.warnings.length > 10) {
      console.log(`  ... and ${stats.warnings.length - 10} more warnings`);
    }
  }

  console.log("");
  console.log("=".repeat(60));

  if (dryRun) {
    console.log("\n✅ Dry run complete. No data was written to the database.");
    console.log("   Remove --dry-run flag to perform actual import.\n");
  } else {
    console.log("\n✅ Import complete!\n");
  }
}

// ============================================================
// Main Entry Point
// ============================================================

async function main(): Promise<void> {
  console.log("\n🎯 LT Communications Import Script");
  console.log("=".repeat(50));

  // Parse arguments
  const { filePath, dryRun, verbose, parseOnly } = parseArgs();

  if (!filePath) {
    console.error("❌ Error: --file argument is required");
    console.log("\nUsage:");
    console.log("  npx tsx scripts/import-lt-communications.ts --file=data/communications.csv --parse-only");
    console.log("  npx tsx scripts/import-lt-communications.ts --file=data/communications.csv --staging --dry-run");
    console.log("  npx tsx scripts/import-lt-communications.ts --file=data/communications.csv --staging");
    console.log("  npx tsx scripts/import-lt-communications.ts --file=data/communications.csv");
    process.exit(1);
  }

  // Check file exists
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ Error: File not found: ${absolutePath}`);
    process.exit(1);
  }

  console.log(`📁 File: ${absolutePath}`);
  console.log(`🌐 Environment: ${parseOnly ? "N/A (parse-only)" : useStaging ? "STAGING" : "PRODUCTION"}`);
  console.log(`🔄 Mode: ${parseOnly ? "PARSE ONLY" : dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`📝 Verbose: ${verbose ? "ON" : "OFF"}`);

  // Validate service key (skip for parse-only mode)
  if (!parseOnly && !SUPABASE_SERVICE_KEY) {
    console.error("❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
    console.log("   Set the environment variable or use --parse-only to test CSV parsing");
    process.exit(1);
  }

  // Read and parse CSV
  console.log("\n📄 Reading CSV file...");
  const csvContent = fs.readFileSync(absolutePath, "utf-8");
  console.log(`   File size: ${(csvContent.length / 1024).toFixed(2)} KB`);

  console.log("\n🔍 Parsing CSV...");
  const { rows, errors: parseErrors } = parseCSV(csvContent);

  // Print parse report
  printParseReport(rows, parseErrors);

  if (rows.length === 0) {
    console.error("❌ No rows to import. Please check CSV format.");
    process.exit(1);
  }

  // Show sample data
  if (rows.length > 0) {
    const sample = rows[0]!;
    console.log("\n📊 Sample Record:");
    console.log(`   Student: ${sample["Student ID"]} (${sample["Chinese Name"]})`);
    console.log(`   Class: ${sample["English Class"]}`);
    console.log(`   Date: ${sample.Date}, Semester: ${sample.Semester}, Term: ${sample.Term}`);
    console.log(`   Teacher: ${sample.Teacher}`);
    console.log(`   Content: ${sample["Teacher Content"]?.substring(0, 50)}...`);
  }

  // Exit early for parse-only mode
  if (parseOnly) {
    console.log("\n✅ Parse-only mode complete. CSV parsing successful!");
    console.log("   Use --dry-run or remove --parse-only to test database operations.\n");
    return;
  }

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Initialize stats
  const stats: ImportStats = {
    totalRows: rows.length,
    validRows: 0,
    inserted: 0,
    skippedInactive: 0,
    skippedNoStudent: 0,
    errors: [],
    warnings: [],
    unmatchedStudentIds: new Set(),
    missingCourses: new Set(),
  };

  // Load reference data
  const studentMap = await loadStudentMap(supabase);
  const courseMap = await loadCourseMap(supabase);

  // Transform rows
  console.log("\n🔄 Transforming records...");
  const records = transformRows(rows, studentMap, courseMap, stats, verbose);
  console.log(`   Transformed ${records.length} valid records`);

  // Confirm before live import
  if (!dryRun) {
    console.log("\n⚠️  WARNING: This will write data to the database!");
    console.log("   Press Ctrl+C within 5 seconds to cancel...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Insert data
  await batchInsert(supabase, records, dryRun, verbose, stats);

  // Print import report
  printImportReport(stats, dryRun);
}

// Run
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
