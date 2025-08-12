-- Migration 004a: Check Existing Data Before Grade Constraint Update
-- Date: 2025-08-11
-- Purpose: Analyze existing data that may conflict with primary school grade constraints (1-6)

SELECT '=== Checking Existing Data for Grade Constraint Conflicts ===' as status;

-- 1. Check users table for grade conflicts
SELECT 'Checking users table...' as step;
SELECT 
    'users' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN grade IS NOT NULL THEN 1 END) as records_with_grade,
    COUNT(CASE WHEN grade IS NULL THEN 1 END) as records_with_null_grade,
    COUNT(CASE WHEN grade BETWEEN 1 AND 6 THEN 1 END) as primary_school_grades,
    COUNT(CASE WHEN grade BETWEEN 7 AND 12 THEN 1 END) as middle_school_grades,
    COUNT(CASE WHEN grade < 1 OR grade > 12 THEN 1 END) as invalid_grades
FROM users;

-- Show specific records that would violate new constraints
SELECT 'Users records that would violate new constraints (grade not in 1-6):' as info;
SELECT 
    id,
    email,
    full_name,
    role,
    grade,
    teacher_type,
    created_at
FROM users 
WHERE grade IS NOT NULL AND (grade < 1 OR grade > 6)
ORDER BY grade;

-- 2. Check classes table for grade conflicts  
SELECT 'Checking classes table...' as step;
SELECT 
    'classes' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN grade BETWEEN 1 AND 6 THEN 1 END) as primary_school_grades,
    COUNT(CASE WHEN grade BETWEEN 7 AND 12 THEN 1 END) as middle_school_grades,
    COUNT(CASE WHEN grade < 1 OR grade > 12 THEN 1 END) as invalid_grades
FROM classes;

-- Show specific records that would violate new constraints
SELECT 'Classes records that would violate new constraints (grade not in 1-6):' as info;
SELECT 
    id,
    name,
    grade,
    track,
    academic_year,
    created_at
FROM classes 
WHERE grade < 1 OR grade > 6
ORDER BY grade;

-- 3. Check students table for grade conflicts
SELECT 'Checking students table...' as step;
SELECT 
    'students' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN grade BETWEEN 1 AND 6 THEN 1 END) as primary_school_grades,
    COUNT(CASE WHEN grade BETWEEN 7 AND 12 THEN 1 END) as middle_school_grades,
    COUNT(CASE WHEN grade < 1 OR grade > 12 THEN 1 END) as invalid_grades
FROM students;

-- Show specific records that would violate new constraints
SELECT 'Students records that would violate new constraints (grade not in 1-6):' as info;
SELECT 
    id,
    student_id,
    full_name,
    grade,
    track,
    created_at
FROM students 
WHERE grade < 1 OR grade > 6
ORDER BY grade;

-- 4. Check assessment_titles table for grade conflicts
SELECT 'Checking assessment_titles table...' as step;
SELECT 
    'assessment_titles' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN grade IS NOT NULL THEN 1 END) as records_with_grade,
    COUNT(CASE WHEN grade IS NULL THEN 1 END) as records_with_null_grade,
    COUNT(CASE WHEN grade BETWEEN 1 AND 6 THEN 1 END) as primary_school_grades,
    COUNT(CASE WHEN grade BETWEEN 7 AND 12 THEN 1 END) as middle_school_grades,
    COUNT(CASE WHEN grade < 1 OR grade > 12 THEN 1 END) as invalid_grades
FROM assessment_titles;

-- Show specific records that would violate new constraints
SELECT 'Assessment_titles records that would violate new constraints (grade not in 1-6):' as info;
SELECT 
    id,
    assessment_code,
    display_name,
    context,
    grade,
    track,
    created_at
FROM assessment_titles 
WHERE grade IS NOT NULL AND (grade < 1 OR grade > 6)
ORDER BY grade;

-- 5. Summary and recommendations
SELECT '=== Summary of Constraint Conflicts ===' as status;
SELECT 
    'TOTAL CONFLICTS' as category,
    (SELECT COUNT(*) FROM users WHERE grade IS NOT NULL AND (grade < 1 OR grade > 6)) +
    (SELECT COUNT(*) FROM classes WHERE grade < 1 OR grade > 6) +
    (SELECT COUNT(*) FROM students WHERE grade < 1 OR grade > 6) +
    (SELECT COUNT(*) FROM assessment_titles WHERE grade IS NOT NULL AND (grade < 1 OR grade > 6))
    as total_conflicting_records;

-- Provide recommendations
SELECT '=== Recommendations ===' as status;
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM users WHERE grade IS NOT NULL AND (grade < 1 OR grade > 6)) +
             (SELECT COUNT(*) FROM classes WHERE grade < 1 OR grade > 6) +
             (SELECT COUNT(*) FROM students WHERE grade < 1 OR grade > 6) +
             (SELECT COUNT(*) FROM assessment_titles WHERE grade IS NOT NULL AND (grade < 1 OR grade > 6)) = 0
        THEN 'NO CONFLICTS FOUND - Safe to apply grade constraints 1-6'
        ELSE 'CONFLICTS FOUND - Need to clean/convert data before applying constraints'
    END as recommendation;

SELECT 'Next steps:' as info;
SELECT '1. If conflicts found, run 004b_migrate_grade_constraints_safely.sql' as next_step;
SELECT '2. If no conflicts, can retry original 004_update_grade_constraints_for_primary_school.sql' as alternative;