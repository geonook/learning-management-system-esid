#!/usr/bin/env npx tsx
/**
 * Update Student Names Script
 * Merge Chinese and English names from CSV template to database
 *
 * Usage:
 *   npx tsx scripts/update-student-names.ts --staging --dry-run
 *   npx tsx scripts/update-student-names.ts --staging
 */

import * as fs from "fs";
import { createClient } from "@supabase/supabase-js";

// Check for --staging flag
const useStaging = process.argv.includes("--staging");
const dryRun = process.argv.includes("--dry-run");

// Environment credentials
const STAGING_URL = "https://kqvpcoolgyhjqleekmee.supabase.co";
const STAGING_KEY = "sb_secret_486qCO_C4zYGZZ7u_WXBUw_fZlUnt4N";
const PROD_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://piwbooidofbaqklhijup.supabase.co";
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const SUPABASE_URL = useStaging ? STAGING_URL : PROD_URL;
const SUPABASE_KEY = useStaging ? STAGING_KEY : PROD_KEY;

// CSV path
const CSV_PATH = "templates/import/4_students_template.csv";

interface StudentRecord {
  studentId: string;
  chineseName: string;
  englishName: string;
  mergedName: string;
}

function parseCSV(content: string): StudentRecord[] {
  const lines = content.split("\n");
  const records: StudentRecord[] = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line (handle commas in quoted fields)
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current.trim());

    // CSV format: student_id, chinese_name, english_name, grade, level, class_name, home_room
    const studentId = fields[0];
    const chineseName = fields[1] || "";
    const englishName = fields[2] || "";

    if (!studentId) continue;

    // Create merged name: "中文名 English Name"
    let mergedName = "";
    if (chineseName && englishName) {
      mergedName = `${chineseName} ${englishName}`;
    } else if (chineseName) {
      mergedName = chineseName;
    } else if (englishName) {
      mergedName = englishName;
    }

    records.push({
      studentId,
      chineseName,
      englishName,
      mergedName,
    });
  }

  return records;
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║        📝 Update Student Names Script                      ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  const envName = useStaging ? "🧪 STAGING" : "🚀 PRODUCTION";
  console.log(`\n🌐 Environment: ${envName}`);
  console.log(`   Dry Run: ${dryRun}`);

  // Read CSV
  console.log(`\n📄 Reading CSV: ${CSV_PATH}`);
  const csvContent = fs.readFileSync(CSV_PATH, "utf-8");
  const csvRecords = parseCSV(csvContent);
  console.log(`   Found ${csvRecords.length} student records in CSV`);

  // Create lookup map from CSV
  const csvMap = new Map<string, StudentRecord>();
  for (const record of csvRecords) {
    csvMap.set(record.studentId, record);
  }

  // Connect to Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Load students from database (paginated)
  console.log(`\n📦 Loading students from database...`);
  const students: { id: string; student_id: string; full_name: string }[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("students")
      .select("id, student_id, full_name")
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(`Failed to load students: ${error.message}`);
    if (!data || data.length === 0) break;

    students.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  console.log(`   Loaded ${students.length} students from database`);

  // Find students that need updating
  const updates: { id: string; studentId: string; oldName: string; newName: string }[] = [];

  for (const student of students) {
    const csvRecord = csvMap.get(student.student_id);
    if (!csvRecord) continue;

    // Check if current name is missing Chinese characters
    const hasChinese = /[\u4e00-\u9fff]/.test(student.full_name);
    const csvHasChinese = /[\u4e00-\u9fff]/.test(csvRecord.mergedName);

    // Update if: DB has no Chinese but CSV has Chinese
    if (!hasChinese && csvHasChinese && csvRecord.mergedName !== student.full_name) {
      updates.push({
        id: student.id,
        studentId: student.student_id,
        oldName: student.full_name,
        newName: csvRecord.mergedName,
      });
    }
  }

  console.log(`\n📊 Analysis:`);
  console.log(`   Students needing update: ${updates.length}`);

  if (updates.length === 0) {
    console.log("\n✅ All student names are already up to date!");
    return;
  }

  // Show sample updates
  console.log(`\n📋 Sample updates (first 10):`);
  for (let i = 0; i < Math.min(10, updates.length); i++) {
    const u = updates[i];
    console.log(`   ${u.studentId}: "${u.oldName}" → "${u.newName}"`);
  }

  if (dryRun) {
    console.log(`\n⏸️  Dry run mode - no changes made`);
    console.log(`   Run without --dry-run to apply updates`);
    return;
  }

  // Apply updates in batches
  console.log(`\n🔄 Applying updates...`);
  const batchSize = 100;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);

    for (const update of batch) {
      const { error } = await supabase
        .from("students")
        .update({ full_name: update.newName })
        .eq("id", update.id);

      if (error) {
        console.error(`   ❌ Failed to update ${update.studentId}: ${error.message}`);
        errors++;
      } else {
        updated++;
      }
    }

    // Progress
    console.log(`   Progress: ${Math.min(i + batchSize, updates.length)}/${updates.length}`);

    // Small delay
    if (i + batchSize < updates.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║                    📊 Update Report                        ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors: ${errors}`);
  console.log(`\n✅ Update completed!`);
}

main().catch(console.error);
