#!/usr/bin/env tsx

/**
 * Analytics Views Performance Testing
 * Tests query performance and validates data integrity
 */

import { createClient } from '@supabase/supabase-js'
import { performance } from 'perf_hooks'
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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing environment variables!')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
})

interface PerformanceTest {
  viewName: string
  query: string
  description: string
}

async function testAnalyticsPerformance() {
  console.log('🚀 Analytics Views Performance Testing')
  console.log('📍 Target:', supabaseUrl)
  console.log('🎯 Performance Goal: <500ms per query\n')

  const tests: PerformanceTest[] = [
    {
      viewName: 'student_grade_aggregates',
      query: 'SELECT COUNT(*) FROM student_grade_aggregates',
      description: '學生成績聚合視圖 - 總記錄數'
    },
    {
      viewName: 'student_grade_aggregates',
      query: 'SELECT * FROM student_grade_aggregates LIMIT 5',
      description: '學生成績聚合視圖 - 前5筆記錄'
    },
    {
      viewName: 'student_grade_aggregates',
      query: 'SELECT grade, COUNT(*) as student_count, AVG(formative_average) as avg_formative FROM student_grade_aggregates WHERE formative_average IS NOT NULL GROUP BY grade ORDER BY grade',
      description: '學生成績聚合視圖 - 按年級統計'
    },
    {
      viewName: 'class_statistics',
      query: 'SELECT COUNT(*) FROM class_statistics',
      description: '班級統計視圖 - 總記錄數'
    },
    {
      viewName: 'class_statistics',
      query: 'SELECT * FROM class_statistics LIMIT 5',
      description: '班級統計視圖 - 前5筆記錄'
    },
    {
      viewName: 'class_statistics',
      query: 'SELECT grade, AVG(class_average) as overall_avg, AVG(completion_rate_percent) as avg_completion FROM class_statistics WHERE class_average IS NOT NULL GROUP BY grade ORDER BY grade',
      description: '班級統計視圖 - 按年級分析'
    },
    {
      viewName: 'teacher_performance',
      query: 'SELECT COUNT(*) FROM teacher_performance',
      description: '教師績效視圖 - 總記錄數'
    },
    {
      viewName: 'teacher_performance',
      query: 'SELECT * FROM teacher_performance LIMIT 5',
      description: '教師績效視圖 - 前5筆記錄'
    },
    {
      viewName: 'teacher_performance',
      query: 'SELECT teacher_type, COUNT(*) as teacher_count, AVG(overall_class_average) as avg_performance FROM teacher_performance WHERE overall_class_average IS NOT NULL GROUP BY teacher_type ORDER BY teacher_type',
      description: '教師績效視圖 - 按教師類型統計'
    }
  ]

  const results: any[] = []
  let totalTime = 0
  let passedTests = 0
  let failedTests = 0

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i]
    if (!test) continue

    console.log(`\n📊 Test ${i + 1}/${tests.length}: ${test.description}`)

    try {
      const startTime = performance.now()

      let data, error

      // For simple SELECT queries, use direct table access
      if (test.query.includes('SELECT COUNT(*)') && test.query.includes('FROM ') && !test.query.includes('GROUP BY')) {
        // Extract table name for COUNT queries
        const tableMatch = test.query.match(/FROM\s+(\w+)/)
        if (tableMatch && tableMatch[1]) {
          const tableName = tableMatch[1]
          const result = await supabase.from(tableName as any).select('*', { count: 'exact', head: true })
          data = [{ count: result.count }]
          error = result.error
        } else {
          // Fallback to RPC
          const result = await supabase.rpc('exec_sql', { sql_query: test.query })
          data = result.data
          error = result.error
        }
      } else if (test.query.includes('LIMIT')) {
        // For LIMIT queries, use direct table access
        const tableMatch = test.query.match(/FROM\s+(\w+)/)
        const limitMatch = test.query.match(/LIMIT\s+(\d+)/)
        if (tableMatch && tableMatch[1] && limitMatch && limitMatch[1]) {
          const tableName = tableMatch[1]
          const limit = parseInt(limitMatch[1])
          const result = await supabase.from(tableName as any).select('*').limit(limit)
          data = result.data
          error = result.error
        } else {
          // Fallback to RPC
          const result = await supabase.rpc('exec_sql', { sql_query: test.query })
          data = result.data
          error = result.error
        }
      } else {
        // For complex queries, try RPC
        const result = await supabase.rpc('exec_sql', { sql_query: test.query })
        data = result.data
        error = result.error
      }
      
      const endTime = performance.now()
      const duration = Math.round(endTime - startTime)
      totalTime += duration

      if (error) {
        console.error(`❌ Query Error: ${error.message}`)
        results.push({
          test: test.description,
          status: 'error',
          error: error.message,
          duration: duration
        })
        failedTests++
      } else {
        const passed = duration < 500
        const status = passed ? '✅' : '⚠️'
        console.log(`${status} Duration: ${duration}ms ${passed ? '(PASS)' : '(SLOW)'}`)
        
        if (Array.isArray(data) && data.length > 0) {
          console.log(`📈 Result: ${JSON.stringify(data[0], null, 2)}`)
        }
        
        results.push({
          test: test.description,
          status: passed ? 'pass' : 'slow',
          duration: duration,
          dataPoints: Array.isArray(data) ? data.length : 0
        })
        
        if (passed) passedTests++
        else failedTests++
      }
      
    } catch (err: any) {
      console.error(`💥 Exception: ${err.message}`)
      results.push({
        test: test.description,
        status: 'exception',
        error: err.message
      })
      failedTests++
    }
  }

  // Summary Report
  console.log('\n' + '='.repeat(60))
  console.log('📋 ANALYTICS PERFORMANCE SUMMARY')
  console.log('='.repeat(60))
  console.log(`🎯 Total Tests: ${tests.length}`)
  console.log(`✅ Passed (<500ms): ${passedTests}`)
  console.log(`⚠️ Slow (≥500ms): ${failedTests - results.filter(r => r.status === 'error' || r.status === 'exception').length}`)
  console.log(`❌ Failed: ${results.filter(r => r.status === 'error' || r.status === 'exception').length}`)
  console.log(`⏱️ Average Duration: ${Math.round(totalTime / tests.length)}ms`)
  console.log(`🏁 Total Test Time: ${totalTime}ms`)

  const fastQueries = results.filter(r => r.status === 'pass').length
  const performanceScore = Math.round((fastQueries / tests.length) * 100)
  
  console.log(`\n🏆 Performance Score: ${performanceScore}%`)
  
  if (performanceScore >= 80) {
    console.log('🎉 EXCELLENT: Analytics views are performing well!')
  } else if (performanceScore >= 60) {
    console.log('⚠️ GOOD: Some queries may need optimization')
  } else {
    console.log('🚨 NEEDS IMPROVEMENT: Consider adding more indexes')
  }

  // Test specific Analytics functionality
  console.log('\n📈 Testing Analytics Data Integrity...')
  
  try {
    // Test student grade calculations using direct table access
    const gradeTestResult = await supabase
      .from('student_grade_aggregates')
      .select('formative_average, summative_average, semester_grade, at_risk')
    
    if (gradeTestResult.data) {
      const gradeTest = [{
        total_students: gradeTestResult.data.length,
        with_formative: gradeTestResult.data.filter(r => r.formative_average !== null).length,
        with_summative: gradeTestResult.data.filter(r => r.summative_average !== null).length,
        with_semester: gradeTestResult.data.filter(r => r.semester_grade !== null).length,
        at_risk_count: gradeTestResult.data.filter(r => r.at_risk === true).length
      }]
    
      if (gradeTest && gradeTest.length > 0) {
        console.log('✅ Grade Calculations:', gradeTest[0])
      }
    }
    
  } catch (err) {
    console.error('❌ Grade calculation test failed:', err)
  }

  console.log('\n🎯 Analytics Performance Testing Complete!')
  
  return {
    summary: {
      totalTests: tests.length,
      passedTests,
      failedTests,
      averageDuration: Math.round(totalTime / tests.length),
      performanceScore
    },
    results
  }
}

// Execute tests
testAnalyticsPerformance().catch(console.error)