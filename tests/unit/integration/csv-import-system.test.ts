import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { executeCleanImport, executeCleanDryRun } from '@/lib/import/clean-batch-processor'

// Mock file system operations
const mockFs = {
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => true)
}

vi.mock('fs', () => mockFs)

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
    delete: vi.fn(() => ({
      eq: vi.fn()
    }))
  })),
  rpc: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => mockSupabaseService
}))

describe('CSV Import System - Integration Tests', () => {
  let batchProcessor: CleanBatchProcessor
  let csvParser: CSVParser
  let importExecutor: ImportExecutor

  beforeEach(() => {
    vi.clearAllMocks()
    batchProcessor = new CleanBatchProcessor()
    csvParser = new CSVParser()
    importExecutor = new ImportExecutor()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Complete Import Workflow', () => {
    it('should process a full 4-stage import successfully', async () => {
      // Stage 1: Users CSV
      const usersCSV = `email,full_name,role,teacher_type,grade,track
admin@kangchiao.com,System Admin,admin,,,
ht.g1.local@kangchiao.com,Head Teacher G1 Local,head,,1,local
lt.teacher.g1@kangchiao.com,LT Teacher G1,teacher,LT,1,local`

      // Stage 2: Classes CSV
      const classesCSV = `name,grade,level,track,academic_year
G1 Trailblazers,1,E1,local,2024-25
G1 Discoverers,1,E2,local,2024-25`

      // Stage 3: Students CSV
      const studentsCSV = `student_id,full_name,grade,level,track,class_name
S001,John Doe,1,E1,local,G1 Trailblazers
S002,Jane Smith,1,E2,local,G1 Discoverers`

      // Stage 4: Scores CSV
      const scoresCSV = `student_id,class_name,assessment_code,score,teacher_email
S001,G1 Trailblazers,FA1,85,lt.teacher.g1@kangchiao.com
S001,G1 Trailblazers,SA1,88,lt.teacher.g1@kangchiao.com
S002,G1 Discoverers,FA1,92,lt.teacher.g1@kangchiao.com`

      // Mock successful responses for each stage
      const mockUsersResponse = { data: [{ id: 'user-1' }, { id: 'user-2' }, { id: 'user-3' }], error: null }
      const mockClassesResponse = { data: [{ id: 'class-1' }, { id: 'class-2' }], error: null }
      const mockStudentsResponse = { data: [{ id: 'student-1' }, { id: 'student-2' }], error: null }
      const mockScoresResponse = { data: [{ id: 'score-1' }, { id: 'score-2' }, { id: 'score-3' }], error: null }

      mockSupabaseService.from().upsert().select
        .mockResolvedValueOnce(mockUsersResponse)
        .mockResolvedValueOnce(mockClassesResponse)
        .mockResolvedValueOnce(mockStudentsResponse)
        .mockResolvedValueOnce(mockScoresResponse)

      // Execute import workflow
      const stage1Result = await batchProcessor.processStage('users', usersCSV)
      expect(stage1Result.success).toBe(true)
      expect(stage1Result.recordsProcessed).toBe(3)

      const stage2Result = await batchProcessor.processStage('classes', classesCSV)
      expect(stage2Result.success).toBe(true)
      expect(stage2Result.recordsProcessed).toBe(2)

      const stage3Result = await batchProcessor.processStage('students', studentsCSV)
      expect(stage3Result.success).toBe(true)
      expect(stage3Result.recordsProcessed).toBe(2)

      const stage4Result = await batchProcessor.processStage('scores', scoresCSV)
      expect(stage4Result.success).toBe(true)
      expect(stage4Result.recordsProcessed).toBe(3)

      // Verify all database operations were called correctly
      expect(mockSupabaseService.from).toHaveBeenCalledWith('users')
      expect(mockSupabaseService.from).toHaveBeenCalledWith('classes')
      expect(mockSupabaseService.from).toHaveBeenCalledWith('students')
      expect(mockSupabaseService.from).toHaveBeenCalledWith('scores')
    })

    it('should validate data integrity across stages', async () => {
      // Test that references between stages are validated
      const usersCSV = `email,full_name,role,teacher_type,grade,track
teacher1@kangchiao.com,Teacher One,teacher,LT,1,local`

      const classesCSV = `name,grade,level,track,academic_year
G1 Trailblazers,1,E1,local,2024-25`

      const studentsCSV = `student_id,full_name,grade,level,track,class_name
S001,Student One,1,E1,local,G1 Trailblazers`

      // Invalid scores CSV - references non-existent student
      const invalidScoresCSV = `student_id,class_name,assessment_code,score,teacher_email
S999,G1 Trailblazers,FA1,85,teacher1@kangchiao.com`

      // Mock responses
      mockSupabaseService.from().upsert().select
        .mockResolvedValueOnce({ data: [{ id: 'user-1' }], error: null })
        .mockResolvedValueOnce({ data: [{ id: 'class-1' }], error: null })
        .mockResolvedValueOnce({ data: [{ id: 'student-1' }], error: null })

      // Mock validation error for invalid student reference
      mockSupabaseService.from().select().eq.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Student S999 not found' }
      })

      await batchProcessor.processStage('users', usersCSV)
      await batchProcessor.processStage('classes', classesCSV)
      await batchProcessor.processStage('students', studentsCSV)

      const invalidResult = await batchProcessor.processStage('scores', invalidScoresCSV)
      
      expect(invalidResult.success).toBe(false)
      expect(invalidResult.errors).toContain('Student S999 not found')
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle partial failures gracefully', async () => {
      const mixedValidityCSV = `email,full_name,role,teacher_type,grade,track
valid@kangchiao.com,Valid User,teacher,LT,1,local
invalid-email,Invalid User,teacher,LT,1,local
another.valid@kangchiao.com,Another Valid,teacher,IT,2,international`

      // Mock partial success response
      const partialResponse = { 
        data: [{ id: 'user-1' }, { id: 'user-3' }], 
        error: null 
      }
      
      mockSupabaseService.from().upsert().select.mockResolvedValueOnce(partialResponse)

      const result = await batchProcessor.processStage('users', mixedValidityCSV)
      
      expect(result.success).toBe(true) // Partial success
      expect(result.recordsProcessed).toBe(2) // Only valid records
      expect(result.warnings).toBeDefined()
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should provide detailed error reporting', async () => {
      const invalidCSV = `email,full_name,role
,Missing Email,admin
invalid@email,Valid Email,invalid_role
valid@kangchiao.com,Valid User,admin`

      const result = await csvParser.parseAndValidate(invalidCSV, 'users')
      
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Row 2: email is required')
      expect(result.errors).toContain('Row 3: invalid role')
      expect(result.validRecords.length).toBe(1) // Only the valid record
    })

    it('should handle database connection failures', async () => {
      const validCSV = `email,full_name,role
admin@kangchiao.com,Admin User,admin`

      // Mock database failure
      const dbError = { message: 'Connection timeout', code: 'PGRST116' }
      mockSupabaseService.from().upsert().select.mockResolvedValueOnce({ 
        data: null, 
        error: dbError 
      })

      const result = await batchProcessor.processStage('users', validCSV)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Connection timeout')
    })
  })

  describe('Grade Calculation Integration', () => {
    it('should trigger grade recalculation after score imports', async () => {
      const scoresCSV = `student_id,class_name,assessment_code,score,teacher_email
S001,G1 Trailblazers,FA1,85,teacher@kangchiao.com
S001,G1 Trailblazers,SA1,90,teacher@kangchiao.com
S001,G1 Trailblazers,FINAL,88,teacher@kangchiao.com`

      // Mock successful score import
      mockSupabaseService.from().upsert().select.mockResolvedValueOnce({ 
        data: [{ id: 'score-1' }, { id: 'score-2' }, { id: 'score-3' }], 
        error: null 
      })

      // Mock grade calculation trigger
      mockSupabaseService.rpc.mockResolvedValueOnce({ 
        data: { semester_grade: 89.22 }, 
        error: null 
      })

      const result = await batchProcessor.processStage('scores', scoresCSV)
      
      expect(result.success).toBe(true)
      expect(mockSupabaseService.rpc).toHaveBeenCalledWith(
        'calculate_student_grades', 
        { student_id: 'S001' }
      )
    })

    it('should validate assessment codes during import', async () => {
      const invalidScoresCSV = `student_id,class_name,assessment_code,score,teacher_email
S001,G1 Trailblazers,INVALID_CODE,85,teacher@kangchiao.com`

      const result = await csvParser.parseAndValidate(invalidScoresCSV, 'scores')
      
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Invalid assessment code: INVALID_CODE')
    })

    it('should enforce score range validation (0-100)', async () => {
      const invalidScoresCSV = `student_id,class_name,assessment_code,score,teacher_email
S001,G1 Trailblazers,FA1,150,teacher@kangchiao.com
S002,G1 Trailblazers,SA1,-10,teacher@kangchiao.com`

      const result = await csvParser.parseAndValidate(invalidScoresCSV, 'scores')
      
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Score must be between 0 and 100: 150')
      expect(result.errors).toContain('Score must be between 0 and 100: -10')
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle large CSV files efficiently', async () => {
      // Generate a large CSV with 1000 records
      const headerRow = 'student_id,full_name,grade,level,track,class_name'
      const dataRows = Array.from({ length: 1000 }, (_, i) => 
        `S${(i + 1).toString().padStart(3, '0')},Student ${i + 1},${Math.floor(i / 167) + 1},E1,local,G1 Class A`
      )
      const largeCSV = [headerRow, ...dataRows].join('\n')

      // Mock successful batch processing
      mockSupabaseService.from().upsert().select.mockResolvedValue({ 
        data: Array.from({ length: 1000 }, (_, i) => ({ id: `student-${i + 1}` })), 
        error: null 
      })

      const startTime = Date.now()
      const result = await batchProcessor.processStage('students', largeCSV)
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(result.recordsProcessed).toBe(1000)
      expect(endTime - startTime).toBeLessThan(10000) // Should complete within 10 seconds
    })

    it('should batch database operations for efficiency', async () => {
      const studentsCSV = `student_id,full_name,grade,level,track,class_name
${Array.from({ length: 100 }, (_, i) => 
  `S${(i + 1).toString().padStart(3, '0')},Student ${i + 1},1,E1,local,G1 Class A`
).join('\n')}`

      mockSupabaseService.from().upsert().select.mockResolvedValue({ 
        data: Array.from({ length: 100 }, (_, i) => ({ id: `student-${i + 1}` })), 
        error: null 
      })

      await batchProcessor.processStage('students', studentsCSV)

      // Should use batch operations, not individual inserts
      expect(mockSupabaseService.from().upsert).toHaveBeenCalledTimes(1) // Single batch operation
    })
  })
})