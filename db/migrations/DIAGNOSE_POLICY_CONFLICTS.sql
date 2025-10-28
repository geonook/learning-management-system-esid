-- ========================================
-- Policy Conflict Diagnostic Script
-- Purpose: Diagnose why Migration 015 failed
-- Date: 2025-10-28
-- ========================================

\echo '========================================';
\echo 'Migration 015 Conflict Diagnostic';
\echo '========================================';
\echo '';

-- ========================================
-- Test 1: Check for Conflicting Policies
-- ========================================

\echo 'Test 1: Checking for Policies that Conflict with Migration 015';
\echo '--------------------------------------------------------------';
\echo '';

-- List all service_role_bypass policies
SELECT
    'service_role_bypass policies' as policy_type,
    tablename,
    policyname,
    '❌ CONFLICTS with Migration 015 Part 11' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname = 'service_role_bypass'
ORDER BY tablename;

\echo '';

-- List all authenticated_read policies
SELECT
    'authenticated_read policies' as policy_type,
    tablename,
    policyname,
    '❌ CONFLICTS with Migration 015 Part 12' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND (policyname LIKE '%authenticated%read%' OR policyname = 'users_own_profile')
ORDER BY tablename, policyname;

\echo '';

-- ========================================
-- Test 2: Count All Existing Policies
-- ========================================

\echo 'Test 2: Count of All RLS Policies by Table';
\echo '------------------------------------------';

SELECT
    tablename,
    COUNT(*) as policy_count,
    string_agg(policyname, ', ' ORDER BY policyname) as policy_names
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'classes', 'courses', 'students', 'student_courses', 'exams', 'scores', 'assessment_codes', 'assessment_titles')
GROUP BY tablename
ORDER BY tablename;

\echo '';

-- ========================================
-- Test 3: Check Which Part of Migration 015 Was Executed
-- ========================================

\echo 'Test 3: Analyzing Migration 015 Execution Status';
\echo '------------------------------------------------';

DO $$
DECLARE
    part1_policies INTEGER;
    part11_policies INTEGER;
    part12_policies INTEGER;
BEGIN
    -- Check Part 1-10 policies (core role-based policies)
    SELECT COUNT(*) INTO part1_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname IN (
          'Admin full access to users',
          'Users can view own profile',
          'Users can update own profile',
          'Heads can view users in jurisdiction',
          'Admin full access to classes',
          'Teachers can view their classes',
          'Heads can view classes in grade',
          'Heads can manage classes in grade'
      );

    -- Check Part 11 policies (service_role_bypass)
    SELECT COUNT(*) INTO part11_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname = 'service_role_bypass';

    -- Check Part 12 policies (authenticated_read)
    SELECT COUNT(*) INTO part12_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (policyname LIKE '%authenticated%read%' OR policyname = 'users_own_profile');

    RAISE NOTICE '';
    RAISE NOTICE 'Migration 015 Execution Analysis:';
    RAISE NOTICE '  Part 1-10 (Core Policies): % policies found', part1_policies;
    RAISE NOTICE '  Part 11 (service_role_bypass): % policies found', part11_policies;
    RAISE NOTICE '  Part 12 (authenticated_read): % policies found', part12_policies;
    RAISE NOTICE '';

    IF part1_policies > 0 AND part11_policies = 0 AND part12_policies = 0 THEN
        RAISE NOTICE '✅ Status: Part 1-10 executed, Part 11-12 not started';
        RAISE NOTICE '   → Migration 015 stopped before Part 11';
        RAISE NOTICE '   → Safe to continue from Part 11';
    ELSIF part1_policies > 0 AND part11_policies > 0 AND part12_policies = 0 THEN
        RAISE NOTICE '⚠️  Status: Part 1-11 executed, Part 12 not started';
        RAISE NOTICE '   → Migration 015 stopped at Part 11';
        RAISE NOTICE '   → Need to cleanup Part 11 before retry';
    ELSIF part1_policies > 0 AND part11_policies > 0 AND part12_policies > 0 THEN
        RAISE NOTICE '✅ Status: All parts executed';
        RAISE NOTICE '   → Migration 015 completed successfully';
        RAISE NOTICE '   → Error might be from re-running migration';
    ELSIF part1_policies = 0 AND (part11_policies > 0 OR part12_policies > 0) THEN
        RAISE NOTICE '❌ Status: INCONSISTENT - Part 11/12 exists but Part 1-10 missing';
        RAISE NOTICE '   → Policies from unknown source';
        RAISE NOTICE '   → Recommend full cleanup and re-execution';
    ELSE
        RAISE NOTICE '❌ Status: UNEXPECTED state';
        RAISE NOTICE '   → Manual review required';
    END IF;
END $$;

\echo '';

-- ========================================
-- Test 4: Check for Non-Optimized Policies
-- ========================================

\echo 'Test 4: Checking if Existing Policies are Optimized';
\echo '---------------------------------------------------';

WITH policy_analysis AS (
    SELECT
        tablename,
        policyname,
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
    COUNT(*) as total_policies,
    SUM(CASE WHEN has_unoptimized_call THEN 1 ELSE 0 END) as unoptimized_policies,
    CASE
        WHEN SUM(CASE WHEN has_unoptimized_call THEN 1 ELSE 0 END) = 0 THEN '✅ All Optimized'
        WHEN SUM(CASE WHEN has_unoptimized_call THEN 1 ELSE 0 END) = COUNT(*) THEN '❌ None Optimized'
        ELSE '⚠️  Partially Optimized'
    END as optimization_status
FROM policy_analysis
GROUP BY tablename
ORDER BY tablename;

\echo '';

-- ========================================
-- Test 5: List All Policies on Affected Tables
-- ========================================

\echo 'Test 5: Complete Policy List (All 9 Tables)';
\echo '-------------------------------------------';

SELECT
    tablename,
    policyname,
    cmd as operation,
    CASE
        WHEN policyname = 'service_role_bypass' THEN '🔴 CONFLICTS (Part 11)'
        WHEN policyname LIKE '%authenticated%read%' OR policyname = 'users_own_profile' THEN '🟡 CONFLICTS (Part 12)'
        ELSE '🟢 OK'
    END as conflict_status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'classes', 'courses', 'students', 'student_courses', 'exams', 'scores', 'assessment_codes', 'assessment_titles')
ORDER BY tablename, policyname;

\echo '';

-- ========================================
-- Summary and Recommendations
-- ========================================

\echo '========================================';
\echo 'DIAGNOSTIC SUMMARY & RECOMMENDATIONS';
\echo '========================================';

DO $$
DECLARE
    conflicting_policies INTEGER;
    total_policies INTEGER;
    service_role_count INTEGER;
    authenticated_read_count INTEGER;
BEGIN
    -- Count conflicting policies
    SELECT COUNT(*) INTO conflicting_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (policyname = 'service_role_bypass'
           OR policyname LIKE '%authenticated%read%'
           OR policyname = 'users_own_profile');

    SELECT COUNT(*) INTO total_policies
    FROM pg_policies
    WHERE schemaname = 'public';

    SELECT COUNT(*) INTO service_role_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname = 'service_role_bypass';

    SELECT COUNT(*) INTO authenticated_read_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (policyname LIKE '%authenticated%read%' OR policyname = 'users_own_profile');

    RAISE NOTICE '';
    RAISE NOTICE '📊 Diagnostic Summary:';
    RAISE NOTICE '  Total RLS Policies: %', total_policies;
    RAISE NOTICE '  Conflicting Policies: %', conflicting_policies;
    RAISE NOTICE '    - service_role_bypass: %', service_role_count;
    RAISE NOTICE '    - authenticated_read: %', authenticated_read_count;
    RAISE NOTICE '';

    IF conflicting_policies = 0 THEN
        RAISE NOTICE '✅ NO CONFLICTS FOUND';
        RAISE NOTICE '';
        RAISE NOTICE 'Recommendation:';
        RAISE NOTICE '  → Migration 015 should execute successfully';
        RAISE NOTICE '  → No cleanup needed';
        RAISE NOTICE '  → Proceed with execution';
    ELSIF conflicting_policies > 0 AND conflicting_policies < 20 THEN
        RAISE NOTICE '⚠️  MINOR CONFLICTS DETECTED';
        RAISE NOTICE '';
        RAISE NOTICE 'Recommendation:';
        RAISE NOTICE '  → Run CLEANUP_CONFLICTING_POLICIES.sql';
        RAISE NOTICE '  → Then re-execute Migration 015';
        RAISE NOTICE '  → Or use Migration 015b (idempotent version)';
    ELSIF conflicting_policies >= 20 THEN
        RAISE NOTICE '🔴 MAJOR CONFLICTS DETECTED';
        RAISE NOTICE '';
        RAISE NOTICE 'Recommendation:';
        RAISE NOTICE '  → Migration 015 was partially executed';
        RAISE NOTICE '  → Run CLEANUP_CONFLICTING_POLICIES.sql';
        RAISE NOTICE '  → Use Migration 015b (idempotent version)';
        RAISE NOTICE '  → Verify with VERIFY_MIGRATION_015.sql after execution';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Run: CLEANUP_CONFLICTING_POLICIES.sql';
    RAISE NOTICE '  2. Run: 015b_optimize_rls_performance_idempotent.sql';
    RAISE NOTICE '  3. Verify: VERIFY_MIGRATION_015.sql';
    RAISE NOTICE '========================================';
END $$;

\echo '';
\echo 'Diagnostic complete. See recommendations above.';
\echo '';
