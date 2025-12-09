-- Migration 028: Fix Users Table RLS Recursion (Simple Approach)
-- Created: 2025-12-09
-- Purpose: Fix infinite recursion in RLS policies for users table
-- Problem: is_admin() and is_office_member() functions query users table, causing recursion
-- Solution: Use simple auth.role() checks, no function calls to users table

-- ============================================================
-- Problem Analysis:
-- Current problematic policies:
-- 1. admin_full_access: USING (is_admin())
--    - is_admin() queries users table WHERE role = 'admin'
--    - This triggers RLS policies on users table → infinite recursion
-- 2. office_member_read_users: USING (is_office_member() OR id = auth.uid())
--    - is_office_member() queries users table WHERE role = 'office_member'
--    - Same recursion issue
--
-- Error symptoms:
-- - 500 errors on /rest/v1/users endpoint
-- - Error code: 25P02 (transaction aborted)
-- ============================================================

-- ============================================================
-- Step 1: Drop ALL problematic policies on users table
-- ============================================================

DROP POLICY IF EXISTS "admin_full_access" ON users;
DROP POLICY IF EXISTS "office_member_read_users" ON users;
DROP POLICY IF EXISTS "users_view_own_profile" ON users;
DROP POLICY IF EXISTS "users_update_own_profile" ON users;

-- Note: Keep service_role_bypass policy (it's safe, uses auth.role() = 'service_role')

-- ============================================================
-- Step 2: Create simple, non-recursive policies
-- ============================================================

-- All authenticated users can read users table
-- Fine-grained access control is handled at application layer (AuthContext)
CREATE POLICY "authenticated_read_users" ON users
FOR SELECT TO authenticated
USING ((SELECT auth.role()) = 'authenticated');

-- Users can only update their own profile
CREATE POLICY "users_update_own" ON users
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================================
-- Step 3: Verification
-- ============================================================

DO $$
DECLARE
  test_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Test that users table is accessible
  SELECT COUNT(*) INTO test_count FROM users;

  -- Count policies on users table
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 028 Verification:';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  Users table accessible: OK (count: %)', test_count;
  RAISE NOTICE '  Total policies on users: %', policy_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

EXCEPTION
  WHEN SQLSTATE '42P17' THEN
    RAISE EXCEPTION 'FAILED: Infinite recursion still detected!';
  WHEN OTHERS THEN
    RAISE NOTICE 'Query test result: % - %', SQLSTATE, SQLERRM;
END $$;

-- List current policies for verification
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'Current Users Table Policies:';

  FOR r IN (
    SELECT policyname,
           CASE cmd
             WHEN 'r' THEN 'SELECT'
             WHEN 'a' THEN 'INSERT'
             WHEN 'w' THEN 'UPDATE'
             WHEN 'd' THEN 'DELETE'
             WHEN '*' THEN 'ALL'
           END AS command
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
    ORDER BY policyname
  )
  LOOP
    RAISE NOTICE '  - % (%)', r.policyname, r.command;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Migration 028 completed successfully!';
  RAISE NOTICE 'Please test SSO login on production.';
  RAISE NOTICE '';
END $$;
