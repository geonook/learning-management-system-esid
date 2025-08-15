#!/usr/bin/env npx tsx

/**
 * Database Schema Checker
 * Check the current table structures
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function checkSchema() {
  console.log('🔍 Checking database schema...\n')

  // Check if tables exist and their basic structure
  const tables = ['users', 'classes', 'courses', 'students', 'exams', 'scores']

  for (const table of tables) {
    console.log(`📋 Table: ${table}`)
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      if (error) {
        console.log(`  ❌ Error: ${error.message}`)
      } else {
        console.log(`  ✅ Exists, sample columns: ${Object.keys(data?.[0] || {}).join(', ')}`)
      }
    } catch (err) {
      console.log(`  ❌ Cannot access table: ${err}`)
    }
    console.log('')
  }

  // Check specific course structure
  console.log('🎯 Checking courses table structure specifically:')
  try {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .limit(1)

    if (error) {
      console.log(`❌ Courses error: ${error.message}`)
    } else if (courses && courses.length > 0) {
      console.log('✅ Courses table structure:')
      console.log(Object.keys(courses[0]).join(', '))
    } else {
      console.log('⚠️  Courses table is empty but accessible')
    }
  } catch (err) {
    console.log(`❌ Cannot check courses: ${err}`)
  }
}

checkSchema()