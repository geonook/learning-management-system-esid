-- Migration 027: Fix RLS Infinite Recursion
-- Purpose: Fix infinite recursion in RLS policies for courses and classes tables
-- Created: 2025-12-09
-- Related: Production error "infinite recursion detected in policy for relation"

-- ============================================================
-- Problem Analysis:
-- 1. teacher_view_class_courses (courses table) - self-referencing RLS
-- 2. Teachers can view their classes (classes table) - queries courses table
--    which triggers courses RLS, causing cross-recursion
-- ============================================================

-- ============================================================
-- Step 1: Create SECURITY DEFINER function to safely get teacher class IDs
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_teacher_class_ids()
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    ARRAY_AGG(DISTINCT class_id),
    ARRAY[]::UUID[]
  )
  FROM public.courses
  WHERE teacher_id = auth.uid()
    AND is_active = true;
$$;

COMMENT ON FUNCTION public.get_teacher_class_ids IS
  'Returns array of class IDs where the current user is a teacher. Uses SECURITY DEFINER to avoid RLS recursion.';

-- ============================================================
-- Step 2: Drop problematic policies
-- ============================================================

-- Drop the self-referencing policy on courses
DROP POLICY IF EXISTS teacher_view_class_courses ON courses;

-- Drop the cross-referencing policy on classes
DROP POLICY IF EXISTS "Teachers can view their classes" ON classes;

-- ============================================================
-- Step 3: Recreate classes policy using SECURITY DEFINER function
-- ============================================================

CREATE POLICY "Teachers can view their classes" ON classes
FOR SELECT TO authenticated
USING (
  id = ANY(public.get_teacher_class_ids())
);

-- ============================================================
-- Verification
-- ============================================================

DO $$
DECLARE
  func_exists BOOLEAN;
  policy_exists BOOLEAN;
  removed_policy BOOLEAN;
BEGIN
  -- Check function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_teacher_class_ids'
  ) INTO func_exists;

  -- Check new policy exists
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'classes'
    AND policyname = 'Teachers can view their classes'
  ) INTO policy_exists;

  -- Check problematic policy is removed
  SELECT NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'courses'
    AND policyname = 'teacher_view_class_courses'
  ) INTO removed_policy;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 027 Verification:';
  RAISE NOTICE '  get_teacher_class_ids function: %', CASE WHEN func_exists THEN 'OK' ELSE 'MISSING' END;
  RAISE NOTICE '  Teachers can view their classes policy: %', CASE WHEN policy_exists THEN 'OK' ELSE 'MISSING' END;
  RAISE NOTICE '  teacher_view_class_courses removed: %', CASE WHEN removed_policy THEN 'OK' ELSE 'STILL EXISTS' END;
  RAISE NOTICE '========================================';

  IF NOT func_exists OR NOT policy_exists OR NOT removed_policy THEN
    RAISE EXCEPTION 'Migration 027 verification failed';
  END IF;
END $$;
