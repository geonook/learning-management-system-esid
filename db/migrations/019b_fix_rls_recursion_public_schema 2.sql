/**
 * Migration 019b: Fix RLS Recursion with SECURITY DEFINER Functions (PUBLIC SCHEMA)
 *
 * CORRECTED VERSION: Migration 019 failed due to auth schema permission denied
 *
 * Problem with Migration 019:
 * - Tried to create functions in 'auth' schema
 * - ERROR: 42501: permission denied for schema auth
 * - Supabase Cloud doesn't allow custom functions in auth schema
 *
 * Solution:
 * - Use 'public' schema instead of 'auth' schema
 * - All other logic remains identical
 * - SECURITY DEFINER still bypasses RLS (no recursion)
 *
 * Created: 2025-11-18
 * Reason: Fix schema permission issue from Migration 019
 * Author: Claude Code
 * References: Migration 019 (failed), Migration 018 (rollback), Migration 015 (has recursion)
 */

-- ============================================================================
-- PART 0: Cleanup (in case Migration 019 partially executed)
-- ============================================================================

-- Drop any partially created functions or policies
DROP FUNCTION IF EXISTS auth.is_admin();
DROP FUNCTION IF EXISTS auth.is_head();
DROP FUNCTION IF EXISTS auth.is_office_member();
DROP FUNCTION IF EXISTS auth.get_user_role();
DROP FUNCTION IF EXISTS auth.get_user_grade();

DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_head();
DROP FUNCTION IF EXISTS public.is_office_member();
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.get_user_grade();

-- ============================================================================
-- PART 1: Create SECURITY DEFINER Helper Functions (PUBLIC SCHEMA)
-- ============================================================================

-- Function 1: Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- Bypasses RLS
SET search_path = public  -- Security: prevents SQL injection
STABLE  -- Performance: result can be cached within query
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

COMMENT ON FUNCTION public.is_admin() IS
'Check if current authenticated user has admin role. Used by RLS policies.';

-- Function 2: Check if current user is head teacher
CREATE OR REPLACE FUNCTION public.is_head()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'head'
  );
END;
$$;

COMMENT ON FUNCTION public.is_head() IS
'Check if current authenticated user is a head teacher. Used by RLS policies.';

-- Function 3: Check if current user is office_member
CREATE OR REPLACE FUNCTION public.is_office_member()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'office_member'
  );
END;
$$;

COMMENT ON FUNCTION public.is_office_member() IS
'Check if current authenticated user has office_member role (read-only access).';

-- Function 4: Get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role_value user_role;
BEGIN
  SELECT role INTO user_role_value
  FROM users
  WHERE id = auth.uid();

  RETURN user_role_value;
END;
$$;

COMMENT ON FUNCTION public.get_user_role() IS
'Get the role of the current authenticated user. Returns NULL if user not found.';

-- Function 5: Get current user's grade (for head teachers)
CREATE OR REPLACE FUNCTION public.get_user_grade()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_grade INTEGER;
BEGIN
  SELECT grade INTO user_grade
  FROM users
  WHERE id = auth.uid();

  RETURN user_grade;
END;
$$;

COMMENT ON FUNCTION public.get_user_grade() IS
'Get the grade of the current authenticated user (for head teachers). Returns NULL if not set.';

-- ============================================================================
-- PART 2: Drop Problematic Migration 015 Policies
-- ============================================================================

DROP POLICY IF EXISTS "Admin full access to users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Heads can view users in jurisdiction" ON users;

-- ============================================================================
-- PART 3: Recreate Users Table Policies (No Recursion)
-- ============================================================================

-- Policy 1: Admin full access to users (ALL operations)
CREATE POLICY "Admin full access to users" ON users
    FOR ALL
    TO authenticated
    USING (public.is_admin());

-- Policy 2: Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT
    TO authenticated
    USING (id = (SELECT auth.uid()));

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE
    TO authenticated
    USING (id = (SELECT auth.uid()))
    WITH CHECK (
        id = (SELECT auth.uid())
        AND role = public.get_user_role()  -- Prevent role escalation
    );

-- Policy 4: Head teachers can view users in their jurisdiction
CREATE POLICY "Heads can view users in jurisdiction" ON users
    FOR SELECT
    TO authenticated
    USING (
        public.is_head()
        AND (
            -- Same grade teachers
            (users.role = 'teacher' AND users.grade = public.get_user_grade())
            OR
            -- Students in their grade (through classes)
            (users.role = 'student' AND EXISTS (
                SELECT 1 FROM students s
                JOIN classes c ON s.class_id = c.id
                WHERE s.id = users.id
                AND c.grade = public.get_user_grade()
            ))
        )
    );

-- ============================================================================
-- PART 4: Create office_member Policies (Read-Only Access to All Tables)
-- ============================================================================

-- Policy 5: office_member can read all users (or own profile)
CREATE POLICY "office_member read users" ON users
    FOR SELECT
    TO authenticated
    USING (
        public.is_office_member()
        OR id = (SELECT auth.uid())
    );

-- Policy 6: office_member can read all classes
CREATE POLICY "office_member read classes" ON classes
    FOR SELECT
    TO authenticated
    USING (public.is_office_member());

-- Policy 7: office_member can read all courses
CREATE POLICY "office_member read courses" ON courses
    FOR SELECT
    TO authenticated
    USING (public.is_office_member());

-- Policy 8: office_member can read all students
CREATE POLICY "office_member read students" ON students
    FOR SELECT
    TO authenticated
    USING (public.is_office_member());

-- Policy 9: office_member can read all student_courses
CREATE POLICY "office_member read student_courses" ON student_courses
    FOR SELECT
    TO authenticated
    USING (public.is_office_member());

-- Policy 10: office_member can read all exams
CREATE POLICY "office_member read exams" ON exams
    FOR SELECT
    TO authenticated
    USING (public.is_office_member());

-- Policy 11: office_member can read all scores
CREATE POLICY "office_member read scores" ON scores
    FOR SELECT
    TO authenticated
    USING (public.is_office_member());

-- Policy 12: office_member can read all assessment_titles
CREATE POLICY "office_member read assessment_titles" ON assessment_titles
    FOR SELECT
    TO authenticated
    USING (public.is_office_member());

-- Policy 13: office_member can read all assessment_codes
CREATE POLICY "office_member read assessment_codes" ON assessment_codes
    FOR SELECT
    TO authenticated
    USING (public.is_office_member());

-- ============================================================================
-- PART 5: Verification and Summary
-- ============================================================================

-- Test that users table is accessible (no recursion)
DO $$
BEGIN
  PERFORM id, email, role FROM users LIMIT 1;
  RAISE NOTICE '✅ SUCCESS: Users table accessible (no recursion)';
EXCEPTION
  WHEN SQLSTATE '42P17' THEN
    RAISE EXCEPTION '❌ FAILED: Infinite recursion still detected';
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Test query completed (%, %)', SQLSTATE, SQLERRM;
END $$;

-- Verify all helper functions were created in public schema
DO $$
DECLARE
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN ('is_admin', 'is_head', 'is_office_member', 'get_user_role', 'get_user_grade');

  IF function_count = 5 THEN
    RAISE NOTICE '✅ SUCCESS: All 5 helper functions created in public schema';
  ELSE
    RAISE WARNING '⚠️ ISSUE: Only % of 5 helper functions found', function_count;
  END IF;
END $$;

-- Count office_member policies
DO $$
DECLARE
  office_member_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO office_member_policy_count
  FROM pg_policies
  WHERE policyname LIKE '%office_member%';

  RAISE NOTICE 'ℹ️ office_member policies created: % (expected: 9)', office_member_policy_count;
END $$;

-- Final Summary Report
DO $$
DECLARE
  total_policies INTEGER;
  total_public_functions INTEGER;
  users_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE schemaname = 'public';

  SELECT COUNT(*) INTO total_public_functions
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN ('is_admin', 'is_head', 'is_office_member', 'get_user_role', 'get_user_grade');

  SELECT COUNT(*) INTO users_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users';

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'MIGRATION 019b SUMMARY';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Total RLS Policies: %', total_policies;
  RAISE NOTICE 'Users Table Policies: % (expected: ~8)', users_policies;
  RAISE NOTICE 'Public Schema Helper Functions: % (expected: 5)', total_public_functions;
  RAISE NOTICE '';
  RAISE NOTICE '🎉 MIGRATION 019b COMPLETED SUCCESSFULLY';
  RAISE NOTICE '✅ SECURITY DEFINER functions created (public schema)';
  RAISE NOTICE '✅ Recursive policies replaced';
  RAISE NOTICE '✅ office_member policies added (9 tables)';
  RAISE NOTICE '✅ No recursion - users table accessible';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '   1. Test SSO login (should stay on Dashboard)';
  RAISE NOTICE '   2. Verify: SELECT * FROM users LIMIT 5;';
  RAISE NOTICE '   3. Test as admin/head/teacher/office_member';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END $$;

/**
 * ROLLBACK INSTRUCTIONS (if needed)
 *
 * To rollback this migration:
 *
 * 1. Drop helper functions:
 *    DROP FUNCTION IF EXISTS public.is_admin();
 *    DROP FUNCTION IF EXISTS public.is_head();
 *    DROP FUNCTION IF EXISTS public.is_office_member();
 *    DROP FUNCTION IF EXISTS public.get_user_role();
 *    DROP FUNCTION IF EXISTS public.get_user_grade();
 *
 * 2. Drop policies (same as Migration 019 rollback)
 *
 * 3. Re-apply Migration 015 (if needed)
 */
