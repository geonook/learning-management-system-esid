#!/usr/bin/env npx tsx

/**
 * Quick Test Data Status Checker
 * Run with: npx tsx scripts/check-test-data.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTestData() {
  console.log('🔍 Checking current test data status...\n')

  try {
    // Check users by role
    console.log('📊 USERS BY ROLE:')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('role, teacher_type, email')
      .like('email', '%@esid.edu')
      .order('role')

    if (usersError) {
      console.error('Error fetching users:', usersError)
    } else {
      const userStats = users?.reduce((acc, user) => {
        const key = `${user.role}${user.teacher_type ? ` (${user.teacher_type})` : ''}`
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      Object.entries(userStats || {}).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} users`)
      })
    }

    // Check classes by grade
    console.log('\n🏫 CLASSES BY GRADE:')
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('grade, track, name')
      .eq('is_active', true)
      .order('grade')

    if (classesError) {
      console.error('Error fetching classes:', classesError)
    } else {
      const classStats = classes?.reduce((acc, cls) => {
        const key = `Grade ${cls.grade} (${cls.track})`
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      Object.entries(classStats || {}).forEach(([grade, count]) => {
        console.log(`  ${grade}: ${count} classes`)
      })
    }

    // Check courses
    console.log('\n📚 COURSES BY TYPE:')
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('course_type, course_name')
      .eq('is_active', true)

    if (coursesError) {
      console.error('Error fetching courses:', coursesError)
    } else {
      const courseStats = courses?.reduce((acc, course) => {
        acc[course.course_type] = (acc[course.course_type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      Object.entries(courseStats || {}).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} courses`)
      })
    }

    // Check students
    console.log('\n👥 STUDENTS:')
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('grade, track')
      .eq('is_active', true)

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
    } else {
      const studentStats = students?.reduce((acc, student) => {
        const key = `Grade ${student.grade} (${student.track})`
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      Object.entries(studentStats || {}).forEach(([grade, count]) => {
        console.log(`  ${grade}: ${count} students`)
      })
      console.log(`  Total: ${students?.length || 0} students`)
    }

    // Check scores
    console.log('\n📝 SAMPLE SCORES:')
    const { count: scoresCount, error: scoresError } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })

    if (scoresError) {
      console.error('Error fetching scores:', scoresError)
    } else {
      console.log(`  Total scores: ${scoresCount || 0}`)
    }

    // Check critical test accounts
    console.log('\n🔐 CRITICAL TEST ACCOUNTS:')
    const criticalAccounts = [
      'admin@esid.edu',
      'head.g1.local@esid.edu',
      'lt.g1@esid.edu',
      'it.g1@esid.edu',
      'kcfs.g1@esid.edu'
    ]

    for (const email of criticalAccounts) {
      const { data: user } = await supabase
        .from('users')
        .select('email, role, teacher_type')
        .eq('email', email)
        .single()

      if (user) {
        console.log(`  ✅ ${email} (${user.role}${user.teacher_type ? ` - ${user.teacher_type}` : ''})`)
      } else {
        console.log(`  ❌ ${email} - MISSING`)
      }
    }

    // Summary
    const totalUsers = users?.length || 0
    const totalClasses = classes?.length || 0
    const totalCourses = courses?.length || 0
    const totalStudents = students?.length || 0

    console.log('\n📊 SUMMARY:')
    console.log(`  Users: ${totalUsers}`)
    console.log(`  Classes: ${totalClasses}`)
    console.log(`  Courses: ${totalCourses}`)
    console.log(`  Students: ${totalStudents}`)
    console.log(`  Scores: ${scoresCount || 0}`)

    if (totalUsers < 5) {
      console.log('\n⚠️  WARNING: Limited test data detected!')
      console.log('   To import full test data:')
      console.log('   1. Run the SQL script: scripts/create-primary-school-test-data.sql')
      console.log('   2. Create Auth users in Supabase dashboard')
      console.log('   3. Re-run this check')
    } else {
      console.log('\n✅ Test data looks good! Ready for testing.')
      console.log('   Access at: http://localhost:3000')
    }

  } catch (error) {
    console.error('Error checking test data:', error)
  }
}

// Run the check
checkTestData()