import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock Supabase service client
const mockSupabaseService = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn()
    })),
    upsert: vi.fn(() => ({
      select: vi.fn()
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn()
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn()
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => mockSupabaseService,
  createClient: () => ({
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: 'dev-admin-user-id' } },
        error: null
      }))
    },
    from: vi.fn(() => mockSupabaseService.from())
  })
}))

vi.mock('@/lib/import/clean-batch-processor', () => ({
  executeCleanImport: vi.fn()
}))

// Import the API route handler and mocked function
import { POST } from '@/app/api/import/route'
import { executeCleanImport } from '@/lib/import/clean-batch-processor'

const mockExecuteCleanImport = vi.mocked(executeCleanImport)

describe('Scores API - Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set NODE_ENV to development for bypass
    process.env.NODE_ENV = 'development'
  })

  describe('POST /api/import', () => {
    it('should validate required fields in bulk scores import', async () => {
      const invalidPayload = {
        // Missing required fields: validationResults and userId
      }

      const request = new NextRequest('http://localhost:3000/api/import', {
        method: 'POST',
        body: JSON.stringify(invalidPayload),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toContain('Missing required fields')
    })

    it('should handle valid bulk scores import with mock data', async () => {
      // Mock successful import
      mockExecuteCleanImport.mockResolvedValue({
        success: true,
        summary: {
          processed: 1,
          created: 1,
          updated: 0,
          errors: 0
        },
        errors: [],
        warnings: []
      })

      const validPayload = {
        validationResults: {
          users: [{ id: 'dev-admin-user-id', name: 'Test Admin', role: 'admin' }],
          classes: [{ id: 'class-1', name: 'G1 Test Class' }],
          students: [{ id: 'student-1', name: 'Test Student' }],
          courses: [{ id: 'course-1', name: 'LT English Language Arts (ELA)' }],
          exams: [{ id: 'exam-1', name: 'FA1 Test' }],
          scores: [
            {
              student_id: 'student-1',
              exam_id: 'exam-1',
              assessment_code: 'FA1',
              score: 85.5,
              entered_by: 'dev-admin-user-id'
            }
          ]
        },
        userId: 'dev-admin-user-id'
      }

      const request = new NextRequest('http://localhost:3000/api/import', {
        method: 'POST',
        body: JSON.stringify(validPayload),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(mockExecuteCleanImport).toHaveBeenCalledWith(
        validPayload.validationResults,
        'dev-admin-user-id'
      )
    })

    it('should handle import processing errors', async () => {
      // Mock import failure
      mockExecuteCleanImport.mockResolvedValue({
        success: false,
        summary: {
          processed: 1,
          created: 0,
          updated: 0,
          errors: 1
        },
        errors: ['Database connection failed'],
        warnings: []
      })

      const validPayload = {
        validationResults: {
          users: [{ id: 'dev-admin-user-id', name: 'Test Admin', role: 'admin' }],
          scores: []
        },
        userId: 'dev-admin-user-id'
      }

      const request = new NextRequest('http://localhost:3000/api/import', {
        method: 'POST',
        body: JSON.stringify(validPayload),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Database connection failed')
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/import', {
        method: 'POST',
        body: 'invalid json{',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      
      expect(response.status).toBe(500)
      // The API returns a generic error message for malformed JSON
      const result = await response.json()
      expect(result.error).toBe('Import failed')
    })
  })

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      // Mock unexpected error
      mockExecuteCleanImport.mockRejectedValue(new Error('Unexpected error'))

      const validPayload = {
        validationResults: { users: [], scores: [] },
        userId: 'dev-admin-user-id'
      }

      const request = new NextRequest('http://localhost:3000/api/import', {
        method: 'POST',
        body: JSON.stringify(validPayload),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Import failed')
      expect(result.success).toBe(false)
    })
  })
})