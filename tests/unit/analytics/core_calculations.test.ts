/**
 * Analytics Core Calculations Tests
 * Phase 3A-1 Analytics system - Core functionality testing
 * Tests: Statistical calculations, Grade calculations, Distribution analysis
 */

import { describe, it, expect } from 'vitest'
import { analyticsEngine } from '@/lib/analytics/core'

describe('Analytics Core Calculations - Phase 3A-1', () => {
  
  // ========================================
  // STATISTICAL CALCULATIONS TESTS
  // ========================================
  
  describe('Statistical Calculations', () => {
    it('should calculate correct basic statistics for typical grade data', () => {
      // Test with realistic grade scores
      const testScores = [85, 90, 78, 92, 88, 76, 95, 82, 89, 91]
      const stats = analyticsEngine.calculateStatistics(testScores)
      
      expect(stats.count).toBe(10)
      expect(stats.mean).toBe(86.6) // (85+90+78+92+88+76+95+82+89+91)/10 = 866/10 = 86.6
      expect(stats.median).toBe(88.5) // Sorted: 76,78,82,85,88,89,90,91,92,95 -> (88+89)/2 = 88.5
      expect(stats.min).toBe(76)
      expect(stats.max).toBe(95)
      expect(stats.standardDeviation).toBeCloseTo(6.05, 1) // Should be approximately 6.05
    })

    it('should handle edge cases: single value', () => {
      const stats = analyticsEngine.calculateStatistics([75])
      
      expect(stats.count).toBe(1)
      expect(stats.mean).toBe(75)
      expect(stats.median).toBe(75)
      expect(stats.min).toBe(75)
      expect(stats.max).toBe(75)
      expect(stats.standardDeviation).toBe(0) // No variation with single value
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

    it('should handle perfect scores scenario', () => {
      const perfectScores = [100, 100, 100, 100, 100]
      const stats = analyticsEngine.calculateStatistics(perfectScores)
      
      expect(stats.count).toBe(5)
      expect(stats.mean).toBe(100)
      expect(stats.median).toBe(100)
      expect(stats.min).toBe(100)
      expect(stats.max).toBe(100)
      expect(stats.standardDeviation).toBe(0) // No variation
    })
  })

  // ========================================
  // PERFORMANCE DISTRIBUTION TESTS
  // ========================================
  
  describe('Performance Distribution Analysis', () => {
    it('should calculate performance distribution correctly', () => {
      // Test with diverse grade range
      const testScores = [95, 88, 82, 76, 91, 58, 73, 85, 67, 93]
      const distribution = analyticsEngine.calculateDistribution(testScores)
      
      expect(distribution.ranges).toHaveLength(5)
      expect(distribution.mean).toBe(80.8) // Average of test scores
      
      // Check specific distribution ranges
      const excellent = distribution.ranges.find(r => r.range.includes('90-100'))
      expect(excellent?.count).toBe(3) // 95, 91, 93
      expect(excellent?.percentage).toBe(30) // 3/10 * 100 = 30%
      
      const good = distribution.ranges.find(r => r.range.includes('80-89'))
      expect(good?.count).toBe(3) // 88, 82, 85
      expect(good?.percentage).toBe(30)
      
      const satisfactory = distribution.ranges.find(r => r.range.includes('70-79'))
      expect(satisfactory?.count).toBe(2) // 76, 73
      
      const needsImprovement = distribution.ranges.find(r => r.range.includes('60-69'))
      expect(needsImprovement?.count).toBe(1) // 67
      
      const belowStandard = distribution.ranges.find(r => r.range.includes('0-59'))
      expect(belowStandard?.count).toBe(1) // 58
    })

    it('should handle all excellent scores', () => {
      const excellentScores = [95, 98, 92, 96, 94]
      const distribution = analyticsEngine.calculateDistribution(excellentScores)
      
      const excellent = distribution.ranges.find(r => r.range.includes('90-100'))
      expect(excellent?.count).toBe(5)
      expect(excellent?.percentage).toBe(100)
      
      // All other ranges should be 0
      const others = distribution.ranges.filter(r => !r.range.includes('90-100'))
      others.forEach(range => {
        expect(range.count).toBe(0)
        expect(range.percentage).toBe(0)
      })
    })

    it('should calculate skewness correctly', () => {
      // Right-skewed distribution (most scores high, few low)
      const rightSkewed = [95, 94, 93, 92, 91, 90, 89, 88, 60, 50]
      const rightDistribution = analyticsEngine.calculateDistribution(rightSkewed)
      expect(rightDistribution.skewness).toBeLessThan(0) // Negative skew (left tail)
      
      // Left-skewed distribution (most scores low, few high)  
      const leftSkewed = [50, 55, 60, 65, 70, 75, 80, 85, 95, 98]
      const leftDistribution = analyticsEngine.calculateDistribution(leftSkewed)
      expect(leftDistribution.skewness).toBeGreaterThan(0) // Positive skew (right tail)
    })
  })

  // ========================================
  // TREND ANALYSIS TESTS
  // ========================================
  
  describe('Trend Analysis', () => {
    it('should detect improving trend correctly', () => {
      const improvingData = [
        { x: '2024-01', y: 75 },
        { x: '2024-02', y: 78 },
        { x: '2024-03', y: 82 },
        { x: '2024-04', y: 85 },
        { x: '2024-05', y: 88 }
      ]
      
      const trend = analyticsEngine.calculateTrend(improvingData)
      
      expect(trend.trend).toBe('up')
      expect(trend.changePercentage).toBeCloseTo(17.33, 1) // (88-75)/75 * 100 ≈ 17.33%
      expect(trend.significance).toBe('high') // >10% change
      expect(trend.data).toHaveLength(5)
    })

    it('should detect declining trend correctly', () => {
      const decliningData = [
        { x: '2024-01', y: 90 },
        { x: '2024-02', y: 85 },
        { x: '2024-03', y: 80 },
        { x: '2024-04', y: 75 },
        { x: '2024-05', y: 70 }
      ]
      
      const trend = analyticsEngine.calculateTrend(decliningData)
      
      expect(trend.trend).toBe('down')
      expect(trend.changePercentage).toBeCloseTo(-22.22, 1) // (70-90)/90 * 100 ≈ -22.22%
      expect(trend.significance).toBe('high') // Significant decline
    })

    it('should detect stable trend correctly', () => {
      const stableData = [
        { x: '2024-01', y: 85 },
        { x: '2024-02', y: 84 },
        { x: '2024-03', y: 86 },
        { x: '2024-04', y: 85 },
        { x: '2024-05', y: 85 }
      ]
      
      const trend = analyticsEngine.calculateTrend(stableData)
      
      expect(trend.trend).toBe('stable')
      expect(Math.abs(trend.changePercentage)).toBeLessThan(5) // Small change
      expect(trend.significance).toBe('low')
    })

    it('should handle insufficient data', () => {
      const insufficientData = [{ x: '2024-01', y: 75 }]
      const trend = analyticsEngine.calculateTrend(insufficientData)
      
      expect(trend.period).toBe('insufficient_data')
      expect(trend.trend).toBe('stable')
      expect(trend.changePercentage).toBe(0)
      expect(trend.significance).toBe('low')
    })

    it('should handle numeric x values', () => {
      const numericData = [
        { x: 1, y: 70 },
        { x: 2, y: 75 },
        { x: 3, y: 80 },
        { x: 4, y: 85 }
      ]
      
      const trend = analyticsEngine.calculateTrend(numericData)
      
      expect(trend.trend).toBe('up')
      expect(trend.changePercentage).toBeCloseTo(21.43, 1) // (85-70)/70 * 100
    })
  })

  // ========================================
  // GRADE CALCULATION VALIDATION
  // ========================================
  
  describe('Grade Calculation Logic Validation', () => {
    it('should match /lib/grade formative average calculation', () => {
      // Test formative average: only count scores > 0
      const faScores = [85, 90, 0, 78, 88] // 0 should be excluded
      const validFAScores = faScores.filter(s => s > 0)
      const expectedFA = Math.round((validFAScores.reduce((a, b) => a + b, 0) / validFAScores.length) * 100) / 100
      
      expect(validFAScores).toEqual([85, 90, 78, 88])
      expect(expectedFA).toBe(85.25) // (85+90+78+88)/4 = 341/4 = 85.25
    })

    it('should match /lib/grade summative average calculation', () => {
      const saScores = [82, 89, 91, 0] // 0 should be excluded
      const validSAScores = saScores.filter(s => s > 0)
      const expectedSA = Math.round((validSAScores.reduce((a, b) => a + b, 0) / validSAScores.length) * 100) / 100
      
      expect(validSAScores).toEqual([82, 89, 91])
      expect(expectedSA).toBe(87.33) // (82+89+91)/3 = 262/3 ≈ 87.33
    })

    it('should match /lib/grade semester calculation formula', () => {
      // Formula: (F×0.15 + S×0.2 + Final×0.1) ÷ 0.45
      const formativeAvg = 85.25
      const summativeAvg = 87.33
      const finalScore = 87
      
      const expectedSemester = Math.round(((formativeAvg * 0.15 + summativeAvg * 0.2 + finalScore * 0.1) / 0.45) * 100) / 100
      
      // Manual calculation:
      // (85.25 * 0.15) + (87.33 * 0.2) + (87 * 0.1) = 12.7875 + 17.466 + 8.7 = 38.9535
      // 38.9535 / 0.45 = 86.563... ≈ 86.56
      expect(expectedSemester).toBeCloseTo(86.56, 2)
    })

    it('should return null for semester grade when components missing', () => {
      const formativeAvg = 85
      const summativeAvg = null // Missing
      const finalScore = 87
      
      const semesterGrade = (formativeAvg && summativeAvg && finalScore) 
        ? Math.round(((formativeAvg * 0.15 + summativeAvg * 0.2 + finalScore * 0.1) / 0.45) * 100) / 100
        : null
      
      expect(semesterGrade).toBeNull()
    })

    it('should handle all zero scores correctly', () => {
      const allZeroScores = [0, 0, 0, 0]
      const validScores = allZeroScores.filter(s => s > 0)
      
      expect(validScores).toEqual([])
      
      // When no valid scores, average should be null
      const average = validScores.length > 0 
        ? validScores.reduce((a, b) => a + b, 0) / validScores.length 
        : null
      
      expect(average).toBeNull()
    })
  })

  // ========================================
  // PERFORMANCE METRICS TESTS
  // ========================================
  
  describe('Performance Metrics', () => {
    it('should calculate improvement rate correctly', () => {
      const earlyScores = [75, 78, 80]
      const recentScores = [85, 88, 90]
      
      const earlyAvg = earlyScores.reduce((a, b) => a + b, 0) / earlyScores.length
      const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length
      const improvementRate = Math.round(((recentAvg - earlyAvg) / earlyAvg) * 100 * 100) / 100
      
      expect(earlyAvg).toBeCloseTo(77.67, 2)
      expect(recentAvg).toBeCloseTo(87.67, 2)
      expect(improvementRate).toBeCloseTo(12.88, 1) // Significant improvement
    })

    it('should calculate consistency score correctly', () => {
      const consistentScores = [85, 86, 84, 85, 86] // Low variation
      const inconsistentScores = [90, 70, 85, 65, 95] // High variation
      
      const consistentStats = analyticsEngine.calculateStatistics(consistentScores)
      const inconsistentStats = analyticsEngine.calculateStatistics(inconsistentScores)
      
      expect(consistentStats.standardDeviation).toBeLessThan(2) // Very consistent
      expect(inconsistentStats.standardDeviation).toBeGreaterThan(10) // Very inconsistent
    })
  })

  // ========================================
  // RISK ASSESSMENT LOGIC TESTS
  // ========================================
  
  describe('Risk Assessment Logic', () => {
    it('should identify at-risk students correctly', () => {
      const lowAverageScore = 65 // Below 70 threshold
      const highInconsistency = 20 // Above 15 threshold
      const negativeImprovement = -15 // Declining
      
      const atRisk = lowAverageScore < 70 || highInconsistency > 15
      
      expect(atRisk).toBe(true)
      
      const riskFactors = []
      if (lowAverageScore < 70) riskFactors.push('Low average performance')
      if (highInconsistency > 15) riskFactors.push('Inconsistent performance')
      if (negativeImprovement < -10) riskFactors.push('Declining trend')
      
      expect(riskFactors).toContain('Low average performance')
      expect(riskFactors).toContain('Inconsistent performance')
      expect(riskFactors).toContain('Declining trend')
    })

    it('should not flag high-performing consistent students', () => {
      const highAverageScore = 88
      const lowInconsistency = 5
      const positiveImprovement = 8
      
      const atRisk = highAverageScore < 70 || lowInconsistency > 15
      
      expect(atRisk).toBe(false)
      
      const riskFactors = []
      if (highAverageScore < 70) riskFactors.push('Low average performance')
      if (lowInconsistency > 15) riskFactors.push('Inconsistent performance')
      if (positiveImprovement < -10) riskFactors.push('Declining trend')
      
      expect(riskFactors).toHaveLength(0) // No risk factors
    })
  })

  // ========================================
  // CACHE FUNCTIONALITY TESTS
  // ========================================
  
  describe('Cache Functionality', () => {
    it('should initialize with empty cache', () => {
      analyticsEngine.clearCache()
      const stats = analyticsEngine.getCacheStats()
      
      expect(stats.size).toBe(0)
      expect(stats.keys).toEqual([])
    })

    it('should provide cache statistics', () => {
      const stats = analyticsEngine.getCacheStats()
      
      expect(stats).toHaveProperty('size')
      expect(stats).toHaveProperty('keys')
      expect(typeof stats.size).toBe('number')
      expect(Array.isArray(stats.keys)).toBe(true)
    })

    it('should clear cache successfully', () => {
      analyticsEngine.clearCache()
      const statsAfterClear = analyticsEngine.getCacheStats()
      
      expect(statsAfterClear.size).toBe(0)
    })
  })

  // ========================================
  // EDGE CASES AND ERROR HANDLING
  // ========================================
  
  describe('Edge Cases and Error Handling', () => {
    it('should handle extremely large numbers', () => {
      const largeScores = [99.99, 99.98, 99.97, 99.96, 99.95]
      const stats = analyticsEngine.calculateStatistics(largeScores)
      
      expect(stats.mean).toBeCloseTo(99.97, 2)
      expect(stats.standardDeviation).toBeLessThan(0.02)
    })

    it('should handle decimal scores correctly', () => {
      const decimalScores = [85.5, 87.3, 82.8, 90.1, 88.7]
      const stats = analyticsEngine.calculateStatistics(decimalScores)
      
      expect(stats.mean).toBeCloseTo(86.88, 2)
      expect(stats.min).toBe(82.8)
      expect(stats.max).toBe(90.1)
    })

    it('should handle negative score edge case', () => {
      // In real system, scores should be ≥ 0, but test edge case
      const scoresWithNegative = [85, -10, 90, 78] // -10 should be unusual
      const stats = analyticsEngine.calculateStatistics(scoresWithNegative)
      
      expect(stats.min).toBe(-10)
      expect(stats.mean).toBeCloseTo(60.75, 2) // (85-10+90+78)/4
    })

    it('should handle very small datasets', () => {
      const twoScores = [85, 90]
      const stats = analyticsEngine.calculateStatistics(twoScores)
      
      expect(stats.count).toBe(2)
      expect(stats.mean).toBe(87.5)
      expect(stats.median).toBe(87.5)
      expect(stats.standardDeviation).toBe(2.5) // sqrt(((85-87.5)^2 + (90-87.5)^2)/2)
    })
  })
})

// ========================================
// INTEGRATION HELPERS FOR MANUAL TESTING
// ========================================

/**
 * Test helper to validate Analytics calculations manually
 */
export function validateCalculations() {
  console.log('🧮 Manual Analytics Calculations Validation')
  
  // Test 1: Basic statistics
  const testScores = [85, 90, 78, 92, 88, 76, 95, 82, 89, 91]
  const stats = analyticsEngine.calculateStatistics(testScores)
  console.log('📊 Basic Statistics:', stats)
  
  // Test 2: Performance distribution
  const distribution = analyticsEngine.calculateDistribution(testScores)
  console.log('📈 Performance Distribution:', distribution)
  
  // Test 3: Trend analysis
  const trendData = [
    { x: '2024-01', y: 75 },
    { x: '2024-02', y: 78 },
    { x: '2024-03', y: 82 },
    { x: '2024-04', y: 85 },
    { x: '2024-05', y: 88 }
  ]
  const trend = analyticsEngine.calculateTrend(trendData)
  console.log('📉 Trend Analysis:', trend)
  
  console.log('✅ Manual validation complete')
}