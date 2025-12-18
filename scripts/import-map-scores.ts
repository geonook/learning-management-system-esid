#!/usr/bin/env npx tsx
/**
 * NWEA MAP Growth Assessment Import Script
 * Import MAP assessment data from Grade Breakdown Report CSV
 *
 * CSV Source: NWEA MAP Growth Platform → Grade Breakdown Report
 *
 * Usage:
 *   npx tsx scripts/import-map-scores.ts --file="data/map-fall-2025.csv"
 *   npx tsx scripts/import-map-scores.ts --file="data/map-fall-2025.csv" --dry-run
 *   npx tsx scripts/import-map-scores.ts --file="data/map-fall-2025.csv" --staging
 *   npx tsx scripts/import-map-scores.ts --file="data/map-fall-2025.csv" --verbose
 *
 * @created 2025-12-18
 */

import * as fs from "fs";
import * as path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  parseMapCSV,
  generateParseReport,
  type MapAssessmentRow,
  type MapParseResult,
} from "../lib/import/map-parser";

// ============================================================
// Environment Configuration
// ============================================================

const useStaging = process.argv.includes("--staging");

// Staging environment
const STAGING_URL = "https://kqvpcoolgyhjqleekmee.supabase.co";

// Production environment
const PROD_URL = "https://piwbooidofbaqklhijup.supabase.co";

// Use environment variable for service role key (works for both environments)
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const SUPABASE_URL = useStaging ? STAGING_URL : PROD_URL;
const SUPABASE_SERVICE_KEY = SERVICE_KEY;

// ============================================================
// Types
// ============================================================

interface ImportStats {
  totalRows: number;
  validRows: number;
  assessmentsCreated: number;
  assessmentsUpdated: number;
  goalsCreated: number;
  studentsMatched: number;
  studentsUnmatched: number;
  errors: string[];
  warnings: string[];
  unmatchedStudentIds: string[];
}

interface StudentMatch {
  id: string;
  student_id: string;
  full_name: string;
}

// ============================================================
// CLI Argument Parsing
// ============================================================

function parseArgs(): {
  filePath: string;
  dryRun: boolean;
  verbose: boolean;
} {
  const args = process.argv.slice(2);
  let filePath = "";
  let dryRun = false;
  let verbose = false;

  for (const arg of args) {
    if (arg.startsWith("--file=")) {
      filePath = arg.replace("--file=", "");
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--verbose") {
      verbose = true;
    }
  }

  return { filePath, dryRun, verbose };
}

// ============================================================
// Student Matching
// ============================================================

async function loadStudentMap(
  supabase: SupabaseClient
): Promise<Map<string, StudentMatch>> {
  console.log("📚 Loading students from database...");

  const { data, error } = await supabase
    .from("students")
    .select("id, student_id, full_name")
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to load students: ${error.message}`);
  }

  const studentMap = new Map<string, StudentMatch>();
  for (const student of data || []) {
    // Map by student_id (e.g., "LE12001")
    studentMap.set(student.student_id, {
      id: student.id,
      student_id: student.student_id,
      full_name: student.full_name,
    });
  }

  console.log(`   Found ${studentMap.size} active students`);
  return studentMap;
}

// ============================================================
// Database Operations
// ============================================================

async function upsertAssessment(
  supabase: SupabaseClient,
  row: MapAssessmentRow,
  studentUUID: string | null,
  importBatchId: string,
  dryRun: boolean,
  verbose: boolean
): Promise<{ created: boolean; updated: boolean; assessmentId: string | null; error: string | null }> {
  const assessmentData = {
    student_id: studentUUID,
    student_number: row.student_number,
    student_last_name: row.student_last_name,
    student_first_name: row.student_first_name,
    grade: row.grade,
    school: row.school,
    term_tested: row.term_tested,
    academic_year: row.academic_year,
    term: row.term,
    course: row.course,
    test_name: row.test_name,
    rit_score: row.rit_score,
    rit_score_range: row.rit_score_range,
    rapid_guessing_percent: row.rapid_guessing_percent,
    lexile_score: row.lexile_score,
    lexile_range: row.lexile_range,
    import_batch_id: importBatchId,
  };

  if (dryRun) {
    if (verbose) {
      console.log(`   [DRY-RUN] Would upsert: ${row.student_number} - ${row.course} - ${row.term_tested}`);
    }
    return { created: true, updated: false, assessmentId: null, error: null };
  }

  const { data, error } = await supabase
    .from("map_assessments")
    .upsert(assessmentData, {
      onConflict: "student_number,course,term_tested",
    })
    .select("id")
    .single();

  if (error) {
    return { created: false, updated: false, assessmentId: null, error: error.message };
  }

  return {
    created: true,
    updated: false, // Supabase upsert doesn't distinguish
    assessmentId: data?.id || null,
    error: null,
  };
}

async function upsertGoals(
  supabase: SupabaseClient,
  assessmentId: string,
  goals: MapAssessmentRow["goals"],
  dryRun: boolean,
  verbose: boolean
): Promise<{ count: number; error: string | null }> {
  if (goals.length === 0) {
    return { count: 0, error: null };
  }

  if (dryRun) {
    if (verbose) {
      console.log(`   [DRY-RUN] Would upsert ${goals.length} goals`);
    }
    return { count: goals.length, error: null };
  }

  const goalData = goals.map((goal) => ({
    assessment_id: assessmentId,
    goal_name: goal.goal_name,
    goal_rit_range: goal.goal_rit_range,
  }));

  const { error } = await supabase
    .from("map_goal_scores")
    .upsert(goalData, {
      onConflict: "assessment_id,goal_name",
    });

  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: goals.length, error: null };
}

// ============================================================
// Main Import Function
// ============================================================

async function importMapScores(
  parseResult: MapParseResult,
  supabase: SupabaseClient,
  dryRun: boolean,
  verbose: boolean
): Promise<ImportStats> {
  const stats: ImportStats = {
    totalRows: parseResult.stats.total,
    validRows: parseResult.stats.valid,
    assessmentsCreated: 0,
    assessmentsUpdated: 0,
    goalsCreated: 0,
    studentsMatched: 0,
    studentsUnmatched: 0,
    errors: [],
    warnings: [],
    unmatchedStudentIds: [],
  };

  // Load student mapping
  const studentMap = await loadStudentMap(supabase);

  // Generate import batch ID
  const importBatchId = crypto.randomUUID();
  console.log(`📦 Import Batch ID: ${importBatchId}`);

  // Process each row
  console.log(`\n🔄 Processing ${parseResult.data.length} valid rows...`);

  let processed = 0;
  for (const row of parseResult.data) {
    processed++;
    if (processed % 100 === 0) {
      console.log(`   Processed ${processed}/${parseResult.data.length}...`);
    }

    // Match student
    const student = studentMap.get(row.student_number);
    const studentUUID = student?.id || null;

    if (!studentUUID) {
      stats.studentsUnmatched++;
      if (!stats.unmatchedStudentIds.includes(row.student_number)) {
        stats.unmatchedStudentIds.push(row.student_number);
      }
      if (verbose) {
        console.log(`   ⚠️  Student not found: ${row.student_number}`);
      }
    } else {
      stats.studentsMatched++;
    }

    // Upsert assessment
    const assessmentResult = await upsertAssessment(
      supabase,
      row,
      studentUUID,
      importBatchId,
      dryRun,
      verbose
    );

    if (assessmentResult.error) {
      stats.errors.push(`Row ${row.student_number}: ${assessmentResult.error}`);
      continue;
    }

    if (assessmentResult.created) {
      stats.assessmentsCreated++;
    } else if (assessmentResult.updated) {
      stats.assessmentsUpdated++;
    }

    // Upsert goals (only if we have an assessment ID)
    if (assessmentResult.assessmentId && row.goals.length > 0) {
      const goalsResult = await upsertGoals(
        supabase,
        assessmentResult.assessmentId,
        row.goals,
        dryRun,
        verbose
      );

      if (goalsResult.error) {
        stats.warnings.push(`Goals for ${row.student_number}: ${goalsResult.error}`);
      } else {
        stats.goalsCreated += goalsResult.count;
      }
    }
  }

  return stats;
}

// ============================================================
// Report Generation
// ============================================================

function printImportReport(stats: ImportStats, dryRun: boolean): void {
  console.log("\n" + "=".repeat(60));
  console.log(dryRun ? "NWEA MAP Import Report (DRY RUN)" : "NWEA MAP Import Report");
  console.log("=".repeat(60));
  console.log("");
  console.log(`Total Rows in CSV:     ${stats.totalRows}`);
  console.log(`Valid Rows:            ${stats.validRows}`);
  console.log("");
  console.log(`Assessments Created:   ${stats.assessmentsCreated}`);
  console.log(`Assessments Updated:   ${stats.assessmentsUpdated}`);
  console.log(`Goals Created:         ${stats.goalsCreated}`);
  console.log("");
  console.log(`Students Matched:      ${stats.studentsMatched}`);
  console.log(`Students Unmatched:    ${stats.studentsUnmatched}`);

  if (stats.unmatchedStudentIds.length > 0) {
    console.log("\nUnmatched Student IDs:");
    for (const id of stats.unmatchedStudentIds.slice(0, 20)) {
      console.log(`  - ${id}`);
    }
    if (stats.unmatchedStudentIds.length > 20) {
      console.log(`  ... and ${stats.unmatchedStudentIds.length - 20} more`);
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
  console.log("\n🎯 NWEA MAP Growth Assessment Import Script");
  console.log("=".repeat(50));

  // Parse arguments
  const { filePath, dryRun, verbose } = parseArgs();

  if (!filePath) {
    console.error("❌ Error: --file argument is required");
    console.log("\nUsage:");
    console.log("  npx tsx scripts/import-map-scores.ts --file=data/map.csv");
    console.log("  npx tsx scripts/import-map-scores.ts --file=data/map.csv --dry-run");
    console.log("  npx tsx scripts/import-map-scores.ts --file=data/map.csv --staging");
    console.log("  npx tsx scripts/import-map-scores.ts --file=data/map.csv --verbose");
    process.exit(1);
  }

  // Check file exists
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ Error: File not found: ${absolutePath}`);
    process.exit(1);
  }

  console.log(`📁 File: ${absolutePath}`);
  console.log(`🌐 Environment: ${useStaging ? "STAGING" : "PRODUCTION"}`);
  console.log(`🔄 Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`📝 Verbose: ${verbose ? "ON" : "OFF"}`);

  // Validate service key
  if (!SUPABASE_SERVICE_KEY) {
    console.error("❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
    console.log("   For production, set the environment variable or use --staging");
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Read and parse CSV
  console.log("\n📄 Reading CSV file...");
  const csvContent = fs.readFileSync(absolutePath, "utf-8");
  console.log(`   File size: ${(csvContent.length / 1024).toFixed(2)} KB`);

  console.log("\n🔍 Parsing CSV...");
  const parseResult = parseMapCSV(csvContent);

  // Print parse report
  console.log("\n" + generateParseReport(parseResult));

  if (parseResult.stats.valid === 0) {
    console.error("❌ No valid rows to import. Please check CSV format and errors above.");
    process.exit(1);
  }

  // Confirm before live import
  if (!dryRun) {
    console.log("\n⚠️  WARNING: This will write data to the database!");
    console.log("   Press Ctrl+C within 5 seconds to cancel...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Run import
  const stats = await importMapScores(parseResult, supabase, dryRun, verbose);

  // Print import report
  printImportReport(stats, dryRun);
}

// Run
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
