/**
 * Data Import Types and Schemas for LMS-ESID
 * Defines the structure and validation for CSV data import
 */

import { z } from 'zod'

// Import data types matching database schema
export const UserImportSchema = z.object({
  email: z.string().email('Invalid email format'),
  full_name: z.string().min(1, 'Full name is required'),
  role: z.enum(['admin', 'head', 'teacher'], {
    errorMap: () => ({ message: 'Role must be admin, head, or teacher' })
  }),
  teacher_type: z.enum(['LT', 'IT', 'KCFS']).optional().nullable(),
  grade: z.number().int().min(1).max(6).optional().nullable(),
  track: z.enum(['local', 'international']).optional().nullable(),
  is_active: z.boolean().default(true)
})

export const ClassImportSchema = z.object({
  name: z.string().min(1, 'Class name is required').regex(
    /^G[1-6] (Trailblazers|Discoverers|Adventurers|Innovators|Explorers|Navigators|Inventors|Voyagers|Pioneers|Guardians|Pathfinders|Seekers|Visionaries|Achievers)$/,
    'Class name must follow format: G[1-6] [StandardClassName]'
  ),
  grade: z.number().int().min(1).max(6, 'Grade must be between 1 and 6'),
  level: z.enum(['E1', 'E2', 'E3'], {
    errorMap: () => ({ message: 'Level must be E1, E2, or E3' })
  }),
  track: z.enum(['local', 'international'], {
    errorMap: () => ({ message: 'Track must be local or international' })
  }),
  teacher_email: z.string().email('Invalid teacher email').optional().nullable(),
  academic_year: z.string().regex(/^\d{4}$/, 'Academic year must be YYYY format').default('2024'),
  is_active: z.boolean().default(true)
})

export const StudentImportSchema = z.object({
  student_id: z.string().min(1, 'Student ID is required'),
  full_name: z.string().min(1, 'Full name is required'),
  grade: z.number().int().min(1).max(6, 'Grade must be between 1 and 6'),
  level: z.enum(['E1', 'E2', 'E3'], {
    errorMap: () => ({ message: 'Level must be E1, E2, or E3' })
  }).optional().nullable(), // Inherited from class, but can be specified
  track: z.enum(['local', 'international'], {
    errorMap: () => ({ message: 'Track must be local or international' })
  }),
  class_name: z.string().optional().nullable(), // Will be mapped to class_id
  is_active: z.boolean().default(true)
})

export const ScoreImportSchema = z.object({
  student_id: z.string().min(1, 'Student ID is required'), // External student ID
  exam_name: z.string().min(1, 'Exam name is required'),
  assessment_code: z.enum([
    'FA1', 'FA2', 'FA3', 'FA4', 'FA5', 'FA6', 'FA7', 'FA8',
    'SA1', 'SA2', 'SA3', 'SA4', 'FINAL'
  ], {
    errorMap: () => ({ message: 'Invalid assessment code' })
  }),
  score: z.number().min(0).max(100, 'Score must be between 0 and 100'),
  entered_by_email: z.string().email('Invalid teacher email') // Will be mapped to entered_by UUID
})

// Inferred types
export type UserImport = z.infer<typeof UserImportSchema>
export type ClassImport = z.infer<typeof ClassImportSchema>
export type StudentImport = z.infer<typeof StudentImportSchema>
export type ScoreImport = z.infer<typeof ScoreImportSchema>

// Import validation result types
export interface ImportValidationResult<T> {
  valid: T[]
  invalid: ImportValidationError[]
  summary: {
    total: number
    valid: number
    invalid: number
    validPercent: number
  }
}

export interface ImportValidationError {
  row: number
  data: Record<string, any>
  errors: string[]
}

// Import execution result types
export interface ImportExecutionResult {
  success: boolean
  summary: {
    users: { created: number; updated: number; errors: number }
    classes: { created: number; updated: number; errors: number }
    students: { created: number; updated: number; errors: number }
    scores: { created: number; updated: number; errors: number }
  }
  errors: ImportExecutionError[]
  warnings: ImportExecutionWarning[]
}

export interface ImportExecutionError {
  stage: 'users' | 'classes' | 'students' | 'scores'
  operation: 'create' | 'update'
  data: Record<string, any>
  error: string
}

export interface ImportExecutionWarning {
  stage: 'users' | 'classes' | 'students' | 'scores'
  message: string
  data?: Record<string, any>
}

// CSV parsing options
export interface CSVParseOptions {
  delimiter?: string
  skipEmptyLines?: boolean
  skipLinesWithError?: boolean
  encoding?: 'utf8' | 'utf16le' | 'latin1'
  maxRows?: number
}

// Import stage configuration
export interface ImportStageConfig {
  stage: 'users' | 'classes' | 'students' | 'scores'
  schema: z.ZodSchema<any>
  requiredColumns: string[]
  optionalColumns: string[]
  dependencies: string[] // Which stages must complete first
}

// File upload types
export interface ImportFileInfo {
  name: string
  size: number
  type: string
  stage: 'users' | 'classes' | 'students' | 'scores'
  content: string
}

// Import session tracking
export interface ImportSession {
  id: string
  created_at: string
  created_by: string
  status: 'pending' | 'validating' | 'importing' | 'completed' | 'failed'
  files: ImportFileInfo[]
  validation_results: Record<string, ImportValidationResult<any>>
  execution_result?: ImportExecutionResult
  progress: {
    current_stage: string
    completed_stages: string[]
    total_progress: number // 0-100
  }
}

// Common CSV column mappings
export const CSV_COLUMN_MAPPINGS = {
  users: {
    email: ['email', 'Email', 'EMAIL', 'teacher_email', 'Teacher Email'],
    full_name: ['full_name', 'Full Name', 'name', 'Name', 'teacher_name'],
    role: ['role', 'Role', 'ROLE', 'position'],
    teacher_type: ['teacher_type', 'Teacher Type', 'type', 'Type'],
    grade: ['grade', 'Grade', 'GRADE'],
    track: ['track', 'Track', 'TRACK', 'stream']
  },
  classes: {
    name: ['name', 'Name', 'class_name', 'Class Name', 'class'],
    grade: ['grade', 'Grade', 'GRADE'],
    level: ['level', 'Level', 'LEVEL', 'class_level', 'performance_level'],
    track: ['track', 'Track', 'TRACK', 'stream'],
    teacher_email: ['teacher_email', 'Teacher Email', 'teacher', 'Teacher'],
    academic_year: ['academic_year', 'Academic Year', 'year', 'Year']
  },
  students: {
    student_id: ['student_id', 'Student ID', 'id', 'ID', 'student_number'],
    full_name: ['full_name', 'Full Name', 'name', 'Name', 'student_name'],
    grade: ['grade', 'Grade', 'GRADE'],
    level: ['level', 'Level', 'LEVEL', 'class_level', 'performance_level'],
    track: ['track', 'Track', 'TRACK', 'stream'],
    class_name: ['class_name', 'Class Name', 'class', 'Class']
  },
  scores: {
    student_id: ['student_id', 'Student ID', 'id', 'ID'],
    exam_name: ['exam_name', 'Exam Name', 'exam', 'Exam'],
    assessment_code: ['assessment_code', 'Assessment Code', 'assessment', 'code'],
    score: ['score', 'Score', 'SCORE', 'marks', 'grade'],
    entered_by_email: ['entered_by_email', 'Teacher Email', 'teacher', 'entered_by']
  }
} as const