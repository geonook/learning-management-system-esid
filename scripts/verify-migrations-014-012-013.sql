-- ================================================================
-- Migration Verification Script (014, 012, 013)
-- Purpose: Verify all Phase 1 migrations are correctly applied
-- Date: 2025-10-27
-- Usage: Execute this in Supabase Dashboard SQL Editor AFTER running all migrations
-- ================================================================

-- ================================================================
-- STEP 1: Verify Migration 014 (Track Column Type Fix)
-- ================================================================
SELECT '========================================' as divider;
SELECT '🔍 STEP 1: Migration 014 Verification' as step;
SELECT '========================================' as divider;

-- 1.1: Check users.track type
SELECT
  '✅ users.track type' as check_name,
  udt_name as current_type,
  CASE
    WHEN udt_name = 'course_type' THEN '✅ CORRECT'
    ELSE '❌ INCORRECT (should be course_type)'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'track';

-- 1.2: Check students.track type
SELECT
  '✅ students.track type' as check_name,
  udt_name as current_type,
  CASE
    WHEN udt_name = 'course_type' THEN '✅ CORRECT'
    ELSE '❌ INCORRECT (should be course_type)'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'students'
  AND column_name = 'track';

-- 1.3: Check classes.track type (should remain track_type)
SELECT
  '✅ classes.track type' as check_name,
  udt_name as current_type,
  CASE
    WHEN udt_name = 'track_type' THEN '✅ CORRECT (unchanged)'
    ELSE '⚠️ UNEXPECTED (should be track_type)'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'classes'
  AND column_name = 'track';

-- 1.4: Verify students.track values are NULL
SELECT
  '✅ students.track NULL count' as check_name,
  COUNT(*) as total_students,
  COUNT(track) as non_null_count,
  CASE
    WHEN COUNT(track) = 0 THEN '✅ ALL NULL (correct)'
    ELSE '⚠️ Some students have non-NULL track'
  END as status
FROM students;

-- 1.5: Check head_teacher_access_courses policy exists
SELECT
  '✅ RLS Policy: head_teacher_access_courses' as check_name,
  policyname,
  cmd,
  CASE
    WHEN policyname = 'head_teacher_access_courses' THEN '✅ EXISTS'
    ELSE '❌ NOT FOUND'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'courses'
  AND policyname = 'head_teacher_access_courses';

-- ================================================================
-- STEP 2: Verify Migration 012 (Missing Architecture)
-- ================================================================
SELECT '========================================' as divider;
SELECT '🔍 STEP 2: Migration 012 Verification' as step;
SELECT '========================================' as divider;

-- 2.1: Check student_courses table exists
SELECT
  '✅ student_courses table' as check_name,
  COUNT(*) as total_enrollments,
  CASE
    WHEN COUNT(*) = 252 THEN '✅ CORRECT (84 classes × 3 courses)'
    WHEN COUNT(*) > 0 THEN '⚠️ PARTIAL (' || COUNT(*) || ' enrollments)'
    ELSE '❌ EMPTY (should have 252)'
  END as status
FROM student_courses;

-- 2.2: Check student_courses data distribution
SELECT
  '✅ student_courses distribution' as check_name,
  COUNT(DISTINCT student_id) as unique_students,
  COUNT(DISTINCT course_id) as unique_courses,
  COUNT(*) as total_enrollments,
  CASE
    WHEN COUNT(DISTINCT course_id) >= 252 THEN '✅ ALL COURSES COVERED'
    ELSE '⚠️ SOME COURSES MISSING'
  END as status
FROM student_courses;

-- 2.3: Check scores.course_id column exists
SELECT
  '✅ scores.course_id column' as check_name,
  data_type,
  is_nullable,
  CASE
    WHEN column_name = 'course_id' THEN '✅ EXISTS'
    ELSE '❌ NOT FOUND'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'scores'
  AND column_name = 'course_id';

-- 2.4: Check student_courses indexes
SELECT
  '✅ student_courses indexes' as check_name,
  COUNT(*) as index_count,
  CASE
    WHEN COUNT(*) >= 3 THEN '✅ SUFFICIENT (>= 3)'
    ELSE '⚠️ MAY NEED MORE'
  END as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'student_courses';

-- List all student_courses indexes
SELECT
  'Index details' as info,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'student_courses'
ORDER BY indexname;

-- 2.5: Check RLS policy from Migration 012
SELECT
  '✅ RLS Policy: Heads can see enrollments' as check_name,
  policyname,
  CASE
    WHEN policyname = 'Heads can see enrollments in their jurisdiction' THEN '✅ EXISTS'
    ELSE '❌ NOT FOUND'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'student_courses'
  AND policyname = 'Heads can see enrollments in their jurisdiction';

-- ================================================================
-- STEP 3: Verify Migration 013 (RLS Security)
-- ================================================================
SELECT '========================================' as divider;
SELECT '🔍 STEP 3: Migration 013 Verification' as step;
SELECT '========================================' as divider;

-- 3.1: Check for dangerous anonymous policies
SELECT
  '🔒 Anonymous policies check' as check_name,
  COUNT(*) as anonymous_policy_count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ SECURE (no anonymous policies)'
    ELSE '❌ VULNERABLE (' || COUNT(*) || ' anonymous policies found)'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    policyname ILIKE '%anonymous%'
    OR pg_get_expr(qual, tablename::regclass) ILIKE '%anon%'
  );

-- 3.2: List all current RLS policies by table
SELECT
  '📋 Current RLS policies' as info,
  tablename,
  policyname,
  cmd,
  CASE
    WHEN policyname ILIKE '%admin%' THEN '✅ Admin'
    WHEN policyname ILIKE '%head%' THEN '✅ Head Teacher'
    WHEN policyname ILIKE '%teacher%' THEN '✅ Teacher'
    WHEN policyname ILIKE '%student%' THEN '✅ Student'
    WHEN policyname ILIKE '%anonymous%' THEN '❌ Anonymous'
    ELSE '⚠️ Other'
  END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3.3: Count policies by type
SELECT
  '📊 Policy distribution' as check_name,
  CASE
    WHEN policyname ILIKE '%admin%' THEN 'Admin policies'
    WHEN policyname ILIKE '%head%' THEN 'Head Teacher policies'
    WHEN policyname ILIKE '%teacher%' THEN 'Teacher policies'
    WHEN policyname ILIKE '%student%' THEN 'Student policies'
    WHEN policyname ILIKE '%anonymous%' THEN '❌ Anonymous policies'
    ELSE 'Other policies'
  END as policy_type,
  COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY policy_type
ORDER BY count DESC;

-- ================================================================
-- STEP 4: Overall Status Summary
-- ================================================================
SELECT '========================================' as divider;
SELECT '📊 OVERALL STATUS SUMMARY' as step;
SELECT '========================================' as divider;

SELECT
  'Migration 014' as migration,
  CASE
    WHEN (
      SELECT udt_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'track'
    ) = 'course_type'
    AND (
      SELECT udt_name FROM information_schema.columns
      WHERE table_name = 'students' AND column_name = 'track'
    ) = 'course_type'
    THEN '✅ PASSED'
    ELSE '❌ FAILED'
  END as status,
  'Track column type fix' as description

UNION ALL

SELECT
  'Migration 012',
  CASE
    WHEN EXISTS (SELECT 1 FROM student_courses LIMIT 1)
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'scores' AND column_name = 'course_id'
    )
    THEN '✅ PASSED'
    ELSE '❌ FAILED'
  END,
  'Missing architecture components'

UNION ALL

SELECT
  'Migration 013',
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
      AND policyname ILIKE '%anonymous%'
    )
    THEN '✅ PASSED'
    ELSE '❌ FAILED'
  END,
  'RLS security improvements'

UNION ALL

SELECT
  'Overall Phase 1',
  CASE
    WHEN (
      -- Check Migration 014
      SELECT udt_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'track'
    ) = 'course_type'
    AND (
      -- Check Migration 012
      EXISTS (SELECT 1 FROM student_courses LIMIT 1)
    )
    AND (
      -- Check Migration 013
      NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND policyname ILIKE '%anonymous%'
      )
    )
    THEN '🎉 ALL CHECKS PASSED'
    ELSE '⚠️ SOME CHECKS FAILED'
  END,
  'Complete Phase 1 verification';

-- ================================================================
-- STEP 5: Detailed Statistics
-- ================================================================
SELECT '========================================' as divider;
SELECT '📈 DETAILED STATISTICS' as step;
SELECT '========================================' as divider;

-- 5.1: Count all tables
SELECT
  '📊 Total tables' as metric,
  COUNT(*) as value
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- 5.2: Count all RLS policies
SELECT
  '🔒 Total RLS policies' as metric,
  COUNT(*) as value
FROM pg_policies
WHERE schemaname = 'public';

-- 5.3: Count all indexes
SELECT
  '⚡ Total indexes' as metric,
  COUNT(*) as value
FROM pg_indexes
WHERE schemaname = 'public';

-- 5.4: Database size
SELECT
  '💾 Database size' as metric,
  pg_size_pretty(pg_database_size(current_database())) as value;

-- ================================================================
-- STEP 6: Next Steps Recommendation
-- ================================================================
SELECT '========================================' as divider;
SELECT '🎯 NEXT STEPS' as step;
SELECT '========================================' as divider;

SELECT
  CASE
    WHEN (
      SELECT udt_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'track'
    ) = 'course_type'
    AND EXISTS (SELECT 1 FROM student_courses LIMIT 1)
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND policyname ILIKE '%anonymous%'
    )
    THEN '✅ All migrations successful! Next: npm run gen:types'
    WHEN (
      SELECT udt_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'track'
    ) != 'course_type'
    THEN '❌ Run Migration 014 first'
    WHEN NOT EXISTS (SELECT 1 FROM student_courses LIMIT 1)
    THEN '❌ Run Migration 012 next'
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND policyname ILIKE '%anonymous%'
    )
    THEN '❌ Run Migration 013 next'
    ELSE '⚠️ Unknown state - check error messages above'
  END as recommendation;

-- ================================================================
-- End of verification script
-- ================================================================
SELECT '========================================' as divider;
SELECT '✅ Verification script completed' as status;
SELECT '========================================' as divider;
