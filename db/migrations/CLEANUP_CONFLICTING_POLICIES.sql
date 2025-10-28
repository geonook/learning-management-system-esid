-- ========================================
-- Cleanup Conflicting Policies Script
-- Purpose: Remove policies that conflict with Migration 015
-- Date: 2025-10-28
-- Safety: This script only removes policies that will be recreated
-- ========================================

\echo '========================================';
\echo 'Cleanup Conflicting Policies';
\echo '========================================';
\echo '';
\echo '⚠️  WARNING: This will remove policies that conflict with Migration 015';
\echo '   These policies will be recreated when you run Migration 015b';
\echo '';
\echo 'Press Ctrl+C within 5 seconds to cancel...';
\echo '';

-- Add a small delay (PostgreSQL doesn't have SLEEP, but we can simulate with a query)
SELECT pg_sleep(5);

\echo 'Proceeding with cleanup...';
\echo '';

-- ========================================
-- Part 1: Remove service_role_bypass Policies
-- ========================================

DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    -- Count existing service_role_bypass policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname = 'service_role_bypass';

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Part 1: Removing service_role_bypass Policies';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Found % service_role_bypass policies', policy_count;
    RAISE NOTICE '';
END $$;

-- Drop service_role_bypass policies from all tables
DROP POLICY IF EXISTS "service_role_bypass" ON users;
DROP POLICY IF EXISTS "service_role_bypass" ON classes;
DROP POLICY IF EXISTS "service_role_bypass" ON courses;
DROP POLICY IF EXISTS "service_role_bypass" ON students;
DROP POLICY IF EXISTS "service_role_bypass" ON student_courses;
DROP POLICY IF EXISTS "service_role_bypass" ON exams;
DROP POLICY IF EXISTS "service_role_bypass" ON assessment_codes;
DROP POLICY IF EXISTS "service_role_bypass" ON scores;
DROP POLICY IF EXISTS "service_role_bypass" ON assessment_titles;

DO $$
BEGIN
    RAISE NOTICE '✅ Part 1 Complete: service_role_bypass policies removed';
    RAISE NOTICE '';
END $$;

-- ========================================
-- Part 2: Remove authenticated_read Policies
-- ========================================

DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    -- Count existing authenticated_read policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (policyname LIKE '%authenticated%read%' OR policyname = 'users_own_profile');

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Part 2: Removing authenticated_read Policies';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Found % authenticated_read policies', policy_count;
    RAISE NOTICE '';
END $$;

-- Drop authenticated_read policies from all tables
DROP POLICY IF EXISTS "users_own_profile" ON users;
DROP POLICY IF EXISTS "users_authenticated_read" ON users;
DROP POLICY IF EXISTS "authenticated_read_classes" ON classes;
DROP POLICY IF EXISTS "authenticated_read_courses" ON courses;
DROP POLICY IF EXISTS "authenticated_read_students" ON students;
DROP POLICY IF EXISTS "authenticated_read_student_courses" ON student_courses;
DROP POLICY IF EXISTS "authenticated_read_exams" ON exams;
DROP POLICY IF EXISTS "authenticated_read_assessment_codes" ON assessment_codes;
DROP POLICY IF EXISTS "authenticated_read_scores" ON scores;
DROP POLICY IF EXISTS "authenticated_read_assessment_titles" ON assessment_titles;

DO $$
BEGIN
    RAISE NOTICE '✅ Part 2 Complete: authenticated_read policies removed';
    RAISE NOTICE '';
END $$;

-- ========================================
-- Part 3: Verify Cleanup
-- ========================================

DO $$
DECLARE
    remaining_service_role INTEGER;
    remaining_authenticated_read INTEGER;
    total_remaining INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Part 3: Verifying Cleanup';
    RAISE NOTICE '========================================';

    -- Check for remaining service_role_bypass policies
    SELECT COUNT(*) INTO remaining_service_role
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname = 'service_role_bypass';

    -- Check for remaining authenticated_read policies
    SELECT COUNT(*) INTO remaining_authenticated_read
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (policyname LIKE '%authenticated%read%' OR policyname = 'users_own_profile');

    total_remaining := remaining_service_role + remaining_authenticated_read;

    RAISE NOTICE 'Verification Results:';
    RAISE NOTICE '  Remaining service_role_bypass: %', remaining_service_role;
    RAISE NOTICE '  Remaining authenticated_read: %', remaining_authenticated_read;
    RAISE NOTICE '  Total Remaining Conflicts: %', total_remaining;
    RAISE NOTICE '';

    IF total_remaining = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All conflicting policies removed';
        RAISE NOTICE '';
        RAISE NOTICE 'Next Steps:';
        RAISE NOTICE '  1. Run Migration 015b (idempotent version)';
        RAISE NOTICE '     → 015b_optimize_rls_performance_idempotent.sql';
        RAISE NOTICE '  2. Verify execution';
        RAISE NOTICE '     → VERIFY_MIGRATION_015.sql';
        RAISE NOTICE '  3. Check Database Linter';
        RAISE NOTICE '     → Confirm auth_rls_initplan warnings are gone';
    ELSE
        RAISE NOTICE '⚠️  WARNING: Some conflicting policies still remain';
        RAISE NOTICE '';
        RAISE NOTICE 'Recommendation:';
        RAISE NOTICE '  → Re-run this cleanup script';
        RAISE NOTICE '  → Or manually DROP remaining policies';
        RAISE NOTICE '  → Then run Migration 015b';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;

-- ========================================
-- Part 4: Display Current Policy Status
-- ========================================

\echo '';
\echo 'Current RLS Policy Count by Table:';
\echo '----------------------------------';

SELECT
    tablename,
    COUNT(*) as policy_count,
    string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'classes', 'courses', 'students', 'student_courses', 'exams', 'scores', 'assessment_codes', 'assessment_titles')
GROUP BY tablename
ORDER BY tablename;

\echo '';
\echo '========================================';
\echo 'Cleanup Complete';
\echo '========================================';
\echo '';
\echo 'You can now safely run Migration 015b';
\echo '';
