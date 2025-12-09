-- Migration 023: Add Grade Band Support for Head Teachers
-- Purpose: Support multi-grade Head Teacher assignments (e.g., G3-4, G5-6, G1-6)
-- Created: 2025-12-02
--
-- Grade Band Structure:
-- LT: G1, G2, G3-4, G5-6
-- IT: G1-2, G3-4, G5-6
-- KCFS: G1-6
--
-- Changes:
-- 1. Add grade_band TEXT column to users table
-- 2. Migrate existing grade data to grade_band
-- 3. Create helper function for grade band matching
-- 4. Update RLS policies to use grade band logic

-- ========================================
-- STEP 1: Add grade_band column
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name = 'grade_band'
  ) THEN
    ALTER TABLE users ADD COLUMN grade_band TEXT;
    RAISE NOTICE 'Added grade_band column to users table';
  ELSE
    RAISE NOTICE 'grade_band column already exists';
  END IF;
END $$;

-- ========================================
-- STEP 2: Migrate existing grade data
-- ========================================

-- Convert existing integer grades to grade_band format
UPDATE users
SET grade_band = grade::TEXT
WHERE grade IS NOT NULL AND grade_band IS NULL;

-- ========================================
-- STEP 3: Create grade band matching function
-- ========================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.grade_in_band(INTEGER, TEXT);

-- Function to check if a grade falls within a grade band
CREATE OR REPLACE FUNCTION public.grade_in_band(
  check_grade INTEGER,
  band TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
AS $$
  SELECT CASE
    -- Single grades
    WHEN band = '1' THEN check_grade = 1
    WHEN band = '2' THEN check_grade = 2
    WHEN band = '3' THEN check_grade = 3
    WHEN band = '4' THEN check_grade = 4
    WHEN band = '5' THEN check_grade = 5
    WHEN band = '6' THEN check_grade = 6
    -- Two-grade bands
    WHEN band = '1-2' THEN check_grade IN (1, 2)
    WHEN band = '3-4' THEN check_grade IN (3, 4)
    WHEN band = '5-6' THEN check_grade IN (5, 6)
    -- Full range
    WHEN band = '1-6' THEN check_grade BETWEEN 1 AND 6
    -- Default: no match
    ELSE FALSE
  END;
$$;

COMMENT ON FUNCTION public.grade_in_band IS
  'Check if a grade (1-6) falls within a grade band (e.g., "3-4", "1-6")';

-- ========================================
-- STEP 4: Create safe role getter function
-- ========================================

-- Drop existing function if exists (from Migration 021)
DROP FUNCTION IF EXISTS public.get_user_role_safe();
DROP FUNCTION IF EXISTS public.get_user_grade_band_safe();
DROP FUNCTION IF EXISTS public.get_user_teacher_type_safe();

-- Function to safely get user role without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role_safe()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role::TEXT FROM public.users WHERE id = auth.uid();
$$;

-- Function to safely get user grade_band without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_grade_band_safe()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT grade_band FROM public.users WHERE id = auth.uid();
$$;

-- Function to safely get user teacher_type without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_teacher_type_safe()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT teacher_type::TEXT FROM public.users WHERE id = auth.uid();
$$;

-- ========================================
-- STEP 5: Update constraint for head teachers
-- ========================================

-- Drop old constraint if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_head_grade_required'
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_head_grade_required;
    RAISE NOTICE 'Dropped old users_head_grade_required constraint';
  END IF;
END $$;

-- Add new constraint for head teachers (grade_band required instead of grade)
-- Note: We allow both grade and grade_band for backwards compatibility
ALTER TABLE users ADD CONSTRAINT users_head_grade_band_required
  CHECK (
    (role::TEXT = 'head' AND (grade_band IS NOT NULL OR grade IS NOT NULL))
    OR role::TEXT != 'head'
  );

-- ========================================
-- STEP 6: Add validation constraint for grade_band format
-- ========================================

ALTER TABLE users ADD CONSTRAINT users_grade_band_format
  CHECK (
    grade_band IS NULL
    OR grade_band ~ '^[1-6]$'           -- Single grade: 1, 2, 3, 4, 5, 6
    OR grade_band ~ '^[1-5]-[2-6]$'     -- Range: 1-2, 3-4, 5-6, 1-6
  );

-- ========================================
-- STEP 7: Create index for grade_band
-- ========================================

CREATE INDEX IF NOT EXISTS idx_users_grade_band ON users(grade_band) WHERE grade_band IS NOT NULL;

-- ========================================
-- STEP 8: Update RLS policies for classes
-- ========================================

-- Drop existing head policies that use old grade logic
DROP POLICY IF EXISTS "head_grade_track_access" ON classes;
DROP POLICY IF EXISTS "heads_manage_grade_band" ON classes;

-- Create new policy using grade_band
CREATE POLICY "heads_manage_grade_band" ON classes
FOR ALL TO authenticated
USING (
  public.get_user_role_safe() = 'admin'
  OR (
    public.get_user_role_safe() = 'head'
    AND public.grade_in_band(classes.grade, public.get_user_grade_band_safe())
  )
);

-- ========================================
-- STEP 9: Update RLS policies for students
-- ========================================

-- Drop existing head policies that use old grade logic
DROP POLICY IF EXISTS "head_grade_track_access" ON students;
DROP POLICY IF EXISTS "heads_manage_student_grade_band" ON students;

-- Create new policy using grade_band
CREATE POLICY "heads_manage_student_grade_band" ON students
FOR ALL TO authenticated
USING (
  public.get_user_role_safe() = 'admin'
  OR (
    public.get_user_role_safe() = 'head'
    AND public.grade_in_band(students.grade, public.get_user_grade_band_safe())
  )
);

-- ========================================
-- STEP 10: Update RLS policies for courses
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS "heads_manage_courses_grade_band" ON courses;

-- Create new policy for head teachers to manage courses in their grade band
CREATE POLICY "heads_manage_courses_grade_band" ON courses
FOR ALL TO authenticated
USING (
  public.get_user_role_safe() = 'admin'
  OR (
    public.get_user_role_safe() = 'head'
    AND public.get_user_teacher_type_safe() = courses.course_type::TEXT
    AND EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = courses.class_id
      AND public.grade_in_band(c.grade, public.get_user_grade_band_safe())
    )
  )
  OR courses.teacher_id = (SELECT auth.uid())
);

-- ========================================
-- VERIFICATION
-- ========================================

DO $$
DECLARE
  grade_band_exists BOOLEAN;
  function_exists BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Check grade_band column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name = 'grade_band'
  ) INTO grade_band_exists;

  -- Check function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'grade_in_band'
  ) INTO function_exists;

  -- Check policies created
  SELECT COUNT(*) FROM pg_policies
  WHERE policyname LIKE 'heads_manage%grade_band%'
  INTO policy_count;

  IF NOT grade_band_exists THEN
    RAISE EXCEPTION 'Migration failed: grade_band column not created';
  END IF;

  IF NOT function_exists THEN
    RAISE EXCEPTION 'Migration failed: grade_in_band function not created';
  END IF;

  RAISE NOTICE 'Migration 023 completed successfully:';
  RAISE NOTICE '  - grade_band column: EXISTS';
  RAISE NOTICE '  - grade_in_band function: EXISTS';
  RAISE NOTICE '  - Grade band policies: % created', policy_count;
END $$;

-- ========================================
-- DOCUMENTATION
-- ========================================

COMMENT ON COLUMN users.grade_band IS
  'Grade band for head teachers. Valid values: 1, 2, 3, 4, 5, 6, 1-2, 3-4, 5-6, 1-6';

-- Record migration (only if schema_versions table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_versions') THEN
    INSERT INTO schema_versions (version, description)
    VALUES ('023_grade_band_support', 'Added grade_band column and RLS policies for multi-grade head teacher support')
    ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;
  END IF;
END $$;
