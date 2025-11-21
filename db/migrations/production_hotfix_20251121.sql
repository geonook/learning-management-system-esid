-- Production Hotfix 2025-11-21
-- Combines fixes from Migration 020 and 021
-- Designed to be idempotent (safe to run multiple times)

BEGIN;

-- ============================================================
-- Fix 1: Disable Auto User Sync (from Migration 020)
-- ============================================================

-- Drop the conflicting trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the conflicting function if it exists
DROP FUNCTION IF EXISTS handle_new_auth_user();


-- ============================================================
-- Fix 2: Fix RLS Recursion in Courses Table (from Migration 021)
-- ============================================================

-- 1. Create/Replace helper function to get class IDs for a teacher
-- This function runs with SECURITY DEFINER privileges to bypass RLS on the courses table
CREATE OR REPLACE FUNCTION public.get_teacher_class_ids(teacher_uuid UUID)
RETURNS TABLE (class_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT c.class_id
  FROM courses c
  WHERE c.teacher_id = teacher_uuid;
END;
$$;

-- 2. Drop the problematic recursive policy if it exists
DROP POLICY IF EXISTS "teacher_view_class_courses" ON courses;

-- 3. Recreate the policy using the helper function
CREATE POLICY "teacher_view_class_courses"
ON courses
FOR SELECT
TO authenticated
USING (
  -- Check if the user is a teacher
  (SELECT auth.role() = 'authenticated') AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
  ) AND
  -- Check if the course belongs to a class the teacher teaches
  class_id IN (
    SELECT * FROM public.get_teacher_class_ids(auth.uid())
  )
);

-- 4. Grant execute permission on the new function
GRANT EXECUTE ON FUNCTION public.get_teacher_class_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_class_ids(UUID) TO service_role;


COMMIT;
