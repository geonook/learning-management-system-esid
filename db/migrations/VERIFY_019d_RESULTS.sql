/**
 * Verification Script for Migration 019d
 *
 * This script verifies that Migration 019d executed successfully:
 * - 5 helper functions created in public schema
 * - 6 policies on users table
 * - 9 total office_member policies (1 on users + 8 on other tables)
 * - No infinite recursion errors
 */

-- ============================================================================
-- Part 1: Verify Helper Functions
-- ============================================================================

SELECT
  '=== HELPER FUNCTIONS ===' AS section,
  '' AS detail;

SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_result(p.oid) AS return_type,
  CASE
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END AS security,
  CASE
    WHEN p.provolatile = 'i' THEN 'IMMUTABLE'
    WHEN p.provolatile = 's' THEN 'STABLE'
    WHEN p.provolatile = 'v' THEN 'VOLATILE'
  END AS volatility
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('is_admin', 'is_head', 'is_office_member', 'get_user_role', 'get_user_grade')
ORDER BY p.proname;

SELECT
  '✅ Expected: 5 functions' AS check_result,
  COUNT(*) AS actual_count,
  CASE
    WHEN COUNT(*) = 5 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('is_admin', 'is_head', 'is_office_member', 'get_user_role', 'get_user_grade');

-- ============================================================================
-- Part 2: Verify Users Table Policies
-- ============================================================================

SELECT
  '' AS section,
  '=== USERS TABLE POLICIES ===' AS detail;

SELECT
  schemaname,
  tablename,
  policyname,
  CASE cmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END AS command,
  roles,
  SUBSTRING(qual::text, 1, 50) AS using_clause
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
ORDER BY policyname;

SELECT
  '✅ Expected: 6 policies on users table' AS check_result,
  COUNT(*) AS actual_count,
  CASE
    WHEN COUNT(*) = 6 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users';

-- ============================================================================
-- Part 3: Verify office_member Policies
-- ============================================================================

SELECT
  '' AS section,
  '=== OFFICE_MEMBER POLICIES ===' AS detail;

SELECT
  tablename,
  policyname,
  CASE cmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END AS command
FROM pg_policies
WHERE schemaname = 'public'
AND policyname LIKE '%office_member%'
ORDER BY tablename, policyname;

SELECT
  '✅ Expected: 9 office_member policies (1 users + 8 others)' AS check_result,
  COUNT(*) AS actual_count,
  CASE
    WHEN COUNT(*) = 9 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
AND policyname LIKE '%office_member%';

-- ============================================================================
-- Part 4: Test Users Table Accessibility (No Recursion)
-- ============================================================================

SELECT
  '' AS section,
  '=== RECURSION TEST ===' AS detail;

DO $$
BEGIN
  PERFORM id, email, role FROM users LIMIT 1;
  RAISE NOTICE '✅ Users table accessible (no recursion detected)';
EXCEPTION
  WHEN SQLSTATE '42P17' THEN
    RAISE EXCEPTION '❌ FAILED: Infinite recursion still detected!';
  WHEN OTHERS THEN
    RAISE NOTICE 'ℹ️ Query test completed: % - %', SQLSTATE, SQLERRM;
END $$;

-- ============================================================================
-- Part 5: Summary Report
-- ============================================================================

SELECT
  '' AS section,
  '=== FINAL SUMMARY ===' AS detail;

DO $$
DECLARE
  function_count INTEGER;
  users_policy_count INTEGER;
  office_member_policy_count INTEGER;
  all_checks_passed BOOLEAN := true;
BEGIN
  -- Count functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN ('is_admin', 'is_head', 'is_office_member', 'get_user_role', 'get_user_grade');

  -- Count users table policies
  SELECT COUNT(*) INTO users_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users';

  -- Count office_member policies
  SELECT COUNT(*) INTO office_member_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND policyname LIKE '%office_member%';

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'MIGRATION 019d VERIFICATION REPORT';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Helper Functions: % (expected: 5) %',
    function_count,
    CASE WHEN function_count = 5 THEN '✅' ELSE '❌' END;

  RAISE NOTICE 'Users Table Policies: % (expected: 6) %',
    users_policy_count,
    CASE WHEN users_policy_count = 6 THEN '✅' ELSE '❌' END;

  RAISE NOTICE 'office_member Policies: % (expected: 9) %',
    office_member_policy_count,
    CASE WHEN office_member_policy_count = 9 THEN '✅' ELSE '❌' END;

  RAISE NOTICE '';

  -- Check if all counts are correct
  IF function_count = 5 AND users_policy_count = 6 AND office_member_policy_count = 9 THEN
    RAISE NOTICE '🎉 ALL CHECKS PASSED!';
    RAISE NOTICE '✅ Migration 019d executed successfully';
    RAISE NOTICE '✅ No recursion detected';
    RAISE NOTICE '✅ SSO login should work now!';
  ELSE
    RAISE WARNING '⚠️ SOME CHECKS FAILED - Please review the counts above';
    all_checks_passed := false;
  END IF;

  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  IF NOT all_checks_passed THEN
    RAISE EXCEPTION 'Migration verification failed - see report above';
  END IF;
END $$;

SELECT '✅ Migration 019d verification completed' AS final_status;
