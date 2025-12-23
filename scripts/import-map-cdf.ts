#!/usr/bin/env npx tsx
/**
 * NWEA MAP Combined Data File (CDF) Import Script
 * Import complete MAP assessment data from CDF CSV
 *
 * CSV Source: NWEA MAP Growth Platform → Combined Data File Export
 *
 * Features:
 * - Imports official NWEA metrics (percentile, achievement quintile)
 * - Imports growth data (projected, observed, conditional growth index)
 * - Imports projected proficiency (ACT/SAT/MAP)
 * - Imports goal performance with adjectives
 *
 * Usage:
 *   npx tsx scripts/import-map-cdf.ts --file="data/cdf.csv"
 *   npx tsx scripts/import-map-cdf.ts --file="data/cdf.csv" --dry-run
 *   npx tsx scripts/import-map-cdf.ts --file="data/cdf.csv" --staging
 *   npx tsx scripts/import-map-cdf.ts --file="data/cdf.csv" --verbose
 *
 * @created 2025-12-23
 */

import * as fs from "fs";
import * as path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  parseMapCDF,
  generateCDFParseReport,
  type MapCDFAssessmentRow,
  type MapCDFParseResult,
} from "../lib/import/map-cdf-parser";

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
  row: MapCDFAssessmentRow,
  studentUUID: string | null,
  importBatchId: string,
  dryRun: boolean,
  verbose: boolean
): Promise<{ created: boolean; updated: boolean; assessmentId: string | null; error: string | null }> {
  const assessmentData = {
    // Basic info
    student_id: studentUUID,
    student_number: row.student_number,
    student_last_name: row.student_last_name,
    student_first_name: row.student_first_name,
    grade: row.grade,
    school: row.school,

    // Term info
    term_tested: row.term_tested,
    academic_year: row.academic_year,
    map_term: row.map_term,
    course: row.course,
    test_name: row.test_name,

    // Core scores
    rit_score: row.rit_score,
    rit_score_range: row.rit_score_range,
    test_standard_error: row.test_standard_error,

    // Official metrics (NEW)
    test_percentile: row.test_percentile,
    achievement_quintile: row.achievement_quintile,
    percent_correct: row.percent_correct,
    rapid_guessing_percent: row.rapid_guessing_percent,

    // Test metadata (NEW)
    test_start_date: row.test_start_date,
    test_duration_minutes: row.test_duration_minutes,

    // Lexile
    lexile_score: row.lexile_score,
    lexile_range: row.lexile_range,

    // Growth data (NEW)
    projected_growth: row.projected_growth,
    observed_growth: row.observed_growth,
    observed_growth_se: row.observed_growth_se,
    met_projected_growth: row.met_projected_growth,
    conditional_growth_index: row.conditional_growth_index,
    conditional_growth_percentile: row.conditional_growth_percentile,
    growth_quintile: row.growth_quintile,
    typical_growth: row.typical_growth,

    // Projected Proficiency (NEW)
    projected_proficiency_study1: row.projected_proficiency[0]?.study || null,
    projected_proficiency_level1: row.projected_proficiency[0]?.level || null,
    projected_proficiency_study2: row.projected_proficiency[1]?.study || null,
    projected_proficiency_level2: row.projected_proficiency[1]?.level || null,
    projected_proficiency_study3: row.projected_proficiency[2]?.study || null,
    projected_proficiency_level3: row.projected_proficiency[2]?.level || null,

    // Import metadata
    import_batch_id: importBatchId,
  };

  if (dryRun) {
    if (verbose) {
      console.log(`   [DRY-RUN] Would upsert: ${row.student_number} - ${row.course} - ${row.term_tested}`);
      if (row.achievement_quintile) {
        console.log(`             Achievement: ${row.achievement_quintile}, Percentile: ${row.test_percentile}`);
      }
      if (row.conditional_growth_index) {
        console.log(`             Growth Index: ${row.conditional_growth_index}, Quintile: ${row.growth_quintile}`);
      }
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
    updated: false,
    assessmentId: data?.id || null,
    error: null,
  };
}

async function upsertGoals(
  supabase: SupabaseClient,
  assessmentId: string,
  goals: MapCDFAssessmentRow["goals"],
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

  // CDF provides goal_rit_score directly, need to convert to range format for existing table
  const goalData = goals.map((goal) => ({
    assessment_id: assessmentId,
    goal_name: goal.goal_name,
    goal_rit_range: goal.goal_range || (goal.goal_rit_score ? `${goal.goal_rit_score}` : null),
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

async function importMapCDF(
  parseResult: MapCDFParseResult,
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
  console.log(dryRun ? "NWEA MAP CDF Import Report (DRY RUN)" : "NWEA MAP CDF Import Report");
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
  console.log("\n🎯 NWEA MAP Combined Data File (CDF) Import Script");
  console.log("=".repeat(50));

  // Parse arguments
  const { filePath, dryRun, verbose, parseOnly } = parseArgs();

  if (!filePath) {
    console.error("❌ Error: --file argument is required");
    console.log("\nUsage:");
    console.log("  npx tsx scripts/import-map-cdf.ts --file=data/cdf.csv");
    console.log("  npx tsx scripts/import-map-cdf.ts --file=data/cdf.csv --dry-run");
    console.log("  npx tsx scripts/import-map-cdf.ts --file=data/cdf.csv --staging");
    console.log("  npx tsx scripts/import-map-cdf.ts --file=data/cdf.csv --verbose");
    console.log("  npx tsx scripts/import-map-cdf.ts --file=data/cdf.csv --parse-only");
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
    console.log("   For production, set the environment variable or use --staging");
    console.log("   Use --parse-only to test CSV parsing without database connection");
    process.exit(1);
  }

  // Read and parse CSV
  console.log("\n📄 Reading CSV file...");
  const csvContent = fs.readFileSync(absolutePath, "utf-8");
  console.log(`   File size: ${(csvContent.length / 1024).toFixed(2)} KB`);

  console.log("\n🔍 Parsing CDF CSV...");
  const parseResult = parseMapCDF(csvContent);

  // Print parse report
  console.log("\n" + generateCDFParseReport(parseResult));

  if (parseResult.stats.valid === 0) {
    console.error("❌ No valid rows to import. Please check CSV format and errors above.");
    process.exit(1);
  }

  // Show sample data for verification
  if (parseResult.data.length > 0) {
    const sample = parseResult.data[0];
    console.log("\n📊 Sample Record:");
    console.log(`   Student: ${sample!.student_number} (${sample!.student_first_name} ${sample!.student_last_name})`);
    console.log(`   Term: ${sample!.term_tested}, Course: ${sample!.course}`);
    console.log(`   RIT: ${sample!.rit_score}, Percentile: ${sample!.test_percentile}, Quintile: ${sample!.achievement_quintile}`);
    if (sample!.conditional_growth_index) {
      console.log(`   Growth Index: ${sample!.conditional_growth_index}, Growth Quintile: ${sample!.growth_quintile}`);
    }
    if (sample!.projected_proficiency.length > 0) {
      console.log(`   Projected Proficiency: ${sample!.projected_proficiency.map(p => `${p.study}: ${p.level}`).join(", ")}`);
    }
  }

  // Exit early for parse-only mode
  if (parseOnly) {
    console.log("\n✅ Parse-only mode complete. CSV parsing successful!");
    console.log("   Use --dry-run or remove --parse-only to test database operations.\n");
    return;
  }

  // Create Supabase client (only needed for non-parse-only mode)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Confirm before live import
  if (!dryRun) {
    console.log("\n⚠️  WARNING: This will write data to the database!");
    console.log("   Press Ctrl+C within 5 seconds to cancel...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Run import
  const stats = await importMapCDF(parseResult, supabase, dryRun, verbose);

  // Print import report
  printImportReport(stats, dryRun);
}

// Run
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
