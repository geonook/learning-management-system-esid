#!/usr/bin/env tsx

/**
 * Simple Analytics Views Deployment
 * Direct SQL execution via REST API for Zeabur Supabase
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
})

async function deployViews() {
  console.log('🚀 Deploying Analytics Views to Zeabur Supabase')
  console.log('📍 Target:', supabaseUrl)
  
  try {
    // Read the Analytics views SQL file
    const viewsPath = join(process.cwd(), 'db/views/002_analytics_views.sql')
    const viewsSql = readFileSync(viewsPath, 'utf-8')
    
    // Split into CREATE VIEW statements
    const createViewStatements = viewsSql
      .split('CREATE OR REPLACE VIEW')
      .slice(1) // Remove empty first element
      .map(statement => 'CREATE OR REPLACE VIEW' + statement.split(';')[0] + ';')
    
    console.log(`\n📊 Found ${createViewStatements.length} view definitions`)
    
    // Execute each view creation
    for (let i = 0; i < createViewStatements.length; i++) {
      const viewSql = createViewStatements[i].trim()
      
      // Extract view name
      const viewNameMatch = viewSql.match(/CREATE OR REPLACE VIEW\s+(\w+)/i)
      const viewName = viewNameMatch ? viewNameMatch[1] : `View ${i + 1}`
      
      console.log(`\n🔧 Creating ${viewName}...`)
      
      try {
        // Use raw SQL query
        const { data, error } = await supabase.rpc('exec', { 
          sql: viewSql 
        })
        
        if (error) {
          console.error(`❌ Error creating ${viewName}:`, error.message)
          
          // Try alternative approach - using REST API directly
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceKey}`,
              'apikey': serviceKey
            },
            body: JSON.stringify({ sql: viewSql })
          })
          
          if (!response.ok) {
            const errorText = await response.text()
            console.error(`❌ HTTP Error ${response.status}:`, errorText)
            continue
          }
          
          console.log(`✅ ${viewName} created successfully (via REST API)`)
        } else {
          console.log(`✅ ${viewName} created successfully`)
          if (data) console.log('   Result:', data)
        }
        
      } catch (err) {
        console.error(`❌ Exception creating ${viewName}:`, err)
        continue
      }
    }
    
    // Test view access
    console.log('\n🔍 Testing View Access...')
    
    const testViews = [
      'student_grade_aggregates',
      'class_statistics', 
      'teacher_performance'
    ]
    
    for (const viewName of testViews) {
      try {
        const startTime = Date.now()
        const { data, error } = await supabase
          .from(viewName)
          .select('*')
          .limit(3)
        
        const endTime = Date.now()
        const duration = endTime - startTime
        
        if (error) {
          console.error(`❌ ${viewName}: ${error.message}`)
        } else {
          console.log(`✅ ${viewName}: ${data?.length || 0} records (${duration}ms)`)
        }
        
      } catch (err) {
        console.error(`❌ ${viewName}: Exception -`, err)
      }
    }
    
    console.log('\n🎯 Analytics Views Deployment Complete!')
    
  } catch (err) {
    console.error('💥 Deployment failed:', err)
    throw err
  }
}

// Execute
deployViews().catch(console.error)