-- Database Clean Reset Script
-- Date: 2025-08-12
-- Purpose: Remove all migration baggage and prepare for clean schema deployment

-- ⚠️ WARNING: This will delete ALL existing data
-- Only run this if you've backed up anything important

BEGIN;

-- Drop all existing tables to remove migration baggage
SELECT '=== STARTING CLEAN RESET ===' as status;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS scores CASCADE;
DROP TABLE IF EXISTS assessment_titles CASCADE;  
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS schema_versions CASCADE;

-- Drop all custom types to clean up enum baggage
DROP TYPE IF EXISTS assessment_code CASCADE;
DROP TYPE IF EXISTS level_type CASCADE;
DROP TYPE IF EXISTS course_type CASCADE;
DROP TYPE IF EXISTS track_type CASCADE;
DROP TYPE IF EXISTS teacher_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Drop any orphaned functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop any remaining indexes that might conflict
-- (Most should be dropped with tables, but just in case)
DROP INDEX IF EXISTS idx_users_email_hash;
DROP INDEX IF EXISTS idx_users_role_active;
DROP INDEX IF EXISTS idx_users_teacher_type;
DROP INDEX IF EXISTS idx_users_grade_track;
DROP INDEX IF EXISTS idx_classes_name_hash;
DROP INDEX IF EXISTS idx_classes_grade_track;
DROP INDEX IF EXISTS idx_classes_academic_year;
DROP INDEX IF EXISTS idx_classes_active;
DROP INDEX IF EXISTS idx_courses_class_type;
DROP INDEX IF EXISTS idx_courses_teacher_id;
DROP INDEX IF EXISTS idx_courses_academic_year;
DROP INDEX IF EXISTS idx_students_student_id_hash;
DROP INDEX IF EXISTS idx_students_class_id;
DROP INDEX IF EXISTS idx_students_grade_track;
DROP INDEX IF EXISTS idx_students_active;
DROP INDEX IF EXISTS idx_exams_class_id;
DROP INDEX IF EXISTS idx_exams_name_class;
DROP INDEX IF EXISTS idx_exams_created_by;
DROP INDEX IF EXISTS idx_scores_student_exam;
DROP INDEX IF EXISTS idx_scores_assessment_code;
DROP INDEX IF EXISTS idx_scores_entered_by;
DROP INDEX IF EXISTS idx_assessment_titles_hierarchy;

-- Clean up any RLS policies (they'll be recreated)
-- Note: Tables are already dropped, so policies should be gone

-- Verify clean state
SELECT '=== VERIFYING CLEAN STATE ===' as status;

-- Check for any remaining tables
SELECT count(*) as remaining_tables 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- Check for any remaining types
SELECT count(*) as remaining_types
FROM pg_type 
WHERE typnamespace = (
    SELECT oid FROM pg_namespace WHERE nspname = 'public'
) AND typtype = 'e'; -- enum types

-- Check for any remaining functions
SELECT count(*) as remaining_functions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';

SELECT '=== CLEAN RESET COMPLETED - READY FOR DEPLOYMENT ===' as status;

COMMIT;