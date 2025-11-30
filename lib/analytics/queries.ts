/**
 * Analytics Query Builder and Report Generator
 * Provides high-level analytics queries for common reporting needs
 */

import { createClient } from '@/lib/supabase/client'
import { analyticsEngine } from './core'
import {
  AnalyticsFilters,
  AnalyticsTimeRange,
  StudentLearningMetrics,
  TeacherPerformanceMetrics,
  ClassComparisonMetrics,
  SchoolOverviewMetrics,
  AnalyticsReport,
  StudentProgressTimeline
} from './types'

/**
 * Analytics Query Service
 */
export class AnalyticsQueries {
  private supabase = createClient()

  /**
   * Generate default time range for current semester
   */
  public getCurrentSemesterRange(): AnalyticsTimeRange {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    // Assume semester starts in August (month 7) or January (month 0)
    let startDate: Date
    let endDate: Date

    if (currentMonth >= 7) {
      // Fall semester
      startDate = new Date(currentYear, 7, 1) // August 1st
      endDate = new Date(currentYear + 1, 0, 31) // January 31st next year
    } else {
      // Spring semester  
      startDate = new Date(currentYear, 0, 1) // January 1st
      endDate = new Date(currentYear, 6, 31) // July 31st
    }

    return {
      startDate: startDate.toISOString().split('T')[0] as string,
      endDate: endDate.toISOString().split('T')[0] as string,
      period: 'semester'
    }
  }

  /**
   * Get student learning analytics for multiple students
   */
  public async getStudentAnalytics(
    studentIds: string[],
    filters?: Partial<AnalyticsFilters>
  ): Promise<StudentLearningMetrics[]> {
    const defaultFilters: AnalyticsFilters = {
      timeRange: this.getCurrentSemesterRange(),
      ...filters
    }

    const results = await Promise.all(
      studentIds.map(id => analyticsEngine.calculateStudentMetrics(id, defaultFilters))
    )

    return results.filter(result => result !== null) as StudentLearningMetrics[]
  }

  /**
   * Get class analytics for multiple classes
   */
  public async getClassAnalytics(
    classIds: string[],
    filters?: Partial<AnalyticsFilters>
  ): Promise<ClassComparisonMetrics[]> {
    const defaultFilters: AnalyticsFilters = {
      timeRange: this.getCurrentSemesterRange(),
      ...filters
    }

    const results = await Promise.all(
      classIds.map(id => analyticsEngine.calculateClassMetrics(id, defaultFilters))
    )

    return results.filter(result => result !== null) as ClassComparisonMetrics[]
  }

  /**
   * Get teacher performance analytics
   */
  public async getTeacherAnalytics(
    teacherId: string,
    filters?: Partial<AnalyticsFilters>
  ): Promise<TeacherPerformanceMetrics | null> {
    const defaultFilters: AnalyticsFilters = {
      timeRange: this.getCurrentSemesterRange(),
      ...filters
    }

    try {
      // Get teacher info and classes
      const { data: teacher, error: teacherError } = await this.supabase
        .from('users')
        .select(`
          id,
          full_name,
          teacher_type,
          courses(
            id,
            course_type,
            classes(
              id,
              name,
              grade,
              track,
              students(count)
            )
          )
        `)
        .eq('id', teacherId)
        .eq('role', 'teacher')
        .single()

      if (teacherError || !teacher) {
        console.error('Error fetching teacher:', teacherError)
        return null
      }

      // Get all classes taught by this teacher
      const classIds = teacher.courses?.map(c => c.classes?.id).filter(Boolean) || []
      const totalStudents = teacher.courses?.reduce((sum, course) => {
        return sum + (course.classes?.students?.length || 0)
      }, 0) || 0

      // Get class analytics for all teacher's classes
      const classAnalytics = await this.getClassAnalytics(classIds, defaultFilters)
      
      if (classAnalytics.length === 0) {
        return null
      }

      // Calculate aggregated metrics
      const averageClassPerformance = classAnalytics.reduce((sum, cls) => sum + cls.averageScore, 0) / classAnalytics.length
      const overallPassRate = classAnalytics.reduce((sum, cls) => sum + cls.passRate, 0) / classAnalytics.length

      // Get exam and grading statistics
      const { data: examStats } = await this.supabase
        .from('exams')
        .select('id, created_at, exam_date')
        .in('class_id', classIds)
        .gte('exam_date', defaultFilters.timeRange.startDate)
        .lte('exam_date', defaultFilters.timeRange.endDate)

      const result: TeacherPerformanceMetrics = {
        teacherId: teacher.id,
        teacherName: teacher.full_name || 'Unknown',
        teacherType: teacher.teacher_type || 'LT',
        
        classesCount: classIds.length,
        studentsCount: totalStudents || 0,
        averageClassPerformance: Math.round(averageClassPerformance * 100) / 100,
        passRate: Math.round(overallPassRate * 100) / 100,
        
        studentImprovementRate: 0, // Would need more complex calculation
        consistencyScore: 0,       // Would need variance calculation across classes
        engagementRate: 0,         // Would need assignment submission data
        
        examsCreated: examStats?.length || 0,
        scoresEntered: 0, // Simplified without RPC call
        averageGradingTime: 0, // Simplified without RPC call
        
        gradeRankPercentile: 50,    // Placeholder - needs comparative analysis
        subjectRankPercentile: 50,  // Placeholder - needs comparative analysis
        
        monthlyPerformance: [] // Would need time-series data
      }

      return result

    } catch (error) {
      console.error('Error calculating teacher analytics:', error)
      return null
    }
  }

  /**
   * Get school overview analytics
   */
  public async getSchoolAnalytics(
    filters?: Partial<AnalyticsFilters>
  ): Promise<SchoolOverviewMetrics | null> {
    const defaultFilters: AnalyticsFilters = {
      timeRange: this.getCurrentSemesterRange(),
      ...filters
    }

    try {
      // Get overall counts
      const [
        { count: totalStudents },
        { count: totalTeachers },
        { count: totalClasses },
        { count: totalExams }
      ] = await Promise.all([
        this.supabase.from('students').select('*', { count: 'exact' }).eq('is_active', true),
        this.supabase.from('users').select('*', { count: 'exact' }).eq('role', 'teacher'),
        this.supabase.from('classes').select('*', { count: 'exact' }).eq('is_active', true),
        this.supabase.from('exams').select('*', { count: 'exact' })
          .gte('exam_date', defaultFilters.timeRange.startDate)
          .lte('exam_date', defaultFilters.timeRange.endDate)
      ])

      // Get all active classes for analytics
      const { data: allClasses } = await this.supabase
        .from('classes')
        .select('id, grade, track')
        .eq('is_active', true)

      if (!allClasses) {
        return null
      }

      // Calculate class analytics for school overview
      const classAnalytics = await this.getClassAnalytics(
        allClasses.map(c => c.id),
        defaultFilters
      )

      const schoolAverageScore = classAnalytics.length > 0
        ? classAnalytics.reduce((sum, cls) => sum + cls.averageScore, 0) / classAnalytics.length
        : 0

      const overallPassRate = classAnalytics.length > 0
        ? classAnalytics.reduce((sum, cls) => sum + cls.passRate, 0) / classAnalytics.length
        : 0

      // Calculate grade performance
      const gradePerformance = []
      for (let grade = 1; grade <= 6; grade++) {
        const gradeClasses = classAnalytics.filter(cls => cls.grade === grade)
        if (gradeClasses.length > 0) {
          const gradeAverage = gradeClasses.reduce((sum, cls) => sum + cls.averageScore, 0) / gradeClasses.length
          const gradePassRate = gradeClasses.reduce((sum, cls) => sum + cls.passRate, 0) / gradeClasses.length
          const studentsCount = gradeClasses.reduce((sum, cls) => sum + cls.studentsCount, 0)

          gradePerformance.push({
            grade,
            studentsCount,
            averageScore: Math.round(gradeAverage * 100) / 100,
            passRate: Math.round(gradePassRate * 100) / 100,
            trend: 'stable' as const // Would need historical data
          })
        }
      }

      // Calculate track performance
      const trackPerformance = ['local', 'international'].map(track => {
        const trackClasses = classAnalytics.filter(cls => cls.track === track)
        if (trackClasses.length === 0) {
          return {
            track: track as 'local' | 'international',
            studentsCount: 0,
            averageScore: 0,
            passRate: 0,
            classesCount: 0
          }
        }

        const trackAverage = trackClasses.reduce((sum, cls) => sum + cls.averageScore, 0) / trackClasses.length
        const trackPassRate = trackClasses.reduce((sum, cls) => sum + cls.passRate, 0) / trackClasses.length
        const studentsCount = trackClasses.reduce((sum, cls) => sum + cls.studentsCount, 0)

        return {
          track: track as 'local' | 'international',
          studentsCount,
          averageScore: Math.round(trackAverage * 100) / 100,
          passRate: Math.round(trackPassRate * 100) / 100,
          classesCount: trackClasses.length
        }
      })

      // Teacher summary by type
      const { data: teachersByType } = await this.supabase
        .from('users')
        .select('teacher_type, id')
        .eq('role', 'teacher')
        .not('teacher_type', 'is', null)

      const teacherSummary = ['LT', 'IT', 'KCFS'].map(type => {
        const typeTeachers = teachersByType?.filter(t => t.teacher_type === type) || []
        return {
          teacherType: type as 'LT' | 'IT' | 'KCFS',
          teachersCount: typeTeachers.length,
          averageClassPerformance: schoolAverageScore, // Simplified
          totalStudents: Math.round((totalStudents ?? 0) / 3) // Simplified assumption
        }
      })

      const result: SchoolOverviewMetrics = {
        totalStudents: totalStudents || 0,
        totalTeachers: totalTeachers || 0,
        totalClasses: totalClasses || 0,
        totalExams: totalExams || 0,
        
        schoolAverageScore: Math.round(schoolAverageScore * 100) / 100,
        overallPassRate: Math.round(overallPassRate * 100) / 100,
        improvementRate: 0, // Would need historical comparison
        
        gradePerformance,
        trackPerformance,
        teacherSummary,
        
        monthlyTrends: [] // Would need time-series implementation
      }

      return result

    } catch (error) {
      console.error('Error calculating school analytics:', error)
      return null
    }
  }

  /**
   * Generate student progress timeline
   */
  public async getStudentTimeline(
    studentId: string,
    filters?: Partial<AnalyticsFilters>
  ): Promise<StudentProgressTimeline | null> {
    const defaultFilters: AnalyticsFilters = {
      timeRange: this.getCurrentSemesterRange(),
      ...filters
    }

    try {
      // Get all scores for the student in chronological order
      const { data: scores, error } = await this.supabase
        .from('scores')
        .select(`
          score,
          assessment_code,
          exams!inner(
            id,
            name,
            exam_date,
            courses!inner(
              course_type
            )
          )
        `)
        .eq('student_id', studentId)
        .gte('exams.exam_date', defaultFilters.timeRange.startDate)
        .lte('exams.exam_date', defaultFilters.timeRange.endDate)
        .not('score', 'is', null)
        .gt('score', 0)

      if (error || !scores) {
        console.error('Error fetching student timeline:', error)
        return null
      }

      // Calculate percentiles for each assessment (simplified)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const assessments = scores.map((score) => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        examId: (score.exams as any).id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        examName: (score.exams as any).name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        examDate: (score.exams as any).exam_date,
        score: score.score || 0,
        assessmentCode: score.assessment_code,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        courseType: (score.exams as any).courses.course_type as 'LT' | 'IT' | 'KCFS',
        percentile: 50 // Simplified - would need class comparison
      }))

      // Generate milestones based on score patterns
      const milestones = []
      for (let i = 1; i < scores.length; i++) {
        const current = scores[i]?.score ?? 0
        const previous = scores[i - 1]?.score ?? 0
        const improvement = current - previous

        if (improvement >= 10) {
          milestones.push({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            date: (scores[i]?.exams as any)?.exam_date ?? '',
            event: 'grade_improvement' as const,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            description: `Improved by ${improvement} points in ${(scores[i]?.exams as any)?.name ?? 'Unknown'}`,
            impact: 'positive' as const
          })
        } else if (improvement <= -10) {
          milestones.push({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            date: (scores[i]?.exams as any)?.exam_date ?? '',
            event: 'concern' as const,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            description: `Declined by ${Math.abs(improvement)} points in ${(scores[i]?.exams as any)?.name ?? 'Unknown'}`,
            impact: 'negative' as const
          })
        }
      }

      // Add achievement milestones for consistently high performance
      const recentHighScores = scores.slice(-3).filter(s => (s.score || 0) >= 90)
      if (recentHighScores.length === 3) {
        milestones.push({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          date: (recentHighScores[2].exams as any).exam_date,
          event: 'achievement' as const,
          description: 'Maintained excellent performance across recent assessments',
          impact: 'positive' as const
        })
      }

      return {
        studentId,
        assessments,
        milestones: milestones.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      }

    } catch (error) {
      console.error('Error generating student timeline:', error)
      return null
    }
  }

  /**
   * Generate comprehensive analytics report
   */
  public async generateReport(
    type: 'student' | 'teacher' | 'class' | 'school',
    targetIds: string[],
    filters?: Partial<AnalyticsFilters>,
    generatedBy: string = 'system'
  ): Promise<AnalyticsReport | null> {
    const defaultFilters: AnalyticsFilters = {
      timeRange: this.getCurrentSemesterRange(),
      ...filters
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any
      const keyInsights: string[] = []
      const recommendations: string[] = []

      switch (type) {
        case 'student':
          data = await this.getStudentAnalytics(targetIds, defaultFilters)
          // Generate insights for student data
          const avgPerformance = data.reduce((sum: number, s: StudentLearningMetrics) => sum + (s.overallAverage || 0), 0) / data.length
          keyInsights.push(`Average performance: ${avgPerformance.toFixed(1)}`)
          keyInsights.push(`${data.filter((s: StudentLearningMetrics) => s.atRisk).length} students at risk`)
          break

        case 'class':
          data = await this.getClassAnalytics(targetIds, defaultFilters)
          const classAvg = data.reduce((sum: number, c: ClassComparisonMetrics) => sum + c.averageScore, 0) / data.length
          keyInsights.push(`Class average: ${classAvg.toFixed(1)}`)
          break

        case 'school':
          data = await this.getSchoolAnalytics(defaultFilters)
          if (data) {
            keyInsights.push(`School average: ${data.schoolAverageScore}`)
            keyInsights.push(`Overall pass rate: ${data.overallPassRate}%`)
          }
          break

        default:
          return null
      }

      return {
        id: `report_${Date.now()}`,
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Analytics Report`,
        type,
        generatedAt: new Date().toISOString(),
        generatedBy,
        filters: defaultFilters,
        data,
        summary: {
          keyInsights,
          recommendations,
          dataQuality: data && Array.isArray(data) && data.length > 0 ? 'good' : 'poor',
          sampleSize: Array.isArray(data) ? data.length : 1
        }
      }

    } catch (error) {
      console.error('Error generating report:', error)
      return null
    }
  }
}

// Export singleton instance
export const analyticsQueries = new AnalyticsQueries()