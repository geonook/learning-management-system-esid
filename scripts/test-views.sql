-- Test script to validate safe views don't cause RLS recursion
-- This script should be run in the Supabase SQL editor to test the views

-- First, create the views
\i '/Users/chenzehong/Desktop/LMS/db/views/001_safe_views.sql'

-- Test basic view queries to check for stack depth errors
BEGIN;

-- Test 1: Basic teacher_classes_view query
SELECT 'Testing teacher_classes_view...' as test_name;
SELECT class_id, class_name, teacher_id, student_count 
FROM teacher_classes_view 
LIMIT 5;

-- Test 2: Basic teacher_students_view query  
SELECT 'Testing teacher_students_view...' as test_name;
SELECT student_id, student_name, class_name, teacher_id
FROM teacher_students_view 
LIMIT 5;

-- Test 3: Basic class_scores_view query
SELECT 'Testing class_scores_view...' as test_name;
SELECT student_name, class_name, assessment_code, score
FROM class_scores_view 
WHERE score IS NOT NULL
LIMIT 5;

-- Test 4: Student performance view query
SELECT 'Testing student_performance_view...' as test_name;
SELECT student_name, class_name, formative_avg, summative_avg, semester_grade
FROM student_performance_view 
LIMIT 5;

-- Test 5: Filtered queries (simulating API-level filtering)
SELECT 'Testing filtered queries...' as test_name;

-- Simulate teacher filtering (if we had a teacher with ID)
-- SELECT * FROM teacher_students_view WHERE teacher_id = 'some-uuid' LIMIT 3;

-- Simulate grade/track filtering (for head teacher)
-- SELECT * FROM teacher_students_view WHERE student_grade = 10 AND student_track = 'local' LIMIT 3;

SELECT 'All view tests completed successfully!' as result;

ROLLBACK;