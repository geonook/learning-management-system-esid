-- Migration 035: Sync exams table schema (Staging → Production alignment)
--
-- Purpose: Align Staging database with Production schema
-- - Remove class_id column (use course_id → courses.class_id instead)
-- - Set course_id as NOT NULL
-- - Rename is_published to is_active
--
-- Created: 2025-12-20

-- ============================================================
-- Step 1: Verify no orphan data
-- ============================================================
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM exams WHERE course_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Found % exams without course_id. Please fix data first.', orphan_count;
  END IF;
END $$;

-- ============================================================
-- Step 2: Set course_id as NOT NULL
-- ============================================================
ALTER TABLE exams ALTER COLUMN course_id SET NOT NULL;

-- ============================================================
-- Step 3: Remove class_id column and related indexes
-- ============================================================
DROP INDEX IF EXISTS idx_exams_class;
DROP INDEX IF EXISTS idx_analytics_exams_timeline;

-- Drop FK constraint if exists
ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_class_id_fkey;

-- Drop the column
ALTER TABLE exams DROP COLUMN IF EXISTS class_id CASCADE;

-- ============================================================
-- Step 4: Rename is_published to is_active
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'exams'
    AND column_name = 'is_published'
  ) THEN
    ALTER TABLE exams RENAME COLUMN is_published TO is_active;
    ALTER TABLE exams ALTER COLUMN is_active SET DEFAULT true;
    RAISE NOTICE '✅ Renamed is_published to is_active';
  ELSE
    RAISE NOTICE 'ℹ️ is_published column does not exist, skipping rename';
  END IF;
END $$;

-- ============================================================
-- Step 5: Update unique constraint
-- ============================================================
ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_class_course_name_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exams_course_id_name_key'
  ) THEN
    ALTER TABLE exams ADD CONSTRAINT exams_course_id_name_key UNIQUE(course_id, name);
    RAISE NOTICE '✅ Created unique constraint exams_course_id_name_key';
  ELSE
    RAISE NOTICE 'ℹ️ Constraint exams_course_id_name_key already exists';
  END IF;
END $$;

-- ============================================================
-- Verification
-- ============================================================
DO $$
DECLARE
  has_class_id BOOLEAN;
  has_course_id BOOLEAN;
  has_is_active BOOLEAN;
  has_is_published BOOLEAN;
BEGIN
  -- Check columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exams' AND column_name = 'class_id'
  ) INTO has_class_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exams' AND column_name = 'course_id'
  ) INTO has_course_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exams' AND column_name = 'is_active'
  ) INTO has_is_active;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'exams' AND column_name = 'is_published'
  ) INTO has_is_published;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 035 Verification:';
  RAISE NOTICE '  class_id removed: %', CASE WHEN NOT has_class_id THEN '✅' ELSE '❌' END;
  RAISE NOTICE '  course_id exists: %', CASE WHEN has_course_id THEN '✅' ELSE '❌' END;
  RAISE NOTICE '  is_active exists: %', CASE WHEN has_is_active THEN '✅' ELSE '❌' END;
  RAISE NOTICE '  is_published removed: %', CASE WHEN NOT has_is_published THEN '✅' ELSE '❌' END;
  RAISE NOTICE '========================================';
END $$;
