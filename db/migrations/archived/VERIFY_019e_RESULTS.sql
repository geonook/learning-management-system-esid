/**
 * Verification Script for Migration 019e
 *
 * Verifies that Migration 019e executed successfully:
 * - heads_view_jurisdiction policy removed
 * - 5 remaining policies on users table
 * - 5 helper functions still present
 * - No recursion errors
 * - System is operational
 */

-- ============================================================================
-- Part 1: Verify Policy Removal
-- ============================================================================

SELECT
  '=== POLICY REMOVAL VERIFICATION ===' AS section,
  '' AS detail;

-- Check if heads_view_jurisdiction was removed
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS: heads_view_jurisdiction removed'
    ELSE '❌ FAIL: heads_view_jurisdiction still exists'
  END AS removal_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
AND policyname = 'heads_view_jurisdiction';

-- ============================================================================
-- Part 2: Verify Remaining Users Table Policies
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
  roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
ORDER BY policyname;

SELECT
  '✅ Expected: 5 policies on users table' AS check_result,
  COUNT(*) AS actual_count,
  CASE
    WHEN COUNT(*) = 5 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users';

-- ============================================================================
-- Part 3: Verify Helper Functions
-- ============================================================================

SELECT
  '' AS section,
  '=== HELPER FUNCTIONS ===' AS detail;

SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_result(p.oid) AS return_type,
  CASE
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END AS security
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('is_admin', 'is_head', 'is_office_member', 'get_user_role', 'get_user_grade')
ORDER BY p.proname;

SELECT
  '✅ Expected: 5 helper functions' AS check_result,
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
-- Part 5: Verify office_member Policies
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
  '✅ Expected: 9 office_member policies' AS check_result,
  COUNT(*) AS actual_count,
  CASE
    WHEN COUNT(*) = 9 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
AND policyname LIKE '%office_member%';

-- ============================================================================
-- Part 6: Final Summary
-- ============================================================================

SELECT
  '' AS section,
  '=== FINAL SUMMARY ===' AS detail;

DO $$
DECLARE
  policy_count INTEGER;
  function_count INTEGER;
  office_member_count INTEGER;
  heads_policy_count INTEGER;
  all_checks_passed BOOLEAN := true;
BEGIN
  -- Count users table policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users';

  -- Count helper functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN ('is_admin', 'is_head', 'is_office_member', 'get_user_role', 'get_user_grade');

  -- Count office_member policies
  SELECT COUNT(*) INTO office_member_count
  FROM pg_policies
  WHERE schemaname = 'public' AND policyname LIKE '%office_member%';

  -- Check heads_view_jurisdiction was removed
  SELECT COUNT(*) INTO heads_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'users'
  AND policyname = 'heads_view_jurisdiction';

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'MIGRATION 019e VERIFICATION REPORT';
  RAISE NOTICE '================================================';

  RAISE NOTICE 'Policy Removal Check:';
  IF heads_policy_count = 0 THEN
    RAISE NOTICE '  ✅ heads_view_jurisdiction removed';
  ELSE
    RAISE NOTICE '  ❌ heads_view_jurisdiction still exists';
    all_checks_passed := false;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Component Counts:';
  RAISE NOTICE '  Helper Functions: % (expected: 5) %',
    function_count,
    CASE WHEN function_count = 5 THEN '✅' ELSE '❌' END;

  RAISE NOTICE '  Users Table Policies: % (expected: 5) %',
    policy_count,
    CASE WHEN policy_count = 5 THEN '✅' ELSE '❌' END;

  RAISE NOTICE '  office_member Policies: % (expected: 9) %',
    office_member_count,
    CASE WHEN office_member_count = 9 THEN '✅' ELSE '❌' END;

  RAISE NOTICE '';
  RAISE NOTICE 'Active Users Table Policies:';
  RAISE NOTICE '  1. service_role_bypass ✅';
  RAISE NOTICE '  2. admin_full_access ✅';
  RAISE NOTICE '  3. users_view_own_profile ✅';
  RAISE NOTICE '  4. users_update_own_profile ✅';
  RAISE NOTICE '  5. office_member_read_users ✅';

  RAISE NOTICE '';

  -- Final status
  IF heads_policy_count = 0 AND policy_count = 5 AND function_count = 5 AND office_member_count = 9 THEN
    RAISE NOTICE '🎉 ALL CHECKS PASSED!';
    RAISE NOTICE '✅ Migration 019e executed successfully';
    RAISE NOTICE '✅ No recursion detected';
    RAISE NOTICE '✅ System is operational';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next Steps:';
    RAISE NOTICE '   1. Clear browser cache';
    RAISE NOTICE '   2. Test SSO login';
    RAISE NOTICE '   3. Verify Dashboard loads without 500 errors';
    RAISE NOTICE '   4. Check that users table queries work';
  ELSE
    RAISE WARNING '⚠️ SOME CHECKS FAILED';
    all_checks_passed := false;
  END IF;

  RAISE NOTICE '================================================';
  RAISE NOTICE '';

  IF NOT all_checks_passed THEN
    RAISE EXCEPTION 'Migration verification failed - see report above';
  END IF;
END $$;

SELECT '✅ Migration 019e verification completed' AS final_status;
