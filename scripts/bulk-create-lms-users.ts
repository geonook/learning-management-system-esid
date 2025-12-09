/**
 * Bulk Create LMS Users
 *
 * Creates users in Supabase Auth first, then in public.users table.
 * Uses Supabase Admin API to bypass SSO requirement.
 *
 * Usage:
 *   npx tsx scripts/bulk-create-lms-users.ts [staging|production]
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

interface TeacherRow {
  full_name: string
  email: string
  teacher_type: 'LT' | 'IT' | 'KCFS' | ''
  grade: string  // grade_band for head teachers
  role: 'admin' | 'head' | 'teacher' | 'office_member'
}

async function main() {
  const env = (process.argv[2] || 'staging') as 'staging' | 'production'

  console.log('═'.repeat(60))
  console.log(`👥 Bulk Create LMS Users`)
  console.log(`🌍 Environment: ${env.toUpperCase()}`)
  console.log('═'.repeat(60))

  const config = ENV_CONFIG[env]
  const supabase = createClient(config.url, config.serviceKey)

  // Read CSV file
  const csvPath = path.join(__dirname, '../templates/import/2_teachers_template.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.trim().split('\n')

  // Parse CSV (skip header)
  // Header: full_name,email,teacher_type,grade_band,role
  const teachers: TeacherRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(s => s.trim())
    if (parts.length >= 5) {
      const email = parts[1]
      if (!email) continue

      // Generate full_name from email if not provided
      let fullName = parts[0]
      if (!fullName && email) {
        // Extract name from email: kassieshih@... -> Kassie Shih
        const localPart = email.split('@')[0] || ''
        // Try to split camelCase or consecutive letters
        fullName = localPart
          .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase
          .replace(/^./, c => c.toUpperCase())   // capitalize first
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
      }

      teachers.push({
        full_name: fullName,
        email: email,
        teacher_type: parts[2] as TeacherRow['teacher_type'],
        grade: parts[3],
        role: parts[4] as TeacherRow['role']
      })
    }
  }

  console.log(`\n📋 Found ${teachers.length} teachers in CSV`)

  // Get existing users
  const { data: existingUsers } = await supabase
    .from('users')
    .select('email')

  const existingEmails = new Set(existingUsers?.map(u => u.email.toLowerCase()) || [])
  console.log(`👥 Found ${existingEmails.size} existing users in LMS`)

  // Filter out existing users
  const newTeachers = teachers.filter(t => !existingEmails.has(t.email.toLowerCase()))
  console.log(`📝 Users to create: ${newTeachers.length}`)

  if (newTeachers.length === 0) {
    console.log('✅ All users already exist!')
    return
  }

  console.log('\n' + '─'.repeat(60))
  console.log('Creating users...\n')

  let created = 0
  let failed = 0

  for (const teacher of newTeachers) {
    // Step 1: Create Auth user using Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: teacher.email,
      email_confirm: true,  // Skip email verification
      password: 'Test123!',  // Default password
      user_metadata: {
        full_name: teacher.full_name,
        role: teacher.role
      }
    })

    if (authError) {
      console.log(`❌ [Auth] ${teacher.email}: ${authError.message}`)
      failed++
      continue
    }

    const authUserId = authData.user?.id
    if (!authUserId) {
      console.log(`❌ [Auth] ${teacher.email}: No user ID returned`)
      failed++
      continue
    }

    // Step 2: Create public.users record with the same ID
    const userData: Record<string, unknown> = {
      id: authUserId,  // Use Auth user ID
      email: teacher.email,
      full_name: teacher.full_name,
      role: teacher.role,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Set teacher_type only for teachers
    if (teacher.role === 'teacher' && teacher.teacher_type) {
      userData.teacher_type = teacher.teacher_type
    }

    // Set grade_band and track for head teachers
    if (teacher.role === 'head') {
      userData.grade_band = teacher.grade || null
      userData.track = teacher.teacher_type || null  // LT/IT/KCFS
    }

    // Insert user
    const { error } = await supabase
      .from('users')
      .insert(userData)

    if (error) {
      console.log(`❌ [DB] ${teacher.email}: ${error.message}`)
      // Cleanup: delete auth user if DB insert failed
      await supabase.auth.admin.deleteUser(authUserId)
      failed++
    } else {
      console.log(`✅ ${teacher.full_name} (${teacher.email}) - ${teacher.role}`)
      created++
    }
  }

  // Final summary
  const { data: finalUsers } = await supabase.from('users').select('id')

  console.log('\n' + '═'.repeat(60))
  console.log('📊 Summary')
  console.log('─'.repeat(60))
  console.log(`   ✅ Created: ${created}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   👥 Total users in LMS: ${finalUsers?.length || 0}`)
  console.log('═'.repeat(60))
}

main().catch(console.error)
