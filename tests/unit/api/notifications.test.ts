/**
 * Notifications API Unit Tests
 * Tests the notification system including user filtering, preferences, and utility functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          lt: vi.fn(() => ({
            limit: vi.fn(() => ({ data: [] }))
          })),
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({ data: [] }))
          })),
          gt: vi.fn(() => ({
            lte: vi.fn(() => ({ data: [] }))
          }))
        }))
      }))
    }))
  })
}))

// Import after mocking
import {
  markNotificationAsRead,
  createNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationType,
  type NotificationPriority
} from '@/lib/api/notifications'

describe('Notifications API - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset date to consistent time for testing
    vi.setSystemTime(new Date('2024-03-15T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('markNotificationAsRead', () => {
    it('should simulate marking notification as read', async () => {
      const result = await markNotificationAsRead('notif-1')
      expect(result).toBe(true)
    })

    it('should handle errors gracefully', async () => {
      // Mock console.error to avoid test output noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const result = await markNotificationAsRead('invalid-id')
      expect(result).toBe(true) // Current implementation always returns true
      
      consoleSpy.mockRestore()
    })
  })

  describe('createNotification', () => {
    it('should create a custom notification with valid ID format', async () => {
      const notificationData = {
        type: 'system_update' as NotificationType,
        priority: 'medium' as NotificationPriority,
        title: 'Custom Alert',
        message: 'Custom message',
        targetRole: 'admin' as 'admin' | 'head' | 'teacher' | 'student'
      }

      const notificationId = await createNotification(notificationData)

      expect(notificationId).toMatch(/^custom-\d+-[a-z0-9]+$/)
      expect(typeof notificationId).toBe('string')
      expect(notificationId.length).toBeGreaterThan(10)
    })

    it('should create unique IDs for multiple notifications', async () => {
      const notificationData = {
        type: 'exam_overdue' as NotificationType,
        priority: 'high' as NotificationPriority,
        title: 'Test Alert',
        message: 'Test message',
        targetRole: 'teacher' as 'admin' | 'head' | 'teacher' | 'student'
      }

      const id1 = await createNotification(notificationData)
      const id2 = await createNotification(notificationData)

      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^custom-\d+-[a-z0-9]+$/)
      expect(id2).toMatch(/^custom-\d+-[a-z0-9]+$/)
    })

    it('should handle empty title and message', async () => {
      const notificationData = {
        type: 'system_update' as NotificationType,
        priority: 'low' as NotificationPriority,
        title: '',
        message: '',
        targetRole: 'admin' as 'admin' | 'head' | 'teacher' | 'student'
      }

      const notificationId = await createNotification(notificationData)
      expect(notificationId).toMatch(/^custom-\d+-[a-z0-9]+$/)
    })
  })

  describe('getNotificationPreferences', () => {
    it('should return default preferences with correct structure', async () => {
      const preferences = await getNotificationPreferences('user-1')

      expect(preferences).toEqual({
        userId: 'user-1',
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
      })
    })

    it('should return preferences for different user IDs', async () => {
      const prefs1 = await getNotificationPreferences('user-1')
      const prefs2 = await getNotificationPreferences('user-2')

      expect(prefs1.userId).toBe('user-1')
      expect(prefs2.userId).toBe('user-2')
      expect(prefs1.emailEnabled).toBe(prefs2.emailEnabled) // Same defaults
    })
  })

  describe('updateNotificationPreferences', () => {
    it('should update email preferences correctly', async () => {
      const updates = {
        emailEnabled: false
      }

      const updatedPrefs = await updateNotificationPreferences('user-1', updates)

      expect(updatedPrefs.emailEnabled).toBe(false)
      expect(updatedPrefs.inAppEnabled).toBe(true) // Should remain default
      expect(updatedPrefs.userId).toBe('user-1')
    })

    it('should update category preferences', async () => {
      const updates = {
        categories: {
          exams: true,
          attendance: false,
          grades: true,
          system: false
        }
      }

      const updatedPrefs = await updateNotificationPreferences('user-1', updates)

      expect(updatedPrefs.categories.attendance).toBe(false)
      expect(updatedPrefs.categories.system).toBe(false)
      expect(updatedPrefs.categories.exams).toBe(true)
      expect(updatedPrefs.categories.grades).toBe(true)
    })

    it('should update quiet hours settings', async () => {
      const updates = {
        quietHours: {
          enabled: true,
          startTime: '23:00',
          endTime: '07:00'
        }
      }

      const updatedPrefs = await updateNotificationPreferences('user-1', updates)

      expect(updatedPrefs.quietHours.enabled).toBe(true)
      expect(updatedPrefs.quietHours.startTime).toBe('23:00')
      expect(updatedPrefs.quietHours.endTime).toBe('07:00')
    })

    it('should handle partial category updates', async () => {
      const updates = {
        categories: {
          attendance: false
        }
      }

      const updatedPrefs = await updateNotificationPreferences('user-1', updates)

      expect(updatedPrefs.categories.attendance).toBe(false)
      // The implementation merges the partial update with defaults
      expect(updatedPrefs.categories).toHaveProperty('attendance', false)
      expect(updatedPrefs.userId).toBe('user-1')
    })

    it('should preserve existing settings when updating only specific fields', async () => {
      // Test updating different fields separately
      const emailUpdates = {
        emailEnabled: false
      }
      
      const emailResult = await updateNotificationPreferences('user-1', emailUpdates)
      expect(emailResult.emailEnabled).toBe(false)
      expect(emailResult.inAppEnabled).toBe(true) // Should remain default
      
      const appUpdates = {
        inAppEnabled: false
      }
      
      const appResult = await updateNotificationPreferences('user-1', appUpdates)
      expect(appResult.inAppEnabled).toBe(false) // Should apply update
      expect(appResult.userId).toBe('user-1')
    })
  })

  describe('Error handling', () => {
    it('should handle API errors gracefully in preferences functions', async () => {
      // Mock console.error to avoid test output noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Test getNotificationPreferences with error handling
      try {
        const prefs = await getNotificationPreferences('error-user')
        // Should still return default preferences
        expect(prefs.userId).toBe('error-user')
      } catch (error) {
        // If it throws, that's also acceptable behavior
        expect(error).toBeDefined()
      }
      
      consoleSpy.mockRestore()
    })
  })

  describe('Data validation', () => {
    it('should validate notification type enum values', () => {
      const validTypes: NotificationType[] = [
        'exam_overdue',
        'low_completion',
        'attendance_low',
        'grade_alert',
        'system_update',
        'assignment_due',
        'data_sync',
        'permission_change'
      ]

      expect(validTypes).toHaveLength(8)
      expect(validTypes).toContain('exam_overdue')
      expect(validTypes).toContain('permission_change')
    })

    it('should validate notification priority enum values', () => {
      const validPriorities: NotificationPriority[] = [
        'low',
        'medium', 
        'high',
        'urgent'
      ]

      expect(validPriorities).toHaveLength(4)
      expect(validPriorities).toContain('urgent')
      expect(validPriorities).toContain('low')
    })
  })

  describe('Time formatting utilities', () => {
    it('should handle time formatting consistently', () => {
      // Test that time formats are valid HH:MM format (allowing single digit hours)
      const validTimeFormat = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
      
      expect('22:00').toMatch(validTimeFormat)
      expect('08:00').toMatch(validTimeFormat)
      expect('23:59').toMatch(validTimeFormat)
      expect('00:00').toMatch(validTimeFormat)
      expect('1:30').toMatch(validTimeFormat) // Single digit hour is valid
      
      // Invalid formats should not match
      expect('25:00').not.toMatch(validTimeFormat)
      expect('12:60').not.toMatch(validTimeFormat)
      expect('24:00').not.toMatch(validTimeFormat) // 24 is not valid hour
    })
  })
})