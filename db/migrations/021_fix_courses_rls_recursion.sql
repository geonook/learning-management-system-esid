-- Migration 021: Fix RLS Recursion in Courses Table
-- Purpose: Resolve "infinite recursion detected in policy for relation courses" error
-- Cause: The policy "teacher_view_class_courses" queries the "courses" table itself to find classes a teacher teaches.
-- Solution: Use a SECURITY DEFINER function to fetch the teacher's class IDs, bypassing RLS.

-- 1. Create a helper function to get class IDs for a teacher
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

-- 2. Drop the problematic recursive policy
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

-- 4. Ensure other policies are safe (re-applying for consistency/safety)
-- "teacher_view_own_courses" is safe as it doesn't query courses table
-- "head_teacher_access_courses" is safe as it queries classes table (assuming classes doesn't query courses)

-- 5. Grant execute permission on the new function
GRANT EXECUTE ON FUNCTION public.get_teacher_class_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_class_ids(UUID) TO service_role;
