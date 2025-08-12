/**
 * Server-side Import Executor for LMS-ESID
 * Executes validated CSV data import to Supabase database with elevated permissions
 */

import { createClient } from '@/lib/supabase/server'
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
  const supabase = createClient()
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email')
  
  if (error) {
    throw new Error(`Failed to fetch user mappings: ${error.message}`)
  }
  
  return new Map(users?.map(user => [user.email, user.id]) || [])
}

async function createClassNameToUUIDMap(): Promise<Map<string, string>> {
  const supabase = createClient()
  const { data: classes, error } = await supabase
    .from('classes')
    .select('id, name')
  
  if (error) {
    throw new Error(`Failed to fetch class mappings: ${error.message}`)
  }
  
  return new Map(classes?.map(cls => [cls.name, cls.id]) || [])
}

async function createStudentIdToUUIDMap(): Promise<Map<string, string>> {
  const supabase = createClient()
  const { data: students, error } = await supabase
    .from('students')
    .select('id, student_id')
  
  if (error) {
    throw new Error(`Failed to fetch student mappings: ${error.message}`)
  }
  
  return new Map(students?.map(student => [student.student_id, student.id]) || [])
}

async function createExamNameToUUIDMap(): Promise<Map<string, string>> {
  const supabase = createClient()
  const { data: exams, error } = await supabase
    .from('exams')
    .select('id, name')
  
  if (error) {
    throw new Error(`Failed to fetch exam mappings: ${error.message}`)
  }
  
  return new Map(exams?.map(exam => [exam.name, exam.id]) || [])
}

// Helper to create student+course to course_id mapping (simplified to avoid stack depth issues)
async function createStudentCourseMap(): Promise<Map<string, string>> {
  const supabase = createClient()
  
  // Simplified query: get student_courses and courses separately, then join in JavaScript
  const [studentCoursesResult, coursesResult] = await Promise.all([
    supabase
      .from('student_courses')
      .select('student_id, course_id'),
    supabase
      .from('courses')
      .select('id, course_type')
  ])
  
  if (studentCoursesResult.error) {
    throw new Error(`Failed to fetch student-course mappings: ${studentCoursesResult.error.message}`)
  }
  
  if (coursesResult.error) {
    throw new Error(`Failed to fetch courses data: ${coursesResult.error.message}`)
  }
  
  // Create course_id to course_type mapping
  const courseTypeMap = new Map<string, string>()
  coursesResult.data?.forEach(course => {
    courseTypeMap.set(course.id, course.course_type)
  })
  
  // Create final mapping: student_id:course_type -> course_id
  const map = new Map<string, string>()
  
  studentCoursesResult.data?.forEach(sc => {
    const student_id = sc.student_id
    const course_id = sc.course_id
    const course_type = courseTypeMap.get(course_id)
    
    if (course_type) {
      const key = `${student_id}:${course_type}`
      map.set(key, course_id)
    }
  })
  
  return map
}

// Users import executor
async function executeUsersImport(
  validUsers: UserImport[],
  result: ImportExecutionResult
): Promise<void> {
  if (validUsers.length === 0) return
  
  try {
    const supabase = createClient()
    
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
    const supabase = createClient()
    
    // Prepare class data for insertion (no teacher assignment at class level)
    const classesToInsert = validClasses.map(cls => ({
      name: cls.name,
      grade: cls.grade,
      level: cls.level,
      track: cls.track,
      academic_year: cls.academic_year,
      is_active: cls.is_active
    }))
    
    // Insert classes with upsert logic
    const { data: insertedClasses, error } = await supabase
      .from('classes')
      .upsert(classesToInsert, {
        onConflict: 'name,grade,level,track,academic_year',
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
    const supabase = createClient()
    
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
    const supabase = createClient()
    
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
    const supabase = createClient()
    
    // Get all required mappings
    const [studentMap, examMap, userMap, studentCourseMap] = await Promise.all([
      createStudentIdToUUIDMap(),
      createExamNameToUUIDMap(), 
      createUserEmailToUUIDMap(),
      createStudentCourseMap()
    ])
    
    // Prepare score data for insertion
    const scoresToInsert = validScores
      .map(score => {
        const studentUUID = studentMap.get(score.student_id)
        const enteredByUUID = userMap.get(score.entered_by_email) || currentUserUUID
        
        // Get course_id from student_id + course_type
        const studentCourseKey = `${studentUUID}:${score.course_type}`
        const courseUUID = studentCourseMap.get(studentCourseKey)
        
        // Track missing references
        if (!studentUUID) {
          result.warnings.push({
            stage: 'scores',
            message: `Student not found: ${score.student_id}`,
            data: { course_type: score.course_type, assessment_code: score.assessment_code }
          })
        }
        
        if (!courseUUID) {
          result.warnings.push({
            stage: 'scores',
            message: `Student not enrolled in course: ${score.student_id} (${score.course_type})`,
            data: { student_id: score.student_id, course_type: score.course_type, assessment_code: score.assessment_code }
          })
        }
        
        // Try to find or create exam for this course and exam_name
        let examUUID = examMap.get(score.exam_name)
        
        // Only return scores with valid references
        if (studentUUID && courseUUID) {
          return {
            student_id: studentUUID,
            course_id: courseUUID,
            exam_id: examUUID, // May be null, will be handled in insertion
            assessment_code: score.assessment_code,
            score: score.score,
            entered_by: enteredByUUID,
            exam_name: score.exam_name // Keep for exam creation if needed
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
    
    // Create exams for unique exam names if they don't exist
    // Note: exams table still uses class_id, so we need to get class_id from courses
    const courseToClassMap = new Map<string, string>()
    
    // Get course to class mapping for exam creation
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('id, class_id')
    
    if (coursesError) {
      console.warn('Failed to fetch courses for exam creation:', coursesError.message)
    } else {
      coursesData?.forEach(course => {
        courseToClassMap.set(course.id, course.class_id)
      })
    }
    
    const uniqueExamsByName = new Map<string, any>()
    scoresToInsert.forEach(score => {
      if (!score.exam_id && score.exam_name && score.course_id) {
        const class_id = courseToClassMap.get(score.course_id)
        if (class_id) {
          const key = `${class_id}:${score.exam_name}`
          if (!uniqueExamsByName.has(key)) {
            uniqueExamsByName.set(key, {
              class_id: class_id,
              name: score.exam_name,
              description: `Auto-created exam for ${score.exam_name}`,
              created_by: currentUserUUID
            })
          }
        }
      }
    })
    
    // Insert missing exams
    const examInserts = Array.from(uniqueExamsByName.values())
    if (examInserts.length > 0) {
      const { data: newExams, error: examError } = await supabase
        .from('exams')
        .upsert(examInserts, {
          onConflict: 'class_id,name',
          ignoreDuplicates: false
        })
        .select('id, name, class_id')
      
      if (examError) {
        console.warn('Failed to create exams:', examError.message)
      } else {
        // Update examMap with new exams
        newExams?.forEach(exam => {
          examMap.set(exam.name, exam.id)
        })
      }
    }
    
    // Update scores with exam_id and prepare for insertion
    const finalScoresToInsert = scoresToInsert.map(score => {
      if (!score.exam_id && score.exam_name) {
        score.exam_id = examMap.get(score.exam_name)
      }
      
      // Remove exam_name and course_id from final insert data (course_id not needed for scores table)
      const { exam_name, course_id, ...scoreData } = score
      return scoreData
    }).filter((score): score is typeof score & { exam_id: string } => 
      score.exam_id !== undefined
    ) // Only include scores with valid exam_id
    
    if (finalScoresToInsert.length === 0) {
      result.warnings.push({
        stage: 'scores',
        message: 'No valid scores to import - could not create or find exams'
      })
      return
    }
    
    // Insert scores with upsert logic
    const { data: insertedScores, error } = await supabase
      .from('scores')
      .upsert(finalScoresToInsert, {
        onConflict: 'student_id,exam_id,assessment_code',
        ignoreDuplicates: false
      })
      .select('id')
    
    if (error) {
      throw error
    }
    
    result.summary.scores.created = insertedScores?.length || 0
    result.summary.scores.updated = finalScoresToInsert.length - (insertedScores?.length || 0)
    
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
  const [userMap, classMap, studentMap, examMap, studentCourseMap] = await Promise.all([
    createUserEmailToUUIDMap(),
    createClassNameToUUIDMap(),
    createStudentIdToUUIDMap(),
    createExamNameToUUIDMap(),
    createStudentCourseMap()
  ])
  
  // Classes don't need teacher validation in new architecture
  // Teachers are assigned at the course level
  
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
      const studentUUID = studentMap.get(score.student_id)
      
      if (!studentUUID) {
        potentialWarnings.push({
          stage: 'scores',
          message: `Student not found: ${score.student_id}`,
          data: { course_type: score.course_type, exam_name: score.exam_name }
        })
      } else {
        // Check if student is enrolled in the specified course
        const studentCourseKey = `${studentUUID}:${score.course_type}`
        if (!studentCourseMap.has(studentCourseKey)) {
          potentialWarnings.push({
            stage: 'scores',
            message: `Student not enrolled in course: ${score.student_id} (${score.course_type})`,
            data: { student_id: score.student_id, course_type: score.course_type }
          })
        }
      }
      
      // Note: Exams will be auto-created if missing, so no warning needed for missing exams
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