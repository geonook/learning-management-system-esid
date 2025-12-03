/**
 * Create Courses for All Classes
 *
 * For each class, creates 3 courses: LT, IT, KCFS
 * This implements the "one class, three teachers" architecture.
 *
 * Usage:
 *   npx tsx scripts/create-courses-for-classes.ts [staging|production]
 *
 * Default: staging environment
 */

import { createClient } from '@supabase/supabase-js'

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

const COURSE_TYPES = ['LT', 'IT', 'KCFS'] as const

async function main() {
  // Parse command line args
  const env = (process.argv[2] || 'staging') as 'staging' | 'production'

  console.log('═'.repeat(60))
  console.log(`📚 Create Courses for All Classes`)
  console.log(`🌍 Environment: ${env.toUpperCase()}`)
  console.log('═'.repeat(60))

  // Get config
  const config = ENV_CONFIG[env]
  if (!config) {
    console.error(`❌ Invalid environment: ${env}`)
    process.exit(1)
  }

  // Create Supabase client
  const supabase = createClient(config.url, config.serviceKey)

  // Fetch all classes
  const { data: classes, error: classesError } = await supabase
    .from('classes')
    .select('id, name, grade, academic_year')
    .eq('is_active', true)

  if (classesError) {
    console.error('❌ Failed to fetch classes:', classesError.message)
    process.exit(1)
  }

  console.log(`\n🏫 Found ${classes?.length || 0} classes`)

  // Check existing courses
  const { data: existingCourses, error: coursesError } = await supabase
    .from('courses')
    .select('id, class_id, course_type')

  if (coursesError) {
    console.error('❌ Failed to fetch existing courses:', coursesError.message)
    process.exit(1)
  }

  // Create a set of existing course keys
  const existingKeys = new Set(
    existingCourses?.map(c => `${c.class_id}:${c.course_type}`) || []
  )
  console.log(`📚 Found ${existingCourses?.length || 0} existing courses`)

  // Generate courses to insert
  const coursesToInsert: Array<{
    class_id: string
    course_type: 'LT' | 'IT' | 'KCFS'
    name: string
    academic_year: string
    teacher_id: null
  }> = []

  for (const cls of classes || []) {
    for (const courseType of COURSE_TYPES) {
      const key = `${cls.id}:${courseType}`
      if (!existingKeys.has(key)) {
        coursesToInsert.push({
          class_id: cls.id,
          course_type: courseType,
          name: `${cls.name} - ${courseType}`,
          academic_year: cls.academic_year || '2025-2026',
          teacher_id: null
        })
      }
    }
  }

  console.log(`\n📝 Courses to create: ${coursesToInsert.length}`)

  if (coursesToInsert.length === 0) {
    console.log('✅ All courses already exist!')
    return
  }

  // Insert in batches of 50
  const batchSize = 50
  let inserted = 0

  console.log('\n' + '─'.repeat(60))
  console.log('Creating courses...\n')

  for (let i = 0; i < coursesToInsert.length; i += batchSize) {
    const batch = coursesToInsert.slice(i, i + batchSize)
    const { error: insertError } = await supabase
      .from('courses')
      .insert(batch)

    if (insertError) {
      console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, insertError.message)
      continue
    }

    inserted += batch.length
    console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} courses created`)
  }

  // Verify final count
  const { data: finalCourses } = await supabase
    .from('courses')
    .select('id')

  console.log('\n' + '═'.repeat(60))
  console.log('📊 Summary')
  console.log('─'.repeat(60))
  console.log(`   ✅ Created: ${inserted}`)
  console.log(`   📚 Total courses: ${finalCourses?.length || 0}`)
  console.log(`   🏫 Classes: ${classes?.length || 0}`)
  console.log(`   📐 Expected: ${(classes?.length || 0) * 3} (${classes?.length} × 3)`)
  console.log('═'.repeat(60))
}

main().catch(console.error)
