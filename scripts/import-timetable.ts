/**
 * Teacher Timetable CSV Import Script
 *
 * Usage:
 *   npx tsx scripts/import-timetable.ts \
 *     --file="data/teacher_timetable_english.csv" \
 *     [--type=english|homeroom] \
 *     [--dry-run] [--verbose]
 *
 * CSV Format (English):
 *   email, teacher_name, day, period, time, classroom, class_name, course_name
 *
 * CSV Format (Homeroom):
 *   email, teacher_name, day, period, time, classroom, class_name, course_name
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
const courseType = (getArg("type") || "english") as "english" | "homeroom" | "ev";
const dryRun = hasFlag("dry-run");
const verbose = hasFlag("verbose");
const academicYear = getArg("year") || "2025-2026";
const updateTeacherName = hasFlag("update-teacher-name");

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
      inQuotes = !inQuotes;
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
// Import Functions
// ============================================================================

interface ImportStats {
  total: number;
  inserted: number;
  skipped: number;
  teacherUpdates: number;
}

const stats: ImportStats = {
  total: 0,
  inserted: 0,
  skipped: 0,
  teacherUpdates: 0,
};

async function importTimetable(filePath: string): Promise<void> {
  console.log(`\n📋 Importing timetable from: ${filePath}`);
  console.log(`   Course type: ${courseType}`);
  console.log(`   Academic year: ${academicYear}`);

  const content = fs.readFileSync(filePath, "utf-8");
  const rows = parseCSV(content);

  stats.total = rows.length;
  console.log(`   Found ${rows.length} entries`);

  // Collect unique teacher emails for teacher_name updates
  const teacherMap = new Map<string, string>();

  const entries: Array<{
    teacher_name: string;
    teacher_email: string;
    day: string;
    period: number;
    class_name: string;
    course_type: string;
    course_name: string | null;
    classroom: string | null;
    academic_year: string;
  }> = [];

  for (const row of rows) {
    const email = row.email?.toLowerCase();
    const teacherName = row.teacher_name;
    const day = row.day;
    const periodStr = row.period;
    const className = row.class_name;
    const courseName = row.course_name || null;
    const classroom = row.classroom || null;

    if (!email || !teacherName || !day || !periodStr || !className) {
      if (verbose) {
        console.log(`   ⚠️  Skipping invalid row: ${JSON.stringify(row)}`);
      }
      stats.skipped++;
      continue;
    }

    const period = parseInt(periodStr);
    if (isNaN(period) || period < 1 || period > 8) {
      if (verbose) {
        console.log(`   ⚠️  Invalid period: ${periodStr}`);
      }
      stats.skipped++;
      continue;
    }

    // Determine actual course type
    let actualCourseType = courseType;
    // EV classes have format like 'G1I', 'G2B' (no space, ends with letter)
    if (/^G[1-6][A-Z]$/.test(className)) {
      actualCourseType = "ev";
    }

    // Track teacher for updates
    teacherMap.set(email, teacherName);

    entries.push({
      teacher_name: teacherName,
      teacher_email: email,
      day,
      period,
      class_name: className,
      course_type: actualCourseType,
      course_name: courseName,
      classroom,
      academic_year: academicYear,
    });
  }

  // Update teacher_name in users table if requested
  if (updateTeacherName && teacherMap.size > 0) {
    console.log(`\n🔄 Updating teacher_name for ${teacherMap.size} teachers...`);

    for (const [email, teacherName] of teacherMap) {
      if (dryRun) {
        if (verbose) console.log(`   [DRY-RUN] Would update: ${email} → ${teacherName}`);
        stats.teacherUpdates++;
        continue;
      }

      const { error } = await supabase
        .from("users")
        .update({ teacher_name: teacherName })
        .eq("email", email);

      if (error) {
        if (verbose) console.log(`   ⚠️  Error updating ${email}: ${error.message}`);
      } else {
        stats.teacherUpdates++;
      }
    }
  }

  // Insert timetable entries
  if (dryRun) {
    console.log(`\n   [DRY-RUN] Would insert ${entries.length} entries`);
    stats.inserted = entries.length;
    return;
  }

  // Batch insert in chunks of 500
  const chunkSize = 500;
  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);

    const { error } = await supabase.from("timetable_entries").upsert(chunk, {
      onConflict: "teacher_name,day,period,academic_year",
      ignoreDuplicates: false,
    });

    if (error) {
      console.error(`   ❌ Error inserting batch ${i / chunkSize + 1}: ${error.message}`);
      stats.skipped += chunk.length;
    } else {
      stats.inserted += chunk.length;
      if (verbose) {
        console.log(`   ✓ Inserted batch ${i / chunkSize + 1} (${chunk.length} entries)`);
      }
    }
  }

  console.log(`   ✓ Inserted ${stats.inserted} entries`);
}

async function linkTeacherIds(): Promise<void> {
  console.log(`\n🔗 Linking teacher IDs...`);

  if (dryRun) {
    console.log(`   [DRY-RUN] Would link teacher_id based on teacher_name`);
    return;
  }

  // Get all entries without teacher_id
  const { data: entries } = await supabase
    .from("timetable_entries")
    .select("id, teacher_name")
    .is("teacher_id", null)
    .eq("academic_year", academicYear);

  if (!entries || entries.length === 0) {
    console.log(`   No entries to link`);
    return;
  }

  // Get unique teacher names
  const teacherNames = [...new Set(entries.map((e) => e.teacher_name))];

  // Get user IDs for these teacher names
  const { data: users } = await supabase
    .from("users")
    .select("id, teacher_name")
    .in("teacher_name", teacherNames);

  if (!users) {
    console.log(`   No matching users found`);
    return;
  }

  const userMap = new Map(users.map((u) => [u.teacher_name, u.id]));
  let linked = 0;

  for (const entry of entries) {
    const userId = userMap.get(entry.teacher_name);
    if (userId) {
      await supabase
        .from("timetable_entries")
        .update({ teacher_id: userId })
        .eq("id", entry.id);
      linked++;
    }
  }

  console.log(`   ✓ Linked ${linked} entries to user IDs`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("KCIS Teacher Timetable Import");
  console.log("=".repeat(60));
  console.log(`Academic Year: ${academicYear}`);
  console.log(`Dry Run: ${dryRun}`);
  console.log(`Verbose: ${verbose}`);
  console.log(`Update teacher_name: ${updateTeacherName}`);

  if (!inputFile) {
    console.error("\n❌ No input file specified!");
    console.log("\nUsage:");
    console.log("  npx tsx scripts/import-timetable.ts \\");
    console.log('    --file="data/teacher_timetable_english.csv" \\');
    console.log("    [--type=english|homeroom|ev] \\");
    console.log("    [--year=2024-2025] \\");
    console.log("    [--update-teacher-name] \\");
    console.log("    [--dry-run] [--verbose]");
    process.exit(1);
  }

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ File not found: ${inputFile}`);
    process.exit(1);
  }

  try {
    await importTimetable(inputFile);

    if (!dryRun) {
      await linkTeacherIds();
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("Import Summary");
    console.log("=".repeat(60));
    console.log(`Total rows: ${stats.total}`);
    console.log(`Inserted:   ${stats.inserted}`);
    console.log(`Skipped:    ${stats.skipped}`);
    if (updateTeacherName) {
      console.log(`Teacher updates: ${stats.teacherUpdates}`);
    }

    if (dryRun) {
      console.log("\n⚠️  This was a dry run. No changes were made.");
      console.log("   Remove --dry-run to actually import data.");
    }
  } catch (error) {
    console.error("\n❌ Import failed:", error);
    process.exit(1);
  }
}

main();
