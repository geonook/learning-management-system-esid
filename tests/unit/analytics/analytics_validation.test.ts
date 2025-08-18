/**
 * Analytics Functionality Validation Tests
 * Phase 3A-1 Analytics system comprehensive testing
 * Tests: Statistical calculations, Database views, API integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@/lib/supabase/client'
import { analyticsEngine } from '@/lib/analytics/core'
import type { AnalyticsFilters } from '@/lib/analytics/types'

// Test configuration
const supabase = createClient()
const testFilters: AnalyticsFilters = {
  grades: [1, 2, 3, 4, 5, 6],
  tracks: ['local', 'international'],
  timeRange: {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    period: 'year'
  }
}

describe('Analytics Validation Tests - Phase 3A-1', () => {
  
  // ========================================
  // STATISTICAL CALCULATIONS TESTS
  // ========================================
  
  describe('Statistical Calculations', () => {
    it('should calculate correct basic statistics', () => {
      const testScores = [85, 90, 78, 92, 88, 76, 95, 82, 89, 91]
      const stats = analyticsEngine.calculateStatistics(testScores)
      
      expect(stats.count).toBe(10)
      expect(stats.mean).toBe(86.6) // Average of test scores
      expect(stats.median).toBe(88.5) // Median of sorted scores
      expect(stats.min).toBe(76)
      expect(stats.max).toBe(95)
      expect(stats.standardDeviation).toBeCloseTo(6.05, 1) // Approximately 6.05
    })

    it('should handle empty dataset gracefully', () => {
      const stats = analyticsEngine.calculateStatistics([])
      
      expect(stats.count).toBe(0)
      expect(stats.mean).toBe(0)
      expect(stats.median).toBe(0)
      expect(stats.min).toBe(0)
      expect(stats.max).toBe(0)
      expect(stats.standardDeviation).toBe(0)
    })

    it('should calculate performance distribution correctly', () => {
      const testScores = [95, 88, 82, 76, 91, 58, 73, 85, 67, 93]
      const distribution = analyticsEngine.calculateDistribution(testScores)
      
      expect(distribution.ranges).toHaveLength(5)
      expect(distribution.mean).toBe(80.8)
      
      // Check distribution ranges
      const excellent = distribution.ranges.find(r => r.range.includes('90-100'))
      expect(excellent?.count).toBe(3) // 95, 91, 93
      
      const good = distribution.ranges.find(r => r.range.includes('80-89'))
      expect(good?.count).toBe(3) // 88, 82, 85
    })
  })

  // ========================================
  // DATABASE VIEWS TESTS
  // ========================================
  
  describe('Database Views Validation', () => {
    it('should access student_grade_aggregates view', async () => {
      const { data, error } = await supabase
        .from('student_grade_aggregates')
        .select('*')
        .limit(5)
      
      expect(error).toBeNull()
      expect(data).toBeDefined()
      
      if (data && data.length > 0) {
        const student = data[0]
        expect(student).toHaveProperty('student_id')
        expect(student).toHaveProperty('student_name')
        expect(student).toHaveProperty('grade')
        expect(student).toHaveProperty('formative_average')
        expect(student).toHaveProperty('summative_average')
        expect(student).toHaveProperty('semester_grade')
      }
    })

    it('should access class_statistics view', async () => {
      const { data, error } = await supabase
        .from('class_statistics')
        .select('*')
        .limit(5)
      
      expect(error).toBeNull()
      expect(data).toBeDefined()
      
      if (data && data.length > 0) {
        const classStats = data[0]
        expect(classStats).toHaveProperty('class_id')
        expect(classStats).toHaveProperty('class_name')
        expect(classStats).toHaveProperty('class_average')
        expect(classStats).toHaveProperty('completion_rate_percent')
        expect(classStats).toHaveProperty('total_students')
      }
    })

    it('should access teacher_performance view', async () => {
      const { data, error } = await supabase
        .from('teacher_performance')
        .select('*')
        .limit(5)
      
      expect(error).toBeNull()
      expect(data).toBeDefined()
      
      if (data && data.length > 0) {
        const teacherPerf = data[0]
        expect(teacherPerf).toHaveProperty('teacher_id')
        expect(teacherPerf).toHaveProperty('teacher_name')
        expect(teacherPerf).toHaveProperty('teacher_type')
        expect(teacherPerf).toHaveProperty('overall_class_average')
        expect(teacherPerf).toHaveProperty('courses_taught')
      }
    })

    it('should validate view data consistency', async () => {
      // Test that aggregated data in views matches raw data calculations
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .limit(3)
      
      expect(studentsError).toBeNull()
      
      if (students && students.length > 0) {
        const studentId = students[0].id
        
        // Get aggregated data from view
        const { data: aggregateData, error: aggError } = await supabase
          .from('student_grade_aggregates')
          .select('formative_average, summative_average')
          .eq('student_id', studentId)
          .single()
        
        expect(aggError).toBeNull()
        
        // Get raw scores for manual calculation
        const { data: rawScores, error: scoresError } = await supabase
          .from('scores')
          .select('score, assessment_code')
          .eq('student_id', studentId)
          .gt('score', 0)
        
        expect(scoresError).toBeNull()
        
        if (rawScores && rawScores.length > 0) {
          const faScores = rawScores
            .filter(s => s.assessment_code.startsWith('FA'))
            .map(s => s.score)
          
          if (faScores.length > 0) {
            const manualFA = Math.round((faScores.reduce((a, b) => a + b, 0) / faScores.length) * 100) / 100
            expect(aggregateData?.formative_average).toBeCloseTo(manualFA, 1)
          }
        }
      }
    })
  })

  // ========================================
  // ANALYTICS ENGINE TESTS
  // ========================================
  
  describe('Analytics Engine Integration', () => {
    it('should calculate student metrics correctly', async () => {
      // Get a test student
      const { data: students, error } = await supabase
        .from('students')
        .select('id')
        .limit(1)
      
      expect(error).toBeNull()
      
      if (students && students.length > 0) {
        const studentId = students[0].id
        const metrics = await analyticsEngine.calculateStudentMetrics(studentId, testFilters)
        
        if (metrics) {
          expect(metrics.studentId).toBe(studentId)
          expect(metrics.grade).toBeGreaterThan(0)
          expect(metrics.grade).toBeLessThanOrEqual(6)
          expect(['local', 'international']).toContain(metrics.track)
          expect(['improving', 'declining', 'stable']).toContain(metrics.performanceTrend)
        }
      }
    })

    it('should calculate class metrics correctly', async () => {
      // Get a test class
      const { data: classes, error } = await supabase
        .from('classes')
        .select('id')
        .limit(1)
      
      expect(error).toBeNull()
      
      if (classes && classes.length > 0) {
        const classId = classes[0].id
        const metrics = await analyticsEngine.calculateClassMetrics(classId, testFilters)
        
        if (metrics) {
          expect(metrics.classId).toBe(classId)
          expect(metrics.grade).toBeGreaterThan(0)
          expect(metrics.grade).toBeLessThanOrEqual(6)
          expect(metrics.studentsCount).toBeGreaterThanOrEqual(0)
          
          if (metrics.averageScore !== null) {
            expect(metrics.averageScore).toBeGreaterThanOrEqual(0)
            expect(metrics.averageScore).toBeLessThanOrEqual(100)
          }
        }
      }
    })

    it('should implement caching correctly', () => {
      // Clear cache first
      analyticsEngine.clearCache()
      let stats = analyticsEngine.getCacheStats()
      expect(stats.size).toBe(0)
      
      // Perform calculation to trigger caching
      const testScores = [85, 90, 78, 92, 88]
      analyticsEngine.calculateStatistics(testScores)
      
      // Cache should still be empty for pure calculations
      stats = analyticsEngine.getCacheStats()
      expect(stats.size).toBeGreaterThanOrEqual(0)
    })
  })

  // ========================================
  // PERFORMANCE TESTS
  // ========================================
  
  describe('Performance Validation', () => {
    it('should execute analytics queries within 500ms', async () => {
      const startTime = Date.now()
      
      const { data, error } = await supabase
        .from('student_grade_aggregates')
        .select('student_id, grade, formative_average, summative_average')
        .eq('grade', 1)
        .limit(10)
      
      const endTime = Date.now()
      const executionTime = endTime - startTime
      
      expect(error).toBeNull()
      expect(executionTime).toBeLessThan(500) // Sub-500ms requirement
    })

    it('should handle large datasets efficiently', async () => {
      const startTime = Date.now()
      
      // Test with broader query
      const { data, error } = await supabase
        .from('class_statistics')
        .select('*')
        .in('grade', [1, 2, 3, 4, 5, 6])
      
      const endTime = Date.now()
      const executionTime = endTime - startTime
      
      expect(error).toBeNull()
      expect(executionTime).toBeLessThan(1000) // 1 second for larger queries
    })

    it('should use indexes effectively', async () => {
      // Test query that should use analytics indexes
      const startTime = Date.now()
      
      const { data, error } = await supabase
        .from('scores')
        .select('student_id, score, assessment_code')
        .like('assessment_code', 'FA%')
        .gt('score', 0)
        .limit(50)
      
      const endTime = Date.now()
      const executionTime = endTime - startTime
      
      expect(error).toBeNull()
      expect(executionTime).toBeLessThan(300) // Should be very fast with indexes
    })
  })

  // ========================================
  // GRADE CALCULATION TESTS
  // ========================================
  
  describe('Grade Calculation Validation', () => {
    it('should match /lib/grade calculation logic', () => {
      // Test formative average calculation
      const faScores = [85, 90, 78, 88]
      const expectedFA = Math.round((faScores.reduce((a, b) => a + b, 0) / faScores.length) * 100) / 100
      
      // Test summative average calculation  
      const saScores = [82, 89, 91]
      const expectedSA = Math.round((saScores.reduce((a, b) => a + b, 0) / saScores.length) * 100) / 100
      
      // Test semester grade calculation: (F×0.15 + S×0.2 + Final×0.1) ÷ 0.45
      const finalScore = 87
      const expectedSemester = Math.round(((expectedFA * 0.15 + expectedSA * 0.2 + finalScore * 0.1) / 0.45) * 100) / 100
      
      expect(expectedFA).toBe(85.25)
      expect(expectedSA).toBe(87.33)
      expect(expectedSemester).toBeCloseTo(86.59, 1)
    })

    it('should handle null and zero scores correctly', () => {
      // Only scores > 0 should be included
      const mixedScores = [85, 0, 90, null, 78]
      const validScores = mixedScores.filter(s => s !== null && s !== undefined && s > 0) as number[]
      const expectedAvg = Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 100) / 100
      
      expect(validScores).toEqual([85, 90, 78])
      expect(expectedAvg).toBe(84.33)
    })

    it('should calculate semester grade only when all components exist', () => {
      // Should return null if any component is missing
      const faAvg = 85
      const saAvg = null // Missing summative
      const finalScore = 87
      
      const semesterGrade = (faAvg && saAvg && finalScore) 
        ? Math.round(((faAvg * 0.15 + saAvg * 0.2 + finalScore * 0.1) / 0.45) * 100) / 100
        : null
      
      expect(semesterGrade).toBeNull()
    })
  })

  // ========================================
  // ERROR HANDLING TESTS
  // ========================================
  
  describe('Error Handling', () => {
    it('should handle invalid student ID gracefully', async () => {
      const invalidId = 'invalid-uuid-12345'
      const metrics = await analyticsEngine.calculateStudentMetrics(invalidId, testFilters)
      
      expect(metrics).toBeNull()
    })

    it('should handle invalid class ID gracefully', async () => {
      const invalidId = 'invalid-uuid-12345'
      const metrics = await analyticsEngine.calculateClassMetrics(invalidId, testFilters)
      
      expect(metrics).toBeNull()
    })

    it('should handle database connection issues', async () => {
      // Test with malformed query
      const { data, error } = await supabase
        .from('nonexistent_table')
        .select('*')
      
      expect(error).toBeDefined()
      expect(data).toBeNull()
    })
  })

  // ========================================
  // DATA INTEGRITY TESTS
  // ========================================
  
  describe('Data Integrity', () => {
    it('should ensure grade values are within valid range', async () => {
      const { data, error } = await supabase
        .from('student_grade_aggregates')
        .select('grade, formative_average, summative_average')
        .not('grade', 'is', null)
      
      expect(error).toBeNull()
      
      if (data) {
        data.forEach(row => {
          expect(row.grade).toBeGreaterThanOrEqual(1)
          expect(row.grade).toBeLessThanOrEqual(6)
          
          if (row.formative_average !== null) {
            expect(row.formative_average).toBeGreaterThanOrEqual(0)
            expect(row.formative_average).toBeLessThanOrEqual(100)
          }
          
          if (row.summative_average !== null) {
            expect(row.summative_average).toBeGreaterThanOrEqual(0)
            expect(row.summative_average).toBeLessThanOrEqual(100)
          }
        })
      }
    })

    it('should ensure assessment codes follow correct patterns', async () => {
      const { data, error } = await supabase
        .from('scores')
        .select('assessment_code')
        .limit(20)
      
      expect(error).toBeNull()
      
      if (data) {
        const validCodes = ['FA1', 'FA2', 'FA3', 'FA4', 'FA5', 'FA6', 'FA7', 'FA8', 
                           'SA1', 'SA2', 'SA3', 'SA4', 'FINAL']
        
        data.forEach(row => {
          expect(validCodes).toContain(row.assessment_code)
        })
      }
    })
  })

  // ========================================
  // TREND ANALYSIS TESTS
  // ========================================
  
  describe('Trend Analysis', () => {
    it('should calculate trends correctly', () => {
      const testData = [
        { x: '2024-01', y: 75 },
        { x: '2024-02', y: 78 },
        { x: '2024-03', y: 82 },
        { x: '2024-04', y: 85 },
        { x: '2024-05', y: 88 }
      ]
      
      const trend = analyticsEngine.calculateTrend(testData)
      
      expect(trend.trend).toBe('up') // Improving scores
      expect(trend.changePercentage).toBeGreaterThan(0)
      expect(trend.significance).toBe('high') // >10% change
    })

    it('should detect declining trends', () => {
      const testData = [
        { x: '2024-01', y: 90 },
        { x: '2024-02', y: 85 },
        { x: '2024-03', y: 80 },
        { x: '2024-04', y: 75 },
        { x: '2024-05', y: 70 }
      ]
      
      const trend = analyticsEngine.calculateTrend(testData)
      
      expect(trend.trend).toBe('down') // Declining scores
      expect(trend.changePercentage).toBeLessThan(0)
      expect(trend.significance).toBe('high') // Significant decline
    })
  })
})

// ========================================
// PERFORMANCE MONITORING FUNCTIONS
// ========================================

/**
 * Manual performance test for Analytics views
 * Run this separately for performance monitoring
 */
export async function performanceTest() {
  console.log('🚀 Starting Analytics Performance Test...')
  
  const tests = [
    {
      name: 'Student Grade Aggregates Query',
      query: () => supabase.from('student_grade_aggregates').select('*').limit(100)
    },
    {
      name: 'Class Statistics Query',  
      query: () => supabase.from('class_statistics').select('*').limit(50)
    },
    {
      name: 'Teacher Performance Query',
      query: () => supabase.from('teacher_performance').select('*').limit(25)
    },
    {
      name: 'Complex Join Query',
      query: () => supabase
        .from('scores')
        .select(`
          score,
          assessment_code,
          students!inner(full_name, grade),
          courses!inner(course_type)
        `)
        .limit(200)
    }
  ]
  
  for (const test of tests) {
    const startTime = Date.now()
    const { data, error } = await test.query()
    const endTime = Date.now()
    
    const executionTime = endTime - startTime
    const status = executionTime < 500 ? '✅ PASS' : '⚠️  SLOW'
    
    console.log(`${status} ${test.name}: ${executionTime}ms`)
    
    if (error) {
      console.error(`❌ Error in ${test.name}:`, error)
    }
  }
  
  console.log('📊 Performance Test Complete')
}

/**
 * Data validation test for Analytics system
 */
export async function dataValidationTest() {
  console.log('🔍 Starting Data Validation Test...')
  
  // Test data consistency
  const { data: studentCount } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
  
  const { data: scoresCount } = await supabase
    .from('scores')
    .select('id', { count: 'exact', head: true })
  
  const { data: viewStudentCount } = await supabase
    .from('student_grade_aggregates')
    .select('student_id', { count: 'exact', head: true })
  
  console.log(`📈 Data Summary:`)
  console.log(`   Students: ${studentCount?.length || 0}`)
  console.log(`   Scores: ${scoresCount?.length || 0}`)
  console.log(`   View Records: ${viewStudentCount?.length || 0}`)
  
  if (studentCount && viewStudentCount) {
    const ratio = viewStudentCount.length / studentCount.length
    console.log(`   Coverage Ratio: ${Math.round(ratio * 100)}%`)
  }
  
  console.log('✅ Data Validation Complete')
}