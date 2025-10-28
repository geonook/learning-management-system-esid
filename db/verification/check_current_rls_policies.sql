-- Check current RLS policies in Supabase
-- This script queries the pg_policies system catalog to see what's actually deployed

-- List all RLS policies in public schema
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Count policies by table
SELECT
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Check RLS status for each table
SELECT
    relname as table_name,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind = 'r'
  AND relname IN ('users', 'classes', 'courses', 'students', 'exams', 'scores', 'assessment_codes', 'assessment_titles', 'student_courses')
ORDER BY relname;
