#!/usr/bin/env node

/**
 * Batch Import Script for LMS-ESID Templates
 * Imports classes, courses, and students from CSV templates to Supabase
 *
 * Usage:
 * npx tsx scripts/batch-import-templates.ts --all
 * npx tsx scripts/batch-import-templates.ts --classes
 * npx tsx scripts/batch-import-templates.ts --courses
 * npx tsx scripts/batch-import-templates.ts --students
 * npx tsx scripts/batch-import-templates.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import { promises as fs } from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Use service role key to bypass RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Template paths
const TEMPLATES_DIR = path.join(process.cwd(), 'templates/import')
const CLASSES_CSV = path.join(TEMPLATES_DIR, '1_classes_template.csv')
const TEACHERS_CSV = path.join(TEMPLATES_DIR, '2_teachers_template.csv')
const COURSES_CSV = path.join(TEMPLATES_DIR, '3_teacher_course_assignments_template.csv')
const STUDENTS_CSV = path.join(TEMPLATES_DIR, '4_students_template.csv')

// Parse CSV file
async function parseCSV(filePath: string): Promise<Record<string, string>[]> {
  const content = await fs.readFile(filePath, 'utf8')
  const lines = content.split(/\r?\n/).filter(line => line.trim())

  if (lines.length === 0) return []

  const headers = lines[0].split(',').map(h => h.trim())
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === headers.length) {
      const row: Record<string, string> = {}
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim() || ''
      })
      rows.push(row)
    }
  }

  return rows
}

// Parse a single CSV line with quote handling
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

// Import classes
async function importClasses(dryRun: boolean = false): Promise<void> {
  console.log('\n📚 Importing classes...')

  const rows = await parseCSV(CLASSES_CSV)
  console.log(`  Found ${rows.length} classes in CSV`)

  if (rows.length === 0) {
    console.log('  ⚠️ No classes to import')
    return
  }

  const classesData = rows.map(row => ({
    name: row.class_name,
    grade: parseInt(row.grade),
    level: row.level, // G1E1 format
    track: null, // track is NULL per Migration 010
    academic_year: row.academic_year || '2025-2026',
    is_active: true
  }))

  if (dryRun) {
    console.log('  [DRY RUN] Would insert:')
    console.log(`    - ${classesData.length} classes`)
    console.log(`    - Sample: ${JSON.stringify(classesData[0])}`)
    return
  }

  // Upsert classes
  const { data, error } = await supabase
    .from('classes')
    .upsert(classesData, {
      onConflict: 'name,academic_year',
      ignoreDuplicates: false
    })
    .select('id, name')

  if (error) {
    console.error(`  ❌ Error importing classes: ${error.message}`)
    throw error
  }

  console.log(`  ✅ Imported ${data?.length || 0} classes`)
}

// Import courses (teacher-course assignments)
async function importCourses(dryRun: boolean = false): Promise<void> {
  console.log('\n📖 Importing courses (teacher-course assignments)...')

  const rows = await parseCSV(COURSES_CSV)
  console.log(`  Found ${rows.length} course assignments in CSV`)

  if (rows.length === 0) {
    console.log('  ⚠️ No courses to import')
    return
  }

  // Get class name to UUID mapping
  const { data: classes, error: classError } = await supabase
    .from('classes')
    .select('id, name')

  if (classError) {
    console.error(`  ❌ Error fetching classes: ${classError.message}`)
    throw classError
  }

  const classMap = new Map(classes?.map(c => [c.name, c.id]) || [])
  console.log(`  Found ${classMap.size} classes in database`)

  // Get teacher email to UUID mapping
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email')

  if (userError) {
    console.error(`  ❌ Error fetching users: ${userError.message}`)
    throw userError
  }

  const userMap = new Map(users?.map(u => [u.email, u.id]) || [])
  console.log(`  Found ${userMap.size} users in database`)

  // Prepare course data
  const coursesData: Array<{
    class_id: string
    course_type: string
    teacher_id: string | null
    academic_year: string
    is_active: boolean
  }> = []

  const warnings: string[] = []

  for (const row of rows) {
    const classId = classMap.get(row.class_name)
    const teacherId = userMap.get(row.teacher_email)

    if (!classId) {
      warnings.push(`Class not found: ${row.class_name}`)
      continue
    }

    // Teacher may not exist yet (will be synced via SSO webhook)
    // So we allow null teacher_id
    coursesData.push({
      class_id: classId,
      course_type: row.course_type,
      teacher_id: teacherId || null,
      academic_year: '2025-2026',
      is_active: true
    })
  }

  if (warnings.length > 0) {
    console.log(`  ⚠️ Warnings (${warnings.length}):`)
    warnings.slice(0, 5).forEach(w => console.log(`    - ${w}`))
    if (warnings.length > 5) {
      console.log(`    ... and ${warnings.length - 5} more`)
    }
  }

  if (dryRun) {
    console.log('  [DRY RUN] Would insert:')
    console.log(`    - ${coursesData.length} courses`)
    console.log(`    - With teacher: ${coursesData.filter(c => c.teacher_id).length}`)
    console.log(`    - Without teacher: ${coursesData.filter(c => !c.teacher_id).length}`)
    return
  }

  if (coursesData.length === 0) {
    console.log('  ⚠️ No valid courses to import')
    return
  }

  // Upsert courses
  const { data, error } = await supabase
    .from('courses')
    .upsert(coursesData, {
      onConflict: 'class_id,course_type',
      ignoreDuplicates: false
    })
    .select('id')

  if (error) {
    console.error(`  ❌ Error importing courses: ${error.message}`)
    throw error
  }

  console.log(`  ✅ Imported ${data?.length || 0} courses`)
}

// Import students
async function importStudents(dryRun: boolean = false): Promise<void> {
  console.log('\n👨‍🎓 Importing students...')

  const rows = await parseCSV(STUDENTS_CSV)
  console.log(`  Found ${rows.length} students in CSV`)

  if (rows.length === 0) {
    console.log('  ⚠️ No students to import')
    return
  }

  // Get class name to UUID mapping
  const { data: classes, error: classError } = await supabase
    .from('classes')
    .select('id, name')

  if (classError) {
    console.error(`  ❌ Error fetching classes: ${classError.message}`)
    throw classError
  }

  const classMap = new Map(classes?.map(c => [c.name, c.id]) || [])
  console.log(`  Found ${classMap.size} classes in database`)

  // Prepare student data
  const studentsData: Array<{
    student_id: string
    full_name: string
    grade: number
    level: string | null
    track: null
    class_id: string | null
    is_active: boolean
  }> = []

  const warnings: string[] = []

  for (const row of rows) {
    const classId = classMap.get(row.class_name)

    if (!classId && row.class_name) {
      warnings.push(`Class not found: ${row.class_name} for student ${row.student_id}`)
    }

    // Combine chinese_name and english_name into full_name
    const fullName = row.full_name ||
      [row.chinese_name, row.english_name].filter(Boolean).join(' ') ||
      row.chinese_name ||
      row.english_name ||
      ''

    studentsData.push({
      student_id: row.student_id,
      full_name: fullName,
      grade: parseInt(row.grade),
      level: row.level || null, // G1E1 format
      track: null, // track is NULL per Migration 010
      class_id: classId || null,
      is_active: true
    })
  }

  if (warnings.length > 0) {
    console.log(`  ⚠️ Warnings (${warnings.length}):`)
    warnings.slice(0, 5).forEach(w => console.log(`    - ${w}`))
    if (warnings.length > 5) {
      console.log(`    ... and ${warnings.length - 5} more`)
    }
  }

  if (dryRun) {
    console.log('  [DRY RUN] Would insert:')
    console.log(`    - ${studentsData.length} students`)
    console.log(`    - With class: ${studentsData.filter(s => s.class_id).length}`)
    console.log(`    - Without class: ${studentsData.filter(s => !s.class_id).length}`)
    console.log(`    - Sample: ${JSON.stringify(studentsData[0])}`)
    return
  }

  // Batch upsert students (100 at a time)
  const BATCH_SIZE = 100
  let totalInserted = 0

  for (let i = 0; i < studentsData.length; i += BATCH_SIZE) {
    const batch = studentsData.slice(i, i + BATCH_SIZE)

    const { data, error } = await supabase
      .from('students')
      .upsert(batch, {
        onConflict: 'student_id',
        ignoreDuplicates: false
      })
      .select('id')

    if (error) {
      console.error(`  ❌ Error importing batch ${i / BATCH_SIZE + 1}: ${error.message}`)
      throw error
    }

    totalInserted += data?.length || 0
    console.log(`  Progress: ${Math.min(i + BATCH_SIZE, studentsData.length)}/${studentsData.length} students`)
  }

  console.log(`  ✅ Imported ${totalInserted} students`)
}

// Show current database status
async function showStatus(): Promise<void> {
  console.log('\n📊 Current Database Status:')

  const { count: classCount } = await supabase
    .from('classes')
    .select('*', { count: 'exact', head: true })

  const { count: courseCount } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true })

  const { count: studentCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })

  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  console.log(`  Classes:  ${classCount || 0}`)
  console.log(`  Courses:  ${courseCount || 0}`)
  console.log(`  Students: ${studentCount || 0}`)
  console.log(`  Users:    ${userCount || 0}`)
}

// Main function
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const importAll = args.includes('--all')
  const importClasses_ = args.includes('--classes')
  const importCourses_ = args.includes('--courses')
  const importStudents_ = args.includes('--students')
  const showHelp = args.includes('--help') || args.includes('-h')

  if (showHelp || args.length === 0) {
    console.log(`
LMS-ESID Template Batch Import

Usage:
  npx tsx scripts/batch-import-templates.ts [options]

Options:
  --all        Import all (classes → courses → students)
  --classes    Import classes only
  --courses    Import courses (teacher-course assignments)
  --students   Import students only
  --dry-run    Validate without importing
  --help, -h   Show this help

Import Order:
  1. Classes must be imported first (students and courses depend on them)
  2. Courses can be imported with or without teachers (teachers sync via SSO)
  3. Students are imported last (depend on classes)

Note:
  - Teachers are NOT imported from CSV
  - Teachers will be created automatically via SSO webhook when they first login
  - The webhook will match teachers by email
`)
    return
  }

  console.log('🚀 LMS-ESID Template Batch Import')
  console.log(`   Supabase URL: ${SUPABASE_URL}`)
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE IMPORT'}`)

  await showStatus()

  try {
    if (importAll || importClasses_) {
      await importClasses(dryRun)
    }

    if (importAll || importCourses_) {
      await importCourses(dryRun)
    }

    if (importAll || importStudents_) {
      await importStudents(dryRun)
    }

    if (!dryRun) {
      await showStatus()
    }

    console.log('\n✅ Import completed!')

  } catch (error: unknown) {
    console.error('\n❌ Import failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// Run
main().catch(console.error)
