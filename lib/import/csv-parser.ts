/**
 * CSV Parser and Validator for LMS-ESID
 * Handles CSV file parsing, validation, and data transformation
 */

import { z } from 'zod'
import {
  UserImportSchema,
  ClassImportSchema,
  CourseImportSchema,
  StudentImportSchema,
  ScoreImportSchema,
  type UserImport,
  type ClassImport,
  type CourseImport,
  type StudentImport,
  type ScoreImport,
  type ImportValidationResult,
  type ImportValidationError,
  type CSVParseOptions,
  CSV_COLUMN_MAPPINGS
} from './types'

// Utility function to detect CSV delimiter
function detectDelimiter(content: string): string {
  const lines = content.split('\n').slice(0, 5) // Check first 5 lines
  const delimiters = [',', ';', '\t', '|']
  
  let bestDelimiter = ','
  let maxCount = 0
  
  for (const delimiter of delimiters) {
    const counts = lines.map(line => (line.match(new RegExp(`\\${delimiter}`, 'g')) || []).length)
    const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length
    const consistency = counts.every(count => Math.abs(count - avgCount) <= 1)
    
    if (avgCount > maxCount && consistency) {
      maxCount = avgCount
      bestDelimiter = delimiter
    }
  }
  
  return bestDelimiter
}

// CSV line parser with proper quote handling
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0
  
  while (i < line.length) {
    const char = line[i]
    const nextChar = line[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i += 2
        continue
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      // End of field
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
    
    i++
  }
  
  // Add the last field
  result.push(current.trim())
  return result
}

// Smart column mapping using predefined mappings
function mapColumns(headers: string[], stage: keyof typeof CSV_COLUMN_MAPPINGS): Record<string, number> {
  const mapping: Record<string, number> = {}
  const stageMapping = CSV_COLUMN_MAPPINGS[stage]
  
  for (const [standardField, variants] of Object.entries(stageMapping)) {
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]?.trim()
      if (header && variants.includes(header)) {
        mapping[standardField] = i
        break
      }
    }
  }
  
  return mapping
}

// Core CSV parsing function
export async function parseCSVContent(
  content: string,
  options: CSVParseOptions = {}
): Promise<{ headers: string[]; rows: string[][]; delimiter: string }> {
  const {
    delimiter = detectDelimiter(content),
    skipEmptyLines = true,
    encoding = 'utf8',
    maxRows
  } = options
  
  // Handle different encodings
  let processedContent = content
  if (encoding !== 'utf8') {
    // For browser compatibility, assume content is already properly decoded
    processedContent = content
  }
  
  const lines = processedContent
    .split(/\r?\n/)
    .filter(line => !skipEmptyLines || line.trim() !== '')
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty')
  }
  
  const headers = parseCSVLine(lines[0], delimiter)
  const rows: string[][] = []
  
  const maxRowsToProcess = maxRows ? Math.min(lines.length - 1, maxRows) : lines.length - 1
  
  for (let i = 1; i <= maxRowsToProcess; i++) {
    const row = parseCSVLine(lines[i], delimiter)
    rows.push(row)
  }
  
  return { headers, rows, delimiter }
}

// Generic validation function
function validateRows<T>(
  headers: string[],
  rows: string[][],
  schema: z.ZodSchema<T>,
  stage: keyof typeof CSV_COLUMN_MAPPINGS,
  options: CSVParseOptions = {}
): ImportValidationResult<T> {
  const columnMapping = mapColumns(headers, stage)
  const valid: T[] = []
  const invalid: ImportValidationError[] = []
  
  const { skipLinesWithError = false } = options
  
  rows.forEach((row, index) => {
    try {
      const rowData: Record<string, any> = {}
      
      // Map row data using column mapping
      for (const [standardField, columnIndex] of Object.entries(columnMapping)) {
        const value = row[columnIndex]?.trim() || null
        
        // Type conversion based on field
        if (value === null || value === '') {
          rowData[standardField] = null
        } else if (['grade', 'score'].some(field => standardField.includes(field))) {
          // Numeric fields
          const numValue = parseFloat(value)
          rowData[standardField] = isNaN(numValue) ? null : numValue
        } else if (standardField === 'is_active') {
          // Boolean fields
          rowData[standardField] = ['true', '1', 'yes', 'active'].includes(value.toLowerCase())
        } else {
          rowData[standardField] = value
        }
      }
      
      // Validate against schema
      const result = schema.parse(rowData)
      valid.push(result)
    } catch (error) {
      const zodError = error as z.ZodError
      const errorMessages = zodError.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      )
      
      invalid.push({
        row: index + 2, // +2 because we skip header and use 1-based indexing
        data: Object.fromEntries(row.map((cell, i) => [headers[i] || `col_${i}`, cell])),
        errors: errorMessages
      })
      
      if (!skipLinesWithError) {
        console.warn(`Row ${index + 2} validation failed:`, errorMessages)
      }
    }
  })
  
  const total = valid.length + invalid.length
  return {
    valid,
    invalid,
    summary: {
      total,
      valid: valid.length,
      invalid: invalid.length,
      validPercent: total > 0 ? Math.round((valid.length / total) * 100) : 0
    }
  }
}

// Specific validation functions for each data type
export async function validateUsersCSV(
  content: string,
  options?: CSVParseOptions
): Promise<ImportValidationResult<UserImport>> {
  const { headers, rows } = await parseCSVContent(content, options)
  return validateRows(headers, rows, UserImportSchema, 'users', options)
}

export async function validateClassesCSV(
  content: string,
  options?: CSVParseOptions
): Promise<ImportValidationResult<ClassImport>> {
  const { headers, rows } = await parseCSVContent(content, options)
  return validateRows(headers, rows, ClassImportSchema, 'classes', options)
}

export async function validateCoursesCSV(
  content: string,
  options?: CSVParseOptions
): Promise<ImportValidationResult<CourseImport>> {
  const { headers, rows } = await parseCSVContent(content, options)
  return validateRows(headers, rows, CourseImportSchema, 'courses', options)
}

export async function validateStudentsCSV(
  content: string,
  options?: CSVParseOptions
): Promise<ImportValidationResult<StudentImport>> {
  const { headers, rows } = await parseCSVContent(content, options)
  return validateRows(headers, rows, StudentImportSchema, 'students', options)
}

export async function validateScoresCSV(
  content: string,
  options?: CSVParseOptions
): Promise<ImportValidationResult<ScoreImport>> {
  const { headers, rows } = await parseCSVContent(content, options)
  return validateRows(headers, rows, ScoreImportSchema, 'scores', options)
}

// File reading utilities
export function readFileAsText(file: File, encoding: 'utf8' | 'utf16le' | 'latin1' = 'utf8'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('Failed to read file as text'))
      }
    }
    
    reader.onerror = () => reject(new Error('Error reading file'))
    
    // Read with appropriate encoding
    switch (encoding) {
      case 'utf16le':
        reader.readAsText(file, 'UTF-16LE')
        break
      case 'latin1':
        reader.readAsText(file, 'ISO-8859-1')
        break
      default:
        reader.readAsText(file, 'UTF-8')
    }
  })
}

// Sample data generators for templates
export function generateSampleUsersCSV(): string {
  const headers = 'email,full_name,role,teacher_type,grade,track'
  const samples = [
    'john.lt@esid.edu,John Doe,teacher,LT,,',
    'mary.it@esid.edu,Mary Smith,teacher,IT,,',
    'sarah.kcfs@esid.edu,Sarah Johnson,teacher,KCFS,,',
    'head.g1@esid.edu,Grade 1 Head,head,LT,1,local',
    'admin@esid.edu,System Admin,admin,,,'
  ]
  return headers + '\n' + samples.join('\n')
}

export function generateSampleClassesCSV(): string {
  const headers = 'name,grade,level,track,academic_year'
  const samples = [
    'G1 Trailblazers,1,E1,local,24-25',
    'G2 Discoverers,2,E2,international,24-25',
    'G3 Adventurers,3,E3,local,24-25'
  ]
  return headers + '\n' + samples.join('\n')
}

export function generateSampleCoursesCSV(): string {
  const headers = 'class_name,course_type,teacher_email,academic_year'
  const samples = [
    'G1 Trailblazers,LT,john.lt@esid.edu,24-25',
    'G1 Trailblazers,IT,mary.it@esid.edu,24-25',
    'G1 Trailblazers,KCFS,sarah.kcfs@esid.edu,24-25',
    'G2 Discoverers,LT,john.lt@esid.edu,24-25',
    'G2 Discoverers,IT,mary.it@esid.edu,24-25',
    'G2 Discoverers,KCFS,sarah.kcfs@esid.edu,24-25'
  ]
  return headers + '\n' + samples.join('\n')
}

export function generateSampleStudentsCSV(): string {
  const headers = 'student_id,full_name,grade,level,track,class_name'
  const samples = [
    'P001,Alice Chen,1,E1,local,G1 Trailblazers',
    'P002,Bob Wang,1,E1,local,G1 Trailblazers',
    'P003,Carol Liu,2,E2,international,G2 Discoverers'
  ]
  return headers + '\n' + samples.join('\n')
}

export function generateSampleScoresCSV(): string {
  const headers = 'student_id,course_type,exam_name,assessment_code,score,entered_by_email'
  const samples = [
    'P001,LT,Formative Assessment 1,FA1,85,john.lt@esid.edu',
    'P001,LT,Summative Assessment 1,SA1,88,john.lt@esid.edu',
    'P001,IT,Formative Assessment 1,FA1,82,mary.it@esid.edu',
    'P001,KCFS,Formative Assessment 1,FA1,90,sarah.kcfs@esid.edu'
  ]
  return headers + '\n' + samples.join('\n')
}

// Validation summary helper
export function getValidationSummary(
  results: ImportValidationResult<any>[]
): {
  totalRecords: number
  validRecords: number
  invalidRecords: number
  overallValidPercent: number
  stages: { stage: string; valid: number; invalid: number; percent: number }[]
} {
  const stages = ['users', 'classes', 'students', 'scores']
  const stageResults = results.map((result, index) => ({
    stage: stages[index] || `stage_${index}`,
    valid: result.summary.valid,
    invalid: result.summary.invalid,
    percent: result.summary.validPercent
  }))
  
  const totalRecords = results.reduce((sum, r) => sum + r.summary.total, 0)
  const validRecords = results.reduce((sum, r) => sum + r.summary.valid, 0)
  const invalidRecords = results.reduce((sum, r) => sum + r.summary.invalid, 0)
  
  return {
    totalRecords,
    validRecords,
    invalidRecords,
    overallValidPercent: totalRecords > 0 ? Math.round((validRecords / totalRecords) * 100) : 0,
    stages: stageResults
  }
}