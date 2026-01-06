-- Migration 043: Allow nullable fields for historical communication import
-- Purpose: Historical LT communication records may have incomplete data
-- Created: 2026-01-06

-- ==============================================================================
-- PART 1: Modify column constraints
-- ==============================================================================

-- Allow nullable course_id (students may not have LT course assigned)
ALTER TABLE communications ALTER COLUMN course_id DROP NOT NULL;

-- Allow nullable teacher_id (linked to course, if course is null, teacher is also null)
ALTER TABLE communications ALTER COLUMN teacher_id DROP NOT NULL;

-- Allow nullable content (historical records may have empty content)
ALTER TABLE communications ALTER COLUMN content DROP NOT NULL;

-- Allow nullable communication_date (historical records may have empty date)
ALTER TABLE communications ALTER COLUMN communication_date DROP NOT NULL;

-- ==============================================================================
-- PART 2: Add comments explaining the changes
-- ==============================================================================

COMMENT ON COLUMN communications.course_id IS 'Course UUID - nullable for historical imports where course assignment may be unclear';
COMMENT ON COLUMN communications.teacher_id IS 'Teacher UUID - nullable for historical imports, derived from course assignment';
COMMENT ON COLUMN communications.content IS 'Communication content - nullable for historical imports with incomplete data';
COMMENT ON COLUMN communications.communication_date IS 'Communication date - nullable for historical imports with missing date';

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================

DO $$
DECLARE
  col_is_nullable TEXT;
BEGIN
  -- Check course_id is nullable
  SELECT is_nullable INTO col_is_nullable
  FROM information_schema.columns
  WHERE table_name = 'communications' AND column_name = 'course_id';

  IF col_is_nullable = 'YES' THEN
    RAISE NOTICE '✅ course_id is now nullable';
  ELSE
    RAISE EXCEPTION '❌ course_id is still NOT NULL';
  END IF;

  -- Check teacher_id is nullable
  SELECT is_nullable INTO col_is_nullable
  FROM information_schema.columns
  WHERE table_name = 'communications' AND column_name = 'teacher_id';

  IF col_is_nullable = 'YES' THEN
    RAISE NOTICE '✅ teacher_id is now nullable';
  ELSE
    RAISE EXCEPTION '❌ teacher_id is still NOT NULL';
  END IF;

  -- Check content is nullable
  SELECT is_nullable INTO col_is_nullable
  FROM information_schema.columns
  WHERE table_name = 'communications' AND column_name = 'content';

  IF col_is_nullable = 'YES' THEN
    RAISE NOTICE '✅ content is now nullable';
  ELSE
    RAISE EXCEPTION '❌ content is still NOT NULL';
  END IF;

  -- Check communication_date is nullable
  SELECT is_nullable INTO col_is_nullable
  FROM information_schema.columns
  WHERE table_name = 'communications' AND column_name = 'communication_date';

  IF col_is_nullable = 'YES' THEN
    RAISE NOTICE '✅ communication_date is now nullable';
  ELSE
    RAISE EXCEPTION '❌ communication_date is still NOT NULL';
  END IF;
END $$;
