/**
 * Notifications System API for Primary School LMS
 * Handles real-time alerts, system notifications, and user preferences
 * Built on top of existing dashboard alerts infrastructure
 */

import { createClient } from '@/lib/supabase/client'

// Notification types for different system events
export type NotificationType = 
  | 'exam_overdue'           // Exams past due date with incomplete scores
  | 'low_completion'         // Score submission rates below threshold
  | 'attendance_low'         // Attendance below expected rate
  | 'grade_alert'            // Academic performance alerts
  | 'system_update'          // System maintenance or updates
  | 'assignment_due'         // Upcoming assessment deadlines
  | 'data_sync'              // CSV import/data synchronization
  | 'permission_change'      // User role or permission updates

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Notification {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  metadata?: Record<string, any> // Additional context data
  targetRole?: 'admin' | 'head' | 'teacher' | 'student'
  targetUserId?: string
  targetGrade?: number
  targetTrack?: 'local' | 'international' | null
  isRead: boolean
  isActive: boolean
  createdAt: string
  expiresAt?: string
}

export interface NotificationPreferences {
  userId: string
  emailEnabled: boolean
  inAppEnabled: boolean
  categories: {
    exams: boolean
    attendance: boolean
    grades: boolean
    system: boolean
  }
  quietHours: {
    enabled: boolean
    startTime: string // HH:MM format
    endTime: string   // HH:MM format
  }
}

/**
 * Generate notifications from system state analysis
 */
export async function generateSystemNotifications(): Promise<Notification[]> {
  const supabase = createClient()
  const notifications: Notification[] = []

  try {
    const now = new Date()
    const today = now.toISOString().split('T')[0]

    // 1. Check for overdue exams
    const { data: overdueExams } = await supabase
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
      .lt('exam_date', today)
      .limit(20)

    for (const exam of overdueExams || []) {
      const classData = exam.classes as unknown as { id: string; name: string; grade: number; track: string | null }

      // Check completion rate
      const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact' })
        .eq('class_id', classData.id)
        .eq('is_active', true)

      const { count: submittedScores } = await supabase
        .from('scores')
        .select('*', { count: 'exact' })
        .eq('exam_id', exam.id)

      const completionRate = totalStudents && totalStudents > 0
        ? (submittedScores || 0) / totalStudents * 100
        : 0

      if (completionRate < 80) { // Threshold for notification
        const daysOverdue = Math.floor((now.getTime() - new Date(exam.exam_date).getTime()) / (1000 * 60 * 60 * 24))

        notifications.push({
          id: `overdue-${exam.id}`,
          type: 'exam_overdue',
          priority: daysOverdue > 7 ? 'urgent' : daysOverdue > 3 ? 'high' : 'medium',
          title: 'Overdue Exam Submission',
          message: `${exam.name} in ${classData.name} is ${daysOverdue} days overdue with ${Math.round(completionRate)}% completion`,
          metadata: {
            examId: exam.id,
            examName: exam.name,
            className: classData.name,
            completionRate,
            daysOverdue
          },
          targetRole: 'admin',
          targetGrade: classData.grade,
          targetTrack: classData.track as 'local' | 'international' | null,
          isRead: false,
          isActive: true,
          createdAt: now.toISOString()
        })
      }
    }

    // 2. Check for low completion rates in recent exams
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
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
      .gte('exam_date', weekAgo)
      .lte('exam_date', today)

    for (const exam of recentExams || []) {
      const classData = exam.classes as unknown as { id: string; name: string; grade: number; track: string | null }

      const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact' })
        .eq('class_id', classData.id)
        .eq('is_active', true)

      const { count: submittedScores } = await supabase
        .from('scores')
        .select('*', { count: 'exact' })
        .eq('exam_id', exam.id)

      const completionRate = totalStudents && totalStudents > 0
        ? (submittedScores || 0) / totalStudents * 100
        : 0

      if (completionRate < 70) { // Lower threshold for recent exams
        notifications.push({
          id: `low-completion-${exam.id}`,
          type: 'low_completion',
          priority: completionRate < 50 ? 'high' : 'medium',
          title: 'Low Score Submission Rate',
          message: `${exam.name} in ${classData.name} has only ${Math.round(completionRate)}% score submission`,
          metadata: {
            examId: exam.id,
            examName: exam.name,
            className: classData.name,
            completionRate
          },
          targetRole: 'head',
          targetGrade: classData.grade,
          targetTrack: classData.track as 'local' | 'international' | null,
          isRead: false,
          isActive: true,
          createdAt: now.toISOString()
        })
      }
    }

    // 3. Check for upcoming assessment deadlines (next 3 days)
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const { data: upcomingExams } = await supabase
      .from('exams')
      .select(`
        id,
        name,
        exam_date,
        classes!inner(
          id,
          name,
          grade,
          track,
          courses!inner(
            teacher_id,
            course_type
          )
        )
      `)
      .eq('is_active', true)
      .gt('exam_date', today)
      .lte('exam_date', threeDaysFromNow)

    for (const exam of upcomingExams || []) {
      const classData = exam.classes as unknown as {
        id: string
        name: string
        grade: number
        track: string | null
        courses: Array<{ teacher_id: string | null; course_type: string }>
      }

      // Notify teachers about upcoming deadlines
      for (const course of classData.courses || []) {
        notifications.push({
          id: `deadline-${exam.id}-${course.teacher_id}`,
          type: 'assignment_due',
          priority: 'medium',
          title: 'Upcoming Assessment Deadline',
          message: `${exam.name} is due on ${exam.exam_date} for ${classData.name}`,
          metadata: {
            examId: exam.id,
            examName: exam.name,
            examDate: exam.exam_date,
            className: classData.name,
            courseType: course.course_type
          },
          targetRole: 'teacher',
          targetUserId: course.teacher_id || undefined,
          isRead: false,
          isActive: true,
          createdAt: now.toISOString(),
          expiresAt: exam.exam_date
        })
      }
    }

    return notifications

  } catch (error) {
    console.error('Error generating system notifications:', error)
    return []
  }
}

/**
 * Get notifications for a specific user
 */
export async function getUserNotifications(
  userId: string,
  userRole: 'admin' | 'head' | 'teacher' | 'student',
  grade?: number,
  track?: 'local' | 'international',
  limit: number = 20
): Promise<Notification[]> {
  try {
    // Generate fresh notifications based on current system state
    const allNotifications = await generateSystemNotifications()
    
    // Filter notifications based on user role and permissions
    const userNotifications = allNotifications.filter(notification => {
      // Global notifications for all users
      if (!notification.targetRole && !notification.targetUserId) {
        return true
      }
      
      // User-specific notifications
      if (notification.targetUserId === userId) {
        return true
      }
      
      // Role-based notifications
      if (notification.targetRole === userRole) {
        // Additional filtering for head teachers by grade/track
        if (userRole === 'head' && grade && track) {
          return notification.targetGrade === grade && notification.targetTrack === track
        }
        return true
      }
      
      return false
    })

    // Sort by priority and creation time
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
    userNotifications.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return userNotifications.slice(0, limit)

  } catch (error) {
    console.error('Error fetching user notifications:', error)
    return []
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    // In a real implementation, this would update a notifications table
    // For now, we simulate marking as read
    console.log(`Notification ${notificationId} marked as read`)
    return true
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return false
  }
}

/**
 * Get notification summary counts
 */
export async function getNotificationSummary(
  userId: string,
  userRole: 'admin' | 'head' | 'teacher' | 'student',
  grade?: number,
  track?: 'local' | 'international'
): Promise<{
  total: number
  unread: number
  byPriority: Record<NotificationPriority, number>
  byType: Record<NotificationType, number>
}> {
  try {
    const notifications = await getUserNotifications(userId, userRole, grade, track, 100)
    
    const summary = {
      total: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      byPriority: { urgent: 0, high: 0, medium: 0, low: 0 } as Record<NotificationPriority, number>,
      byType: {} as Record<NotificationType, number>
    }

    notifications.forEach(notification => {
      summary.byPriority[notification.priority]++
      summary.byType[notification.type] = (summary.byType[notification.type] || 0) + 1
    })

    return summary

  } catch (error) {
    console.error('Error getting notification summary:', error)
    return {
      total: 0,
      unread: 0,
      byPriority: { urgent: 0, high: 0, medium: 0, low: 0 },
      byType: {} as Record<NotificationType, number>
    }
  }
}

/**
 * Create a custom notification (for manual alerts)
 */
export async function createNotification(
  notification: Omit<Notification, 'id' | 'createdAt' | 'isRead' | 'isActive'>
): Promise<string> {
  try {
    const notificationId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // In a real implementation, this would be stored in the database
    console.log('Created notification:', { id: notificationId, ...notification })
    
    return notificationId
  } catch (error) {
    console.error('Error creating notification:', error)
    throw new Error('Failed to create notification')
  }
}

/**
 * Get notification preferences for a user
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  try {
    // Default preferences - in real implementation, fetch from database
    return {
      userId,
      emailEnabled: true,
      inAppEnabled: true,
      categories: {
        exams: true,
        attendance: true,
        grades: true,
        system: true
      },
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00'
      }
    }
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    throw new Error('Failed to fetch notification preferences')
  }
}

/**
 * Update notification preferences for a user
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  try {
    const currentPrefs = await getNotificationPreferences(userId)
    const updatedPrefs = { ...currentPrefs, ...preferences }
    
    // In real implementation, save to database
    console.log('Updated notification preferences:', updatedPrefs)
    
    return updatedPrefs
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    throw new Error('Failed to update notification preferences')
  }
}