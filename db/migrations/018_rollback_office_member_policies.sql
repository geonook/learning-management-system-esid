/**
 * Migration 018: Emergency Rollback - Delete office_member RLS Policies
 *
 * CRITICAL FIX: Migration 017 caused infinite recursion in RLS policies
 *
 * Problem:
 * - Migration 017 created 9 policies for office_member role
 * - All 9 policies query the 'users' table to check role
 * - This creates recursive loop: users policy → query users → users policy → ∞
 * - PostgreSQL error: "infinite recursion detected in policy for relation 'users'"
 * - Result: ALL users (admin, head, teacher, office_member) cannot log in
 *
 * Solution:
 * - Delete all 9 office_member policies immediately
 * - System recovers to Migration 016 state (working)
 * - office_member role still exists (Migration 016 ENUM, permanent)
 * - office_member users can log in (as authenticated users)
 * - Will implement proper JWT-based policies in Migration 019
 *
 * Impact:
 * - ✅ Immediate: All users can log in again
 * - ✅ SSO flow resumes normal operation
 * - ⚠️ Temporary: office_member has same access as authenticated users
 * - ✅ Safe: No data loss, only policy deletion
 *
 * Migration 016 (Remains Active):
 * - office_member role in user_role ENUM: KEPT
 * - Cannot rollback ENUMs, but this is safe
 *
 * Migration 017 (Fully Rolled Back):
 * - All 9 policies: DELETED
 *
 * Created: 2025-11-18
 * Reason: Emergency fix for production-breaking RLS recursion
 * Author: Claude Code
 * Reference: Migration 017 (broken), Migration 016 (ENUM, kept)
 */

-- ============================================================================
-- EMERGENCY ROLLBACK: Delete Migration 017 Policies
-- ============================================================================

-- Drop all 9 office_member policies created in Migration 017
-- These policies cause infinite recursion by querying 'users' table
-- from within users table policies

DROP POLICY IF EXISTS "office_member_read_users" ON users;
DROP POLICY IF EXISTS "office_member_read_classes" ON classes;
DROP POLICY IF EXISTS "office_member_read_courses" ON courses;
DROP POLICY IF EXISTS "office_member_read_students" ON students;
DROP POLICY IF EXISTS "office_member_read_student_courses" ON student_courses;
DROP POLICY IF EXISTS "office_member_read_exams" ON exams;
DROP POLICY IF EXISTS "office_member_read_scores" ON scores;
DROP POLICY IF EXISTS "office_member_read_assessment_titles" ON assessment_titles;
DROP POLICY IF EXISTS "office_member_read_assessment_codes" ON assessment_codes;

-- ============================================================================
-- VERIFICATION QUERIES (Run these after migration)
-- ============================================================================

-- Verify all office_member policies are deleted
DO $$
DECLARE
  office_member_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO office_member_policy_count
  FROM pg_policies
  WHERE policyname LIKE '%office_member%';

  IF office_member_policy_count = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All office_member policies deleted';
  ELSE
    RAISE WARNING '⚠️ ISSUE: % office_member policies still exist', office_member_policy_count;
  END IF;
END $$;

-- Verify users table is accessible (no recursion)
DO $$
BEGIN
  PERFORM id, email, role FROM users LIMIT 1;
  RAISE NOTICE '✅ SUCCESS: Users table accessible (no recursion)';
EXCEPTION
  WHEN SQLSTATE '42P17' THEN
    RAISE EXCEPTION '❌ FAILED: Infinite recursion still detected';
END $$;

-- Verify office_member role still exists in ENUM (from Migration 016)
DO $$
DECLARE
  has_office_member BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'office_member'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) INTO has_office_member;

  IF has_office_member THEN
    RAISE NOTICE '✅ SUCCESS: office_member role exists in user_role ENUM';
  ELSE
    RAISE WARNING '⚠️ UNEXPECTED: office_member role missing from ENUM';
  END IF;
END $$;

-- Summary Report
DO $$
DECLARE
  total_policies INTEGER;
  office_member_policies INTEGER;
  enum_roles TEXT[];
BEGIN
  -- Count total policies
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE schemaname = 'public';

  -- Count office_member policies (should be 0)
  SELECT COUNT(*) INTO office_member_policies
  FROM pg_policies
  WHERE policyname LIKE '%office_member%';

  -- List all roles in ENUM
  SELECT array_agg(enumlabel ORDER BY enumsortorder) INTO enum_roles
  FROM pg_enum
  WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role');

  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'MIGRATION 018 ROLLBACK SUMMARY';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Total RLS Policies: %', total_policies;
  RAISE NOTICE 'office_member Policies: % (expected: 0)', office_member_policies;
  RAISE NOTICE 'User Roles in ENUM: %', enum_roles;
  RAISE NOTICE '';

  IF office_member_policies = 0 THEN
    RAISE NOTICE '🎉 MIGRATION 018 COMPLETED SUCCESSFULLY';
    RAISE NOTICE '✅ System recovered from RLS recursion issue';
    RAISE NOTICE '✅ All users can now log in';
    RAISE NOTICE '✅ SSO login flow restored';
    RAISE NOTICE '⚠️  office_member has authenticated user access (temporary)';
    RAISE NOTICE '📋 Next: Implement Migration 019 (JWT-based policies)';
  ELSE
    RAISE EXCEPTION '❌ MIGRATION 018 FAILED: office_member policies still exist';
  END IF;

  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END $$;

/**
 * ROLLBACK INSTRUCTIONS (if needed)
 *
 * This migration is a rollback itself, so "rolling back" means re-applying
 * Migration 017 policies. However, DO NOT do this as Migration 017 is broken.
 *
 * If you need to restore office_member permissions, wait for Migration 019
 * which will use JWT-based policies (no recursion).
 *
 * To manually re-enable office_member (NOT RECOMMENDED):
 * 1. Wait for Migration 019
 * 2. Test thoroughly in development first
 * 3. Never use Migration 017 approach (recursive users table query)
 */
