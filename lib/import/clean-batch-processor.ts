/**
 * Clean Batch Processor for Primary School LMS
 * Standardized, debt-free CSV import processing
 * Replaces all previous complex import logic with clean, consistent approach
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import type {
  UserImport,
  ClassImport,
  CourseImport,
  StudentImport,
  ScoreImport,
  ImportExecutionResult,
  ImportExecutionError,
  ImportExecutionWarning,
  ImportValidationResult
} from './types'

// Standard batch size for all operations (prevents database overload)
const BATCH_SIZE = 5

// Standard retry configuration
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 200

/**
 * Standard Batch Insert Template
 * All import stages use this same pattern for consistency
 */
async function performBatchInsert<T>(
  tableName: string,
  records: T[],
  transformFn: (record: any) => any,
  stageName: string,
  result: ImportExecutionResult
): Promise<{ created: number; updated: number; errors: number }> {
  const supabase = createServiceRoleClient()
  let totalCreated = 0
  let totalUpdated = 0
  let totalErrors = 0

  console.log(`Starting ${stageName} batch import: ${records.length} records`)

  // Process in small batches to avoid stack depth and timeout issues
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(records.length / BATCH_SIZE)
    
    console.log(`Processing ${stageName} batch ${batchNumber}/${totalBatches}: ${batch.length} records`)
    
    try {
      // Transform records for database insertion
      const transformedBatch = batch.map(transformFn).filter(record => record !== null)
      
      if (transformedBatch.length === 0) {
        console.log(`Batch ${batchNumber} skipped: no valid records after transformation`)
        continue
      }
      
      // Perform simple INSERT (avoid complex upsert logic)
      const { data, error } = await supabase
        .from(tableName)
        .insert(transformedBatch)
        .select('id')
      
      if (error) {
        console.warn(`Batch ${batchNumber} failed:`, error.message)
        
        // Try individual inserts as fallback
        for (const record of transformedBatch) {
          let attempts = 0
          while (attempts < MAX_RETRIES) {
            try {
              await supabase.from(tableName).insert(record)
              totalCreated++
              break
            } catch (individualError: any) {
              attempts++
              if (attempts === MAX_RETRIES) {
                console.warn(`Individual ${stageName} insert failed after ${MAX_RETRIES} attempts:`, individualError.message)
                totalErrors++
                result.errors.push({
                  stage: stageName,
                  operation: 'create',
                  data: record,
                  error: individualError.message
                })
              } else {
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
              }
            }
          }
        }
      } else {
        const insertedCount = data?.length || 0
        totalCreated += insertedCount
        console.log(`Batch ${batchNumber} succeeded: ${insertedCount} records`)
      }
      
      // Small delay between batches to prevent database overload
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (batchError: any) {
      console.error(`Fatal error in batch ${batchNumber}:`, batchError.message)
      totalErrors += batch.length
      result.errors.push({
        stage: stageName,
        operation: 'create',
        data: { batchNumber, batchSize: batch.length },
        error: batchError.message
      })
    }
  }
  
  console.log(`${stageName} import completed: ${totalCreated} created, ${totalUpdated} updated, ${totalErrors} errors`)
  return { created: totalCreated, updated: totalUpdated, errors: totalErrors }
}

/**
 * Reference Resolution Helper
 * Creates clean UUID mappings for foreign key references
 */
class ReferenceResolver {
  private userEmailToId = new Map<string, string>()
  private classNameToId = new Map<string, string>()
  private studentIdToId = new Map<string, string>()
  private examNameToId = new Map<string, string>()
  
  async initialize(): Promise<void> {
    const supabase = createServiceRoleClient()
    
    try {
      // Load user mappings
      const { data: users } = await supabase
        .from('users')
        .select('id, email')
        .limit(200)
      
      users?.forEach(user => {
        if (user.email && user.id) {
          this.userEmailToId.set(user.email, user.id)
        }
      })
      
      // Load class mappings
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name')
        .limit(100)
      
      classes?.forEach(cls => {
        if (cls.name && cls.id) {
          this.classNameToId.set(cls.name, cls.id)
        }
      })
      
      // Load student mappings
      const { data: students } = await supabase
        .from('students')
        .select('id, student_id')
        .limit(500)
      
      students?.forEach(student => {
        if (student.student_id && student.id) {
          this.studentIdToId.set(student.student_id, student.id)
        }
      })
      
      console.log(`Reference resolver initialized: ${this.userEmailToId.size} users, ${this.classNameToId.size} classes, ${this.studentIdToId.size} students`)
      
    } catch (error: any) {
      console.warn('Reference resolver initialization failed:', error.message)
      // Continue with empty maps - will generate warnings for missing references
    }
  }
  
  getUserId(email: string): string | null {
    return this.userEmailToId.get(email) || null
  }
  
  getClassId(name: string): string | null {
    return this.classNameToId.get(name) || null
  }
  
  getStudentId(studentId: string): string | null {
    return this.studentIdToId.get(studentId) || null
  }
  
  getExamId(name: string): string | null {
    return this.examNameToId.get(name) || null
  }
  
  // Refresh mappings after each stage (for subsequent stages)
  async refresh(): Promise<void> {
    await this.initialize()
  }
}

/**
 * Stage 1: Users Import
 */
export async function executeUsersImport(
  validUsers: UserImport[],
  result: ImportExecutionResult
): Promise<void> {
  if (validUsers.length === 0) return
  
  const transformUser = (user: UserImport) => ({
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    teacher_type: user.teacher_type || null,
    grade: user.grade || null,
    track: user.track || null,
    is_active: user.is_active
  })
  
  const stats = await performBatchInsert(
    'users',
    validUsers,
    transformUser,
    'users',
    result
  )
  
  result.summary.users = stats
}

/**
 * Stage 2: Classes Import
 */
export async function executeClassesImport(
  validClasses: ClassImport[],
  result: ImportExecutionResult
): Promise<void> {
  if (validClasses.length === 0) return
  
  const transformClass = (cls: ClassImport) => ({
    name: cls.name,
    grade: cls.grade,
    level: cls.level || null,
    track: cls.track,
    academic_year: cls.academic_year,
    is_active: cls.is_active
  })
  
  const stats = await performBatchInsert(
    'classes',
    validClasses,
    transformClass,
    'classes',
    result
  )
  
  result.summary.classes = stats
}

/**
 * Stage 3: Courses Import
 */
export async function executeCoursesImport(
  validCourses: CourseImport[],
  result: ImportExecutionResult,
  resolver: ReferenceResolver
): Promise<void> {
  if (validCourses.length === 0) return
  
  // Refresh references to include newly created classes
  await resolver.refresh()
  
  const transformCourse = (course: CourseImport) => {
    const classId = resolver.getClassId(course.class_name)
    const teacherId = resolver.getUserId(course.teacher_email)
    
    // Track missing references
    if (!classId) {
      result.warnings.push({
        stage: 'courses',
        message: `Class not found: ${course.class_name}`,
        data: { course_type: course.course_type, teacher_email: course.teacher_email }
      })
      return null // Skip this record
    }
    
    if (!teacherId) {
      result.warnings.push({
        stage: 'courses',
        message: `Teacher not found: ${course.teacher_email}`,
        data: { class_name: course.class_name, course_type: course.course_type }
      })
      return null // Skip this record
    }
    
    return {
      class_id: classId,
      course_type: course.course_type,
      teacher_id: teacherId,
      academic_year: course.academic_year,
      is_active: course.is_active
    }
  }
  
  const stats = await performBatchInsert(
    'courses',
    validCourses,
    transformCourse,
    'courses',
    result
  )
  
  result.summary.courses = stats
}

/**
 * Stage 4: Students Import
 */
export async function executeStudentsImport(
  validStudents: StudentImport[],
  result: ImportExecutionResult,
  resolver: ReferenceResolver
): Promise<void> {
  if (validStudents.length === 0) return
  
  const transformStudent = (student: StudentImport) => {
    const classId = student.class_name ? resolver.getClassId(student.class_name) : null
    
    // Track missing class reference (but don't skip - students can exist without class)
    if (student.class_name && !classId) {
      result.warnings.push({
        stage: 'students',
        message: `Class not found: ${student.class_name}`,
        data: { student_id: student.student_id }
      })
    }
    
    return {
      student_id: student.student_id,
      full_name: student.full_name,
      grade: student.grade,
      level: student.level || null,
      track: student.track,
      class_id: classId,
      is_active: student.is_active
    }
  }
  
  const stats = await performBatchInsert(
    'students',
    validStudents,
    transformStudent,
    'students',
    result
  )
  
  result.summary.students = stats
}

/**
 * Stage 5: Scores Import (More Complex - Future Implementation)
 */
export async function executeScoresImport(
  validScores: ScoreImport[],
  result: ImportExecutionResult,
  resolver: ReferenceResolver
): Promise<void> {
  // TODO: Implement after basic 4 stages are stable
  console.log(`Scores import requested but not yet implemented: ${validScores.length} records`)
  
  result.warnings.push({
    stage: 'scores',
    message: 'Scores import not yet implemented in clean processor',
    data: { requested_count: validScores.length }
  })
  
  result.summary.scores = { created: 0, updated: 0, errors: 0 }
}

/**
 * Main Clean Import Executor
 * Replaces the complex import-executor-server.ts with clean logic
 */
export async function executeCleanImport(
  validationResults: {
    users?: ImportValidationResult<UserImport>
    classes?: ImportValidationResult<ClassImport>
    courses?: ImportValidationResult<CourseImport>
    students?: ImportValidationResult<StudentImport>
    scores?: ImportValidationResult<ScoreImport>
  },
  currentUserUUID: string
): Promise<ImportExecutionResult> {
  const result: ImportExecutionResult = {
    success: false,
    summary: {
      users: { created: 0, updated: 0, errors: 0 },
      classes: { created: 0, updated: 0, errors: 0 },
      courses: { created: 0, updated: 0, errors: 0 },
      students: { created: 0, updated: 0, errors: 0 },
      scores: { created: 0, updated: 0, errors: 0 }
    },
    errors: [],
    warnings: []
  }
  
  console.log('Starting clean CSV import execution')
  
  try {
    // Initialize reference resolver
    const resolver = new ReferenceResolver()
    await resolver.initialize()
    
    // Execute imports in sequence to maintain referential integrity
    
    // Stage 1: Users (foundation)
    if (validationResults.users?.valid) {
      await executeUsersImport(validationResults.users.valid, result)
    }
    
    // Stage 2: Classes (needs users for head references)
    if (validationResults.classes?.valid) {
      await executeClassesImport(validationResults.classes.valid, result)
    }
    
    // Stage 3: Courses (needs classes and users)
    if (validationResults.courses?.valid) {
      await executeCoursesImport(validationResults.courses.valid, result, resolver)
    }
    
    // Stage 4: Students (needs classes)
    if (validationResults.students?.valid) {
      await executeStudentsImport(validationResults.students.valid, result, resolver)
    }
    
    // Stage 5: Scores (needs students, courses, exams)
    if (validationResults.scores?.valid) {
      await executeScoresImport(validationResults.scores.valid, result, resolver)
    }
    
    // Determine overall success
    const totalErrors = Object.values(result.summary).reduce((sum, stage) => sum + stage.errors, 0)
    result.success = totalErrors === 0
    
    const totalCreated = Object.values(result.summary).reduce((sum, stage) => sum + stage.created, 0)
    console.log(`Clean import completed: ${totalCreated} total records created, ${totalErrors} errors, ${result.warnings.length} warnings`)
    
    return result
    
  } catch (error: any) {
    console.error('Fatal error in clean import execution:', error)
    result.success = false
    result.errors.push({
      stage: 'system',
      operation: 'import',
      data: {},
      error: `Fatal import error: ${error.message}`
    })
    
    return result
  }
}

/**
 * Clean Dry Run Executor
 */
export async function executeCleanDryRun(
  validationResults: {
    users?: ImportValidationResult<UserImport>
    classes?: ImportValidationResult<ClassImport>
    courses?: ImportValidationResult<CourseImport>
    students?: ImportValidationResult<StudentImport>
    scores?: ImportValidationResult<ScoreImport>
  }
): Promise<{
  wouldCreate: { users: number; classes: number; courses: number; students: number; scores: number }
  wouldUpdate: { users: number; classes: number; courses: number; students: number; scores: number }
  potentialWarnings: ImportExecutionWarning[]
}> {
  const potentialWarnings: ImportExecutionWarning[] = []
  
  // Initialize resolver to check references
  const resolver = new ReferenceResolver()
  await resolver.initialize()
  
  // Check courses for missing references
  if (validationResults.courses?.valid) {
    for (const course of validationResults.courses.valid) {
      if (!resolver.getClassId(course.class_name)) {
        potentialWarnings.push({
          stage: 'courses',
          message: `Class not found: ${course.class_name}`,
          data: { course_type: course.course_type, teacher_email: course.teacher_email }
        })
      }
      
      if (!resolver.getUserId(course.teacher_email)) {
        potentialWarnings.push({
          stage: 'courses',
          message: `Teacher not found: ${course.teacher_email}`,
          data: { class_name: course.class_name, course_type: course.course_type }
        })
      }
    }
  }
  
  // Check students for missing classes
  if (validationResults.students?.valid) {
    for (const student of validationResults.students.valid) {
      if (student.class_name && !resolver.getClassId(student.class_name)) {
        potentialWarnings.push({
          stage: 'students',
          message: `Class not found: ${student.class_name}`,
          data: { student_id: student.student_id }
        })
      }
    }
  }
  
  return {
    wouldCreate: {
      users: validationResults.users?.valid.length || 0,
      classes: validationResults.classes?.valid.length || 0,
      courses: validationResults.courses?.valid.length || 0,
      students: validationResults.students?.valid.length || 0,
      scores: validationResults.scores?.valid.length || 0
    },
    wouldUpdate: {
      users: 0, // Clean import uses INSERT only
      classes: 0,
      courses: 0,
      students: 0,
      scores: 0
    },
    potentialWarnings
  }
}