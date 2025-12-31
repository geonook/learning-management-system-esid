/**
 * Student Class History CSV Import Script
 *
 * Usage:
 *   npx tsx scripts/import-student-class-history.ts \
 *     --file="NY的各種DataView - 2024-2025.csv" \
 *     --year="2024-2025" \
 *     [--dry-run] [--verbose]
 *
 * CSV Format:
 *   ID,Grade,Homeroom,Chinese Name,English Name,English Class
 *   LE09068,5,501,劉丞峰,Quintus Liu,G5 Achievers
 *
 * Environment:
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key for admin access
 *
 * To run on different databases:
 *   # Staging
 *   NEXT_PUBLIC_SUPABASE_URL="https://kqvpcoolgyhjqleekmee.supabase.co" \
 *   SUPABASE_SERVICE_ROLE_KEY="..." \
 *   npx tsx scripts/import-student-class-history.ts --file="..." --year="2024-2025"
 *
 *   # Production
 *   NEXT_PUBLIC_SUPABASE_URL="https://piwbooidofbaqklhijup.supabase.co" \
 *   SUPABASE_SERVICE_ROLE_KEY="..." \
 *   npx tsx scripts/import-student-class-history.ts --file="..." --year="2024-2025"
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

// Load environment variables from .env.local
config({ path: ".env.local" });

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg?.split("=")[1];
};
const hasFlag = (name: string): boolean => args.includes(`--${name}`);

const inputFile = getArg("file");
const academicYear = getArg("year");
const dryRun = hasFlag("dry-run");
const verbose = hasFlag("verbose");

if (!inputFile) {
  console.error("Missing required argument: --file");
  console.error("Usage: npx tsx scripts/import-student-class-history.ts --file=<csv> --year=<YYYY-YYYY>");
  process.exit(1);
}

if (!academicYear) {
  console.error("Missing required argument: --year");
  console.error("Usage: npx tsx scripts/import-student-class-history.ts --file=<csv> --year=<YYYY-YYYY>");
  process.exit(1);
}

// Validate academic year format
if (!/^\d{4}-\d{4}$/.test(academicYear)) {
  console.error(`Invalid academic year format: ${academicYear}`);
  console.error("Expected format: YYYY-YYYY (e.g., 2024-2025)");
  process.exit(1);
}

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`\n🎓 Student Class History Import`);
console.log(`   Database: ${supabaseUrl}`);
console.log(`   File: ${inputFile}`);
console.log(`   Academic Year: ${academicYear}`);
console.log(`   Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
console.log("");

// ============================================================================
// CSV Parsing
// ============================================================================

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx]?.trim() || "";
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// ============================================================================
// Main Import Logic
// ============================================================================

interface StudentClassRecord {
  student_number: string;
  academic_year: string;
  grade: number;
  english_class: string;
  homeroom: string | null;
}

async function main() {
  // Read CSV file
  if (!fs.existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    process.exit(1);
  }

  const content = fs.readFileSync(inputFile, "utf-8");
  const rows = parseCSV(content);

  console.log(`📄 Found ${rows.length} rows in CSV`);

  // Parse and validate rows
  const records: StudentClassRecord[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 2; // +2 for header and 0-based index

    // Map CSV columns - handle both formats
    const studentNumber = row["ID"] || row["Student ID"] || row["student_number"];
    const gradeStr = row["Grade"] || row["grade"];
    const homeroom = row["Homeroom"] || row["homeroom"] || null;
    const englishClass = row["English Class"] || row["english_class"];

    // Validate required fields
    if (!studentNumber) {
      errors.push(`Line ${lineNum}: Missing student ID`);
      continue;
    }

    if (!gradeStr) {
      errors.push(`Line ${lineNum}: Missing grade for ${studentNumber}`);
      continue;
    }

    if (!englishClass) {
      errors.push(`Line ${lineNum}: Missing English Class for ${studentNumber}`);
      continue;
    }

    const grade = parseInt(gradeStr, 10);
    if (isNaN(grade) || grade < 1 || grade > 6) {
      errors.push(`Line ${lineNum}: Invalid grade "${gradeStr}" for ${studentNumber}`);
      continue;
    }

    records.push({
      student_number: studentNumber,
      academic_year: academicYear,
      grade,
      english_class: englishClass,
      homeroom: homeroom || null,
    });
  }

  // Report validation errors
  if (errors.length > 0) {
    console.warn(`\n⚠️  Validation warnings (${errors.length}):`);
    errors.slice(0, 10).forEach(e => console.warn(`   ${e}`));
    if (errors.length > 10) {
      console.warn(`   ... and ${errors.length - 10} more`);
    }
  }

  console.log(`\n✅ Parsed ${records.length} valid records`);

  // Group by grade for stats
  const byGrade = new Map<number, number>();
  for (const r of records) {
    byGrade.set(r.grade, (byGrade.get(r.grade) || 0) + 1);
  }
  console.log("\n📊 Records by grade:");
  for (const [grade, count] of Array.from(byGrade.entries()).sort((a, b) => a[0] - b[0])) {
    console.log(`   G${grade}: ${count} students`);
  }

  // Group by class for stats
  const byClass = new Map<string, number>();
  for (const r of records) {
    byClass.set(r.english_class, (byClass.get(r.english_class) || 0) + 1);
  }
  console.log(`\n📚 ${byClass.size} unique classes`);

  if (verbose) {
    console.log("\nClasses:");
    for (const [cls, count] of Array.from(byClass.entries()).sort()) {
      console.log(`   ${cls}: ${count}`);
    }
  }

  if (dryRun) {
    console.log("\n🔍 DRY RUN - No changes made to database");
    console.log("   Remove --dry-run to actually import");
    return;
  }

  // Delete existing records for this academic year
  console.log(`\n🗑️  Clearing existing records for ${academicYear}...`);
  const { error: deleteError } = await supabase
    .from("student_class_history")
    .delete()
    .eq("academic_year", academicYear);

  if (deleteError) {
    console.error(`Failed to delete existing records: ${deleteError.message}`);
    process.exit(1);
  }

  // Insert records in batches
  console.log(`\n📥 Inserting ${records.length} records...`);
  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase
      .from("student_class_history")
      .insert(batch);

    if (insertError) {
      console.error(`Failed to insert batch at ${i}: ${insertError.message}`);
      process.exit(1);
    }

    inserted += batch.length;
    process.stdout.write(`\r   Inserted: ${inserted}/${records.length}`);
  }

  console.log("\n");
  console.log(`✅ Successfully imported ${inserted} records for ${academicYear}`);
  console.log("");
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
