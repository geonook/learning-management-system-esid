/**
 * Analytics Type Definitions for Primary School LMS
 * Comprehensive types for learning analytics and reporting system
 */

// Base analytics interfaces
export interface AnalyticsTimeRange {
  startDate: string // ISO date string
  endDate: string   // ISO date string
  period: 'day' | 'week' | 'month' | 'semester' | 'year' | 'custom'
}

export interface AnalyticsFilters {
  grades?: number[]
  tracks?: ('local' | 'international')[]
  classes?: string[]
  teachers?: string[]
  courseTypes?: ('LT' | 'IT' | 'KCFS')[]
  students?: string[]
  timeRange: AnalyticsTimeRange
}

// Student Analytics Types
export interface StudentLearningMetrics {
  studentId: string
  studentName: string
  grade: number
  track: 'local' | 'international'
  classId: string
  className: string
  
  // Academic Performance
  overallAverage: number | null
  formativeAverage: number | null
  summativeAverage: number | null
  semesterGrade: number | null
  
  // Progress Metrics
  improvementRate: number // Percentage improvement over time
  consistency: number     // Score variance metric (lower = more consistent)
  engagement: number      // Participation/submission rate
  
  // Risk Indicators
  atRisk: boolean
  riskFactors: string[]
  interventionNeeded: boolean
  
  // Trends
  performanceTrend: 'improving' | 'declining' | 'stable'
  recentScores: number[]
  timeStamps: string[]
}

export interface StudentProgressTimeline {
  studentId: string
  assessments: Array<{
    examId: string
    examName: string
    examDate: string
    score: number
    assessmentCode: string
    courseType: 'LT' | 'IT' | 'KCFS'
    percentile: number // Student's rank within class
  }>
  milestones: Array<{
    date: string
    event: 'grade_improvement' | 'consistent_performance' | 'achievement' | 'concern'
    description: string
    impact: 'positive' | 'negative' | 'neutral'
  }>
}

// Teacher Analytics Types
export interface TeacherPerformanceMetrics {
  teacherId: string
  teacherName: string
  teacherType: 'LT' | 'IT' | 'KCFS'
  
  // Class Performance
  classesCount: number
  studentsCount: number
  averageClassPerformance: number
  passRate: number // Percentage of students passing (>= 70%)
  
  // Teaching Effectiveness
  studentImprovementRate: number // Average improvement across all students
  consistencyScore: number       // How consistent are student outcomes
  engagementRate: number          // Assignment submission rate
  
  // Workload Metrics
  examsCreated: number
  scoresEntered: number
  averageGradingTime: number // Days between exam and score entry
  
  // Comparative Metrics
  gradeRankPercentile: number    // Performance vs other teachers in same grade
  subjectRankPercentile: number  // Performance vs other teachers of same type
  
  // Trend Data
  monthlyPerformance: Array<{
    month: string
    averageScore: number
    passRate: number
    studentsCount: number
  }>
}

export interface ClassComparisonMetrics {
  classId: string
  className: string
  grade: number
  track: 'local' | 'international'
  studentsCount: number
  
  // Performance Metrics
  averageScore: number
  medianScore: number
  standardDeviation: number
  passRate: number
  
  // Course-specific Performance
  ltPerformance: number | null
  itPerformance: number | null
  kcfsPerformance: number | null
  
  // Ranking
  gradeRank: number    // Rank within same grade
  schoolRank: number   // Rank within entire school
  trackRank: number    // Rank within same track
  
  // Distribution
  scoreDistribution: Array<{
    range: string // e.g., "90-100", "80-89"
    count: number
    percentage: number
  }>
}

// Administrative Analytics Types
export interface SchoolOverviewMetrics {
  totalStudents: number
  totalTeachers: number
  totalClasses: number
  totalExams: number
  
  // Overall Performance
  schoolAverageScore: number
  overallPassRate: number
  improvementRate: number
  
  // Grade Performance
  gradePerformance: Array<{
    grade: number
    studentsCount: number
    averageScore: number
    passRate: number
    trend: 'improving' | 'declining' | 'stable'
  }>
  
  // Track Performance
  trackPerformance: Array<{
    track: 'local' | 'international'
    studentsCount: number
    averageScore: number
    passRate: number
    classesCount: number
  }>
  
  // Teacher Performance Summary
  teacherSummary: Array<{
    teacherType: 'LT' | 'IT' | 'KCFS'
    teachersCount: number
    averageClassPerformance: number
    totalStudents: number
  }>
  
  // Recent Trends
  monthlyTrends: Array<{
    month: string
    averageScore: number
    passRate: number
    examCount: number
    alertCount: number
  }>
}

// Predictive Analytics Types
export interface LearningPrediction {
  studentId: string
  predictionType: 'semester_grade' | 'pass_likelihood' | 'improvement_potential'
  confidence: number // 0-1, how confident the model is
  prediction: number
  factors: Array<{
    factor: string
    impact: number    // -1 to 1, negative means hurting performance
    importance: number // 0-1, how important this factor is
  }>
  recommendations: string[]
  dataPoints: number // How many scores/assessments were used
}

export interface RiskAssessment {
  studentId: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskScore: number // 0-100
  primaryConcerns: string[]
  interventions: Array<{
    type: 'academic_support' | 'attendance_monitoring' | 'parent_conference' | 'peer_tutoring'
    priority: 'high' | 'medium' | 'low'
    description: string
    estimatedImpact: number // Expected improvement percentage
  }>
  timeline: {
    identifiedDate: string
    lastAssessment: string
    nextReview: string
  }
}

// Visualization Data Types
export interface ChartDataPoint {
  x: number | string
  y: number
  label?: string
  color?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
}

export interface TrendAnalysis {
  period: string
  data: ChartDataPoint[]
  trend: 'up' | 'down' | 'stable'
  changePercentage: number
  significance: 'high' | 'medium' | 'low' // Statistical significance
}

export interface PerformanceDistribution {
  ranges: Array<{
    min: number
    max: number
    range: string        // Format: "90-100", "80-89", etc.
    count: number
    percentage: number
    label: string
  }>
  mean: number
  median: number
  standardDeviation: number
  skewness: number // -1 to 1, indicates distribution shape
}

// Export all analytics types
export interface AnalyticsReport {
  id: string
  title: string
  type: 'student' | 'teacher' | 'class' | 'school' | 'predictive'
  generatedAt: string
  generatedBy: string
  filters: AnalyticsFilters
  data: StudentLearningMetrics[] | TeacherPerformanceMetrics[] | ClassComparisonMetrics[] | SchoolOverviewMetrics
  summary: {
    keyInsights: string[]
    recommendations: string[]
    dataQuality: 'excellent' | 'good' | 'fair' | 'poor'
    sampleSize: number
  }
}

// Query Builder Types
export interface AnalyticsQuery {
  queryId: string
  name: string
  description: string
  type: 'aggregation' | 'comparison' | 'trend' | 'prediction'
  sql?: string // Raw SQL for complex queries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parameters: Record<string, any>
  cacheDuration: number // Minutes to cache results
  permissions: ('admin' | 'head' | 'teacher')[]
}

export interface AnalyticsCache {
  queryId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any
  generatedAt: string
  expiresAt: string
  filters: AnalyticsFilters
  hitCount: number
}