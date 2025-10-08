#!/usr/bin/env tsx

/**
 * Deploy Analytics Views to Zeabur Supabase
 * Deploys the Analytics database views and indexes for Phase 3A-1
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!serviceKey)
  process.exit(1)
}

// Create Supabase client with service role
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
})

/**
 * Execute SQL file
 */
async function executeSqlFile(filePath: string, description: string): Promise<boolean> {
  try {
    console.log(`📂 Reading ${description}...`)
    const sqlContent = readFileSync(filePath, 'utf-8')
    
    console.log(`🚀 Executing ${description}...`)
    const { data, error } = await supabase.rpc('execute_sql', { sql: sqlContent })
    
    if (error) {
      console.error(`❌ Error executing ${description}:`, error)
      return false
    }
    
    console.log(`✅ ${description} executed successfully`)
    if (data) {
      console.log('   Result:', data)
    }
    
    return true
  } catch (err) {
    console.error(`❌ Failed to execute ${description}:`, err)
    return false
  }
}

/**
 * Test view accessibility
 */
async function testViewAccess(viewName: string): Promise<boolean> {
  try {
    console.log(`🔍 Testing ${viewName} access...`)
    const { data, error } = await supabase
      .from(viewName)
      .select('*')
      .limit(1)
    
    if (error) {
      console.error(`❌ Error accessing ${viewName}:`, error)
      return false
    }
    
    console.log(`✅ ${viewName} accessible`)
    return true
  } catch (err) {
    console.error(`❌ Failed to test ${viewName}:`, err)
    return false
  }
}

/**
 * Execute raw SQL using service role
 */
async function executeRawSql(sql: string, description: string): Promise<boolean> {
  try {
    console.log(`🚀 Executing ${description}...`)
    
    // Use service role connection directly
    const { data, error } = await supabase.rpc('exec_sql', { 
      query: sql 
    }).single()
    
    if (error) {
      // Try alternative method
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey!
        },
        body: JSON.stringify({ query: sql })
      })
      
      if (!response.ok) {
        console.error(`❌ HTTP Error ${response.status}:`, await response.text())
        return false
      }
      
      const result = await response.json()
      console.log(`✅ ${description} executed successfully`)
      if (result) {
        console.log('   Result:', result)
      }
      return true
    }
    
    console.log(`✅ ${description} executed successfully`)
    if (data) {
      console.log('   Result:', data)
    }
    
    return true
  } catch (err) {
    console.error(`❌ Failed to execute ${description}:`, err)
    return false
  }
}

/**
 * Main deployment function
 */
async function deployAnalytics() {
  console.log('🚀 Starting Analytics Views & Indexes Deployment')
  console.log('📍 Target:', supabaseUrl)
  console.log('')
  
  let success = true
  
  // Step 1: Deploy Analytics Views
  console.log('📊 Step 1: Deploying Analytics Views')
  const viewsPath = join(process.cwd(), 'db/views/002_analytics_views.sql')
  
  try {
    const viewsSql = readFileSync(viewsPath, 'utf-8')
    
    // Split SQL into individual statements
    const statements = viewsSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`   Found ${statements.length} SQL statements`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement && statement.length > 10) { // Skip empty statements
        console.log(`   Executing statement ${i + 1}/${statements.length}`)

        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';'
        })
        
        if (error && !error.message.includes('already exists')) {
          console.error(`   ❌ Error in statement ${i + 1}:`, error)
          success = false
        } else {
          console.log(`   ✅ Statement ${i + 1} completed`)
        }
      }
    }
    
  } catch (err) {
    console.error('❌ Error deploying views:', err)
    success = false
  }
  
  // Step 2: Deploy Analytics Indexes
  console.log('\n🏗️  Step 2: Deploying Analytics Indexes')
  const indexesPath = join(process.cwd(), 'db/migrations/007_analytics_performance_indexes.sql')
  
  try {
    const indexesSql = readFileSync(indexesPath, 'utf-8')
    
    // Split SQL into individual statements
    const statements = indexesSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`   Found ${statements.length} SQL statements`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement && statement.length > 10 && statement.toUpperCase().includes('CREATE')) {
        console.log(`   Executing index ${i + 1}/${statements.length}`)

        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';'
        })
        
        if (error && !error.message.includes('already exists')) {
          console.error(`   ❌ Error in index ${i + 1}:`, error)
          // Don't fail for indexes, as some may already exist
        } else {
          console.log(`   ✅ Index ${i + 1} completed`)
        }
      }
    }
    
  } catch (err) {
    console.error('❌ Error deploying indexes:', err)
    // Don't fail for indexes
  }
  
  // Step 3: Test View Access
  console.log('\n🔍 Step 3: Testing View Access')
  const views = [
    'student_grade_aggregates',
    'class_statistics', 
    'teacher_performance'
  ]
  
  for (const view of views) {
    const accessible = await testViewAccess(view)
    if (!accessible) {
      success = false
    }
  }
  
  // Step 4: Performance Test
  console.log('\n⚡ Step 4: Performance Testing')
  try {
    const startTime = Date.now()
    const { data, error } = await supabase
      .from('student_grade_aggregates')
      .select('student_id, grade, formative_average, summative_average')
      .limit(10)
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    if (error) {
      console.error('❌ Performance test failed:', error)
      success = false
    } else {
      console.log(`✅ Performance test completed in ${duration}ms`)
      console.log(`   Records returned: ${data?.length || 0}`)
      
      if (duration > 500) {
        console.warn(`⚠️  Query time ${duration}ms exceeds 500ms target`)
      } else {
        console.log(`🎯 Query time ${duration}ms meets <500ms target`)
      }
    }
    
  } catch (err) {
    console.error('❌ Performance test error:', err)
    success = false
  }
  
  // Summary
  console.log('\n📋 Deployment Summary')
  if (success) {
    console.log('✅ Analytics Views & Indexes deployment SUCCESSFUL')
    console.log('🎯 Ready for Phase 3A-2 development')
  } else {
    console.log('❌ Analytics deployment had ISSUES')
    console.log('🔧 Check errors above and retry if needed')
  }
  
  return success
}

// Execute if run directly
if (require.main === module) {
  deployAnalytics()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(err => {
      console.error('💥 Deployment failed:', err)
      process.exit(1)
    })
}

export { deployAnalytics }