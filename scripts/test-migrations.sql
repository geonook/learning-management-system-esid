-- ================================================================
-- Migration Testing Script
-- Purpose: Execute and verify Migrations 012 & 013
-- Date: 2025-10-27
-- ================================================================

-- Step 1: Check current state before migrations
SELECT '=== STEP 1: PRE-MIGRATION STATE CHECK ===' as step;

-- Check if student_courses exists and has data
SELECT
  'student_courses table' as check_name,
  COUNT(*) as record_count
FROM student_courses;

-- Check if scores.course_id exists
SELECT
  'scores.course_id column' as check_name,
  CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'NOT_EXISTS' END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'scores'
  AND column_name = 'course_id';

-- Check current RLS policies
SELECT
  'RLS policies count' as check_name,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public';

-- ================================================================
-- Step 2: Execute Migration 012 (if not already applied)
-- ================================================================
SELECT '=== STEP 2: EXECUTING MIGRATION 012 ===' as step;

-- This migration should be idempotent due to IF NOT EXISTS checks
-- Copy and paste the content from db/migrations/012_add_missing_architecture.sql here

-- ================================================================
-- Step 3: Execute Migration 013 (if not already applied)
-- ================================================================
SELECT '=== STEP 3: EXECUTING MIGRATION 013 ===' as step;

-- This migration will remove anonymous policies and add role-based policies
-- Copy and paste the content from db/migrations/013_fix_rls_policies_security.sql here

-- ================================================================
-- Step 4: Verify migrations applied successfully
-- ================================================================
SELECT '=== STEP 4: POST-MIGRATION VERIFICATION ===' as step;

-- 4.1: Verify student_courses has data
SELECT
  '✅ student_courses populated' as verification,
  COUNT(*) as total_enrollments,
  COUNT(DISTINCT student_id) as unique_students,
  COUNT(DISTINCT course_id) as unique_courses
FROM student_courses;

-- Expected: ~57 students × 3 courses = ~171 enrollments

-- 4.2: Verify scores.course_id column exists
SELECT
  '✅ scores.course_id exists' as verification,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'scores'
  AND column_name = 'course_id';

-- 4.3: Verify RLS policies updated
SELECT
  '✅ RLS policies' as verification,
  tablename,
  policyname,
  CASE
    WHEN policyname LIKE '%Anonymous%' THEN '❌ DANGEROUS'
    WHEN policyname LIKE '%Admin%' OR policyname LIKE '%Teacher%' OR policyname LIKE '%Student%' THEN '✅ SECURE'
    ELSE '⚠️ REVIEW'
  END as security_status
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4.4: Verify indexes created
SELECT
  '✅ Indexes' as verification,
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('student_courses', 'scores')
ORDER BY tablename, indexname;

-- ================================================================
-- Step 5: Test RLS policies with sample queries
-- ================================================================
SELECT '=== STEP 5: RLS POLICY TESTING ===' as step;

-- 5.1: Test anonymous access (should return empty or error)
-- This will need to be tested via curl with no auth token

-- 5.2: Count policies by type
SELECT
  'Policy type distribution' as test_name,
  CASE
    WHEN policyname LIKE '%Admin%' THEN 'Admin policies'
    WHEN policyname LIKE '%Teacher%' THEN 'Teacher policies'
    WHEN policyname LIKE '%Student%' THEN 'Student policies'
    WHEN policyname LIKE '%Head%' THEN 'Head Teacher policies'
    WHEN policyname LIKE '%Anonymous%' THEN 'Anonymous policies (⚠️)'
    ELSE 'Other policies'
  END as policy_type,
  COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY policy_type
ORDER BY count DESC;

-- ================================================================
-- Summary Report
-- ================================================================
SELECT '=== MIGRATION TEST SUMMARY ===' as step;

SELECT
  'Database Architecture' as component,
  CASE
    WHEN EXISTS (SELECT 1 FROM student_courses LIMIT 1) THEN '✅ READY'
    ELSE '⚠️ NEEDS DATA'
  END as status,
  'student_courses table populated' as details
UNION ALL
SELECT
  'Score Tracking',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'scores' AND column_name = 'course_id'
    ) THEN '✅ READY'
    ELSE '❌ MISSING'
  END,
  'scores.course_id column'
UNION ALL
SELECT
  'Security Policies',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE policyname LIKE '%Anonymous%'
    ) THEN '❌ VULNERABLE'
    ELSE '✅ SECURE'
  END,
  'RLS policies'
UNION ALL
SELECT
  'Performance Indexes',
  CASE
    WHEN (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'student_courses') >= 3
    THEN '✅ OPTIMIZED'
    ELSE '⚠️ NEEDS INDEXES'
  END,
  'student_courses indexes';
