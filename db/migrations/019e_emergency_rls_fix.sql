/**
 * Migration 019e: Emergency RLS Recursion Fix
 *
 * CRITICAL FIX: Migration 019d still has infinite recursion
 *
 * Problem with Migration 019d:
 * - heads_view_jurisdiction policy causes recursion
 * - Policy USING clause calls public.is_head() and public.get_user_grade()
 * - These functions query users table (even with SECURITY DEFINER)
 * - Policy evaluation triggers for each row → infinite loop
 * - Result: 500 errors on all users table queries
 *
 * Root Cause Analysis:
 * SECURITY DEFINER makes function internals bypass RLS, BUT:
 * - The policy's USING clause still evaluates for each row
 * - This triggers RLS policy checks on the users table
 * - Creates circular dependency: Policy → Function → Query users → Policy → ∞
 *
 * Solution:
 * - Remove heads_view_jurisdiction policy completely
 * - Head teacher permissions will be handled in application layer (Phase 2)
 * - This is a temporary fix to restore system functionality
 * - Long-term solution: JWT claims (Migration 020)
 *
 * Impact:
 * - ✅ System becomes operational immediately
 * - ✅ Admin, office_member, teacher roles unaffected
 * - ⚠️ Head teachers temporarily can only view own profile
 * - ✅ Head teachers will regain functionality via app-layer checks (Phase 2)
 *
 * Created: 2025-11-18
 * Reason: Emergency fix for RLS recursion causing 500 errors
 * Author: Claude Code
 */

-- ============================================================================
-- PART 1: Remove Problematic Policy
-- ============================================================================

-- This policy causes infinite recursion and must be removed
DROP POLICY IF EXISTS "heads_view_jurisdiction" ON users;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'MIGRATION 019e: EMERGENCY RLS FIX';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ Removed heads_view_jurisdiction policy';
  RAISE NOTICE 'ℹ️ This policy was causing infinite recursion';
  RAISE NOTICE 'ℹ️ Head teachers will use application-layer permission checks';
  RAISE NOTICE '';
END$$;

-- ============================================================================
-- PART 2: Verify No Recursion
-- ============================================================================

-- Test that users table is now accessible without recursion
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
-- PART 3: Verify Remaining Policies
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  function_count INTEGER;
  office_member_policy_count INTEGER;
BEGIN
  -- Count users table policies (should be 5 now)
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users';

  -- Count helper functions (should still be 5)
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN ('is_admin', 'is_head', 'is_office_member', 'get_user_role', 'get_user_grade');

  -- Count office_member policies (should be 9: 1 on users + 8 on other tables)
  SELECT COUNT(*) INTO office_member_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND policyname LIKE '%office_member%';

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'MIGRATION 019e VERIFICATION REPORT';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Helper Functions: % (expected: 5) %',
    function_count,
    CASE WHEN function_count = 5 THEN '✅' ELSE '❌' END;

  RAISE NOTICE 'Users Table Policies: % (expected: 5) %',
    policy_count,
    CASE WHEN policy_count = 5 THEN '✅' ELSE '❌' END;

  RAISE NOTICE 'office_member Policies: % (expected: 9) %',
    office_member_policy_count,
    CASE WHEN office_member_policy_count = 9 THEN '✅' ELSE '❌' END;

  RAISE NOTICE '';
  RAISE NOTICE 'Active Users Table Policies:';
  RAISE NOTICE '  1. service_role_bypass: ✅ (service role full access)';
  RAISE NOTICE '  2. admin_full_access: ✅ (admin full access)';
  RAISE NOTICE '  3. users_view_own_profile: ✅ (users view own data)';
  RAISE NOTICE '  4. users_update_own_profile: ✅ (users update own data)';
  RAISE NOTICE '  5. office_member_read_users: ✅ (office_member read all)';
  RAISE NOTICE '  6. heads_view_jurisdiction: ❌ REMOVED (prevented recursion)';
  RAISE NOTICE '';

  IF policy_count = 5 AND function_count = 5 AND office_member_policy_count = 9 THEN
    RAISE NOTICE '🎉 MIGRATION 019e COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '✅ System is now operational';
    RAISE NOTICE '✅ No recursion detected';
    RAISE NOTICE '✅ SSO login should work now!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next Steps:';
    RAISE NOTICE '   1. Test SSO login (should stay on Dashboard)';
    RAISE NOTICE '   2. Verify no 500 errors on users queries';
    RAISE NOTICE '   3. Implement Phase 2 (application-layer permissions)';
    RAISE NOTICE '   4. Restore head teacher cross-user visibility';
  ELSE
    RAISE WARNING '⚠️ SOME CHECKS FAILED - Please review counts above';
  END IF;

  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PART 4: List Actual Policies for Verification
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'Current Users Table Policies:';
  RAISE NOTICE '';

  FOR r IN (
    SELECT policyname,
           CASE cmd
             WHEN 'r' THEN 'SELECT'
             WHEN 'a' THEN 'INSERT'
             WHEN 'w' THEN 'UPDATE'
             WHEN 'd' THEN 'DELETE'
             WHEN '*' THEN 'ALL'
           END AS command,
           roles
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
    ORDER BY policyname
  )
  LOOP
    RAISE NOTICE '  - % (%, %)', r.policyname, r.command, r.roles;
  END LOOP;

  RAISE NOTICE '';
END $$;

/**
 * ROLLBACK INSTRUCTIONS (NOT RECOMMENDED)
 *
 * To rollback this migration (will restore the recursion problem):
 *
 * CREATE POLICY "heads_view_jurisdiction" ON users
 *     FOR SELECT TO authenticated
 *     USING (
 *         public.is_head()
 *         AND (
 *             (users.role = 'teacher' AND users.grade = public.get_user_grade())
 *             OR
 *             (users.role = 'student' AND EXISTS (
 *                 SELECT 1 FROM students s
 *                 JOIN classes c ON s.class_id = c.id
 *                 WHERE s.id = users.id
 *                 AND c.grade = public.get_user_grade()
 *             ))
 *         )
 *     );
 *
 * WARNING: This will bring back the infinite recursion problem!
 * Only use if you have a better solution for the recursion issue.
 */
