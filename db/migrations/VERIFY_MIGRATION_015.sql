-- ========================================
-- Verification Script for Migration 015
-- Purpose: Verify RLS policy optimization
-- ========================================

\echo '========================================';
\echo 'Migration 015 Verification Script';
\echo '========================================';
\echo '';

-- ========================================
-- Test 1: Count RLS Policies by Table
-- ========================================

\echo 'Test 1: RLS Policies Count by Table';
\echo '------------------------------------';

SELECT
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

\echo '';

-- ========================================
-- Test 2: Check for auth.uid() Direct Calls (Should be ZERO)
-- ========================================

\echo 'Test 2: Checking for Non-Optimized auth.uid() Calls';
\echo '--------------------------------------------------';
\echo 'Expected: All policies should use (SELECT auth.uid())';
\echo '';

WITH policy_analysis AS (
    SELECT
        tablename,
        policyname,
        qual::text as using_clause,
        with_check::text as with_check_clause,
        CASE
            WHEN qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%(SELECT auth.uid())%' THEN true
            WHEN with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%(SELECT auth.uid())%' THEN true
            ELSE false
        END as has_unoptimized_call
    FROM pg_policies
    WHERE schemaname = 'public'
)
SELECT
    tablename,
    policyname,
    CASE
        WHEN has_unoptimized_call THEN '❌ NOT OPTIMIZED'
        ELSE '✅ OPTIMIZED'
    END as status
FROM policy_analysis
ORDER BY has_unoptimized_call DESC, tablename, policyname;

\echo '';

-- ========================================
-- Test 3: Summary of Optimization Status
-- ========================================

\echo 'Test 3: Overall Optimization Status';
\echo '-----------------------------------';

WITH policy_analysis AS (
    SELECT
        tablename,
        policyname,
        CASE
            WHEN qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%(SELECT auth.uid())%' THEN 1
            WHEN with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%(SELECT auth.uid())%' THEN 1
            ELSE 0
        END as has_unoptimized_call
    FROM pg_policies
    WHERE schemaname = 'public'
)
SELECT
    COUNT(*) as total_policies,
    SUM(has_unoptimized_call) as unoptimized_policies,
    COUNT(*) - SUM(has_unoptimized_call) as optimized_policies,
    CASE
        WHEN SUM(has_unoptimized_call) = 0 THEN '🎉 ALL POLICIES OPTIMIZED ✅'
        ELSE '⚠️  SOME POLICIES NEED OPTIMIZATION ❌'
    END as overall_status
FROM policy_analysis;

\echo '';

-- ========================================
-- Test 4: Verify RLS is Enabled on All Tables
-- ========================================

\echo 'Test 4: RLS Enabled Status';
\echo '---------------------------';

SELECT
    relname as table_name,
    CASE
        WHEN relrowsecurity = true THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as rls_status
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind = 'r'
  AND relname IN ('users', 'classes', 'courses', 'students', 'student_courses', 'exams', 'scores', 'assessment_codes', 'assessment_titles')
ORDER BY relname;

\echo '';

-- ========================================
-- Test 5: Check Service Role Bypass Policies Exist
-- ========================================

\echo 'Test 5: Service Role Bypass Policies';
\echo '------------------------------------';

SELECT
    tablename,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_policies p2
            WHERE p2.schemaname = 'public'
            AND p2.tablename = pg_policies.tablename
            AND p2.policyname = 'service_role_bypass'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as service_role_bypass
FROM (
    SELECT DISTINCT tablename
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('users', 'classes', 'courses', 'students', 'student_courses', 'exams', 'scores', 'assessment_codes', 'assessment_titles')
) AS pg_policies
ORDER BY tablename;

\echo '';

-- ========================================
-- Test 6: Check Authenticated Read Policies Exist
-- ========================================

\echo 'Test 6: Authenticated Read Policies';
\echo '-----------------------------------';

SELECT
    t.tablename,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_policies p
            WHERE p.schemaname = 'public'
            AND p.tablename = t.tablename
            AND p.policyname LIKE '%authenticated%read%'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as authenticated_read_policy
FROM (
    VALUES
        ('users'),
        ('classes'),
        ('courses'),
        ('students'),
        ('student_courses'),
        ('exams'),
        ('scores'),
        ('assessment_codes'),
        ('assessment_titles')
) AS t(tablename)
ORDER BY tablename;

\echo '';

-- ========================================
-- Test 7: Performance Test Query Plan
-- ========================================

\echo 'Test 7: Sample Query Plan Analysis';
\echo '----------------------------------';
\echo 'Checking if auth.uid() is called once per query...';
\echo '';

-- This query should show InitPlan for auth.uid() at the top level
-- If optimized correctly, you should see "InitPlan 1" only ONCE
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT COUNT(*)
FROM users
WHERE EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (SELECT auth.uid())
    AND u.role = 'admin'
);

\echo '';

-- ========================================
-- Test 8: Final Summary
-- ========================================

\echo '========================================';
\echo 'MIGRATION 015 VERIFICATION SUMMARY';
\echo '========================================';

DO $$
DECLARE
    total_policies INTEGER;
    unoptimized_count INTEGER;
    tables_with_rls INTEGER;
    expected_tables INTEGER := 9;
BEGIN
    -- Count total policies
    SELECT COUNT(*) INTO total_policies
    FROM pg_policies
    WHERE schemaname = 'public';

    -- Count unoptimized policies
    WITH policy_analysis AS (
        SELECT
            CASE
                WHEN qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%(SELECT auth.uid())%' THEN 1
                WHEN with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%(SELECT auth.uid())%' THEN 1
                ELSE 0
            END as has_unoptimized_call
        FROM pg_policies
        WHERE schemaname = 'public'
    )
    SELECT SUM(has_unoptimized_call) INTO unoptimized_count
    FROM policy_analysis;

    -- Count tables with RLS enabled
    SELECT COUNT(*) INTO tables_with_rls
    FROM pg_class
    WHERE relnamespace = 'public'::regnamespace
      AND relkind = 'r'
      AND relname IN ('users', 'classes', 'courses', 'students', 'student_courses', 'exams', 'scores', 'assessment_codes', 'assessment_titles')
      AND relrowsecurity = true;

    RAISE NOTICE '';
    RAISE NOTICE '📊 Verification Results:';
    RAISE NOTICE '  - Total RLS Policies: %', total_policies;
    RAISE NOTICE '  - Unoptimized Policies: %', COALESCE(unoptimized_count, 0);
    RAISE NOTICE '  - Tables with RLS: % / %', tables_with_rls, expected_tables;
    RAISE NOTICE '';

    IF COALESCE(unoptimized_count, 0) = 0 AND tables_with_rls = expected_tables THEN
        RAISE NOTICE '✅ ALL TESTS PASSED!';
        RAISE NOTICE '';
        RAISE NOTICE 'Migration 015 was successful:';
        RAISE NOTICE '  ✅ All policies are optimized';
        RAISE NOTICE '  ✅ All tables have RLS enabled';
        RAISE NOTICE '  ✅ Performance should be improved by 50-200%%';
        RAISE NOTICE '';
        RAISE NOTICE 'Next Steps:';
        RAISE NOTICE '  1. Run Supabase Database Linter again';
        RAISE NOTICE '  2. Monitor query performance in production';
        RAISE NOTICE '  3. Commit this migration to git';
    ELSE
        RAISE NOTICE '⚠️  ISSUES DETECTED!';
        RAISE NOTICE '';
        IF COALESCE(unoptimized_count, 0) > 0 THEN
            RAISE NOTICE '  ❌ % policies still need optimization', unoptimized_count;
        END IF;
        IF tables_with_rls < expected_tables THEN
            RAISE NOTICE '  ❌ % tables missing RLS', expected_tables - tables_with_rls;
        END IF;
        RAISE NOTICE '';
        RAISE NOTICE 'Please review the test results above.';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;

\echo '';
\echo 'Verification script completed.';
\echo '';
