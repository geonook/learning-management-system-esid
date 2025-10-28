-- ========================================
-- Migration 015 Final Verification Script (SELECT Version)
-- Purpose: Verify Migration 015 execution was successful
-- Date: 2025-10-28
-- Compatibility: Supabase SQL Editor
-- Usage: Run this script after executing Migration 015b
-- ========================================

-- ========================================
-- Test 1: Check for Unoptimized Policies
-- ========================================
-- Expected: 0 unoptimized policies if Migration 015 succeeded

SELECT
    '🔍 TEST 1: UNOPTIMIZED POLICIES' as test_name,
    COUNT(*) as unoptimized_count,
    CASE
        WHEN COUNT(*) = 0 THEN '✅ PASS - All policies are optimized'
        ELSE '❌ FAIL - ' || COUNT(*) || ' policies still need optimization'
    END as test_result
FROM pg_policies
WHERE schemaname = 'public'
  AND (
      (qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%(SELECT auth.uid())%')
      OR
      (with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%(SELECT auth.uid())%')
  );

-- ========================================
-- Test 2: Verify service_role_bypass Policies
-- ========================================
-- Expected: 9 service_role_bypass policies (one per table), all optimized

SELECT
    '🔴 TEST 2: SERVICE_ROLE_BYPASS POLICIES' as test_name,
    tablename,
    policyname,
    CASE
        WHEN qual::text ~ '\(SELECT auth\.uid\(\)\)' THEN '✅ OPTIMIZED'
        WHEN with_check::text ~ '\(SELECT auth\.uid\(\)\)' THEN '✅ OPTIMIZED'
        WHEN qual IS NULL AND with_check IS NULL THEN '✅ OK (No auth.uid)'
        ELSE '❌ NOT OPTIMIZED'
    END as optimization_status
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname = 'service_role_bypass'
ORDER BY tablename;

-- ========================================
-- Test 3: Verify authenticated_read Policies
-- ========================================
-- Expected: 10 authenticated_read policies, all optimized

SELECT
    '🟡 TEST 3: AUTHENTICATED_READ POLICIES' as test_name,
    tablename,
    policyname,
    CASE
        WHEN qual::text ~ '\(SELECT auth\.uid\(\)\)' THEN '✅ OPTIMIZED'
        WHEN with_check::text ~ '\(SELECT auth\.uid\(\)\)' THEN '✅ OPTIMIZED'
        WHEN qual IS NULL AND with_check IS NULL THEN '✅ OK (No auth.uid)'
        ELSE '❌ NOT OPTIMIZED'
    END as optimization_status
FROM pg_policies
WHERE schemaname = 'public'
  AND (policyname LIKE '%authenticated%read%' OR policyname = 'users_own_profile')
ORDER BY tablename, policyname;

-- ========================================
-- Test 4: Overall Optimization Statistics
-- ========================================
-- Expected: 100% optimization rate

WITH policy_stats AS (
    SELECT
        COUNT(*) as total_policies,
        SUM(
            CASE
                WHEN (qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%(SELECT auth.uid())%')
                     OR (with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%(SELECT auth.uid())%')
                THEN 1
                ELSE 0
            END
        ) as unoptimized_policies,
        SUM(
            CASE
                WHEN qual::text ~ '\(SELECT auth\.uid\(\)\)'
                     OR with_check::text ~ '\(SELECT auth\.uid\(\)\)'
                THEN 1
                ELSE 0
            END
        ) as optimized_policies
    FROM pg_policies
    WHERE schemaname = 'public'
)
SELECT
    '📊 TEST 4: OPTIMIZATION STATISTICS' as test_name,
    total_policies,
    optimized_policies,
    unoptimized_policies,
    ROUND(
        (optimized_policies::NUMERIC / NULLIF(total_policies, 0) * 100),
        2
    ) as optimization_percentage,
    CASE
        WHEN unoptimized_policies = 0 THEN '✅ PASS - 100% optimized'
        ELSE '❌ FAIL - Only ' || ROUND((optimized_policies::NUMERIC / NULLIF(total_policies, 0) * 100), 2) || '% optimized'
    END as test_result
FROM policy_stats;

-- ========================================
-- Test 5: Policy Count by Table
-- ========================================
-- Expected: All 9 core tables should have policies

SELECT
    '📋 TEST 5: POLICY COUNT BY TABLE' as test_name,
    tablename,
    COUNT(*) as total_policies,
    SUM(
        CASE
            WHEN (qual::text ~ '\(SELECT auth\.uid\(\)\)' OR with_check::text ~ '\(SELECT auth\.uid\(\)\)')
                 OR (qual IS NULL AND with_check IS NULL)
            THEN 1
            ELSE 0
        END
    ) as optimized_policies,
    SUM(
        CASE
            WHEN (qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%(SELECT auth.uid())%')
                 OR (with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%(SELECT auth.uid())%')
            THEN 1
            ELSE 0
        END
    ) as unoptimized_policies,
    CASE
        WHEN SUM(
            CASE
                WHEN (qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%(SELECT auth.uid())%')
                     OR (with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%(SELECT auth.uid())%')
                THEN 1
                ELSE 0
            END
        ) = 0 THEN '✅ ALL OPTIMIZED'
        ELSE '❌ HAS UNOPTIMIZED'
    END as table_status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'classes', 'courses', 'students', 'student_courses', 'exams', 'scores', 'assessment_codes', 'assessment_titles')
GROUP BY tablename
ORDER BY tablename;

-- ========================================
-- Test 6: Final Summary and Recommendations
-- ========================================

WITH summary_stats AS (
    SELECT
        COUNT(*) as total_policies,
        SUM(
            CASE
                WHEN (qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%(SELECT auth.uid())%')
                     OR (with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%(SELECT auth.uid())%')
                THEN 1
                ELSE 0
            END
        ) as unoptimized_count,
        (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND policyname = 'service_role_bypass') as service_role_count,
        (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND (policyname LIKE '%authenticated%read%' OR policyname = 'users_own_profile')) as authenticated_read_count,
        (SELECT COUNT(DISTINCT relname) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relrowsecurity = true) as tables_with_rls
    FROM pg_policies
    WHERE schemaname = 'public'
)
SELECT
    '🎯 FINAL SUMMARY' as section,
    total_policies as "總 Policy 數",
    unoptimized_count as "未優化數量",
    service_role_count as "service_role_bypass 數",
    authenticated_read_count as "authenticated_read 數",
    tables_with_rls as "啟用 RLS 的資料表",
    CASE
        WHEN unoptimized_count = 0 AND service_role_count = 9 AND authenticated_read_count >= 9 AND tables_with_rls = 9
        THEN '🎉 SUCCESS - Migration 015 執行成功！'
        WHEN unoptimized_count = 0 AND service_role_count < 9
        THEN '⚠️  WARNING - 優化成功但 service_role_bypass 數量不足'
        WHEN unoptimized_count > 0
        THEN '❌ FAILED - 仍有 ' || unoptimized_count || ' 個 policies 未優化'
        ELSE '⚠️  PARTIAL - 需要檢查詳細結果'
    END as "執行狀態",
    CASE
        WHEN unoptimized_count = 0 AND service_role_count = 9 AND authenticated_read_count >= 9 AND tables_with_rls = 9
        THEN '✅ 請執行 Supabase Database Linter 驗證警告是否消失'
        WHEN unoptimized_count > 0
        THEN '❌ 請重新執行 Migration 015b 或檢查執行日誌'
        ELSE '⚠️  請檢查上方測試結果，確認問題所在'
    END as "下一步建議"
FROM summary_stats;

-- ========================================
-- Test 7: List All Unoptimized Policies (If Any)
-- ========================================
-- This query will return 0 rows if everything is optimized

SELECT
    '❌ UNOPTIMIZED POLICIES DETAIL' as test_name,
    tablename,
    policyname,
    cmd as operation,
    CASE
        WHEN qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%(SELECT auth.uid())%'
        THEN 'USING clause has unoptimized auth.uid()'
        WHEN with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%(SELECT auth.uid())%'
        THEN 'WITH CHECK clause has unoptimized auth.uid()'
        ELSE 'Unknown optimization issue'
    END as issue_description
FROM pg_policies
WHERE schemaname = 'public'
  AND (
      (qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%(SELECT auth.uid())%')
      OR
      (with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%(SELECT auth.uid())%')
  )
ORDER BY tablename, policyname;

-- ========================================
-- Expected Output if Migration 015 Succeeded:
-- ========================================
-- Test 1: unoptimized_count = 0, test_result = '✅ PASS'
-- Test 2: 9 rows, all showing '✅ OPTIMIZED'
-- Test 3: 10 rows, all showing '✅ OPTIMIZED'
-- Test 4: optimization_percentage = 100.00, test_result = '✅ PASS'
-- Test 5: 9 rows, all showing '✅ ALL OPTIMIZED'
-- Test 6: 執行狀態 = '🎉 SUCCESS', 下一步建議 = '✅ 請執行 Linter 驗證'
-- Test 7: 0 rows returned (no unoptimized policies)
-- ========================================
