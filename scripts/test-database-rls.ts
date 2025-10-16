#!/usr/bin/env tsx

/**
 * Database Connection and RLS Policy Testing
 * Tests basic database connectivity and Row Level Security
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables from .env.local
function loadEnvVars() {
  try {
    const envPath = join(process.cwd(), '.env.local')
    const envContent = readFileSync(envPath, 'utf-8')
    
    const envVars: { [key: string]: string } = {}
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim()
      }
    })
    
    return envVars
  } catch (err) {
    console.error('Error loading .env.local:', err)
    return {}
  }
}

const env = loadEnvVars()
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !anonKey || !serviceKey) {
  console.error('❌ Missing environment variables!')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', anonKey ? '✅' : '❌')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✅' : '❌')
  process.exit(1)
}

// Create clients
const anonClient = createClient(supabaseUrl, anonKey)
const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
})

async function testDatabaseConnection() {
  console.log('🔌 Testing Database Connection & RLS Policies')
  console.log('📍 Target:', supabaseUrl)
  console.log('='.repeat(60))

  const testResults: any[] = []

  // Test 1: Basic connectivity with admin client
  console.log('\n📊 Test 1: Admin Client Database Connectivity')
  try {
    const startTime = Date.now()
    const { data, error } = await adminClient
      .from('users')
      .select('id, email, role, full_name')
      .limit(5)
    
    const duration = Date.now() - startTime
    
    if (error) {
      console.error('❌ Admin connectivity failed:', error.message)
      testResults.push({ test: 'Admin Connectivity', status: 'failed', error: error.message })
    } else {
      console.log(`✅ Admin connectivity successful (${duration}ms)`)
      console.log(`📈 Found ${data?.length || 0} users`)
      testResults.push({ test: 'Admin Connectivity', status: 'passed', duration, userCount: data?.length })
    }
  } catch (err: any) {
    console.error('💥 Admin connectivity exception:', err.message)
    testResults.push({ test: 'Admin Connectivity', status: 'exception', error: err.message })
  }

  // Test 2: Anonymous client (should be restricted by RLS)
  console.log('\n📊 Test 2: Anonymous Client RLS Enforcement')
  try {
    const startTime = Date.now()
    const { data, error } = await anonClient
      .from('users')
      .select('id, email, role')
      .limit(5)
    
    const duration = Date.now() - startTime
    
    if (error) {
      console.log(`✅ RLS working correctly - Anonymous access blocked (${duration}ms)`)
      console.log(`🔒 Error: ${error.message}`)
      testResults.push({ test: 'RLS Enforcement', status: 'passed', duration, rls_blocked: true })
    } else {
      console.log(`⚠️ RLS may not be working - Anonymous access allowed (${duration}ms)`)
      console.log(`📈 Anonymous client got ${data?.length || 0} records`)
      testResults.push({ test: 'RLS Enforcement', status: 'warning', duration, rls_blocked: false, recordCount: data?.length })
    }
  } catch (err: any) {
    console.error('💥 Anonymous client exception:', err.message)
    testResults.push({ test: 'RLS Enforcement', status: 'exception', error: err.message })
  }

  // Test 3: Analytics Views Accessibility (Admin)
  console.log('\n📊 Test 3: Analytics Views Access Control')
  const analyticsViews = ['student_grade_aggregates', 'class_statistics', 'teacher_performance']
  
  for (const viewName of analyticsViews) {
    try {
      const startTime = Date.now()
      const { data, error } = await adminClient
        .from(viewName)
        .select('*')
        .limit(1)
      
      const duration = Date.now() - startTime
      
      if (error) {
        console.error(`❌ ${viewName} access failed:`, error.message)
        testResults.push({ test: `${viewName} Access`, status: 'failed', error: error.message })
      } else {
        console.log(`✅ ${viewName} accessible (${duration}ms) - ${data?.length || 0} records`)
        testResults.push({ test: `${viewName} Access`, status: 'passed', duration, recordCount: data?.length })
      }
    } catch (err: any) {
      console.error(`💥 ${viewName} exception:`, err.message)
      testResults.push({ test: `${viewName} Access`, status: 'exception', error: err.message })
    }
  }

  // Test 4: Core Tables Accessibility
  console.log('\n📊 Test 4: Core Tables Access Control')
  const coreTables = ['classes', 'courses', 'students', 'scores', 'exams']
  
  for (const tableName of coreTables) {
    try {
      const startTime = Date.now()
      const { data, error } = await adminClient
        .from(tableName)
        .select('*')
        .limit(1)
      
      const duration = Date.now() - startTime
      
      if (error) {
        console.error(`❌ ${tableName} access failed:`, error.message)
        testResults.push({ test: `${tableName} Table`, status: 'failed', error: error.message })
      } else {
        console.log(`✅ ${tableName} accessible (${duration}ms) - ${data?.length || 0} records`)
        testResults.push({ test: `${tableName} Table`, status: 'passed', duration, recordCount: data?.length })
      }
    } catch (err: any) {
      console.error(`💥 ${tableName} exception:`, err.message)
      testResults.push({ test: `${tableName} Table`, status: 'exception', error: err.message })
    }
  }

  // Test 5: Database Schema Information
  console.log('\n📊 Test 5: Database Schema Validation')
  try {
    // Get table information
    const { data: tables, error: tablesError } = await adminClient
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name')
    
    if (tablesError) {
      console.error('❌ Schema info failed:', tablesError.message)
    } else {
      console.log(`✅ Found ${tables?.length || 0} public tables`)
      const tableNames = tables?.map(t => t.table_name) || []
      console.log(`📋 Tables: ${tableNames.join(', ')}`)
      testResults.push({ test: 'Schema Info', status: 'passed', tableCount: tables?.length, tables: tableNames })
    }
  } catch (err: any) {
    console.error('💥 Schema info exception:', err.message)
    testResults.push({ test: 'Schema Info', status: 'exception', error: err.message })
  }

  // Summary Report
  console.log('\n' + '='.repeat(60))
  console.log('📋 DATABASE & RLS TEST SUMMARY')
  console.log('='.repeat(60))
  
  const passed = testResults.filter(r => r.status === 'passed').length
  const failed = testResults.filter(r => r.status === 'failed').length
  const warnings = testResults.filter(r => r.status === 'warning').length
  const exceptions = testResults.filter(r => r.status === 'exception').length
  
  console.log(`🎯 Total Tests: ${testResults.length}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⚠️ Warnings: ${warnings}`)
  console.log(`💥 Exceptions: ${exceptions}`)
  
  const healthScore = Math.round((passed / testResults.length) * 100)
  console.log(`\n🏆 Database Health Score: ${healthScore}%`)
  
  if (healthScore >= 90) {
    console.log('🎉 EXCELLENT: Database is fully operational!')
  } else if (healthScore >= 75) {
    console.log('✅ GOOD: Database is working well with minor issues')
  } else if (healthScore >= 50) {
    console.log('⚠️ FAIR: Some database issues need attention')
  } else {
    console.log('🚨 POOR: Significant database issues detected')
  }

  console.log('\n🎯 Database Connection & RLS Testing Complete!')
  
  return {
    summary: {
      totalTests: testResults.length,
      passed,
      failed,
      warnings,
      exceptions,
      healthScore
    },
    results: testResults
  }
}

// Execute tests
testDatabaseConnection().catch(console.error)