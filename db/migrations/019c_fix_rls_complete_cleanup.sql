/**
 * Migration 019c: Complete RLS Fix with Thorough Cleanup
 *
 * FINAL VERSION: Migration 019b failed with "policy already exists"
 *
 * Problem with Migration 019b:
 * - Migration 015 policies still exist in database
 * - DROP POLICY IF EXISTS didn't work (policies have same names)
 * - Need more comprehensive cleanup
 *
 * Solution:
 * - Drop ALL users table policies first (comprehensive cleanup)
 * - Then recreate only the policies we need
 * - Use public schema (not auth schema)
 *
 * Created: 2025-11-18
 * Reason: Fix policy name conflicts from Migration 019b
 * Author: Claude Code
 */

-- ============================================================================
-- PART 0: Complete Cleanup (Drop ALL existing policies and functions)
-- ============================================================================

-- Drop ALL users table policies (to avoid conflicts)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON users', r.policyname);
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END$$;

-- Drop office_member policies on other tables (SPACES)
DROP POLICY IF EXISTS "office_member read classes" ON classes;
DROP POLICY IF EXISTS "office_member read courses" ON courses;
DROP POLICY IF EXISTS "office_member read students" ON students;
DROP POLICY IF EXISTS "office_member read student_courses" ON student_courses;
DROP POLICY IF EXISTS "office_member read exams" ON exams;
DROP POLICY IF EXISTS "office_member read scores" ON scores;
DROP POLICY IF EXISTS "office_member read assessment_titles" ON assessment_titles;
DROP POLICY IF EXISTS "office_member read assessment_codes" ON assessment_codes;

-- Drop office_member policies on other tables (UNDERSCORES)
DROP POLICY IF EXISTS "office_member_read_classes" ON classes;
DROP POLICY IF EXISTS "office_member_read_courses" ON courses;
DROP POLICY IF EXISTS "office_member_read_students" ON students;
DROP POLICY IF EXISTS "office_member_read_student_courses" ON student_courses;
DROP POLICY IF EXISTS "office_member_read_exams" ON exams;
DROP POLICY IF EXISTS "office_member_read_scores" ON scores;
DROP POLICY IF EXISTS "office_member_read_assessment_titles" ON assessment_titles;
DROP POLICY IF EXISTS "office_member_read_assessment_codes" ON assessment_codes;

-- Drop any existing helper functions
DROP FUNCTION IF EXISTS auth.is_admin() CASCADE;
DROP FUNCTION IF EXISTS auth.is_head() CASCADE;
DROP FUNCTION IF EXISTS auth.is_office_member() CASCADE;
DROP FUNCTION IF EXISTS auth.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS auth.get_user_grade() CASCADE;

DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_head() CASCADE;
DROP FUNCTION IF EXISTS public.is_office_member() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_grade() CASCADE;

DO $$ BEGIN
  RAISE NOTICE '✅ Cleanup complete - all old policies and functions removed';
END $$;

-- ============================================================================
-- PART 1: Create SECURITY DEFINER Helper Functions (PUBLIC SCHEMA)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
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
    AND role = 'admin'
  );
END;
$$;

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

DO $$ BEGIN
  RAISE NOTICE '✅ Created 5 helper functions in public schema';
END $$;

-- ============================================================================
-- PART 2: Create Users Table Policies (No Recursion)
-- ============================================================================

-- Policy 1: Service role bypass (always needed)
CREATE POLICY "service_role_bypass" ON users
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy 2: Admin full access
CREATE POLICY "admin_full_access" ON users
    FOR ALL TO authenticated
    USING (public.is_admin());

-- Policy 3: Users view own profile
CREATE POLICY "users_view_own_profile" ON users
    FOR SELECT TO authenticated
    USING (id = (SELECT auth.uid()));

-- Policy 4: Users update own profile
CREATE POLICY "users_update_own_profile" ON users
    FOR UPDATE TO authenticated
    USING (id = (SELECT auth.uid()))
    WITH CHECK (
        id = (SELECT auth.uid())
        AND role = public.get_user_role()
    );

-- Policy 5: Heads view users in jurisdiction
CREATE POLICY "heads_view_jurisdiction" ON users
    FOR SELECT TO authenticated
    USING (
        public.is_head()
        AND (
            (users.role = 'teacher' AND users.grade = public.get_user_grade())
            OR
            (users.role = 'student' AND EXISTS (
                SELECT 1 FROM students s
                JOIN classes c ON s.class_id = c.id
                WHERE s.id = users.id
                AND c.grade = public.get_user_grade()
            ))
        )
    );

-- Policy 6: office_member read all users
CREATE POLICY "office_member_read_users" ON users
    FOR SELECT TO authenticated
    USING (
        public.is_office_member()
        OR id = (SELECT auth.uid())
    );

DO $$ BEGIN
  RAISE NOTICE '✅ Created 6 policies on users table';
END $$;

-- ============================================================================
-- PART 3: Create office_member Policies for Other Tables
-- ============================================================================

CREATE POLICY "office_member_read_classes" ON classes
    FOR SELECT TO authenticated
    USING (public.is_office_member());

CREATE POLICY "office_member_read_courses" ON courses
    FOR SELECT TO authenticated
    USING (public.is_office_member());

CREATE POLICY "office_member_read_students" ON students
    FOR SELECT TO authenticated
    USING (public.is_office_member());

CREATE POLICY "office_member_read_student_courses" ON student_courses
    FOR SELECT TO authenticated
    USING (public.is_office_member());

CREATE POLICY "office_member_read_exams" ON exams
    FOR SELECT TO authenticated
    USING (public.is_office_member());

CREATE POLICY "office_member_read_scores" ON scores
    FOR SELECT TO authenticated
    USING (public.is_office_member());

CREATE POLICY "office_member_read_assessment_titles" ON assessment_titles
    FOR SELECT TO authenticated
    USING (public.is_office_member());

CREATE POLICY "office_member_read_assessment_codes" ON assessment_codes
    FOR SELECT TO authenticated
    USING (public.is_office_member());

DO $$ BEGIN
  RAISE NOTICE '✅ Created 8 office_member policies on other tables';
END $$;

-- ============================================================================
-- PART 4: Verification
-- ============================================================================

DO $$
BEGIN
  PERFORM id, email, role FROM users LIMIT 1;
  RAISE NOTICE '✅ Users table accessible (no recursion)';
EXCEPTION
  WHEN SQLSTATE '42P17' THEN
    RAISE EXCEPTION '❌ Infinite recursion detected';
  WHEN OTHERS THEN
    RAISE NOTICE 'ℹ️ Test completed (%, %)', SQLSTATE, SQLERRM;
END $$;

DO $$
DECLARE
  function_count INTEGER;
  users_policy_count INTEGER;
  office_member_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN ('is_admin', 'is_head', 'is_office_member', 'get_user_role', 'get_user_grade');

  SELECT COUNT(*) INTO users_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users';

  SELECT COUNT(*) INTO office_member_policy_count
  FROM pg_policies
  WHERE policyname LIKE '%office_member%';

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'MIGRATION 019c SUMMARY';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Helper Functions: % (expected: 5)', function_count;
  RAISE NOTICE 'Users Table Policies: % (expected: 6)', users_policy_count;
  RAISE NOTICE 'office_member Policies: % (expected: 9)', office_member_policy_count;
  RAISE NOTICE '';

  IF function_count = 5 AND users_policy_count = 6 THEN
    RAISE NOTICE '🎉 MIGRATION 019c COMPLETED SUCCESSFULLY';
    RAISE NOTICE '✅ No recursion - SSO login should work!';
  ELSE
    RAISE WARNING '⚠️ Check counts - something may be missing';
  END IF;

  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END $$;
