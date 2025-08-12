-- Cleanup Script for Test Data
-- Date: 2025-08-11
-- Purpose: Remove all test data created during verification
-- Updated: Test data now uses grade 7 (TEST_G7_*) to match schema constraints

SELECT '=== Cleaning Up Test Data ===' as status;

-- Show what will be deleted
SELECT 'Test data to be deleted:' as info;
SELECT 'Test student enrollments:' as category;
SELECT COUNT(*) as count FROM student_courses sc
JOIN students s ON sc.student_id = s.id
WHERE s.student_id LIKE 'TEST_%';

SELECT 'Test courses:' as category;
SELECT COUNT(*) as count FROM courses c
JOIN classes cl ON c.class_id = cl.id
WHERE cl.name LIKE 'TEST_%';

SELECT 'Test students:' as category;
SELECT COUNT(*) as count FROM students WHERE student_id LIKE 'TEST_%';

SELECT 'Test classes:' as category;
SELECT COUNT(*) as count FROM classes WHERE name LIKE 'TEST_%';


-- Delete in correct order due to foreign key constraints
SELECT 'Deleting test student enrollments...' as action;
DELETE FROM student_courses WHERE student_id IN (
    SELECT id FROM students WHERE student_id LIKE 'TEST_%'
);

SELECT 'Deleting test courses...' as action;
DELETE FROM courses WHERE class_id IN (
    SELECT id FROM classes WHERE name LIKE 'TEST_%'
);

SELECT 'Deleting test students...' as action;
DELETE FROM students WHERE student_id LIKE 'TEST_%';

SELECT 'Deleting test classes...' as action;
DELETE FROM classes WHERE name LIKE 'TEST_%';


SELECT '=== Cleanup Complete ===' as status;