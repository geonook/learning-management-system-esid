-- ========================================
-- Policy Conflict Diagnostic Script (SELECT Version)
-- Purpose: Diagnose why Migration 015 failed (Shows results in Results panel)
-- Date: 2025-10-28
-- Compatibility: Supabase SQL Editor
-- ========================================

-- Test 1: Check for service_role_bypass policies (Migration 015 Part 11 conflicts)
SELECT
    '🔴 PART 11 CONFLICTS' as test_section,
    tablename,
    policyname,
    '❌ CONFLICTS with Migration 015 Part 11' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname = 'service_role_bypass'
ORDER BY tablename;

-- Test 2: Check for authenticated_read policies (Migration 015 Part 12 conflicts)
SELECT
    '🟡 PART 12 CONFLICTS' as test_section,
    tablename,
    policyname,
    '❌ CONFLICTS with Migration 015 Part 12' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND (policyname LIKE '%authenticated%read%' OR policyname = 'users_own_profile')
ORDER BY tablename, policyname;

-- Test 3: Count all policies by table
SELECT
    '📊 POLICY COUNT' as test_section,
    tablename,
    COUNT(*) as total_policies,
    string_agg(policyname, ', ' ORDER BY policyname) as policy_names
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'classes', 'courses', 'students', 'student_courses', 'exams', 'scores', 'assessment_codes', 'assessment_titles')
GROUP BY tablename
ORDER BY tablename;

-- Test 4: Check optimization status
WITH policy_analysis AS (
    SELECT
        tablename,
        policyname,
        CASE
            WHEN qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%(SELECT auth.uid())%' THEN 1
            WHEN with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%(SELECT auth.uid())%' THEN 1
            ELSE 0
        END as is_unoptimized
    FROM pg_policies
    WHERE schemaname = 'public'
)
SELECT
    '🔍 OPTIMIZATION STATUS' as test_section,
    tablename,
    COUNT(*) as total_policies,
    SUM(is_unoptimized) as unoptimized_policies,
    COUNT(*) - SUM(is_unoptimized) as optimized_policies,
    CASE
        WHEN SUM(is_unoptimized) = 0 THEN '✅ All Optimized'
        WHEN SUM(is_unoptimized) = COUNT(*) THEN '❌ None Optimized'
        ELSE '⚠️  Partially Optimized'
    END as optimization_status
FROM policy_analysis
GROUP BY tablename
ORDER BY tablename;

-- Test 5: Summary and conflict count
SELECT
    '📋 SUMMARY' as test_section,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND policyname = 'service_role_bypass') as service_role_bypass_count,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND (policyname LIKE '%authenticated%read%' OR policyname = 'users_own_profile')) as authenticated_read_count,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND (policyname = 'service_role_bypass' OR policyname LIKE '%authenticated%read%' OR policyname = 'users_own_profile')) as total_conflicts,
    CASE
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND (policyname = 'service_role_bypass' OR policyname LIKE '%authenticated%read%' OR policyname = 'users_own_profile')) = 0
        THEN '✅ NO CONFLICTS - Can run Migration 015'
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND (policyname = 'service_role_bypass' OR policyname LIKE '%authenticated%read%' OR policyname = 'users_own_profile')) < 20
        THEN '⚠️  MINOR CONFLICTS - Run cleanup script first'
        ELSE '🔴 MAJOR CONFLICTS - Run cleanup script or use 015b'
    END as recommendation;

-- Test 6: Complete policy list with conflict indicators
SELECT
    '📝 COMPLETE POLICY LIST' as test_section,
    tablename,
    policyname,
    cmd as operation,
    CASE
        WHEN policyname = 'service_role_bypass' THEN '🔴 CONFLICTS (Part 11)'
        WHEN policyname LIKE '%authenticated%read%' OR policyname = 'users_own_profile' THEN '🟡 CONFLICTS (Part 12)'
        ELSE '🟢 OK'
    END as conflict_status,
    CASE
        WHEN qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%(SELECT auth.uid())%' THEN '❌ NOT OPTIMIZED'
        WHEN with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%(SELECT auth.uid())%' THEN '❌ NOT OPTIMIZED'
        WHEN qual::text LIKE '%(SELECT auth.uid())%' OR with_check::text LIKE '%(SELECT auth.uid())%' THEN '✅ OPTIMIZED'
        ELSE '➖ N/A'
    END as optimization_status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'classes', 'courses', 'students', 'student_courses', 'exams', 'scores', 'assessment_codes', 'assessment_titles')
ORDER BY tablename, policyname;
