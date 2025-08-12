/**
 * Import Executor for LMS-ESID
 * Executes validated CSV data import to Supabase database
 */

import { supabase } from '@/lib/supabase/client'
import {
  type UserImport,
  type ClassImport,
  type CourseImport,
  type StudentImport,
  type ScoreImport,
  type ImportExecutionResult,
  type ImportExecutionError,
  type ImportExecutionWarning,
  type ImportValidationResult
} from './types'

// Helper function to create UUID mapping for external IDs
async function createUserEmailToUUIDMap(): Promise<Map<string, string>> {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email')
  
  if (error) {
    throw new Error(`Failed to fetch user mappings: ${error.message}`)
  }
  
  return new Map(users?.map(user => [user.email, user.id]) || [])
}

async function createClassNameToUUIDMap(): Promise<Map<string, string>> {
  const { data: classes, error } = await supabase
    .from('classes')
    .select('id, name')
  
  if (error) {
    throw new Error(`Failed to fetch class mappings: ${error.message}`)
  }
  
  return new Map(classes?.map(cls => [cls.name, cls.id]) || [])
}

async function createStudentIdToUUIDMap(): Promise<Map<string, string>> {
  const { data: students, error } = await supabase
    .from('students')
    .select('id, student_id')
  
  if (error) {
    throw new Error(`Failed to fetch student mappings: ${error.message}`)
  }
  
  return new Map(students?.map(student => [student.student_id, student.id]) || [])
}

async function createExamNameToUUIDMap(): Promise<Map<string, string>> {
  const { data: exams, error } = await supabase
    .from('exams')
    .select('id, name')
  
  if (error) {
    throw new Error(`Failed to fetch exam mappings: ${error.message}`)
  }
  
  return new Map(exams?.map(exam => [exam.name, exam.id]) || [])
}

// Users import executor
async function executeUsersImport(
  validUsers: UserImport[],
  result: ImportExecutionResult
): Promise<void> {
  if (validUsers.length === 0) return
  
  try {
    // Prepare user data for insertion
    const usersToInsert = validUsers.map(user => ({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      teacher_type: user.teacher_type || null,
      grade: user.grade || null,
      track: user.track || null,
      is_active: user.is_active
    }))
    
    // Insert users with upsert logic
    const { data: insertedUsers, error } = await supabase
      .from('users')
      .upsert(usersToInsert, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select('id, email')
    
    if (error) {
      throw error
    }
    
    // Count successful operations
    result.summary.users.created = insertedUsers?.length || 0
    result.summary.users.updated = validUsers.length - (insertedUsers?.length || 0)
    
  } catch (error: any) {
    result.summary.users.errors = validUsers.length
    result.errors.push({
      stage: 'users',
      operation: 'create',
      data: { count: validUsers.length },
      error: error.message
    })
  }
}

// Classes import executor
async function executeClassesImport(
  validClasses: ClassImport[],
  result: ImportExecutionResult
): Promise<void> {
  if (validClasses.length === 0) return
  
  try {
    // Get user email to UUID mapping
    const userMap = await createUserEmailToUUIDMap()
    
    // Prepare class data for insertion
    const classesToInsert = validClasses.map(cls => {
      const teacherUUID = cls.teacher_email ? userMap.get(cls.teacher_email) : null
      
      if (cls.teacher_email && !teacherUUID) {
        result.warnings.push({
          stage: 'classes',
          message: `Teacher not found for email: ${cls.teacher_email}`,
          data: { class_name: cls.name }
        })
      }
      
      return {
        name: cls.name,
        grade: cls.grade,
        track: cls.track,
        teacher_id: teacherUUID,
        academic_year: cls.academic_year,
        is_active: cls.is_active
      }
    })
    
    // Insert classes with upsert logic
    const { data: insertedClasses, error } = await supabase
      .from('classes')
      .upsert(classesToInsert, {
        onConflict: 'name,grade,track,academic_year',
        ignoreDuplicates: false
      })
      .select('id, name')
    
    if (error) {
      throw error
    }
    
    result.summary.classes.created = insertedClasses?.length || 0
    result.summary.classes.updated = validClasses.length - (insertedClasses?.length || 0)
    
  } catch (error: any) {
    result.summary.classes.errors = validClasses.length
    result.errors.push({
      stage: 'classes',
      operation: 'create',
      data: { count: validClasses.length },
      error: error.message
    })
  }
}

// Courses import executor  
async function executeCoursesImport(
  validCourses: CourseImport[],
  result: ImportExecutionResult
): Promise<void> {
  if (validCourses.length === 0) return
  
  try {
    // Get required mappings
    const [classMap, userMap] = await Promise.all([
      createClassNameToUUIDMap(),
      createUserEmailToUUIDMap()
    ])
    
    // Prepare course data for insertion
    const coursesToInsert = validCourses.map(course => {
      const classUUID = classMap.get(course.class_name)
      const teacherUUID = userMap.get(course.teacher_email)
      
      // Track missing references
      if (!classUUID) {
        result.warnings.push({
          stage: 'courses',
          message: `Class not found: ${course.class_name}`,
          data: { 
            course_type: course.course_type, 
            teacher_email: course.teacher_email 
          }
        })
      }
      
      if (!teacherUUID) {
        result.warnings.push({
          stage: 'courses',
          message: `Teacher not found: ${course.teacher_email}`,
          data: { 
            class_name: course.class_name, 
            course_type: course.course_type 
          }
        })
      }
      
      // Only return courses with valid references
      if (classUUID && teacherUUID) {
        return {
          class_id: classUUID,
          course_type: course.course_type,
          teacher_id: teacherUUID,
          academic_year: course.academic_year,
          is_active: course.is_active
        }
      }
      
      return null
    }).filter((course): course is NonNullable<typeof course> => course !== null)
    
    if (coursesToInsert.length === 0) {
      result.warnings.push({
        stage: 'courses',
        message: 'No valid courses to import - all references missing'
      })
      return
    }
    
    // Insert courses with upsert logic
    const { data: insertedCourses, error } = await supabase
      .from('courses')
      .upsert(coursesToInsert, {
        onConflict: 'class_id,course_type',
        ignoreDuplicates: false
      })
      .select('id')
    
    if (error) {
      throw error
    }
    
    result.summary.courses.created = insertedCourses?.length || 0
    result.summary.courses.updated = coursesToInsert.length - (insertedCourses?.length || 0)
    
  } catch (error: any) {
    result.summary.courses.errors = validCourses.length
    result.errors.push({
      stage: 'courses',
      operation: 'create',
      data: { count: validCourses.length },
      error: error.message
    })
  }
}

// Students import executor
async function executeStudentsImport(
  validStudents: StudentImport[],
  result: ImportExecutionResult
): Promise<void> {
  if (validStudents.length === 0) return
  
  try {
    // Get class name to UUID mapping
    const classMap = await createClassNameToUUIDMap()
    
    // Prepare student data for insertion
    const studentsToInsert = validStudents.map(student => {
      const classUUID = student.class_name ? classMap.get(student.class_name) : null
      
      if (student.class_name && !classUUID) {
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
        track: student.track,
        class_id: classUUID,
        is_active: student.is_active
      }
    })
    
    // Insert students with upsert logic
    const { data: insertedStudents, error } = await supabase
      .from('students')
      .upsert(studentsToInsert, {
        onConflict: 'student_id',
        ignoreDuplicates: false
      })
      .select('id, student_id')
    
    if (error) {
      throw error
    }
    
    result.summary.students.created = insertedStudents?.length || 0
    result.summary.students.updated = validStudents.length - (insertedStudents?.length || 0)
    
  } catch (error: any) {
    result.summary.students.errors = validStudents.length
    result.errors.push({
      stage: 'students',
      operation: 'create',
      data: { count: validStudents.length },
      error: error.message
    })
  }
}

// Scores import executor
async function executeScoresImport(
  validScores: ScoreImport[],
  result: ImportExecutionResult,
  currentUserUUID: string
): Promise<void> {
  if (validScores.length === 0) return
  
  try {
    // Get all required mappings
    const [studentMap, examMap, userMap] = await Promise.all([
      createStudentIdToUUIDMap(),
      createExamNameToUUIDMap(),
      createUserEmailToUUIDMap()
    ])
    
    // Prepare score data for insertion
    const scoresToInsert = validScores
      .map(score => {
        const studentUUID = studentMap.get(score.student_id)
        const examUUID = examMap.get(score.exam_name)
        const enteredByUUID = userMap.get(score.entered_by_email) || currentUserUUID
        
        // Track missing references
        if (!studentUUID) {
          result.warnings.push({
            stage: 'scores',
            message: `Student not found: ${score.student_id}`,
            data: { exam_name: score.exam_name, assessment_code: score.assessment_code }
          })
        }
        
        if (!examUUID) {
          result.warnings.push({
            stage: 'scores',
            message: `Exam not found: ${score.exam_name}`,
            data: { student_id: score.student_id, assessment_code: score.assessment_code }
          })
        }
        
        // Only return scores with valid references
        if (studentUUID && examUUID) {
          return {
            student_id: studentUUID,
            exam_id: examUUID,
            assessment_code: score.assessment_code,
            score: score.score,
            entered_by: enteredByUUID
          }
        }
        
        return null
      })
      .filter((score): score is NonNullable<typeof score> => score !== null)
    
    if (scoresToInsert.length === 0) {
      result.warnings.push({
        stage: 'scores',
        message: 'No valid scores to import - all references missing'
      })
      return
    }
    
    // Insert scores with upsert logic
    const { data: insertedScores, error } = await supabase
      .from('scores')
      .upsert(scoresToInsert, {
        onConflict: 'student_id,exam_id,assessment_code',
        ignoreDuplicates: false
      })
      .select('id')
    
    if (error) {
      throw error
    }
    
    result.summary.scores.created = insertedScores?.length || 0
    result.summary.scores.updated = scoresToInsert.length - (insertedScores?.length || 0)
    
  } catch (error: any) {
    result.summary.scores.errors = validScores.length
    result.errors.push({
      stage: 'scores',
      operation: 'create',
      data: { count: validScores.length },
      error: error.message
    })
  }
}

// Main import executor
export async function executeImport(
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
  
  try {
    // Execute imports in sequence to maintain referential integrity
    
    // 1. Import users first (teachers need to exist for classes)
    if (validationResults.users?.valid) {
      await executeUsersImport(validationResults.users.valid, result)
    }
    
    // 2. Import classes (need teachers to exist)
    if (validationResults.classes?.valid) {
      await executeClassesImport(validationResults.classes.valid, result)
    }
    
    // 3. Import courses (need classes and teachers to exist)
    if (validationResults.courses?.valid) {
      await executeCoursesImport(validationResults.courses.valid, result)
    }
    
    // 4. Import students (need classes to exist)
    if (validationResults.students?.valid) {
      await executeStudentsImport(validationResults.students.valid, result)
    }
    
    // 5. Import scores (need students and exams to exist)
    if (validationResults.scores?.valid) {
      await executeScoresImport(validationResults.scores.valid, result, currentUserUUID)
    }
    
    // Determine overall success
    const totalErrors = Object.values(result.summary).reduce((sum, stage) => sum + stage.errors, 0)
    result.success = totalErrors === 0
    
    return result
    
  } catch (error: any) {
    result.success = false
    result.errors.push({
      stage: 'users', // Default stage for global errors
      operation: 'create',
      data: {},
      error: `Global import error: ${error.message}`
    })
    
    return result
  }
}

// Batch import with transaction support
export async function executeBatchImport(
  batches: {
    users?: ImportValidationResult<UserImport>[]
    classes?: ImportValidationResult<ClassImport>[]
    courses?: ImportValidationResult<CourseImport>[]
    students?: ImportValidationResult<StudentImport>[]
    scores?: ImportValidationResult<ScoreImport>[]
  },
  currentUserUUID: string
): Promise<ImportExecutionResult[]> {
  const results: ImportExecutionResult[] = []
  
  // Determine the maximum batch size
  const maxBatches = Math.max(
    batches.users?.length || 0,
    batches.classes?.length || 0,
    batches.courses?.length || 0,
    batches.students?.length || 0,
    batches.scores?.length || 0
  )
  
  // Execute each batch
  for (let i = 0; i < maxBatches; i++) {
    const batchValidationResults = {
      users: batches.users?.[i],
      classes: batches.classes?.[i],
      courses: batches.courses?.[i],
      students: batches.students?.[i],
      scores: batches.scores?.[i]
    }
    
    const batchResult = await executeImport(batchValidationResults, currentUserUUID)
    results.push(batchResult)
  }
  
  return results
}

// Dry run executor - validates without inserting
export async function executeDryRun(
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
  
  // Get mappings to check for missing references
  const [userMap, classMap, studentMap, examMap] = await Promise.all([
    createUserEmailToUUIDMap(),
    createClassNameToUUIDMap(),
    createStudentIdToUUIDMap(),
    createExamNameToUUIDMap()
  ])
  
  // Check classes for missing teachers
  if (validationResults.classes?.valid) {
    for (const cls of validationResults.classes.valid) {
      if (cls.teacher_email && !userMap.has(cls.teacher_email)) {
        potentialWarnings.push({
          stage: 'classes',
          message: `Teacher not found: ${cls.teacher_email}`,
          data: { class_name: cls.name }
        })
      }
    }
  }
  
  // Check courses for missing references
  if (validationResults.courses?.valid) {
    for (const course of validationResults.courses.valid) {
      if (!classMap.has(course.class_name)) {
        potentialWarnings.push({
          stage: 'courses',
          message: `Class not found: ${course.class_name}`,
          data: { course_type: course.course_type, teacher_email: course.teacher_email }
        })
      }
      
      if (!userMap.has(course.teacher_email)) {
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
      if (student.class_name && !classMap.has(student.class_name)) {
        potentialWarnings.push({
          stage: 'students',
          message: `Class not found: ${student.class_name}`,
          data: { student_id: student.student_id }
        })
      }
    }
  }
  
  // Check scores for missing references
  if (validationResults.scores?.valid) {
    for (const score of validationResults.scores.valid) {
      if (!studentMap.has(score.student_id)) {
        potentialWarnings.push({
          stage: 'scores',
          message: `Student not found: ${score.student_id}`,
          data: { exam_name: score.exam_name }
        })
      }
      
      if (!examMap.has(score.exam_name)) {
        potentialWarnings.push({
          stage: 'scores',
          message: `Exam not found: ${score.exam_name}`,
          data: { student_id: score.student_id }
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
      users: 0, // Would need to check existing records
      classes: 0,
      courses: 0,
      students: 0,
      scores: 0
    },
    potentialWarnings
  }
}