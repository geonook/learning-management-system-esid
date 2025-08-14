/**
 * Dashboard Data API for Primary School LMS
 * Provides real Supabase queries to replace mock data
 * Supports admin/head/teacher role-based data access
 */

import { createClient } from '@/lib/supabase/client'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import { 
  calculateGrades, 
  calcFormativeAvg, 
  calcSummativeAvg, 
  getFinalScore,
  calcSemesterGrade,
  isValidScore
} from '@/lib/grade/calculations'

// Types for dashboard data structures
export interface DashboardStudent {
  id: string
  student_id: string
  full_name: string
  grade: number
  level: 'E1' | 'E2' | 'E3' | null
  track: 'local' | 'international'
  class_name: string | null
  class_id: string | null
  is_active: boolean
}

export interface TeacherKpis {
  attendanceRate: number
  averageScore: number
  passRate: number
  activeAlerts: number
}

export interface AdminKpis {
  totalExams: number
  notDue: number
  overdue: number
  coverage: number
  onTime: number
}

export interface ClassDistribution {
  bucket: string
  count: number
}

export interface ScatterPoint {
  x: number
  y: number
  z: number
}

export interface UpcomingDeadline {
  id: string
  title: string
  due_at: string
}

export interface RecentAlert {
  id: string
  message: string
  when: string
}

/**
 * Get students data based on user role and permissions
 */
export async function getDashboardStudents(
  userRole: 'admin' | 'head' | 'teacher' | 'student',
  userId?: string,
  grade?: number,
  track?: 'local' | 'international'
): Promise<DashboardStudent[]> {
  const supabase = createClient()
  
  try {
    let query = supabase
      .from('students')
      .select(`
        id,
        student_id,
        full_name,
        grade,
        level,
        track,
        is_active,
        class_id,
        classes!inner(
          id,
          name,
          grade,
          track,
          is_active
        )
      `)
      .eq('is_active', true)
      .eq('classes.is_active', true)

    // Apply role-based filtering
    if (userRole === 'head' && grade && track) {
      query = query
        .eq('grade', grade)
        .eq('track', track)
    } else if (userRole === 'teacher' && userId) {
      // Get teacher's class IDs first
      const { data: teacherCourses } = await supabase
        .from('courses')
        .select('class_id')
        .eq('teacher_id', userId)
        .eq('is_active', true)

      const classIds = (teacherCourses || []).map(course => course.class_id)
      if (classIds.length > 0) {
        query = query.in('class_id', classIds)
      } else {
        return [] // No classes assigned
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching dashboard students:', error)
      return []
    }

    return (data || []).map((student: any) => ({
      id: student.id,
      student_id: student.student_id,
      full_name: student.full_name,
      grade: student.grade,
      level: student.level,
      track: student.track,
      class_name: student.classes?.name || null,
      class_id: student.class_id,
      is_active: student.is_active
    }))

  } catch (error) {
    console.error('Exception in getDashboardStudents:', error)
    return []
  }
}

/**
 * Get teacher KPIs based on their assigned classes and courses
 */
export async function getTeacherKpis(teacherId: string): Promise<TeacherKpis> {
  const supabase = createClient()
  
  try {
    // Get teacher's courses and associated data
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select(`
        id,
        course_type,
        class_id,
        classes!inner(
          id,
          name,
          grade,
          track
        )
      `)
      .eq('teacher_id', teacherId)
      .eq('is_active', true)
      .eq('classes.is_active', true)

    if (coursesError || !courses) {
      console.error('Error fetching teacher courses:', coursesError)
      return { attendanceRate: 0, averageScore: 0, passRate: 0, activeAlerts: 0 }
    }

    const classIds = courses.map(course => course.class_id)
    
    // Get students in teacher's classes
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, class_id')
      .in('class_id', classIds)
      .eq('is_active', true)

    if (studentsError || !students) {
      console.error('Error fetching students:', studentsError)
      return { attendanceRate: 0, averageScore: 0, passRate: 0, activeAlerts: 0 }
    }

    const studentIds = students.map(s => s.id)

    // Get recent scores for grade calculations
    const { data: scores, error: scoresError } = await supabase
      .from('scores')
      .select(`
        student_id,
        assessment_code,
        score,
        exam_id,
        exams!inner(
          id,
          class_id
        )
      `)
      .in('student_id', studentIds)
      .in('exams.class_id', classIds)
      .gte('entered_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

    if (scoresError) {
      console.error('Error fetching scores:', scoresError)
    }

    const validScores = (scores || []).filter(score => isValidScore(score.score))
    
    // Calculate metrics
    const totalScores = validScores.length
    const averageScore = totalScores > 0 
      ? validScores.reduce((sum, score) => sum + (score.score || 0), 0) / totalScores
      : 0
    
    const passRate = totalScores > 0
      ? (validScores.filter(score => (score.score || 0) >= 60).length / totalScores) * 100
      : 0

    // Mock attendance rate and alerts for now (can be implemented later)
    const attendanceRate = Math.round(85 + Math.random() * 10)
    const activeAlerts = Math.floor(Math.random() * 3)

    return {
      attendanceRate,
      averageScore: Math.round(averageScore * 10) / 10,
      passRate: Math.round(passRate),
      activeAlerts
    }

  } catch (error) {
    console.error('Exception in getTeacherKpis:', error)
    return { attendanceRate: 0, averageScore: 0, passRate: 0, activeAlerts: 0 }
  }
}

/**
 * Get admin KPIs for whole school overview
 */
export async function getAdminKpis(): Promise<AdminKpis> {
  const supabase = createClient()
  
  try {
    // Get total exams count
    const { count: totalExams } = await supabase
      .from('exams')
      .select('*', { count: 'exact' })
      .eq('is_active', true)

    // Get exams due in next 7 days
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const { count: notDue } = await supabase
      .from('exams')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .lte('exam_date', nextWeek.toISOString().split('T')[0])

    // Get overdue exams (exam_date < today but no scores)
    const today = new Date().toISOString().split('T')[0]
    const { count: overdue } = await supabase
      .from('exams')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .lt('exam_date', today)

    // Calculate coverage (percentage of students with scores)
    const { data: studentsWithScores } = await supabase
      .from('scores')
      .select('student_id')
      .gte('entered_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    const { count: totalActiveStudents } = await supabase
      .from('students')
      .select('*', { count: 'exact' })
      .eq('is_active', true)

    const uniqueStudentsWithScores = new Set(
      (studentsWithScores || []).map(s => s.student_id)
    ).size

    const coverage = totalActiveStudents && totalActiveStudents > 0
      ? Math.round((uniqueStudentsWithScores / totalActiveStudents) * 100)
      : 0

    // Mock onTime percentage (can be refined later)
    const onTime = Math.round(70 + Math.random() * 20)

    return {
      totalExams: totalExams || 0,
      notDue: notDue || 0,
      overdue: overdue || 0,
      coverage,
      onTime
    }

  } catch (error) {
    console.error('Exception in getAdminKpis:', error)
    return { totalExams: 0, notDue: 0, overdue: 0, coverage: 0, onTime: 0 }
  }
}

/**
 * Get class score distribution for charts
 */
export async function getClassDistribution(
  userRole: 'admin' | 'head' | 'teacher' | 'student',
  userId?: string,
  grade?: number,
  track?: 'local' | 'international'
): Promise<ClassDistribution[]> {
  const supabase = createClient()

  try {
    let query = supabase
      .from('scores')
      .select(`
        score,
        exams!inner(
          class_id,
          classes!inner(
            grade,
            track,
            is_active
          )
        ),
        students!inner(
          id,
          is_active
        )
      `)
      .eq('exams.classes.is_active', true)
      .eq('students.is_active', true)
      .not('score', 'is', null)
      .gte('score', 0)
      .lte('score', 100)

    // Apply role-based filtering
    if (userRole === 'head' && grade && track) {
      query = query
        .eq('exams.classes.grade', grade)
        .eq('exams.classes.track', track)
    } else if (userRole === 'teacher' && userId) {
      // Get teacher's class IDs through courses
      const { data: teacherCourses } = await supabase
        .from('courses')
        .select('class_id')
        .eq('teacher_id', userId)
        .eq('is_active', true)

      const classIds = (teacherCourses || []).map(course => course.class_id)
      if (classIds.length > 0) {
        query = query.in('exams.class_id', classIds)
      } else {
        return [] // No classes assigned
      }
    }

    const { data: scores, error } = await query

    if (error) {
      console.error('Error fetching score distribution:', error)
      return []
    }

    // Create distribution buckets
    const distribution: ClassDistribution[] = []
    const buckets = ["0-10", "10-20", "20-30", "30-40", "40-50", "50-60", "60-70", "70-80", "80-90", "90-100"]
    
    for (const bucket of buckets) {
      distribution.push({ bucket, count: 0 })
    }

    // Count scores in each bucket
    if (scores && scores.length > 0) {
      scores.forEach((scoreData: any) => {
        const score = scoreData.score || 0
        const bucketIndex = Math.min(Math.floor(score / 10), 9)
        if (bucketIndex >= 0 && bucketIndex < 10 && distribution[bucketIndex]) {
          distribution[bucketIndex].count++
        }
      })
    }

    return distribution

  } catch (error) {
    console.error('Exception in getClassDistribution:', error)
    return []
  }
}

/**
 * Get upcoming deadlines for exams and assessments
 */
export async function getUpcomingDeadlines(
  userRole: 'admin' | 'head' | 'teacher' | 'student',
  userId?: string,
  grade?: number,
  track?: 'local' | 'international'
): Promise<UpcomingDeadline[]> {
  const supabase = createClient()

  try {
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    
    let query = supabase
      .from('exams')
      .select(`
        id,
        name,
        exam_date,
        class_id,
        classes!inner(
          name,
          grade,
          track,
          is_active
        )
      `)
      .eq('is_active', true)
      .eq('classes.is_active', true)
      .gte('exam_date', new Date().toISOString().split('T')[0])
      .lte('exam_date', nextWeek.toISOString().split('T')[0])
      .order('exam_date', { ascending: true })
      .limit(5)

    // Apply role-based filtering
    if (userRole === 'head' && grade && track) {
      query = query
        .eq('classes.grade', grade)
        .eq('classes.track', track)
    } else if (userRole === 'teacher' && userId) {
      const { data: teacherCourses } = await supabase
        .from('courses')
        .select('class_id')
        .eq('teacher_id', userId)
        .eq('is_active', true)

      const classIds = (teacherCourses || []).map(course => course.class_id)
      if (classIds.length > 0) {
        query = query.in('class_id', classIds)
      } else {
        return []
      }
    }

    const { data: exams, error } = await query

    if (error) {
      console.error('Error fetching upcoming deadlines:', error)
      return []
    }

    return (exams || []).map(exam => {
      const examDate = new Date(exam.exam_date)
      const today = new Date()
      const diffTime = examDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      let dueText = ''
      if (diffDays === 0) {
        dueText = 'Today'
      } else if (diffDays === 1) {
        dueText = 'Tomorrow'
      } else {
        dueText = `${diffDays} days`
      }

      return {
        id: exam.id,
        title: `${exam.name} (${exam.classes?.name})`,
        due_at: dueText
      }
    })

  } catch (error) {
    console.error('Exception in getUpcomingDeadlines:', error)
    return []
  }
}

/**
 * Get recent alerts and notifications
 */
export async function getRecentAlerts(
  userRole: 'admin' | 'head' | 'teacher' | 'student',
  userId?: string
): Promise<RecentAlert[]> {
  // For now, return static alerts similar to mock data
  // This can be enhanced with a proper notifications system later
  const alerts: RecentAlert[] = []

  try {
    const supabase = createClient()

    // Check for low score submissions in recent exams
    const { data: recentExams } = await supabase
      .from('exams')
      .select(`
        id,
        name,
        exam_date,
        classes!inner(
          id,
          name,
          grade,
          track
        )
      `)
      .eq('is_active', true)
      .eq('classes.is_active', true)
      .gte('exam_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .limit(5)

    for (const exam of recentExams || []) {
      const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact' })
        .eq('class_id', exam.classes.id)
        .eq('is_active', true)

      const { count: submittedScores } = await supabase
        .from('scores')
        .select('*', { count: 'exact' })
        .eq('exam_id', exam.id)

      if (totalStudents && submittedScores !== null) {
        const completionRate = (submittedScores / totalStudents) * 100
        
        if (completionRate < 70) {
          alerts.push({
            id: `alert-${exam.id}`,
            message: `Low completion rate (${Math.round(completionRate)}%) for ${exam.name} in ${exam.classes.name}`,
            when: '1 day ago'
          })
        }
      }
    }

    // Add some general alerts if none found
    if (alerts.length === 0) {
      alerts.push(
        {
          id: 'alert-general-1',
          message: 'All assessments up to date',
          when: '1 hour ago'
        }
      )
    }

    return alerts.slice(0, 3) // Limit to 3 most recent

  } catch (error) {
    console.error('Exception in getRecentAlerts:', error)
    return [
      {
        id: 'alert-error',
        message: 'Unable to fetch recent alerts',
        when: 'just now'
      }
    ]
  }
}

/**
 * Get scatter plot data for class performance analysis
 */
export async function getScatterData(
  userRole: 'admin' | 'head' | 'teacher' | 'student',
  userId?: string
): Promise<ScatterPoint[]> {
  // This is a placeholder implementation
  // Real implementation would analyze class averages vs coverage metrics
  return Array.from({ length: 12 }).map(() => ({
    x: Math.round(60 + Math.random() * 35), // Class average
    y: Math.round(70 + Math.random() * 30), // Submission coverage
    z: Math.round(15 + Math.random() * 20), // Class size
  }))
}