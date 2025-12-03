/**
 * Import Teacher Course Assignments
 *
 * Reads 3_teacher_course_assignments_template.csv and updates
 * the courses table with teacher_id assignments.
 *
 * Usage:
 *   npx tsx scripts/import-course-assignments.ts [--env staging|production]
 *
 * Default: staging environment
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Environment configuration
const ENV_CONFIG = {
  staging: {
    url: 'https://kqvpcoolgyhjqleekmee.supabase.co',
    serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxdnBjb29sZ3loanFsZWVrbWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY5MDM5NSwiZXhwIjoyMDc5MjY2Mzk1fQ.VgHtLZn7dFIWnlOrEjg8VPcTjC5S5L01C1wtV0WB0zg'
  },
  production: {
    url: 'https://piwbooidofbaqklhijup.supabase.co',
    serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpd2Jvb2lkb2ZiYXFrbGhpanVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDUwODExMiwiZXhwIjoyMDc2MDg0MTEyfQ.UQUvbBrbc1eR6Ox_RIpxq8Qviiw8zWjHDlObcTfZGPE'
  }
}

interface AssignmentRow {
  teacher_email: string
  class_name: string
  course_type: 'LT' | 'IT' | 'KCFS'
}

async function main() {
  // Parse command line args
  const args = process.argv.slice(2)
  const envArg = args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'staging'
  const env = envArg as 'staging' | 'production'

  console.log('═'.repeat(60))
  console.log(`📚 Import Teacher Course Assignments`)
  console.log(`🌍 Environment: ${env.toUpperCase()}`)
  console.log('═'.repeat(60))

  // Get config
  const config = ENV_CONFIG[env]
  if (!config.serviceKey) {
    console.error(`❌ Missing service key for ${env} environment`)
    console.error(`   Set SUPABASE_${env === 'staging' ? 'STAGING_SERVICE_KEY' : 'SERVICE_ROLE_KEY'} environment variable`)
    process.exit(1)
  }

  // Create Supabase client
  const supabase = createClient(config.url, config.serviceKey)

  // Read CSV file
  const csvPath = path.join(__dirname, '../templates/import/3_teacher_course_assignments_template.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.trim().split('\n')

  // Parse CSV (skip header)
  const assignments: AssignmentRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const [teacher_email, class_name, course_type] = lines[i].split(',').map(s => s.trim())
    if (teacher_email && class_name && course_type) {
      assignments.push({
        teacher_email,
        class_name,
        course_type: course_type as 'LT' | 'IT' | 'KCFS'
      })
    }
  }

  console.log(`\n📋 Found ${assignments.length} assignments in CSV`)

  // Fetch all users (teachers)
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email')

  if (usersError) {
    console.error('❌ Failed to fetch users:', usersError.message)
    process.exit(1)
  }

  const userMap = new Map(users?.map(u => [u.email.toLowerCase(), u.id]) || [])
  console.log(`👥 Found ${userMap.size} users in database`)

  // Fetch all classes
  const { data: classes, error: classesError } = await supabase
    .from('classes')
    .select('id, name')

  if (classesError) {
    console.error('❌ Failed to fetch classes:', classesError.message)
    process.exit(1)
  }

  const classMap = new Map(classes?.map(c => [c.name, c.id]) || [])
  console.log(`🏫 Found ${classMap.size} classes in database`)

  // Fetch all courses
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, class_id, course_type, teacher_id')

  if (coursesError) {
    console.error('❌ Failed to fetch courses:', coursesError.message)
    process.exit(1)
  }

  // Create course lookup: class_id + course_type -> course_id
  const courseMap = new Map<string, { id: string; teacher_id: string | null }>()
  for (const course of courses || []) {
    const key = `${course.class_id}:${course.course_type}`
    courseMap.set(key, { id: course.id, teacher_id: course.teacher_id })
  }
  console.log(`📚 Found ${courseMap.size} courses in database`)

  // Process assignments
  console.log('\n' + '─'.repeat(60))
  console.log('Processing assignments...\n')

  let updated = 0
  let skipped = 0
  let notFound = 0
  const errors: string[] = []

  for (const assignment of assignments) {
    const teacherId = userMap.get(assignment.teacher_email.toLowerCase())
    const classId = classMap.get(assignment.class_name)

    if (!teacherId) {
      errors.push(`Teacher not found: ${assignment.teacher_email}`)
      notFound++
      continue
    }

    if (!classId) {
      errors.push(`Class not found: ${assignment.class_name}`)
      notFound++
      continue
    }

    const courseKey = `${classId}:${assignment.course_type}`
    const course = courseMap.get(courseKey)

    if (!course) {
      errors.push(`Course not found: ${assignment.class_name} - ${assignment.course_type}`)
      notFound++
      continue
    }

    // Skip if already assigned to same teacher
    if (course.teacher_id === teacherId) {
      skipped++
      continue
    }

    // Update the course with teacher_id
    const { error: updateError } = await supabase
      .from('courses')
      .update({ teacher_id: teacherId })
      .eq('id', course.id)

    if (updateError) {
      errors.push(`Failed to update course ${course.id}: ${updateError.message}`)
      continue
    }

    console.log(`✅ ${assignment.teacher_email.split('@')[0]} → ${assignment.class_name} (${assignment.course_type})`)
    updated++
  }

  // Summary
  console.log('\n' + '═'.repeat(60))
  console.log('📊 Summary')
  console.log('─'.repeat(60))
  console.log(`   ✅ Updated: ${updated}`)
  console.log(`   ⏭️  Skipped (already assigned): ${skipped}`)
  console.log(`   ❌ Not found: ${notFound}`)
  console.log(`   📋 Total processed: ${assignments.length}`)

  if (errors.length > 0 && errors.length <= 20) {
    console.log('\n⚠️  Errors:')
    errors.forEach(e => console.log(`   - ${e}`))
  } else if (errors.length > 20) {
    console.log(`\n⚠️  ${errors.length} errors (showing first 20):`)
    errors.slice(0, 20).forEach(e => console.log(`   - ${e}`))
  }

  // Verify final state
  const { data: finalCourses } = await supabase
    .from('courses')
    .select('teacher_id')

  const assignedCount = finalCourses?.filter(c => c.teacher_id !== null).length || 0
  const totalCourses = finalCourses?.length || 0

  console.log('\n' + '─'.repeat(60))
  console.log(`📈 Final State: ${assignedCount}/${totalCourses} courses have teachers assigned`)
  console.log('═'.repeat(60))
}

main().catch(console.error)
