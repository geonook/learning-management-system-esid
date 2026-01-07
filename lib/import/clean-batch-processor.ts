/**
 * Clean Batch Processor for Primary School LMS
 * Standardized, debt-free CSV import processing
 * Replaces all previous complex import logic with clean, consistent approach
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { BATCH_PROCESSING } from '@/lib/config/import'
import type {
  UserImport,
  ClassImport,
  CourseImport,
  StudentImport,
  ScoreImport,
  ImportExecutionResult,
  ImportExecutionWarning,
  ImportValidationResult
} from './types'

// Use centralized batch processing configuration
const { BATCH_SIZE, MAX_RETRIES, RETRY_DELAY_MS } = BATCH_PROCESSING

/**
 * Standard Batch Insert Template
 * All import stages use this same pattern for consistency
 */
type ValidTableName = 'users' | 'classes' | 'students' | 'exams' | 'assessment_codes' | 'scores' | 'assessment_titles' | 'courses' | 'student_courses'

async function performBatchInsert<T>(
  tableName: ValidTableName,
  records: T[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transformFn: (record: any) => any,
  stageName: string,
  result: ImportExecutionResult
): Promise<{ created: number; updated: number; errors: number }> {
  const supabase = createServiceRoleClient()
  let totalCreated = 0
  const totalUpdated = 0
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (individualError: any) {
              attempts++
              if (attempts === MAX_RETRIES) {
                console.warn(`Individual ${stageName} insert failed after ${MAX_RETRIES} attempts:`, individualError.message)
                totalErrors++
                result.errors.push({
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  stage: stageName as any,
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
      
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (batchError: any) {
      console.error(`Fatal error in batch ${batchNumber}:`, batchError.message)
      totalErrors += batch.length
      result.errors.push({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stage: stageName as any,
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
  private courseKeyToId = new Map<string, string>() // "student_id|course_type" -> course_id
  
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
      
      // Load course mappings (student_id + course_type -> course_id)
      const { data: courses } = await supabase
        .from('courses')
        .select('id, class_id, course_type')
        .limit(1000)
      
      // Need to also get students for each course
      if (courses) {
        for (const course of courses) {
          const { data: courseStudents } = await supabase
            .from('students')
            .select('student_id')
            .eq('class_id', course.class_id)
          
          courseStudents?.forEach(student => {
            if (student.student_id) {
              const courseKey = `${student.student_id}|${course.course_type}`
              this.courseKeyToId.set(courseKey, course.id)
            }
          })
        }
      }
      
      // Load exam mappings
      const { data: exams } = await supabase
        .from('exams')
        .select('id, name, class_id')
        .limit(1000)
      
      exams?.forEach(exam => {
        if (exam.name && exam.id) {
          // Use exam name as key
          this.examNameToId.set(exam.name, exam.id)
        }
      })
      
      console.log(`Reference resolver initialized: ${this.userEmailToId.size} users, ${this.classNameToId.size} classes, ${this.studentIdToId.size} students, ${this.courseKeyToId.size} courses, ${this.examNameToId.size} exams`)
      
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  
  getCourseId(studentId: string, courseType: string): string | null {
    const courseKey = `${studentId}|${courseType}`
    return this.courseKeyToId.get(courseKey) || null
  }
  
  addExamMapping(examName: string, examId: string): void {
    this.examNameToId.set(examName, examId)
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
  result: ImportExecutionResult,
  resolver?: ReferenceResolver
): Promise<void> {
  if (validClasses.length === 0) return
  
  const supabase = createServiceRoleClient()
  
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
  
  // Refresh resolver to include newly created users
  if (resolver) {
    await resolver.refresh()
  }
  
  // After classes are created, assign teachers to auto-created courses
  for (const cls of validClasses) {
    try {
      // Find the teacher by email
      const { data: teacher, error: teacherError } = await supabase
        .from('users')
        .select('id, teacher_type')
        .eq('email', cls.teacher_email)
        .single()
      
      if (teacherError || !teacher) {
        result.warnings.push({
          stage: 'classes',
          message: `Teacher not found for class assignment: ${cls.teacher_email}`,
          data: { class_name: cls.name, teacher_email: cls.teacher_email }
        })
        continue
      }
      
      // Find the class to get its ID
      const { data: classRecord, error: classError } = await supabase
        .from('classes')
        .select('id')
        .eq('name', cls.name)
        .eq('academic_year', cls.academic_year)
        .single()
      
      if (classError || !classRecord) {
        result.warnings.push({
          stage: 'classes',
          message: `Class not found for teacher assignment: ${cls.name}`,
          data: { class_name: cls.name, teacher_email: cls.teacher_email }
        })
        continue
      }
      
      // Assign teacher to the corresponding course type
      if (teacher.teacher_type) {
        const { error: updateError } = await supabase
          .from('courses')
          .update({ teacher_id: teacher.id })
          .eq('class_id', classRecord.id)
          .eq('course_type', teacher.teacher_type)
        
        if (updateError) {
          result.warnings.push({
            stage: 'classes',
            message: `Failed to assign teacher to course: ${updateError.message}`,
            data: { 
              class_name: cls.name, 
              teacher_email: cls.teacher_email,
              teacher_type: teacher.teacher_type 
            }
          })
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      result.warnings.push({
        stage: 'classes',
        message: `Error assigning teacher: ${error.message}`,
        data: { class_name: cls.name, teacher_email: cls.teacher_email }
      })
    }
  }
  
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
 * Stage 5: Scores Import (Complete Implementation)
 */
export async function executeScoresImport(
  validScores: ScoreImport[],
  result: ImportExecutionResult,
  resolver: ReferenceResolver
): Promise<void> {
  if (validScores.length === 0) return
  
  const supabase = createServiceRoleClient()
  
  // Refresh references to include newly created students and courses
  await resolver.refresh()
  
  const transformScore = async (score: ScoreImport) => {
    const studentUUID = resolver.getStudentId(score.student_id)
    const enteredById = resolver.getUserId(score.entered_by_email)
    
    // Track missing references
    if (!studentUUID) {
      result.warnings.push({
        stage: 'scores',
        message: `Student not found: ${score.student_id}`,
        data: { 
          course_type: score.course_type, 
          exam_name: score.exam_name,
          assessment_code: score.assessment_code 
        }
      })
      return null
    }
    
    if (!enteredById) {
      result.warnings.push({
        stage: 'scores',
        message: `Teacher not found: ${score.entered_by_email}`,
        data: { 
          student_id: score.student_id,
          course_type: score.course_type,
          exam_name: score.exam_name 
        }
      })
      return null
    }
    
    // Find course_id from student enrollment
    const courseId = resolver.getCourseId(score.student_id, score.course_type)
    
    if (!courseId) {
      result.warnings.push({
        stage: 'scores',
        message: `Course not found for student: ${score.student_id} in ${score.course_type}`,
        data: { 
          exam_name: score.exam_name,
          assessment_code: score.assessment_code 
        }
      })
      return null
    }
    
    // Find or create exam
    let examId = resolver.getExamId(score.exam_name)
    
    if (!examId) {
      // Find class_id from course
      const { data: courseData } = await supabase
        .from('courses')
        .select('class_id')
        .eq('id', courseId)
        .single()
      
      if (!courseData) {
        result.warnings.push({
          stage: 'scores',
          message: `Course not found: ${courseId}`,
          data: { 
            student_id: score.student_id,
            course_type: score.course_type,
            exam_name: score.exam_name 
          }
        })
        return null
      }
      
      // Create exam if it doesn't exist
      const { data: newExam, error: examError } = await supabase
        .from('exams')
        .insert({
          name: score.exam_name,
          class_id: courseData.class_id, // Correct: exam belongs to class
          exam_date: new Date().toISOString().split('T')[0], // Default to today
          is_active: true,
          created_by: enteredById
        })
        .select('id')
        .single()
      
      if (examError || !newExam) {
        result.warnings.push({
          stage: 'scores',
          message: `Failed to create exam: ${score.exam_name}`,
          data: { 
            student_id: score.student_id,
            course_type: score.course_type,
            error: examError?.message 
          }
        })
        return null
      }
      
      examId = newExam.id
      // Update resolver cache
      resolver.addExamMapping(score.exam_name, examId!)
    }
    
    return {
      student_id: studentUUID,
      exam_id: examId,
      assessment_code: score.assessment_code,
      score: score.score,
      entered_by: enteredById,
      entered_at: new Date().toISOString(),
      updated_by: enteredById,
      updated_at: new Date().toISOString()
    }
  }
  
  // Process scores with async transformation
  let totalCreated = 0
  let totalErrors = 0
  
  console.log(`Starting scores import: ${validScores.length} records`)
  
  for (let i = 0; i < validScores.length; i += BATCH_SIZE) {
    const batch = validScores.slice(i, i + BATCH_SIZE)
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(validScores.length / BATCH_SIZE)
    
    console.log(`Processing scores batch ${batchNumber}/${totalBatches}: ${batch.length} records`)
    
    try {
      // Transform records with async operations
      const transformedBatch = []
      for (const score of batch) {
        const transformed = await transformScore(score)
        if (transformed) {
          transformedBatch.push(transformed)
        }
      }
      
      if (transformedBatch.length === 0) {
        console.log(`Batch ${batchNumber} skipped: no valid records after transformation`)
        continue
      }
      
      // Use upsert to handle duplicate scores
      const { data, error } = await supabase
        .from('scores')
        .upsert(transformedBatch, {
          onConflict: 'student_id,exam_id,assessment_code'
        })
        .select('id')
      
      if (error) {
        console.warn(`Batch ${batchNumber} failed:`, error.message)
        totalErrors += transformedBatch.length
        result.errors.push({
          stage: 'scores',
          operation: 'create',
          data: { batchNumber, batchSize: transformedBatch.length },
          error: error.message
        })
      } else {
        const insertedCount = data?.length || 0
        totalCreated += insertedCount
        console.log(`Batch ${batchNumber} succeeded: ${insertedCount} records`)
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100))
      
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (batchError: any) {
      console.error(`Fatal error in scores batch ${batchNumber}:`, batchError.message)
      totalErrors += batch.length
      result.errors.push({
        stage: 'scores',
        operation: 'create',
        data: { batchNumber, batchSize: batch.length },
        error: batchError.message
      })
    }
  }
  
  console.log(`Scores import completed: ${totalCreated} created, ${totalErrors} errors`)
  result.summary.scores = { created: totalCreated, updated: 0, errors: totalErrors }
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      await executeClassesImport(validationResults.classes.valid, result, resolver)
    }
    
    // Stage 3: Courses (auto-created by database triggers, teachers assigned in Stage 2)
    // Skip manual courses import - courses are automatically created by database triggers
    // and teachers are assigned during classes import
    
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
    
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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