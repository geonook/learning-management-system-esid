-- Migration 032: Create Gradebook Expectations Table
-- Purpose: Allow Head Teachers to configure expected assessment counts per Grade × Level
-- Created: 2025-12-15
--
-- Settings Structure:
-- - LT/IT: Per Grade × Level (E1, E2, E3)
-- - KCFS: Unified setting (all grades, all levels)
--
-- Default Values: FA=8, SA=4, MID=1 (Total=13)

-- ========================================
-- STEP 1: Create Table
-- ========================================

CREATE TABLE IF NOT EXISTS gradebook_expectations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context identifiers
  academic_year TEXT NOT NULL,           -- '2025-2026'
  term INTEGER NOT NULL CHECK (term BETWEEN 1 AND 4),
  course_type course_type NOT NULL,      -- 'LT', 'IT', 'KCFS'

  -- LT/IT: Specific grade + level
  -- KCFS: grade = NULL, level = NULL (unified setting)
  grade INTEGER CHECK (grade IS NULL OR grade BETWEEN 1 AND 6),
  level TEXT CHECK (level IS NULL OR level IN ('E1', 'E2', 'E3')),

  -- Expected assessment counts
  expected_fa INTEGER NOT NULL DEFAULT 8 CHECK (expected_fa BETWEEN 0 AND 8),
  expected_sa INTEGER NOT NULL DEFAULT 4 CHECK (expected_sa BETWEEN 0 AND 4),
  expected_mid BOOLEAN NOT NULL DEFAULT TRUE,

  -- Computed total (stored for query efficiency)
  expected_total INTEGER GENERATED ALWAYS AS (
    expected_fa + expected_sa + (CASE WHEN expected_mid THEN 1 ELSE 0 END)
  ) STORED,

  -- Audit fields
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint
  -- LT/IT: (academic_year, term, course_type, grade, level)
  -- KCFS: (academic_year, term, course_type, NULL, NULL)
  UNIQUE (academic_year, term, course_type, grade, level),

  -- Check constraint: LT/IT must have grade+level, KCFS must not
  CONSTRAINT check_grade_level_by_course_type CHECK (
    (course_type = 'KCFS' AND grade IS NULL AND level IS NULL)
    OR (course_type IN ('LT', 'IT') AND grade IS NOT NULL AND level IS NOT NULL)
  )
);

-- ========================================
-- STEP 2: Create Index
-- ========================================

CREATE INDEX IF NOT EXISTS idx_expectations_lookup
  ON gradebook_expectations(academic_year, term, course_type, grade, level);

CREATE INDEX IF NOT EXISTS idx_expectations_created_by
  ON gradebook_expectations(created_by);

-- ========================================
-- STEP 3: Enable RLS
-- ========================================

ALTER TABLE gradebook_expectations ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 4: Create RLS Policies
-- ========================================

-- Service role bypass (for migrations and admin tasks)
DROP POLICY IF EXISTS "service_role_bypass_expectations" ON gradebook_expectations;
CREATE POLICY "service_role_bypass_expectations" ON gradebook_expectations
FOR ALL TO service_role
USING (TRUE)
WITH CHECK (TRUE);

-- Everyone can read (needed for progress calculation)
DROP POLICY IF EXISTS "authenticated_read_expectations" ON gradebook_expectations;
CREATE POLICY "authenticated_read_expectations" ON gradebook_expectations
FOR SELECT TO authenticated
USING (TRUE);

-- Head Teachers can manage their own expectations
-- Admin can manage all expectations
DROP POLICY IF EXISTS "heads_manage_own_expectations" ON gradebook_expectations;
CREATE POLICY "heads_manage_own_expectations" ON gradebook_expectations
FOR ALL TO authenticated
USING (
  public.get_user_role_safe() = 'admin'
  OR (
    public.get_user_role_safe() = 'head'
    AND course_type::TEXT = public.get_user_teacher_type_safe()
    AND (
      -- KCFS Head: can only manage KCFS unified setting
      (course_type = 'KCFS' AND grade IS NULL)
      OR
      -- LT/IT Head: can only manage settings within their grade band
      (course_type IN ('LT', 'IT') AND public.grade_in_band(grade, public.get_user_grade_band_safe()))
    )
  )
)
WITH CHECK (
  public.get_user_role_safe() = 'admin'
  OR (
    public.get_user_role_safe() = 'head'
    AND course_type::TEXT = public.get_user_teacher_type_safe()
    AND (
      (course_type = 'KCFS' AND grade IS NULL)
      OR
      (course_type IN ('LT', 'IT') AND public.grade_in_band(grade, public.get_user_grade_band_safe()))
    )
  )
);

-- ========================================
-- STEP 5: Create updated_at Trigger
-- ========================================

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION update_gradebook_expectations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS set_updated_at_expectations ON gradebook_expectations;
CREATE TRIGGER set_updated_at_expectations
  BEFORE UPDATE ON gradebook_expectations
  FOR EACH ROW
  EXECUTE FUNCTION update_gradebook_expectations_updated_at();

-- ========================================
-- STEP 6: Add Table Comment
-- ========================================

COMMENT ON TABLE gradebook_expectations IS
  'Stores expected assessment counts per academic_year, term, course_type, grade, and level.
   LT/IT use grade×level combinations, KCFS uses a unified setting (grade=NULL, level=NULL).
   Default: FA=8, SA=4, MID=1 (total=13)';

COMMENT ON COLUMN gradebook_expectations.grade IS
  'Grade number (1-6). NULL for KCFS unified setting.';

COMMENT ON COLUMN gradebook_expectations.level IS
  'Student level (E1, E2, E3). NULL for KCFS unified setting.';

COMMENT ON COLUMN gradebook_expectations.expected_total IS
  'Auto-computed: expected_fa + expected_sa + (expected_mid ? 1 : 0)';

-- ========================================
-- VERIFICATION
-- ========================================

DO $$
DECLARE
  table_exists BOOLEAN;
  index_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Check table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'gradebook_expectations'
  ) INTO table_exists;

  -- Check indexes
  SELECT COUNT(*) FROM pg_indexes
  WHERE schemaname = 'public'
  AND tablename = 'gradebook_expectations'
  INTO index_count;

  -- Check policies
  SELECT COUNT(*) FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'gradebook_expectations'
  INTO policy_count;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'Migration failed: gradebook_expectations table not created';
  END IF;

  RAISE NOTICE 'Migration 032 completed successfully:';
  RAISE NOTICE '  - Table: gradebook_expectations EXISTS';
  RAISE NOTICE '  - Indexes: % created', index_count;
  RAISE NOTICE '  - RLS Policies: % created', policy_count;
END $$;

-- ========================================
-- Record migration
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_versions') THEN
    INSERT INTO schema_versions (version, description)
    VALUES ('032_gradebook_expectations', 'Created gradebook_expectations table for Head Teacher assessment settings')
    ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;
  END IF;
END $$;
