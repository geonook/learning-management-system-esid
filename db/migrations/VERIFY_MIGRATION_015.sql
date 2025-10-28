-- ========================================
-- Verification Script for Migration 015
-- Purpose: Verify RLS policy optimization
-- Date: 2025-10-28
-- Compatibility: Supabase SQL Editor
-- ========================================

-- ========================================
-- Header
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 015 Verification Script';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- ========================================
-- Test 1: Count RLS Policies by Table
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Test 1: RLS Policies Count by Table';
    RAISE NOTICE '------------------------------------';
    RAISE NOTICE '';
END $$;

DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
        SELECT
            tablename,
            COUNT(*) as policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        GROUP BY tablename
        ORDER BY tablename
    LOOP
        RAISE NOTICE '%: % policies', table_record.tablename, table_record.policy_count;
    END LOOP;
    RAISE NOTICE '';
END $$;

-- ========================================
-- Test 2: Check for auth.uid() Direct Calls (Should be ZERO)
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Test 2: Checking for Non-Optimized auth.uid() Calls';
    RAISE NOTICE '--------------------------------------------------';
    RAISE NOTICE 'Expected: All policies should use (SELECT auth.uid())';
    RAISE NOTICE '';
END $$;

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
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
        ORDER BY has_unoptimized_call DESC, tablename, policyname
    LOOP
        RAISE NOTICE '%.%: %', policy_record.tablename, policy_record.policyname, policy_record.status;
    END LOOP;
    RAISE NOTICE '';
END $$;

-- ========================================
-- Test 3: Summary of Optimization Status
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Test 3: Overall Optimization Status';
    RAISE NOTICE '-----------------------------------';
    RAISE NOTICE '';
END $$;

DO $$
DECLARE
    total_policies INTEGER;
    unoptimized_policies INTEGER;
    optimized_policies INTEGER;
    overall_status TEXT;
BEGIN
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
        COUNT(*),
        SUM(has_unoptimized_call),
        COUNT(*) - SUM(has_unoptimized_call),
        CASE
            WHEN SUM(has_unoptimized_call) = 0 THEN '🎉 ALL POLICIES OPTIMIZED ✅'
            ELSE '⚠️  SOME POLICIES NEED OPTIMIZATION ❌'
        END
    INTO total_policies, unoptimized_policies, optimized_policies, overall_status
    FROM policy_analysis;

    RAISE NOTICE 'Total Policies: %', total_policies;
    RAISE NOTICE 'Unoptimized: %', COALESCE(unoptimized_policies, 0);
    RAISE NOTICE 'Optimized: %', optimized_policies;
    RAISE NOTICE 'Status: %', overall_status;
    RAISE NOTICE '';
END $$;

-- ========================================
-- Test 4: Verify RLS is Enabled on All Tables
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Test 4: RLS Enabled Status';
    RAISE NOTICE '---------------------------';
    RAISE NOTICE '';
END $$;

DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
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
        ORDER BY relname
    LOOP
        RAISE NOTICE '%: %', table_record.table_name, table_record.rls_status;
    END LOOP;
    RAISE NOTICE '';
END $$;

-- ========================================
-- Test 5: Check Service Role Bypass Policies Exist
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Test 5: Service Role Bypass Policies';
    RAISE NOTICE '------------------------------------';
    RAISE NOTICE '';
END $$;

DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
        SELECT
            tablename,
            CASE
                WHEN EXISTS (
                    SELECT 1 FROM pg_policies p2
                    WHERE p2.schemaname = 'public'
                    AND p2.tablename = t.tablename
                    AND p2.policyname = 'service_role_bypass'
                ) THEN '✅ EXISTS'
                ELSE '❌ MISSING'
            END as service_role_bypass
        FROM (
            SELECT DISTINCT tablename
            FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename IN ('users', 'classes', 'courses', 'students', 'student_courses', 'exams', 'scores', 'assessment_codes', 'assessment_titles')
        ) AS t
        ORDER BY tablename
    LOOP
        RAISE NOTICE '%: %', table_record.tablename, table_record.service_role_bypass;
    END LOOP;
    RAISE NOTICE '';
END $$;

-- ========================================
-- Test 6: Check Authenticated Read Policies Exist
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Test 6: Authenticated Read Policies';
    RAISE NOTICE '-----------------------------------';
    RAISE NOTICE '';
END $$;

DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
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
        ORDER BY tablename
    LOOP
        RAISE NOTICE '%: %', table_record.tablename, table_record.authenticated_read_policy;
    END LOOP;
    RAISE NOTICE '';
END $$;

-- ========================================
-- Test 7: Performance Test Query Plan
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Test 7: Sample Query Plan Analysis';
    RAISE NOTICE '----------------------------------';
    RAISE NOTICE 'Checking if auth.uid() is called once per query...';
    RAISE NOTICE '';
    RAISE NOTICE 'NOTE: This test requires manual EXPLAIN ANALYZE execution.';
    RAISE NOTICE 'To test, run the following query separately in SQL Editor:';
    RAISE NOTICE '';
    RAISE NOTICE 'EXPLAIN (ANALYZE, BUFFERS, VERBOSE)';
    RAISE NOTICE 'SELECT COUNT(*)';
    RAISE NOTICE 'FROM users';
    RAISE NOTICE 'WHERE EXISTS (';
    RAISE NOTICE '    SELECT 1 FROM users u';
    RAISE NOTICE '    WHERE u.id = (SELECT auth.uid())';
    RAISE NOTICE '    AND u.role = ''admin''';
    RAISE NOTICE ');';
    RAISE NOTICE '';
    RAISE NOTICE 'Expected: You should see "InitPlan 1" only ONCE at the top level.';
    RAISE NOTICE '';
END $$;

-- ========================================
-- Test 8: Final Summary
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION 015 VERIFICATION SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

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

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Verification script completed.';
    RAISE NOTICE '';
END $$;
