#!/usr/bin/env node

/**
 * Import data to Staging Supabase via direct PostgreSQL connection
 */

import { promises as fs } from 'fs'
import path from 'path'
import pg from 'pg'

const { Pool } = pg

// Staging PostgreSQL connection
const STAGING_CONNECTION = 'postgresql://postgres.kqvpcoolgyhjqleekmee:geonook8588@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres'

const pool = new Pool({
  connectionString: STAGING_CONNECTION,
  ssl: { rejectUnauthorized: false }
})

// Template paths
const TEMPLATES_DIR = path.join(process.cwd(), 'templates/import')
const CLASSES_CSV = path.join(TEMPLATES_DIR, '1_classes_template.csv')
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

async function checkCurrentStatus(): Promise<void> {
  console.log('\n📊 Staging Database Status:')

  const client = await pool.connect()
  try {
    const classCount = await client.query('SELECT COUNT(*) FROM classes')
    const courseCount = await client.query('SELECT COUNT(*) FROM courses')
    const studentCount = await client.query('SELECT COUNT(*) FROM students')
    const userCount = await client.query('SELECT COUNT(*) FROM users')

    console.log(`  Classes:  ${classCount.rows[0].count}`)
    console.log(`  Courses:  ${courseCount.rows[0].count}`)
    console.log(`  Students: ${studentCount.rows[0].count}`)
    console.log(`  Users:    ${userCount.rows[0].count}`)
  } finally {
    client.release()
  }
}

async function importClasses(): Promise<Map<string, string>> {
  console.log('\n📚 Importing classes to Staging...')

  const rows = await parseCSV(CLASSES_CSV)
  console.log(`  Found ${rows.length} classes in CSV`)

  const classMap = new Map<string, string>()
  const client = await pool.connect()

  try {
    for (const row of rows) {
      const result = await client.query(`
        INSERT INTO classes (name, grade, level, track, academic_year, is_active)
        VALUES ($1, $2, $3, NULL, $4, true)
        ON CONFLICT (name, academic_year) DO UPDATE SET
          grade = EXCLUDED.grade,
          level = EXCLUDED.level,
          is_active = true
        RETURNING id, name
      `, [row.class_name, parseInt(row.grade), row.level, row.academic_year || '2025-2026'])

      if (result.rows[0]) {
        classMap.set(result.rows[0].name, result.rows[0].id)
      }
    }

    console.log(`  ✅ Imported ${classMap.size} classes`)
  } finally {
    client.release()
  }

  return classMap
}

async function importStudents(classMap: Map<string, string>): Promise<void> {
  console.log('\n👨‍🎓 Importing students to Staging...')

  const rows = await parseCSV(STUDENTS_CSV)
  console.log(`  Found ${rows.length} students in CSV`)

  const client = await pool.connect()
  let imported = 0
  let warnings = 0

  try {
    // Process in batches
    const BATCH_SIZE = 100

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)

      for (const row of batch) {
        const classId = classMap.get(row.class_name)

        if (!classId && row.class_name) {
          warnings++
          continue
        }

        // Combine chinese_name and english_name
        const fullName = row.full_name ||
          [row.chinese_name, row.english_name].filter(Boolean).join(' ') ||
          row.chinese_name ||
          row.english_name ||
          ''

        try {
          await client.query(`
            INSERT INTO students (student_id, full_name, grade, level, track, class_id, is_active)
            VALUES ($1, $2, $3, $4, NULL, $5, true)
            ON CONFLICT (student_id) DO UPDATE SET
              full_name = EXCLUDED.full_name,
              grade = EXCLUDED.grade,
              level = EXCLUDED.level,
              class_id = EXCLUDED.class_id,
              is_active = true
          `, [row.student_id, fullName, parseInt(row.grade), row.level || null, classId || null])

          imported++
        } catch (err) {
          console.error(`  Error importing ${row.student_id}:`, err)
        }
      }

      console.log(`  Progress: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length} students`)
    }

    console.log(`  ✅ Imported ${imported} students`)
    if (warnings > 0) {
      console.log(`  ⚠️ ${warnings} students skipped (class not found)`)
    }
  } finally {
    client.release()
  }
}

async function main(): Promise<void> {
  console.log('🚀 Import to Staging Supabase')
  console.log('   URL: kqvpcoolgyhjqleekmee.supabase.co')

  try {
    await checkCurrentStatus()

    // Import classes first
    const classMap = await importClasses()

    // Then import students
    await importStudents(classMap)

    await checkCurrentStatus()

    console.log('\n✅ Staging import completed!')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await pool.end()
  }
}

main()
