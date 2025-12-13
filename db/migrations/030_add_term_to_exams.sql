-- Migration 030: Add term field to exams table (Four-term system)
--
-- This migration adds support for the four-term academic system:
--   Term 1: Fall Midterm (2025 Fall Midterm)
--   Term 2: Fall Final (2025 Fall Final)
--   Term 3: Spring Midterm (2026 Spring Midterm)
--   Term 4: Spring Final (2026 Spring Final)
--
-- Semester is derived from term:
--   term 1-2 → semester 1 (Fall)
--   term 3-4 → semester 2 (Spring)
--
-- Author: Claude Code
-- Date: 2025-12-12

-- ============================================================
-- Part 1: Add term column to exams table
-- ============================================================

-- Add term column (1-4)
ALTER TABLE exams
ADD COLUMN IF NOT EXISTS term INTEGER
  CHECK (term IS NULL OR term IN (1, 2, 3, 4));

-- Note: PostgreSQL doesn't support generated columns with subqueries referencing the same table
-- So we'll add semester as a regular column and maintain it via trigger or application logic
ALTER TABLE exams
ADD COLUMN IF NOT EXISTS semester INTEGER
  CHECK (semester IS NULL OR semester IN (1, 2));

-- ============================================================
-- Part 2: Create trigger to auto-calculate semester from term
-- ============================================================

-- Create function to calculate semester from term
CREATE OR REPLACE FUNCTION calculate_semester_from_term()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.term IS NOT NULL THEN
    NEW.semester := CASE
      WHEN NEW.term IN (1, 2) THEN 1  -- Fall semester
      WHEN NEW.term IN (3, 4) THEN 2  -- Spring semester
      ELSE NULL
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update semester when term changes
DROP TRIGGER IF EXISTS exams_calculate_semester ON exams;
CREATE TRIGGER exams_calculate_semester
  BEFORE INSERT OR UPDATE OF term ON exams
  FOR EACH ROW
  EXECUTE FUNCTION calculate_semester_from_term();

-- ============================================================
-- Part 3: Create indexes for term queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_exams_term ON exams(term);
CREATE INDEX IF NOT EXISTS idx_exams_semester ON exams(semester);
CREATE INDEX IF NOT EXISTS idx_exams_course_term ON exams(course_id, term);

-- ============================================================
-- Part 4: Populate existing data based on exam names
-- ============================================================

-- Current data is all Term 1 (2025 Fall Midterm)
-- Update based on exam name patterns
UPDATE exams SET term = CASE
  -- Fall Midterm patterns
  WHEN name ILIKE '%Midterm%' AND name ILIKE '%Fall%' THEN 1
  WHEN name ILIKE '%Term 1%' THEN 1
  WHEN name ILIKE '%25Fall%' AND name ILIKE '%Midterm%' THEN 1

  -- Fall Final patterns
  WHEN name ILIKE '%Final%' AND name ILIKE '%Fall%' THEN 2
  WHEN name ILIKE '%Term 2%' THEN 2
  WHEN name ILIKE '%25Fall%' AND name ILIKE '%Final%' THEN 2

  -- Spring Midterm patterns
  WHEN name ILIKE '%Midterm%' AND name ILIKE '%Spring%' THEN 3
  WHEN name ILIKE '%Term 3%' THEN 3
  WHEN name ILIKE '%26Spring%' AND name ILIKE '%Midterm%' THEN 3

  -- Spring Final patterns
  WHEN name ILIKE '%Final%' AND name ILIKE '%Spring%' THEN 4
  WHEN name ILIKE '%Term 4%' THEN 4
  WHEN name ILIKE '%26Spring%' AND name ILIKE '%Final%' THEN 4

  -- Default: If name contains "Midterm" → Term 1, "Final" → Term 2
  WHEN name ILIKE '%Midterm%' THEN 1
  WHEN name ILIKE '%Final%' THEN 2

  -- Fallback: Term 1
  ELSE 1
END
WHERE term IS NULL;

-- ============================================================
-- Part 5: Verification
-- ============================================================

-- Show term distribution
DO $$
DECLARE
  total_exams INTEGER;
  term1_count INTEGER;
  term2_count INTEGER;
  term3_count INTEGER;
  term4_count INTEGER;
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_exams FROM exams;
  SELECT COUNT(*) INTO term1_count FROM exams WHERE term = 1;
  SELECT COUNT(*) INTO term2_count FROM exams WHERE term = 2;
  SELECT COUNT(*) INTO term3_count FROM exams WHERE term = 3;
  SELECT COUNT(*) INTO term4_count FROM exams WHERE term = 4;
  SELECT COUNT(*) INTO null_count FROM exams WHERE term IS NULL;

  RAISE NOTICE '=== Migration 030: Term Distribution ===';
  RAISE NOTICE 'Total exams: %', total_exams;
  RAISE NOTICE 'Term 1 (Fall Midterm): %', term1_count;
  RAISE NOTICE 'Term 2 (Fall Final): %', term2_count;
  RAISE NOTICE 'Term 3 (Spring Midterm): %', term3_count;
  RAISE NOTICE 'Term 4 (Spring Final): %', term4_count;
  RAISE NOTICE 'NULL term: %', null_count;
END $$;

-- ============================================================
-- Rollback instructions
-- ============================================================
-- To rollback this migration:
--
-- DROP TRIGGER IF EXISTS exams_calculate_semester ON exams;
-- DROP FUNCTION IF EXISTS calculate_semester_from_term();
-- DROP INDEX IF EXISTS idx_exams_term;
-- DROP INDEX IF EXISTS idx_exams_semester;
-- DROP INDEX IF EXISTS idx_exams_course_term;
-- ALTER TABLE exams DROP COLUMN IF EXISTS semester;
-- ALTER TABLE exams DROP COLUMN IF EXISTS term;
