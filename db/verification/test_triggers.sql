-- Test Script for Courses Architecture Triggers
-- Date: 2025-08-11
-- Purpose: Test automatic course creation and student enrollment triggers

\echo '=== Testing Courses Architecture Triggers ==='
\echo ''

-- Clean up any existing test data
\echo 'Cleaning up existing test data...'
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

\echo ''

-- 1. Test automatic course creation when creating a class
\echo '1. Testing automatic course creation trigger...'
\echo 'Creating test class: TEST_G1_Explorers'

INSERT INTO classes (name, grade, track, academic_year, is_active)
VALUES ('TEST_G1_Explorers', 1, 'local', '24-25', true);

\echo 'Checking courses were automatically created:'
SELECT 
    cl.name as class_name,
    c.course_type,
    c.course_name,
    c.academic_year,
    c.is_active
FROM courses c
JOIN classes cl ON c.class_id = cl.id
WHERE cl.name = 'TEST_G1_Explorers'
ORDER BY c.course_type;

\echo ''

-- 2. Test automatic student enrollment when adding students to class
\echo '2. Testing automatic student enrollment trigger...'
\echo 'Adding test students to the class'

-- Get the test class ID
DO $$
DECLARE
    test_class_id UUID;
BEGIN
    SELECT id INTO test_class_id FROM classes WHERE name = 'TEST_G1_Explorers';
    
    -- Insert test students
    INSERT INTO students (student_id, full_name, grade, track, class_id, is_active)
    VALUES 
        ('TEST_001', 'Test Student One', 1, 'local', test_class_id, true),
        ('TEST_002', 'Test Student Two', 1, 'local', test_class_id, true);
END $$;

\echo 'Checking students were automatically enrolled in all courses:'
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

\echo ''

-- 3. Test course_details view
\echo '3. Testing course_details view with test data...'
SELECT * FROM course_details 
WHERE class_name = 'TEST_G1_Explorers'
ORDER BY course_type;

\echo ''

-- 4. Test student_course_enrollments view
\echo '4. Testing student_course_enrollments view with test data...'
SELECT * FROM student_course_enrollments
WHERE external_student_id LIKE 'TEST_%'
ORDER BY external_student_id, course_type;

\echo ''

-- 5. Test adding a student to existing class with courses
\echo '5. Testing late student enrollment...'
\echo 'Adding another student to existing class with courses'

DO $$
DECLARE
    test_class_id UUID;
BEGIN
    SELECT id INTO test_class_id FROM classes WHERE name = 'TEST_G1_Explorers';
    
    INSERT INTO students (student_id, full_name, grade, track, class_id, is_active)
    VALUES ('TEST_003', 'Test Student Three', 1, 'local', test_class_id, true);
END $$;

\echo 'Checking late student was enrolled in all existing courses:'
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

\echo ''

-- Summary
\echo '6. Summary of test results...'
\echo 'Total courses created for test class:'
SELECT COUNT(*) as course_count 
FROM courses c
JOIN classes cl ON c.class_id = cl.id
WHERE cl.name = 'TEST_G1_Explorers';

\echo 'Total student enrollments:'
SELECT COUNT(*) as enrollment_count
FROM student_courses sc
JOIN students s ON sc.student_id = s.id
WHERE s.student_id LIKE 'TEST_%';

\echo 'Expected: 3 courses × 3 students = 9 enrollments'

\echo ''
\echo '=== Trigger Testing Complete ==='
\echo 'Note: Test data (TEST_*) remains in database for inspection.'
\echo 'Run cleanup script to remove test data when done.'