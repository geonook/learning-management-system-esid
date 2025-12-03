#!/usr/bin/env node

/**
 * Import Teachers to LMS Supabase Script
 *
 * Reads teachers_template.csv and imports users to LMS database
 * Note: This creates users in LMS public.users table only (not auth.users)
 * Teachers will be linked to auth.users when they SSO login
 *
 * Usage:
 * npx tsx scripts/import-teachers.ts --dry-run
 * npx tsx scripts/import-teachers.ts --env production
 */

import { promises as fs } from 'fs'
import path from 'path'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// Environment configuration
const ENVIRONMENTS = {
  staging: {
    url: 'https://kqvpcoolgyhjqleekmee.supabase.co',
    key: process.env.STAGING_SUPABASE_SERVICE_KEY || ''
  },
  production: {
    url: 'https://piwbooidofbaqklhijup.supabase.co',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  }
}

interface TeacherRow {
  full_name: string
  email: string
  teacher_type: 'LT' | 'IT' | 'KCFS' | ''
  grade_band: string
  role: 'admin' | 'head' | 'teacher' | 'office_member'
}

interface ImportResult {
  success: boolean
  email: string
  action: 'created' | 'updated' | 'skipped'
  error?: string
}

// Parse command line arguments
function parseArgs() {
  const args = {
    dryRun: false,
    env: 'production' as 'staging' | 'production',
    csvPath: path.join(process.cwd(), 'templates/import/2_teachers_template.csv'),
    verbose: false
  }

  const argv = process.argv.slice(2)

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const nextArg = argv[i + 1]

    switch (arg) {
      case '--dry-run':
        args.dryRun = true
        break
      case '--env':
        if (nextArg === 'staging' || nextArg === 'production') {
          args.env = nextArg
        }
        i++
        break
      case '--csv':
        args.csvPath = nextArg
        i++
        break
      case '--verbose':
      case '-v':
        args.verbose = true
        break
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
    }
  }

  return args
}

function printHelp() {
  console.log(`
Import Teachers to LMS Script

Usage:
  npx tsx scripts/import-teachers.ts [options]

Options:
  --dry-run      Validate data without making changes
  --env          Target environment: staging or production (default: production)
  --csv          Path to CSV file (default: templates/import/2_teachers_template.csv)
  --verbose, -v  Show detailed output
  --help, -h     Show this help message

Examples:
  npx tsx scripts/import-teachers.ts --dry-run
  npx tsx scripts/import-teachers.ts --env production
`)
}

// Parse CSV file
async function parseCSV(filePath: string): Promise<TeacherRow[]> {
  const content = await fs.readFile(filePath, 'utf-8')
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())

  // Validate headers
  const expectedHeaders = ['full_name', 'email', 'teacher_type', 'grade_band', 'role']
  const missingHeaders = expectedHeaders.filter(h => !headers.includes(h))
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`)
  }

  const teachers: TeacherRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = line.split(',').map(v => v.trim())
    const row: Record<string, string> = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    // Skip rows without email
    if (!row.email) continue

    teachers.push({
      full_name: row.full_name || '',
      email: row.email,
      teacher_type: row.teacher_type as TeacherRow['teacher_type'],
      grade_band: row.grade_band || '',
      role: row.role as TeacherRow['role']
    })
  }

  return teachers
}

// Convert grade_band to grade number (for head teachers)
function parseGradeBand(gradeBand: string): number | null {
  if (!gradeBand) return null

  // Single grade: "1", "2"
  if (/^\d$/.test(gradeBand)) {
    return parseInt(gradeBand, 10)
  }

  // Grade range: "1-2", "3-4", "5-6", "1-6"
  // For ranges, return the first grade
  const match = gradeBand.match(/^(\d)/)
  if (match) {
    return parseInt(match[1], 10)
  }

  return null
}

// Import teachers to database
async function importTeachers(
  supabase: SupabaseClient,
  teachers: TeacherRow[],
  dryRun: boolean,
  verbose: boolean
): Promise<ImportResult[]> {
  // Get existing users
  const { data: existingUsers, error: fetchError } = await supabase
    .from('users')
    .select('id, email')

  if (fetchError) {
    throw new Error(`Failed to fetch existing users: ${fetchError.message}`)
  }

  const existingMap = new Map<string, string>()
  existingUsers?.forEach(u => existingMap.set(u.email.toLowerCase(), u.id))

  const results: ImportResult[] = []

  console.log(`\n📊 Processing ${teachers.length} teachers...`)

  for (const teacher of teachers) {
    const result: ImportResult = {
      success: false,
      email: teacher.email,
      action: 'skipped'
    }

    // Validate role
    if (!['admin', 'head', 'teacher', 'office_member'].includes(teacher.role)) {
      result.error = `Invalid role: ${teacher.role}`
      results.push(result)
      continue
    }

    // Check if user exists
    const existingId = existingMap.get(teacher.email.toLowerCase())

    // Prepare user data
    const userData = {
      email: teacher.email,
      full_name: teacher.full_name || teacher.email.split('@')[0],
      role: teacher.role,
      teacher_type: teacher.teacher_type || null,
      grade: parseGradeBand(teacher.grade_band),
      track: teacher.teacher_type || null,  // Store teacher_type in track for head teachers
      is_active: true,
      updated_at: new Date().toISOString()
    }

    if (dryRun) {
      result.success = true
      result.action = existingId ? 'updated' : 'created'
      if (verbose) {
        console.log(`   ${existingId ? '🔄' : '➕'} ${teacher.email} (${teacher.role})`)
      }
      results.push(result)
      continue
    }

    try {
      if (existingId) {
        // Update existing user
        const { error: updateError } = await supabase
          .from('users')
          .update(userData)
          .eq('id', existingId)

        if (updateError) {
          result.error = updateError.message
        } else {
          result.success = true
          result.action = 'updated'
        }
      } else {
        // Insert new user with generated UUID
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: randomUUID(),
            ...userData,
            created_at: new Date().toISOString()
          })

        if (insertError) {
          result.error = insertError.message
        } else {
          result.success = true
          result.action = 'created'
        }
      }

      if (verbose && result.success) {
        console.log(`   ${result.action === 'updated' ? '🔄' : '➕'} ${teacher.email}`)
      }
    } catch (err) {
      result.error = err instanceof Error ? err.message : 'Unknown error'
    }

    results.push(result)
  }

  return results
}

// Generate summary report
function generateReport(results: ImportResult[]) {
  const created = results.filter(r => r.success && r.action === 'created')
  const updated = results.filter(r => r.success && r.action === 'updated')
  const failed = results.filter(r => !r.success)

  console.log('\n📋 Import Summary')
  console.log('─'.repeat(50))
  console.log(`Total Processed:  ${results.length}`)
  console.log(`➕ Created:       ${created.length}`)
  console.log(`🔄 Updated:       ${updated.length}`)
  console.log(`❌ Failed:        ${failed.length}`)

  if (failed.length > 0) {
    console.log('\n❌ Failed Imports:')
    failed.forEach(f => {
      console.log(`   - ${f.email}: ${f.error}`)
    })
  }
}

// Main function
async function main() {
  const args = parseArgs()

  console.log('🚀 Teacher Import Script')
  console.log('═'.repeat(50))
  console.log(`Environment: ${args.env}`)
  console.log(`CSV File: ${args.csvPath}`)
  console.log(`Dry Run: ${args.dryRun}`)

  // Validate environment
  const envConfig = ENVIRONMENTS[args.env]
  if (!envConfig.key) {
    console.error(`\n❌ Missing service key for ${args.env} environment`)
    console.error(`   Set ${args.env === 'production' ? 'SUPABASE_SERVICE_ROLE_KEY' : 'STAGING_SUPABASE_SERVICE_KEY'} environment variable`)
    process.exit(1)
  }

  // Create Supabase client
  const supabase = createClient(envConfig.url, envConfig.key, {
    auth: { persistSession: false }
  })

  try {
    // Parse CSV
    console.log('\n📂 Reading CSV file...')
    const teachers = await parseCSV(args.csvPath)
    console.log(`   Found ${teachers.length} teachers`)

    // Show breakdown by role
    const byRole = new Map<string, number>()
    teachers.forEach(t => {
      byRole.set(t.role, (byRole.get(t.role) || 0) + 1)
    })
    console.log('\n   By Role:')
    byRole.forEach((count, role) => {
      console.log(`   - ${role}: ${count}`)
    })

    // Import teachers
    const results = await importTeachers(supabase, teachers, args.dryRun, args.verbose)

    // Generate report
    generateReport(results)

    if (args.dryRun) {
      console.log('\n⚠️  DRY RUN: No changes were made')
    } else {
      console.log('\n✅ Import complete!')
    }

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
