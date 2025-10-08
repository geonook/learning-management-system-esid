import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Deploy Analytics Views API Route
 * POST /api/deploy-analytics
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting Analytics Views Deployment...')
    
    // Create service role client
    const supabase = createClient()
    
    // Read Analytics views SQL
    const viewsPath = join(process.cwd(), 'db/views/002_analytics_views.sql')
    const viewsSql = readFileSync(viewsPath, 'utf-8')
    
    // Split into individual CREATE VIEW statements
    const statements = viewsSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 10 && stmt.includes('CREATE'))
    
    console.log(`📊 Found ${statements.length} statements to execute`)
    
    const results: any[] = []
    let successCount = 0
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      
      try {
        console.log(`Executing statement ${i + 1}/${statements.length}`)
        
        // Execute raw SQL
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        })
        
        if (error) {
          console.error(`Error in statement ${i + 1}:`, error)
          results.push({
            statement: i + 1,
            status: 'error',
            error: error.message,
            sql: statement.substring(0, 100) + '...'
          })
        } else {
          console.log(`✅ Statement ${i + 1} completed`)
          results.push({
            statement: i + 1,
            status: 'success',
            sql: statement.substring(0, 100) + '...'
          })
          successCount++
        }
        
      } catch (err: any) {
        console.error(`Exception in statement ${i + 1}:`, err)
        results.push({
          statement: i + 1,
          status: 'exception',
          error: err.message,
          sql: statement.substring(0, 100) + '...'
        })
      }
    }
    
    // Test view access
    console.log('🔍 Testing view access...')
    const viewTests: any[] = []
    
    const testViews = [
      'student_grade_aggregates',
      'class_statistics',
      'teacher_performance'
    ]
    
    for (const viewName of testViews) {
      try {
        const startTime = Date.now()
        const { data, error } = await supabase
          .from(viewName as any)
          .select('*')
          .limit(1)
        
        const endTime = Date.now()
        const duration = endTime - startTime
        
        viewTests.push({
          view: viewName,
          status: error ? 'error' : 'success',
          error: error?.message,
          duration,
          recordCount: data?.length || 0
        })
        
      } catch (err: any) {
        viewTests.push({
          view: viewName,
          status: 'exception',
          error: err.message
        })
      }
    }
    
    // Summary
    const summary = {
      totalStatements: statements.length,
      successfulStatements: successCount,
      failedStatements: statements.length - successCount,
      viewsAccessible: viewTests.filter(t => t.status === 'success').length,
      averageQueryTime: viewTests
        .filter(t => t.duration)
        .reduce((sum, t) => sum + t.duration, 0) / viewTests.filter(t => t.duration).length || 0
    }
    
    console.log('📋 Deployment Summary:', summary)
    
    return NextResponse.json({
      success: successCount > 0,
      summary,
      results,
      viewTests,
      message: successCount > 0 
        ? `✅ Analytics deployment completed (${successCount}/${statements.length} statements successful)`
        : '❌ Analytics deployment failed'
    })
    
  } catch (error: any) {
    console.error('💥 Analytics deployment failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}