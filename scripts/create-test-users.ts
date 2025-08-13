#!/usr/bin/env tsx

/**
 * Create Test Users Script
 * Creates demo users for testing real authentication
 */

import { config } from 'dotenv'
import { createServiceRoleClient } from '../lib/supabase/server'

// Load environment variables
config({ path: '.env.local' })

interface TestUser {
  email: string
  password: string
  full_name: string
  role: 'admin' | 'head' | 'teacher' | 'student'
  teacher_type?: 'LT' | 'IT' | 'KCFS'
  grade?: number
  track?: 'local' | 'international'
}

const testUsers: TestUser[] = [
  {
    email: 'admin@esid.edu',
    password: 'admin123',
    full_name: 'System Administrator',
    role: 'admin'
  },
  {
    email: 'teacher.lt@esid.edu',
    password: 'teacher123',
    full_name: 'Local Teacher (LT)',
    role: 'teacher',
    teacher_type: 'LT',
    grade: 1,
    track: 'local'
  },
  {
    email: 'teacher.it@esid.edu',
    password: 'teacher123',
    full_name: 'International Teacher (IT)',
    role: 'teacher',
    teacher_type: 'IT',
    grade: 1,
    track: 'international'
  },
  {
    email: 'teacher.kcfs@esid.edu',
    password: 'teacher123',
    full_name: 'KCFS Teacher',
    role: 'teacher',
    teacher_type: 'KCFS',
    grade: 1,
    track: 'local'
  },
  {
    email: 'head.local@esid.edu',
    password: 'head123',
    full_name: 'Head Teacher (Local)',
    role: 'head',
    grade: 1,
    track: 'local'
  },
  {
    email: 'head.international@esid.edu',
    password: 'head123',
    full_name: 'Head Teacher (International)',
    role: 'head',
    grade: 1,
    track: 'international'
  }
]

async function createTestUsers() {
  const supabase = createServiceRoleClient()
  
  console.log('🚀 Creating test users for authentication...')
  
  for (const testUser of testUsers) {
    try {
      console.log(`Creating user: ${testUser.email}`)
      
      // Create auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        email_confirm: true // Auto-confirm email
      })
      
      if (authError) {
        console.error(`❌ Auth error for ${testUser.email}:`, authError.message)
        continue
      }
      
      if (!authUser.user) {
        console.error(`❌ No user created for ${testUser.email}`)
        continue
      }
      
      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          email: testUser.email,
          full_name: testUser.full_name,
          role: testUser.role,
          teacher_type: testUser.teacher_type || null,
          grade: testUser.grade || null,
          track: testUser.track || null,
          is_active: true
        })
      
      if (profileError) {
        console.error(`❌ Profile error for ${testUser.email}:`, profileError.message)
        // Delete auth user if profile creation failed
        await supabase.auth.admin.deleteUser(authUser.user.id)
        continue
      }
      
      console.log(`✅ Created: ${testUser.email} (${testUser.role})`)
      
    } catch (error: any) {
      console.error(`❌ Exception creating ${testUser.email}:`, error.message)
    }
  }
  
  console.log('\n🎉 Test user creation completed!')
  console.log('\n📝 Demo Credentials:')
  testUsers.forEach(user => {
    console.log(`${user.role.toUpperCase()}: ${user.email} / ${user.password}`)
  })
}

// Run the script
createTestUsers().catch(console.error)