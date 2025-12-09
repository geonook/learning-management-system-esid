#!/usr/bin/env node

/**
 * Check Staging Supabase data status
 */

import pg from 'pg'

const { Pool } = pg

// Staging PostgreSQL connection
const STAGING_CONNECTION = 'postgresql://postgres.kqvpcoolgyhjqleekmee:geonook8588@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres'

const pool = new Pool({
  connectionString: STAGING_CONNECTION,
  ssl: { rejectUnauthorized: false }
})

async function checkStatus() {
  const client = await pool.connect()

  try {
    console.log('=== Staging Database Status ===\n')

    // Check classes
    const classCount = await client.query('SELECT COUNT(*) as count FROM classes')
    console.log(`Classes: ${classCount.rows[0].count}`)

    // Sample classes
    const sampleClasses = await client.query('SELECT name, grade, level FROM classes ORDER BY grade, name LIMIT 6')
    console.log('Sample classes:')
    sampleClasses.rows.forEach(c => console.log(`  - ${c.name} (Grade ${c.grade}, ${c.level})`))

    // Check students
    const studentCount = await client.query('SELECT COUNT(*) as count FROM students')
    console.log(`\nStudents: ${studentCount.rows[0].count}`)

    // Sample students
    const sampleStudents = await client.query('SELECT student_id, full_name, grade, level FROM students LIMIT 3')
    console.log('Sample students:')
    sampleStudents.rows.forEach(s => console.log(`  - ${s.student_id}: ${s.full_name} (Grade ${s.grade}, ${s.level})`))

    // Check courses
    const courseCount = await client.query('SELECT COUNT(*) as count FROM courses')
    console.log(`\nCourses: ${courseCount.rows[0].count}`)

    // Check users
    const users = await client.query('SELECT id, email, role, full_name FROM users')
    console.log(`\nUsers: ${users.rows.length}`)
    users.rows.forEach(u => console.log(`  - ${u.email} (${u.role}): ${u.full_name || 'N/A'}`))

  } finally {
    client.release()
    await pool.end()
  }
}

checkStatus().catch(console.error)
