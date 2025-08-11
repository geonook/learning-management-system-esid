-- Cleanup Script for Test Data
-- Date: 2025-08-11
-- Purpose: Remove all test data created during verification

\echo '=== Cleaning Up Test Data ==='
\echo ''

-- Show what will be deleted
\echo 'Test data to be deleted:'
\echo 'Test student enrollments:'
SELECT COUNT(*) as count FROM student_courses sc
JOIN students s ON sc.student_id = s.id
WHERE s.student_id LIKE 'TEST_%';

\echo 'Test courses:'
SELECT COUNT(*) as count FROM courses c
JOIN classes cl ON c.class_id = cl.id
WHERE cl.name LIKE 'TEST_%';

\echo 'Test students:'
SELECT COUNT(*) as count FROM students WHERE student_id LIKE 'TEST_%';

\echo 'Test classes:'
SELECT COUNT(*) as count FROM classes WHERE name LIKE 'TEST_%';

\echo ''

-- Delete in correct order due to foreign key constraints
\echo 'Deleting test student enrollments...'
DELETE FROM student_courses WHERE student_id IN (
    SELECT id FROM students WHERE student_id LIKE 'TEST_%'
);

\echo 'Deleting test courses...'
DELETE FROM courses WHERE class_id IN (
    SELECT id FROM classes WHERE name LIKE 'TEST_%'
);

\echo 'Deleting test students...'
DELETE FROM students WHERE student_id LIKE 'TEST_%';

\echo 'Deleting test classes...'
DELETE FROM classes WHERE name LIKE 'TEST_%';

\echo ''
\echo '=== Cleanup Complete ==='