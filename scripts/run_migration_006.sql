-- Run Migration 006: Support Primary School CSV Import
-- Execute this script to update the database for primary school support

\echo 'Starting Migration 006: Primary School CSV Import Support'
\echo '============================================================'

-- Clear any existing data first (development environment)
\echo 'Cleaning existing data...'
DELETE FROM scores WHERE id IS NOT NULL;
DELETE FROM student_courses WHERE id IS NOT NULL;
DELETE FROM students WHERE id IS NOT NULL;
DELETE FROM courses WHERE id IS NOT NULL;
DELETE FROM classes WHERE id IS NOT NULL;
DELETE FROM users WHERE email != 'admin@dev.local';
\echo 'Data cleanup completed'

-- Execute the migration
\echo 'Executing migration 006...'
\i /Users/chenzehong/Desktop/LMS/db/migrations/006_support_primary_school_csv_import.sql

\echo 'Migration 006 completed successfully!'
\echo '===================================='
\echo 'Database is now ready for primary school CSV import'