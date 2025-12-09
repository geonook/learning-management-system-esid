-- Migration 025: Add course_id FK to exams table
-- Purpose: Allow exams to be associated with specific courses (LT/IT/KCFS)
-- This enables importing gradebook data that distinguishes between course types
--
-- Created: 2025-12-08
-- Related: Gradebook import feature for 25 Fall Midterm

-- ============================================================
-- Part 1: Add course_id column
-- ============================================================

-- Add course_id column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'exams'
    AND column_name = 'course_id'
  ) THEN
    ALTER TABLE public.exams
    ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;

    RAISE NOTICE '✅ Added course_id column to exams table';
  ELSE
    RAISE NOTICE 'ℹ️ course_id column already exists in exams table';
  END IF;
END $$;

-- ============================================================
-- Part 2: Create index for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_exams_course_id
ON public.exams(course_id);

-- ============================================================
-- Part 3: Update unique constraint
-- ============================================================

-- Drop old constraint if exists (class_id + name)
ALTER TABLE public.exams
DROP CONSTRAINT IF EXISTS exams_class_id_name_key;

-- Create new unique constraint (class_id + course_id + name)
-- This allows same exam name for different courses in the same class
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exams_class_course_name_key'
  ) THEN
    ALTER TABLE public.exams
    ADD CONSTRAINT exams_class_course_name_key
    UNIQUE(class_id, course_id, name);

    RAISE NOTICE '✅ Created unique constraint exams_class_course_name_key';
  ELSE
    RAISE NOTICE 'ℹ️ Constraint exams_class_course_name_key already exists';
  END IF;
END $$;

-- ============================================================
-- Verification
-- ============================================================

DO $$
DECLARE
  col_exists BOOLEAN;
  idx_exists BOOLEAN;
  constraint_exists BOOLEAN;
BEGIN
  -- Check column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'exams'
    AND column_name = 'course_id'
  ) INTO col_exists;

  -- Check index
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_exams_course_id'
  ) INTO idx_exists;

  -- Check constraint
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exams_class_course_name_key'
  ) INTO constraint_exists;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 025 Verification:';
  RAISE NOTICE '  course_id column: %', CASE WHEN col_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE '  idx_exams_course_id: %', CASE WHEN idx_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE '  exams_class_course_name_key: %', CASE WHEN constraint_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE '========================================';
END $$;
