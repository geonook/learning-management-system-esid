import { NextRequest, NextResponse } from 'next/server'
import { executeCleanImport } from '@/lib/import/clean-batch-processor'
import { validateUsersCSV, validateClassesCSV, validateCoursesCSV, validateStudentsCSV } from '@/lib/import/csv-parser'

/**
 * Test Clean Import API
 * Tests the new clean batch processor with sample data
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest) {
  try {
    // Generate sample CSV data for testing
    const sampleUsers = `email,full_name,role,teacher_type,grade,track,is_active
admin@school.edu,System Admin,admin,,,,true
head.g1@school.edu,Grade 1 Head,head,LT,1,local,true
john.lt@school.edu,John Doe,teacher,LT,,,true
mary.it@school.edu,Mary Smith,teacher,IT,,,true
sarah.kcfs@school.edu,Sarah Johnson,teacher,KCFS,,,true`

    const sampleClasses = `name,grade,level,track,teacher_email,academic_year,is_active
G1 Trailblazers,1,E1,local,john.lt@school.edu,24-25,true
G1 Discoverers,1,E1,international,mary.it@school.edu,24-25,true
G2 Adventurers,2,E2,local,john.lt@school.edu,24-25,true
G2 Innovators,2,E2,international,mary.it@school.edu,24-25,true`

    const sampleCourses = `class_name,course_type,teacher_email,academic_year,is_active
G1 Trailblazers,LT,john.lt@school.edu,24-25,true
G1 Trailblazers,IT,mary.it@school.edu,24-25,true
G1 Trailblazers,KCFS,sarah.kcfs@school.edu,24-25,true
G1 Discoverers,LT,john.lt@school.edu,24-25,true
G1 Discoverers,IT,mary.it@school.edu,24-25,true
G2 Adventurers,LT,john.lt@school.edu,24-25,true`

    const sampleStudents = `student_id,full_name,grade,level,track,class_name,is_active
P001,Alice Chen,1,E1,local,G1 Trailblazers,true
P002,Bob Wang,1,E1,local,G1 Trailblazers,true
P003,Carol Liu,1,E1,international,G1 Discoverers,true
P004,David Lin,2,E2,local,G2 Adventurers,true`

    console.log('Starting clean import test with sample data')

    // Validate all CSV data
    const usersValidation = await validateUsersCSV(sampleUsers)
    const classesValidation = await validateClassesCSV(sampleClasses)
    const coursesValidation = await validateCoursesCSV(sampleCourses)
    const studentsValidation = await validateStudentsCSV(sampleStudents)

    console.log('Validation results:', {
      users: usersValidation.summary,
      classes: classesValidation.summary,
      courses: coursesValidation.summary,
      students: studentsValidation.summary
    })

    // Check if all validations passed
    const hasValidationErrors = 
      usersValidation.summary.invalid > 0 ||
      classesValidation.summary.invalid > 0 ||
      coursesValidation.summary.invalid > 0 ||
      studentsValidation.summary.invalid > 0

    if (hasValidationErrors) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed for sample data',
        validation_results: {
          users: usersValidation,
          classes: classesValidation,
          courses: coursesValidation,
          students: studentsValidation
        }
      })
    }

    // Execute clean import
    const result = await executeCleanImport({
      users: usersValidation,
      classes: classesValidation,
      courses: coursesValidation,
      students: studentsValidation
    }, 'test-admin-user-id')

    console.log('Clean import test completed:', {
      success: result.success,
      summary: result.summary,
      errors: result.errors.length,
      warnings: result.warnings.length
    })

    return NextResponse.json({
      success: result.success,
      message: result.success ? 
        'Clean import test PASSED - system ready for production use!' :
        'Clean import test FAILED - check errors',
      test_summary: {
        users_created: result.summary.users.created,
        classes_created: result.summary.classes.created,
        courses_created: result.summary.courses.created,
        students_created: result.summary.students.created,
        total_errors: result.errors.length,
        total_warnings: result.warnings.length
      },
      full_result: result,
      next_steps: result.success ? [
        '✅ System is ready for CSV imports',
        '✅ Go to /admin/import to use the interface',
        '✅ Upload your real CSV files'
      ] : [
        '🚨 Fix the errors shown in full_result',
        '🚨 Check database schema deployment', 
        '🚨 Verify Service Role permissions'
      ]
    })

  } catch (error: any) {
    console.error('Clean import test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      test_summary: null
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Clean Import Test API',
    info: 'Use POST to test the clean import system with sample data',
    test_data: {
      users: '5 sample users',
      classes: '4 sample classes',
      courses: '6 sample courses', 
      students: '4 sample students'
    }
  })
}