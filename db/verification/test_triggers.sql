-- Test Script for Courses Architecture Triggers
-- Date: 2025-08-11
-- Purpose: Test automatic course creation and student enrollment triggers

SELECT '=== Testing Courses Architecture Triggers ===' as status;

-- Clean up any existing test data
SELECT 'Cleaning up existing test data...' as step;
DELETE FROM student_courses WHERE course_id IN (
    SELECT c.id FROM courses c
    JOIN classes cl ON c.class_id = cl.id
    WHERE cl.name LIKE 'TEST_%'
);
DELETE FROM courses WHERE class_id IN (
    SELECT id FROM classes WHERE name LIKE 'TEST_%'
);
DELETE FROM students WHERE student_id LIKE 'TEST_%';
DELETE FROM classes WHERE name LIKE 'TEST_%';


-- 1. Test automatic course creation when creating a class
SELECT '1. Testing automatic course creation trigger...' as step;
SELECT 'Creating test class: TEST_G7_Explorers' as action;

INSERT INTO classes (name, grade, track, academic_year, is_active)
VALUES ('TEST_G7_Explorers', 7, 'local', '24-25', true);

SELECT 'Checking courses were automatically created:' as action;
SELECT 
    cl.name as class_name,
    c.course_type,
    c.course_name,
    c.academic_year,
    c.is_active
FROM courses c
JOIN classes cl ON c.class_id = cl.id
WHERE cl.name = 'TEST_G7_Explorers'
ORDER BY c.course_type;


-- 2. Test automatic student enrollment when adding students to class
SELECT '2. Testing automatic student enrollment trigger...' as step;
SELECT 'Adding test students to the class' as action;

-- Get the test class ID
DO $$
DECLARE
    test_class_id UUID;
BEGIN
    SELECT id INTO test_class_id FROM classes WHERE name = 'TEST_G7_Explorers';
    
    -- Insert test students
    INSERT INTO students (student_id, full_name, grade, track, class_id, is_active)
    VALUES 
        ('TEST_001', 'Test Student One', 7, 'local', test_class_id, true),
        ('TEST_002', 'Test Student Two', 7, 'local', test_class_id, true);
END $$;

SELECT 'Checking students were automatically enrolled in all courses:' as action;
SELECT 
    s.student_id,
    s.full_name,
    cl.name as class_name,
    c.course_type,
    c.course_name,
    sc.enrolled_at,
    sc.is_active
FROM student_courses sc
JOIN students s ON sc.student_id = s.id
JOIN courses c ON sc.course_id = c.id
JOIN classes cl ON c.class_id = cl.id
WHERE s.student_id LIKE 'TEST_%'
ORDER BY s.student_id, c.course_type;


-- 3. Test course_details view
SELECT '3. Testing course_details view with test data...' as step;
SELECT * FROM course_details 
WHERE class_name = 'TEST_G7_Explorers'
ORDER BY course_type;


-- 4. Test student_course_enrollments view
SELECT '4. Testing student_course_enrollments view with test data...' as step;
SELECT * FROM student_course_enrollments
WHERE external_student_id LIKE 'TEST_%'
ORDER BY external_student_id, course_type;


-- 5. Test adding a student to existing class with courses
SELECT '5. Testing late student enrollment...' as step;
SELECT 'Adding another student to existing class with courses' as action;

DO $$
DECLARE
    test_class_id UUID;
BEGIN
    SELECT id INTO test_class_id FROM classes WHERE name = 'TEST_G7_Explorers';
    
    INSERT INTO students (student_id, full_name, grade, track, class_id, is_active)
    VALUES ('TEST_003', 'Test Student Three', 7, 'local', test_class_id, true);
END $$;

SELECT 'Checking late student was enrolled in all existing courses:' as action;
SELECT 
    s.student_id,
    s.full_name,
    c.course_type,
    sc.enrolled_at
FROM student_courses sc
JOIN students s ON sc.student_id = s.id
JOIN courses c ON sc.course_id = c.id
WHERE s.student_id = 'TEST_003'
ORDER BY c.course_type;


-- Summary
SELECT '6. Summary of test results...' as step;
SELECT 'Total courses created for test class:' as summary;
SELECT COUNT(*) as course_count 
FROM courses c
JOIN classes cl ON c.class_id = cl.id
WHERE cl.name = 'TEST_G7_Explorers';

SELECT 'Total student enrollments:' as summary;
SELECT COUNT(*) as enrollment_count
FROM student_courses sc
JOIN students s ON sc.student_id = s.id
WHERE s.student_id LIKE 'TEST_%';

SELECT 'Expected: 3 courses × 3 students = 9 enrollments' as expected;

SELECT '=== Trigger Testing Complete ===' as status;
SELECT 'Note: Test data (TEST_*) remains in database for inspection.' as note;
SELECT 'Run cleanup script to remove test data when done.' as note;