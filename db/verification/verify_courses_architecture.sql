-- Verification Script for Courses Architecture
-- Date: 2025-08-11
-- Purpose: Verify that migration 003a & 003b executed successfully

\echo '=== Verifying Courses Architecture Migration ==='
\echo ''

-- 1. Check ENUM types exist with correct values
\echo '1. Checking ENUM types...'
SELECT 
    t.typname as enum_name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('user_role', 'teacher_type', 'course_type')
GROUP BY t.typname
ORDER BY t.typname;

\echo ''

-- 2. Check tables exist
\echo '2. Checking new tables exist...'
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('courses', 'student_courses')
ORDER BY table_name;

\echo ''

-- 3. Check courses table structure
\echo '3. Checking courses table structure...'
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'courses'
ORDER BY ordinal_position;

\echo ''

-- 4. Check student_courses table structure
\echo '4. Checking student_courses table structure...'
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'student_courses'
ORDER BY ordinal_position;

\echo ''

-- 5. Check scores table has new course_id column
\echo '5. Checking scores table course_id column...'
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'scores'
AND column_name = 'course_id';

\echo ''

-- 6. Check indexes were created
\echo '6. Checking indexes...'
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE '%course%'
ORDER BY tablename, indexname;

\echo ''

-- 7. Check triggers exist
\echo '7. Checking triggers...'
SELECT 
    trigger_name,
    event_object_table,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%course%'
ORDER BY event_object_table, trigger_name;

\echo ''

-- 8. Check views exist
\echo '8. Checking views...'
SELECT 
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('course_details', 'student_course_enrollments')
ORDER BY table_name;

\echo ''

-- 9. Check RLS policies
\echo '9. Checking RLS policies...'
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('courses', 'student_courses')
ORDER BY tablename, policyname;

\echo ''

-- 10. Test data counts
\echo '10. Current data counts...'
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'classes', COUNT(*) FROM classes
UNION ALL  
SELECT 'courses', COUNT(*) FROM courses
UNION ALL
SELECT 'students', COUNT(*) FROM students
UNION ALL
SELECT 'student_courses', COUNT(*) FROM student_courses
UNION ALL
SELECT 'scores', COUNT(*) FROM scores
ORDER BY table_name;

\echo ''
\echo '=== Verification Complete ==='