-- Migration 033: KCFS Scoring System + Global Absent Support
-- Purpose:
--   1. Add is_absent column to scores table (all course types)
--   2. Create kcfs_categories table for grade-specific KCFS categories
--   3. Add KCFS assessment codes (COMM, COLLAB, SD, CT, BW, PORT, PRES)
-- Created: 2025-12-16
--
-- KCFS Scoring Logic:
--   - Score Range: 0-5 (0.5 increments)
--   - Formula: Term Grade = 50 + (Σ category_score × weight)
--   - G1-2: 4 categories (weight 2.5)
--   - G3-4: 5 categories (weight 2.0)
--   - G5-6: 6 categories (weight 5/3)
--
-- Absent Feature:
--   - Applies to ALL course types (LT, IT, KCFS)
--   - is_absent = TRUE: student absent, excluded from average
--   - score = NULL, is_absent = FALSE: not yet entered

-- ========================================
-- STEP 1: Add is_absent column to scores table
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scores'
    AND column_name = 'is_absent'
  ) THEN
    ALTER TABLE scores ADD COLUMN is_absent BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added is_absent column to scores table';
  ELSE
    RAISE NOTICE 'is_absent column already exists';
  END IF;
END $$;

-- Add constraint: score should be NULL when is_absent is TRUE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_absent_score'
  ) THEN
    ALTER TABLE scores ADD CONSTRAINT check_absent_score
      CHECK (NOT (is_absent = TRUE AND score IS NOT NULL));
    RAISE NOTICE 'Added check_absent_score constraint';
  ELSE
    RAISE NOTICE 'check_absent_score constraint already exists';
  END IF;
END $$;

-- Create index for is_absent queries
CREATE INDEX IF NOT EXISTS idx_scores_is_absent ON scores(is_absent) WHERE is_absent = TRUE;

-- ========================================
-- STEP 2: Create kcfs_categories table
-- ========================================

CREATE TABLE IF NOT EXISTS kcfs_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Grade range (1-2, 3-4, 5-6)
  grade_range_start INTEGER NOT NULL CHECK (grade_range_start BETWEEN 1 AND 6),
  grade_range_end INTEGER NOT NULL CHECK (grade_range_end BETWEEN 1 AND 6),

  -- Category configuration
  category_code TEXT NOT NULL,      -- e.g., 'COMM', 'COLLAB', 'SD', 'CT', 'BW', 'PORT', 'PRES'
  category_name TEXT NOT NULL,      -- e.g., 'Communication', 'Collaboration'
  weight NUMERIC(5,4) NOT NULL,     -- e.g., 2.5, 2.0, 1.6667
  sequence_order INTEGER NOT NULL,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE (grade_range_start, grade_range_end, category_code),
  CHECK (grade_range_start <= grade_range_end)
);

-- Create index for grade range lookups
CREATE INDEX IF NOT EXISTS idx_kcfs_categories_grade_range
  ON kcfs_categories(grade_range_start, grade_range_end);

-- ========================================
-- STEP 3: Seed KCFS categories data
-- ========================================

INSERT INTO kcfs_categories (grade_range_start, grade_range_end, category_code, category_name, weight, sequence_order) VALUES
  -- G1-2: 4 categories, weight = 2.5
  (1, 2, 'COMM', 'Communication', 2.5, 1),
  (1, 2, 'COLLAB', 'Collaboration', 2.5, 2),
  (1, 2, 'SD', 'Self-Direction', 2.5, 3),
  (1, 2, 'CT', 'Critical Thinking', 2.5, 4),

  -- G3-4: 5 categories, weight = 2.0
  (3, 4, 'COMM', 'Communication', 2.0, 1),
  (3, 4, 'COLLAB', 'Collaboration', 2.0, 2),
  (3, 4, 'SD', 'Self-Direction', 2.0, 3),
  (3, 4, 'CT', 'Critical Thinking', 2.0, 4),
  (3, 4, 'BW', 'Book Work', 2.0, 5),

  -- G5-6: 6 categories, weight = 5/3 = 1.6667
  (5, 6, 'COMM', 'Communication', 1.6667, 1),
  (5, 6, 'COLLAB', 'Collaboration', 1.6667, 2),
  (5, 6, 'SD', 'Self-Direction', 1.6667, 3),
  (5, 6, 'CT', 'Critical Thinking', 1.6667, 4),
  (5, 6, 'PORT', 'Portfolio', 1.6667, 5),
  (5, 6, 'PRES', 'Presentation', 1.6667, 6)
ON CONFLICT (grade_range_start, grade_range_end, category_code) DO UPDATE SET
  category_name = EXCLUDED.category_name,
  weight = EXCLUDED.weight,
  sequence_order = EXCLUDED.sequence_order,
  is_active = EXCLUDED.is_active;

-- ========================================
-- STEP 4: Add KCFS assessment codes
-- ========================================

INSERT INTO assessment_codes (code, category, sequence_order, is_active) VALUES
  ('COMM', 'kcfs', 20, TRUE),
  ('COLLAB', 'kcfs', 21, TRUE),
  ('SD', 'kcfs', 22, TRUE),
  ('CT', 'kcfs', 23, TRUE),
  ('BW', 'kcfs', 24, TRUE),
  ('PORT', 'kcfs', 25, TRUE),
  ('PRES', 'kcfs', 26, TRUE)
ON CONFLICT (code) DO UPDATE SET
  category = EXCLUDED.category,
  sequence_order = EXCLUDED.sequence_order,
  is_active = EXCLUDED.is_active;

-- ========================================
-- STEP 5: Enable RLS on kcfs_categories
-- ========================================

ALTER TABLE kcfs_categories ENABLE ROW LEVEL SECURITY;

-- Service role bypass
DROP POLICY IF EXISTS "service_role_bypass_kcfs_categories" ON kcfs_categories;
CREATE POLICY "service_role_bypass_kcfs_categories" ON kcfs_categories
FOR ALL TO service_role
USING (TRUE)
WITH CHECK (TRUE);

-- Everyone can read (configuration data)
DROP POLICY IF EXISTS "authenticated_read_kcfs_categories" ON kcfs_categories;
CREATE POLICY "authenticated_read_kcfs_categories" ON kcfs_categories
FOR SELECT TO authenticated
USING (TRUE);

-- Only admin can modify
DROP POLICY IF EXISTS "admin_manage_kcfs_categories" ON kcfs_categories;
CREATE POLICY "admin_manage_kcfs_categories" ON kcfs_categories
FOR ALL TO authenticated
USING (public.get_user_role_safe() = 'admin')
WITH CHECK (public.get_user_role_safe() = 'admin');

-- ========================================
-- STEP 6: Add Table Comments
-- ========================================

COMMENT ON TABLE kcfs_categories IS
  'KCFS grade-specific category configuration.
   G1-2: 4 categories (Communication, Collaboration, Self-Direction, Critical Thinking) weight=2.5
   G3-4: 5 categories (+ Book Work) weight=2.0
   G5-6: 6 categories (+ Portfolio, Presentation instead of Book Work) weight=5/3';

COMMENT ON COLUMN kcfs_categories.category_code IS
  'Short code: COMM, COLLAB, SD, CT, BW, PORT, PRES';

COMMENT ON COLUMN kcfs_categories.weight IS
  'Weight for term grade calculation: G1-2=2.5, G3-4=2.0, G5-6=1.6667';

COMMENT ON COLUMN scores.is_absent IS
  'TRUE if student was absent. Absent scores are excluded from average calculations.
   Applies to all course types (LT, IT, KCFS).';

-- ========================================
-- VERIFICATION
-- ========================================

DO $$
DECLARE
  absent_col_exists BOOLEAN;
  kcfs_table_exists BOOLEAN;
  kcfs_cat_count INTEGER;
  kcfs_code_count INTEGER;
BEGIN
  -- Check is_absent column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scores'
    AND column_name = 'is_absent'
  ) INTO absent_col_exists;

  -- Check kcfs_categories table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'kcfs_categories'
  ) INTO kcfs_table_exists;

  -- Count KCFS categories
  SELECT COUNT(*) FROM kcfs_categories INTO kcfs_cat_count;

  -- Count KCFS assessment codes
  SELECT COUNT(*) FROM assessment_codes WHERE category = 'kcfs' INTO kcfs_code_count;

  IF NOT absent_col_exists THEN
    RAISE EXCEPTION 'Migration failed: is_absent column not created';
  END IF;

  IF NOT kcfs_table_exists THEN
    RAISE EXCEPTION 'Migration failed: kcfs_categories table not created';
  END IF;

  IF kcfs_cat_count < 15 THEN
    RAISE EXCEPTION 'Migration failed: Expected 15 KCFS categories, found %', kcfs_cat_count;
  END IF;

  IF kcfs_code_count < 7 THEN
    RAISE EXCEPTION 'Migration failed: Expected 7 KCFS assessment codes, found %', kcfs_code_count;
  END IF;

  RAISE NOTICE 'Migration 033 completed successfully:';
  RAISE NOTICE '  - scores.is_absent column: EXISTS';
  RAISE NOTICE '  - kcfs_categories table: EXISTS (% rows)', kcfs_cat_count;
  RAISE NOTICE '  - KCFS assessment codes: % created', kcfs_code_count;
END $$;

-- ========================================
-- Record migration
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_versions') THEN
    INSERT INTO schema_versions (version, description)
    VALUES ('033_kcfs_scoring_system', 'Added KCFS scoring system with categories + global absent support')
    ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;
  END IF;
END $$;
