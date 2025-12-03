#!/usr/bin/env node

/**
 * Assign Teachers to Courses Script
 *
 * Reads course_assignments.csv and updates courses table with teacher_id
 *
 * Usage:
 * npx tsx scripts/assign-teachers-to-courses.ts --dry-run
 * npx tsx scripts/assign-teachers-to-courses.ts --env staging
 * npx tsx scripts/assign-teachers-to-courses.ts --env production
 */

import { promises as fs } from 'fs'
import path from 'path'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

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

interface CourseAssignment {
  teacher_email: string
  class_name: string
  course_type: 'LT' | 'IT' | 'KCFS'
}

interface AssignmentResult {
  success: boolean
  teacher_email: string
  class_name: string
  course_type: string
  error?: string
  course_id?: string
  teacher_id?: string
}

// Parse command line arguments
function parseArgs() {
  const args = {
    dryRun: false,
    env: 'staging' as 'staging' | 'production',
    csvPath: path.join(process.cwd(), 'templates/import/3_teacher_course_assignments_template.csv'),
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
Assign Teachers to Courses Script

Usage:
  npx tsx scripts/assign-teachers-to-courses.ts [options]

Options:
  --dry-run      Validate data without making changes
  --env          Target environment: staging or production (default: staging)
  --csv          Path to CSV file (default: templates/import/3_teacher_course_assignments_template.csv)
  --verbose, -v  Show detailed output
  --help, -h     Show this help message

Examples:
  npx tsx scripts/assign-teachers-to-courses.ts --dry-run
  npx tsx scripts/assign-teachers-to-courses.ts --env production
`)
}

// Parse CSV file
async function parseCSV(filePath: string): Promise<CourseAssignment[]> {
  const content = await fs.readFile(filePath, 'utf-8')
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())

  // Validate headers
  const expectedHeaders = ['teacher_email', 'class_name', 'course_type']
  const missingHeaders = expectedHeaders.filter(h => !headers.includes(h))
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`)
  }

  const assignments: CourseAssignment[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = line.split(',').map(v => v.trim())
    const row: Record<string, string> = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    if (row.teacher_email && row.class_name && row.course_type) {
      assignments.push({
        teacher_email: row.teacher_email,
        class_name: row.class_name,
        course_type: row.course_type as 'LT' | 'IT' | 'KCFS'
      })
    }
  }

  return assignments
}

// Build lookup maps for efficient querying
async function buildLookupMaps(supabase: SupabaseClient) {
  // Get all teachers
  const { data: teachers, error: teacherError } = await supabase
    .from('users')
    .select('id, email')
    .in('role', ['teacher', 'head', 'office_member'])
    .eq('is_active', true)

  if (teacherError) {
    throw new Error(`Failed to fetch teachers: ${teacherError.message}`)
  }

  // Get all classes
  const { data: classes, error: classError } = await supabase
    .from('classes')
    .select('id, name')
    .eq('academic_year', '2025-2026')
    .eq('is_active', true)

  if (classError) {
    throw new Error(`Failed to fetch classes: ${classError.message}`)
  }

  // Get all courses
  const { data: courses, error: courseError } = await supabase
    .from('courses')
    .select('id, class_id, course_type, teacher_id')
    .eq('is_active', true)

  if (courseError) {
    throw new Error(`Failed to fetch courses: ${courseError.message}`)
  }

  // Build maps
  const teacherMap = new Map<string, string>()
  teachers?.forEach(t => teacherMap.set(t.email.toLowerCase(), t.id))

  const classMap = new Map<string, string>()
  classes?.forEach(c => classMap.set(c.name.toLowerCase(), c.id))

  const courseMap = new Map<string, { id: string; teacher_id: string | null }>()
  courses?.forEach(c => {
    const key = `${c.class_id}|${c.course_type}`
    courseMap.set(key, { id: c.id, teacher_id: c.teacher_id })
  })

  return { teacherMap, classMap, courseMap }
}

// Process assignments
async function processAssignments(
  supabase: SupabaseClient,
  assignments: CourseAssignment[],
  dryRun: boolean,
  verbose: boolean
): Promise<AssignmentResult[]> {
  console.log('\n📊 Building lookup maps...')
  const { teacherMap, classMap, courseMap } = await buildLookupMaps(supabase)

  console.log(`   Teachers: ${teacherMap.size}`)
  console.log(`   Classes: ${classMap.size}`)
  console.log(`   Courses: ${courseMap.size}`)

  const results: AssignmentResult[] = []
  const updateBatch: { id: string; teacher_id: string }[] = []

  console.log('\n🔍 Validating assignments...')

  for (const assignment of assignments) {
    const result: AssignmentResult = {
      success: false,
      teacher_email: assignment.teacher_email,
      class_name: assignment.class_name,
      course_type: assignment.course_type
    }

    // Find teacher
    const teacherId = teacherMap.get(assignment.teacher_email.toLowerCase())
    if (!teacherId) {
      result.error = `Teacher not found: ${assignment.teacher_email}`
      results.push(result)
      continue
    }
    result.teacher_id = teacherId

    // Find class
    const classId = classMap.get(assignment.class_name.toLowerCase())
    if (!classId) {
      result.error = `Class not found: ${assignment.class_name}`
      results.push(result)
      continue
    }

    // Find course
    const courseKey = `${classId}|${assignment.course_type}`
    const course = courseMap.get(courseKey)
    if (!course) {
      result.error = `Course not found: ${assignment.class_name} - ${assignment.course_type}`
      results.push(result)
      continue
    }
    result.course_id = course.id

    // Check if already assigned
    if (course.teacher_id === teacherId) {
      result.success = true
      result.error = 'Already assigned'
      results.push(result)
      continue
    }

    // Add to update batch
    updateBatch.push({ id: course.id, teacher_id: teacherId })
    result.success = true
    results.push(result)
  }

  // Execute updates
  if (!dryRun && updateBatch.length > 0) {
    console.log(`\n📝 Updating ${updateBatch.length} courses...`)

    let updated = 0
    let failed = 0

    for (const update of updateBatch) {
      const { error } = await supabase
        .from('courses')
        .update({
          teacher_id: update.teacher_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', update.id)

      if (error) {
        failed++
        if (verbose) {
          console.log(`   ❌ Failed to update course ${update.id}: ${error.message}`)
        }
      } else {
        updated++
      }
    }

    console.log(`   ✅ Updated: ${updated}`)
    if (failed > 0) {
      console.log(`   ❌ Failed: ${failed}`)
    }
  }

  return results
}

// Generate summary report
function generateReport(results: AssignmentResult[]) {
  const successful = results.filter(r => r.success && r.error !== 'Already assigned')
  const alreadyAssigned = results.filter(r => r.success && r.error === 'Already assigned')
  const failed = results.filter(r => !r.success)

  console.log('\n📋 Summary Report')
  console.log('─'.repeat(50))
  console.log(`Total Assignments:    ${results.length}`)
  console.log(`✅ Successful:         ${successful.length}`)
  console.log(`⏭️  Already Assigned:   ${alreadyAssigned.length}`)
  console.log(`❌ Failed:             ${failed.length}`)

  if (failed.length > 0) {
    console.log('\n❌ Failed Assignments:')

    // Group by error type
    const byError = new Map<string, AssignmentResult[]>()
    failed.forEach(f => {
      const key = f.error || 'Unknown error'
      if (!byError.has(key)) byError.set(key, [])
      byError.get(key)!.push(f)
    })

    byError.forEach((items, error) => {
      console.log(`\n   ${error}:`)
      items.slice(0, 5).forEach(item => {
        console.log(`   - ${item.teacher_email} → ${item.class_name} (${item.course_type})`)
      })
      if (items.length > 5) {
        console.log(`   ... and ${items.length - 5} more`)
      }
    })
  }
}

// Main function
async function main() {
  const args = parseArgs()

  console.log('🚀 Teacher Course Assignment Script')
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
    const assignments = await parseCSV(args.csvPath)
    console.log(`   Found ${assignments.length} assignments`)

    // Process assignments
    const results = await processAssignments(supabase, assignments, args.dryRun, args.verbose)

    // Generate report
    generateReport(results)

    if (args.dryRun) {
      console.log('\n⚠️  DRY RUN: No changes were made')
    } else {
      console.log('\n✅ Assignment complete!')
    }

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
