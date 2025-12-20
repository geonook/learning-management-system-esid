/**
 * Core Analytics Engine for Primary School LMS
 * Provides foundational analytics calculations and data processing
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { createClient } from '@/lib/supabase/client'
import {
  AnalyticsFilters,
  AnalyticsTimeRange,
  StudentLearningMetrics,
  ClassComparisonMetrics,
  PerformanceDistribution,
  TrendAnalysis,
  ChartDataPoint
} from './types'

/**
 * Core Analytics Engine Class
 */
export class AnalyticsEngine {
  private supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cache = new Map<string, { data: any; expires: number }>()

  /**
   * Generate cache key for query
   */
  private getCacheKey(operation: string, filters: AnalyticsFilters): string {
    return `${operation}:${JSON.stringify(filters)}`
  }

  /**
   * Check cache for existing results
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (cached && cached.expires > Date.now()) {
      return cached.data as T
    }
    this.cache.delete(key)
    return null
  }

  /**
   * Store result in cache
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private setCache(key: string, data: any, ttlMinutes: number = 15): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttlMinutes * 60 * 1000)
    })
  }

  /**
   * Build date range condition for SQL queries
   */
  private buildDateCondition(timeRange: AnalyticsTimeRange, dateColumn: string = 'exam_date'): string {
    return `${dateColumn} >= '${timeRange.startDate}' AND ${dateColumn} <= '${timeRange.endDate}'`
  }

  /**
   * Calculate statistical measures for a dataset
   */
  public calculateStatistics(values: number[]): {
    mean: number
    median: number
    standardDeviation: number
    min: number
    max: number
    count: number
  } {
    if (values.length === 0) {
      return { mean: 0, median: 0, standardDeviation: 0, min: 0, max: 0, count: 0 }
    }

    const sorted = [...values].sort((a, b) => a - b)
    const count = values.length
    const mean = values.reduce((sum, val) => sum + val, 0) / count
    
    const median = count % 2 === 0 
      ? (sorted[count / 2 - 1]! + sorted[count / 2]!) / 2
      : sorted[Math.floor(count / 2)]!
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count
    const standardDeviation = Math.sqrt(variance)

    return {
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      min: sorted[0] || 0,
      max: sorted[count - 1] || 0,
      count
    }
  }

  /**
   * Calculate performance distribution (for LT/IT 0-100 scale)
   */
  public calculateDistribution(scores: number[]): PerformanceDistribution {
    const ranges = [
      { min: 90, max: 100, label: 'Excellent (90-100)' },
      { min: 80, max: 89, label: 'Good (80-89)' },
      { min: 70, max: 79, label: 'Satisfactory (70-79)' },
      { min: 60, max: 69, label: 'Needs Improvement (60-69)' },
      { min: 0, max: 59, label: 'Below Standard (0-59)' }
    ]

    const stats = this.calculateStatistics(scores)
    const distribution = ranges.map(range => {
      const count = scores.filter(score => score >= range.min && score <= range.max).length
      return {
        range: range.label,
        count,
        percentage: Math.round((count / (scores.length || 1)) * 100 * 100) / 100
      }
    })

    // Calculate skewness (measure of distribution asymmetry)
    const skewness = scores.length > 0 && stats.standardDeviation > 0
      ? scores.reduce((sum, score) => sum + Math.pow((score - stats.mean) / stats.standardDeviation, 3), 0) / scores.length
      : 0

    return {
      ranges: distribution.map(d => ({
        range: d.range,
        count: d.count,
        percentage: d.percentage
      })),
      mean: stats.mean,
      median: stats.median,
      standardDeviation: stats.standardDeviation,
      skewness: Math.round(skewness * 100) / 100
    }
  }

  /**
   * Calculate KCFS performance distribution (for 0-5 scale)
   * KCFS uses different ranges: 4.5-5 = Excellent, 4-4.5 = Good, etc.
   */
  public calculateKCFSDistribution(scores: number[]): PerformanceDistribution {
    const ranges = [
      { min: 4.5, max: 5, label: 'Excellent (4.5-5)' },
      { min: 4, max: 4.49, label: 'Good (4-4.5)' },
      { min: 3.5, max: 3.99, label: 'Satisfactory (3.5-4)' },
      { min: 3, max: 3.49, label: 'Pass (3-3.5)' },
      { min: 0, max: 2.99, label: 'Below Standard (0-3)' }
    ]

    const stats = this.calculateStatistics(scores)
    const distribution = ranges.map(range => {
      const count = scores.filter(score => score >= range.min && score <= range.max).length
      return {
        range: range.label,
        count,
        percentage: Math.round((count / (scores.length || 1)) * 100 * 100) / 100
      }
    })

    // Calculate skewness (measure of distribution asymmetry)
    const skewness = scores.length > 0 && stats.standardDeviation > 0
      ? scores.reduce((sum, score) => sum + Math.pow((score - stats.mean) / stats.standardDeviation, 3), 0) / scores.length
      : 0

    return {
      ranges: distribution.map(d => ({
        range: d.range,
        count: d.count,
        percentage: d.percentage
      })),
      mean: stats.mean,
      median: stats.median,
      standardDeviation: stats.standardDeviation,
      skewness: Math.round(skewness * 100) / 100
    }
  }

  /**
   * Calculate distribution based on course type
   * Automatically selects appropriate scale (0-100 for LT/IT, 0-5 for KCFS)
   */
  public calculateDistributionByCourseType(
    scores: number[],
    courseType: 'LT' | 'IT' | 'KCFS'
  ): PerformanceDistribution {
    if (courseType === 'KCFS') {
      return this.calculateKCFSDistribution(scores)
    }
    return this.calculateDistribution(scores)
  }

  /**
   * Calculate trend analysis for time series data
   */
  public calculateTrend(dataPoints: ChartDataPoint[]): TrendAnalysis {
    if (dataPoints.length < 2) {
      return {
        period: 'insufficient_data',
        data: dataPoints,
        trend: 'stable',
        changePercentage: 0,
        significance: 'low'
      }
    }

    // Sort by x value (assuming it's time-based)
    const sorted = [...dataPoints].sort((a, b) => {
      if (typeof a.x === 'string' && typeof b.x === 'string') {
        return new Date(a.x).getTime() - new Date(b.x).getTime()
      }
      return Number(a.x) - Number(b.x)
    })

    // Calculate linear regression for trend
    const n = sorted.length
    const sumX = sorted.reduce((sum, point, index) => sum + index, 0)
    const sumY = sorted.reduce((sum, point) => sum + point.y, 0)
    const sumXY = sorted.reduce((sum, point, index) => sum + (index * point.y), 0)
    const sumXX = sorted.reduce((sum, point, index) => sum + (index * index), 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const firstValue = sorted[0]?.y || 0
    const lastValue = sorted[n - 1]?.y || 0
    
    const changePercentage = firstValue !== 0 
      ? Math.round(((lastValue - firstValue) / firstValue) * 100 * 100) / 100
      : 0

    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (Math.abs(slope) > 0.1) { // Threshold for significant change
      trend = slope > 0 ? 'up' : 'down'
    }

    // Determine significance based on correlation strength
    let significance: 'high' | 'medium' | 'low' = 'low'
    if (Math.abs(changePercentage) > 10) significance = 'high'
    else if (Math.abs(changePercentage) > 5) significance = 'medium'

    return {
      period: `${sorted[0]?.x || 'start'}_to_${sorted[n - 1]?.x || 'end'}`,
      data: sorted,
      trend,
      changePercentage,
      significance
    }
  }

  /**
   * Get student scores with grade calculations
   * Uses nested join: exams -> courses to get course_type directly
   */
  private async getStudentScores(studentId: string, filters: AnalyticsFilters) {
    // Get scores with exam and course info using nested join
    const { data: rawScores, error } = await this.supabase
      .from('scores')
      .select(`
        score,
        assessment_code,
        exams!inner(
          id,
          name,
          exam_date,
          course_id,
          courses!inner(
            id,
            class_id,
            course_type,
            classes!inner(
              id,
              grade,
              track
            )
          )
        )
      `)
      .eq('student_id', studentId)
      .gte('exams.exam_date', filters.timeRange.startDate)
      .lte('exams.exam_date', filters.timeRange.endDate)
      .not('score', 'is', null)
      .gt('score', 0) // Only valid scores

    if (error || !rawScores) {
      console.error('Error fetching student scores:', error)
      return []
    }

    // Transform scores with course/class info from nested join
    return rawScores
      .filter(score => score.score !== null)
      .map(score => {
        type ExamData = {
          id: string;
          name: string;
          exam_date: string;
          course_id: string;
          courses: {
            id: string;
            class_id: string;
            course_type: string;
            classes: { id: string; grade: number; track: string | null };
          };
        };
        const exam = score.exams as unknown as ExamData
        const course = exam.courses
        const classData = course.classes

        const courseType = course.course_type
        const classInfo = { grade: classData.grade, track: classData.track }

        return {
          ...score,
          exams: {
            ...exam,
            course_type: courseType,
            class_grade: classInfo.grade,
            class_track: classInfo.track
          }
        }
      })
  }

  /**
   * Calculate student learning metrics
   */
  public async calculateStudentMetrics(
    studentId: string, 
    filters: AnalyticsFilters
  ): Promise<StudentLearningMetrics | null> {
    const cacheKey = this.getCacheKey(`student_metrics_${studentId}`, filters)
    const cached = this.getFromCache<StudentLearningMetrics>(cacheKey)
    if (cached) return cached

    try {
      // Get student basic info
      const { data: student, error: studentError } = await this.supabase
        .from('students')
        .select(`
          id,
          student_id,
          full_name,
          grade,
          track,
          class_id,
          classes(
            id,
            name
          )
        `)
        .eq('id', studentId)
        .single()

      if (studentError || !student) {
        console.error('Error fetching student:', studentError)
        return null
      }

      // Get student scores
      const scores = await this.getStudentScores(studentId, filters)
      
      // Calculate grade averages using simplified approach
      const validScores = scores.filter(s => s.score !== null && s.score > 0)
      let formativeAvg: number | null = null
      let summativeAvg: number | null = null
      let semesterGrade: number | null = null
      
      if (validScores.length > 0) {
        const formativeScores = validScores.filter(s => s.assessment_code.startsWith('FA')).map(s => s.score!)
        const summativeScores = validScores.filter(s => s.assessment_code.startsWith('SA')).map(s => s.score!)
        const finalScores = validScores.filter(s => s.assessment_code === 'FINAL').map(s => s.score!)
        
        if (formativeScores.length > 0) {
          formativeAvg = Math.round((formativeScores.reduce((a, b) => a + b, 0) / formativeScores.length) * 100) / 100
        }
        if (summativeScores.length > 0) {
          summativeAvg = Math.round((summativeScores.reduce((a, b) => a + b, 0) / summativeScores.length) * 100) / 100
        }
        if (formativeAvg !== null && summativeAvg !== null && finalScores.length > 0) {
          semesterGrade = Math.round(((formativeAvg * 0.15 + summativeAvg * 0.2 + finalScores[0] * 0.1) / 0.45) * 100) / 100
        }
      }

      // Calculate performance metrics
      const scoreValues = scores.map(s => s.score).filter(s => s !== null && s > 0) as number[]
      const stats = this.calculateStatistics(scoreValues)
      
      // Calculate improvement rate (compare first half vs second half of period)
      const midpoint = Math.floor(scores.length / 2)
      const earlyScores = scores.slice(0, midpoint).map(s => s.score).filter(s => s !== null) as number[]
      const recentScores = scores.slice(midpoint).map(s => s.score).filter(s => s !== null) as number[]
      
      const earlyAvg = earlyScores.length > 0 ? earlyScores.reduce((a, b) => a + b, 0) / earlyScores.length : 0
      const recentAvg = recentScores.length > 0 ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : 0
      const improvementRate = earlyAvg > 0 ? Math.round(((recentAvg - earlyAvg) / earlyAvg) * 100 * 100) / 100 : 0

      // Determine performance trend
      let performanceTrend: 'improving' | 'declining' | 'stable' = 'stable'
      if (improvementRate > 5) performanceTrend = 'improving'
      else if (improvementRate < -5) performanceTrend = 'declining'

      // Risk assessment
      const averageScore = stats.mean
      const consistency = stats.standardDeviation
      const atRisk = averageScore < 70 || consistency > 15
      
      const riskFactors = []
      if (averageScore < 70) riskFactors.push('Low average performance')
      if (consistency > 15) riskFactors.push('Inconsistent performance')
      if (improvementRate < -10) riskFactors.push('Declining trend')

      const result: StudentLearningMetrics = {
        studentId: student.id,
        studentName: student.full_name,
        grade: student.grade,
        track: student.track,
        classId: student.class_id || '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        className: (student.classes as any)?.name || 'Unknown',
        
        overallAverage: Math.round(averageScore * 100) / 100,
        formativeAverage: formativeAvg,
        summativeAverage: summativeAvg,
        semesterGrade: semesterGrade,
        
        improvementRate,
        consistency: Math.round((100 - consistency) * 100) / 100, // Invert so higher is better
        engagement: Math.round((scores.length / 20) * 100), // Assume 20 possible assessments
        
        atRisk,
        riskFactors,
        interventionNeeded: atRisk && riskFactors.length > 1,
        
        performanceTrend,
        recentScores: recentScores.slice(-5), // Last 5 scores
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        timeStamps: scores.slice(-5).map(s => (s.exams as any).exam_date)
      }

      this.setCache(cacheKey, result, 30) // Cache for 30 minutes
      return result

    } catch (error) {
      console.error('Error calculating student metrics:', error)
      return null
    }
  }

  /**
   * Calculate class comparison metrics
   */
  public async calculateClassMetrics(
    classId: string,
    filters: AnalyticsFilters
  ): Promise<ClassComparisonMetrics | null> {
    const cacheKey = this.getCacheKey(`class_metrics_${classId}`, filters)
    const cached = this.getFromCache<ClassComparisonMetrics>(cacheKey)
    if (cached) return cached

    try {
      // Get class info and students
      const { data: classData, error: classError } = await this.supabase
        .from('classes')
        .select(`
          id,
          name,
          grade,
          track,
          students(
            id,
            full_name
          )
        `)
        .eq('id', classId)
        .single()

      if (classError || !classData) {
        console.error('Error fetching class:', classError)
        return null
      }

      // Get all scores for students in this class
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const studentIds = (classData.students as any[]).map((s: any) => s.id)
      const allScores: number[] = []
      const courseScores: { LT: number[], IT: number[], KCFS: number[] } = { LT: [], IT: [], KCFS: [] }

      for (const studentId of studentIds) {
        const scores = await this.getStudentScores(studentId, filters)
        scores.forEach(score => {
          if (score.score !== null) {
            allScores.push(score.score)
            // course_type is now directly on exams object (fetched separately in getStudentScores)
            const courseType = (score.exams as { course_type: string | null }).course_type as 'LT' | 'IT' | 'KCFS' | null
            if (courseType && courseScores[courseType]) {
              courseScores[courseType].push(score.score)
            }
          }
        })
      }

      if (allScores.length === 0) {
        return null // No data available
      }

      const stats = this.calculateStatistics(allScores)
      const distribution = this.calculateDistribution(allScores)
      const passCount = allScores.filter(score => score >= 70).length
      const passRate = Math.round((passCount / allScores.length) * 100 * 100) / 100

      // Calculate course-specific averages
      const ltPerformance = courseScores.LT.length > 0 
        ? Math.round((courseScores.LT.reduce((a, b) => a + b, 0) / courseScores.LT.length) * 100) / 100
        : null
      const itPerformance = courseScores.IT.length > 0
        ? Math.round((courseScores.IT.reduce((a, b) => a + b, 0) / courseScores.IT.length) * 100) / 100
        : null
      const kcfsPerformance = courseScores.KCFS.length > 0
        ? Math.round((courseScores.KCFS.reduce((a, b) => a + b, 0) / courseScores.KCFS.length) * 100) / 100
        : null

      const result: ClassComparisonMetrics = {
        classId: classData.id,
        className: classData.name,
        grade: classData.grade,
        track: classData.track,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        studentsCount: (classData.students as any[]).length,
        
        averageScore: stats.mean,
        medianScore: stats.median,
        standardDeviation: stats.standardDeviation,
        passRate,
        
        ltPerformance,
        itPerformance,
        kcfsPerformance,
        
        // Rankings would need to be calculated against other classes
        gradeRank: 1, // Placeholder
        schoolRank: 1, // Placeholder
        trackRank: 1, // Placeholder
        
        scoreDistribution: distribution.ranges.map(r => ({
          range: r.range,
          count: r.count,
          percentage: r.percentage
        }))
      }

      this.setCache(cacheKey, result, 30)
      return result

    } catch (error) {
      console.error('Error calculating class metrics:', error)
      return null
    }
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  public clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Export singleton instance
export const analyticsEngine = new AnalyticsEngine()