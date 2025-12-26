-- =====================================================
-- Migration 040: Academic Period Management System
-- 學年週期管理系統
-- =====================================================
-- This is the core infrastructure for academic year lifecycle management.
-- Supports: Year > Semester > Term hierarchy with state machine.
--
-- States: preparing -> active -> closing -> locked -> archived
--
-- Future extensions:
-- - Term reports (triggered on 'locked')
-- - Data archival (triggered on 'archived')
-- - Promotion/graduation (triggered on year 'locked')
-- - Teacher/student assignment (during 'preparing')
-- =====================================================

-- =====================================================
-- 1. Create academic_periods table
-- =====================================================
CREATE TABLE IF NOT EXISTS academic_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Period identification
  academic_year TEXT NOT NULL,              -- '2025-2026'
  period_type TEXT NOT NULL                 -- 'year' | 'semester' | 'term'
    CHECK (period_type IN ('year', 'semester', 'term')),
  semester INTEGER                          -- 1 | 2 (for semester/term types)
    CHECK (semester IS NULL OR semester IN (1, 2)),
  term INTEGER                              -- 1-4 (for term type only)
    CHECK (term IS NULL OR term IN (1, 2, 3, 4)),

  -- State management
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('preparing', 'active', 'closing', 'locked', 'archived')),
  status_changed_at TIMESTAMPTZ,
  status_changed_by UUID REFERENCES users(id),

  -- Time configuration
  start_date DATE,                          -- Period start date
  end_date DATE,                            -- Period end date
  lock_deadline TIMESTAMPTZ,                -- Auto-lock deadline
  warning_days INTEGER DEFAULT 7,           -- Days before deadline to show warning

  -- Auto-lock settings
  auto_lock_enabled BOOLEAN DEFAULT TRUE,
  auto_locked_at TIMESTAMPTZ,

  -- History tracking
  status_history JSONB DEFAULT '[]'::jsonb, -- [{from, to, at, by, reason}]

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_year_period CHECK (
    period_type != 'year' OR (semester IS NULL AND term IS NULL)
  ),
  CONSTRAINT valid_semester_period CHECK (
    period_type != 'semester' OR (semester IS NOT NULL AND term IS NULL)
  ),
  CONSTRAINT valid_term_period CHECK (
    period_type != 'term' OR (semester IS NOT NULL AND term IS NOT NULL)
  ),
  CONSTRAINT term_semester_consistency CHECK (
    term IS NULL OR
    (term IN (1, 2) AND semester = 1) OR
    (term IN (3, 4) AND semester = 2)
  )
);

-- Unique constraint for period identification
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_year_period
  ON academic_periods(academic_year)
  WHERE period_type = 'year';

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_semester_period
  ON academic_periods(academic_year, semester)
  WHERE period_type = 'semester';

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_term_period
  ON academic_periods(academic_year, term)
  WHERE period_type = 'term';

-- =====================================================
-- 2. Create indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_periods_year ON academic_periods(academic_year);
CREATE INDEX IF NOT EXISTS idx_periods_status ON academic_periods(status);
CREATE INDEX IF NOT EXISTS idx_periods_type ON academic_periods(period_type);

-- Index for auto-lock deadline queries
CREATE INDEX IF NOT EXISTS idx_periods_auto_lock_deadline
  ON academic_periods(lock_deadline)
  WHERE auto_lock_enabled = TRUE AND status NOT IN ('locked', 'archived');

-- Index for active periods lookup
CREATE INDEX IF NOT EXISTS idx_periods_active
  ON academic_periods(academic_year, period_type, status)
  WHERE status IN ('active', 'closing');

-- =====================================================
-- 3. Create is_period_editable function (for RLS)
-- =====================================================
CREATE OR REPLACE FUNCTION is_period_editable(
  p_academic_year TEXT,
  p_term INTEGER
) RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- Check if a term is editable based on:
  -- 1. Term itself must be 'active' or 'closing'
  -- 2. Parent Semester must not be 'locked' or 'archived'
  -- 3. Parent Year must not be 'locked' or 'archived'
  --
  -- If no period record exists, defaults to editable (for backward compatibility)
  SELECT COALESCE(
    (
      -- Term level: must be active or closing (or not exist)
      NOT EXISTS (
        SELECT 1 FROM academic_periods
        WHERE academic_year = p_academic_year
          AND period_type = 'term'
          AND term = p_term
          AND status NOT IN ('active', 'closing')
      )
      AND
      -- Semester level: must not be locked/archived
      NOT EXISTS (
        SELECT 1 FROM academic_periods
        WHERE academic_year = p_academic_year
          AND period_type = 'semester'
          AND semester = CASE WHEN p_term IN (1, 2) THEN 1 ELSE 2 END
          AND status IN ('locked', 'archived')
      )
      AND
      -- Year level: must not be locked/archived
      NOT EXISTS (
        SELECT 1 FROM academic_periods
        WHERE academic_year = p_academic_year
          AND period_type = 'year'
          AND status IN ('locked', 'archived')
      )
    ),
    TRUE  -- Default to editable if no records exist
  );
$$;

-- =====================================================
-- 4. Create helper function: get_period_status
-- =====================================================
CREATE OR REPLACE FUNCTION get_period_status(
  p_academic_year TEXT,
  p_term INTEGER
) RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- Returns the effective status for a term, considering hierarchy
  -- Priority: Year > Semester > Term
  SELECT COALESCE(
    -- Check Year level first
    (SELECT status FROM academic_periods
     WHERE academic_year = p_academic_year
       AND period_type = 'year'
       AND status IN ('locked', 'archived')
     LIMIT 1),
    -- Check Semester level
    (SELECT status FROM academic_periods
     WHERE academic_year = p_academic_year
       AND period_type = 'semester'
       AND semester = CASE WHEN p_term IN (1, 2) THEN 1 ELSE 2 END
       AND status IN ('locked', 'archived')
     LIMIT 1),
    -- Check Term level
    (SELECT status FROM academic_periods
     WHERE academic_year = p_academic_year
       AND period_type = 'term'
       AND term = p_term
     LIMIT 1),
    -- Default to active
    'active'
  );
$$;

-- =====================================================
-- 5. Create trigger for status change history
-- =====================================================
CREATE OR REPLACE FUNCTION record_period_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Record status change in history
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_history = COALESCE(NEW.status_history, '[]'::jsonb) || jsonb_build_object(
      'from', OLD.status,
      'to', NEW.status,
      'at', NOW(),
      'by', NEW.status_changed_by
    );
    NEW.status_changed_at = NOW();
  END IF;

  -- Always update updated_at
  NEW.updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_period_status_change ON academic_periods;
CREATE TRIGGER trigger_period_status_change
  BEFORE UPDATE ON academic_periods
  FOR EACH ROW
  EXECUTE FUNCTION record_period_status_change();

-- =====================================================
-- 6. Create RLS policies for academic_periods
-- =====================================================
ALTER TABLE academic_periods ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access to academic_periods"
  ON academic_periods
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid())
        AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid())
        AND role = 'admin'
    )
  );

-- All authenticated users can view
CREATE POLICY "Authenticated users can view academic_periods"
  ON academic_periods
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- =====================================================
-- 7. Initialize existing academic years
-- =====================================================

-- Insert Term records from existing exams data
INSERT INTO academic_periods (
  academic_year,
  period_type,
  semester,
  term,
  status
)
SELECT DISTINCT
  c.academic_year,
  'term',
  CASE WHEN e.term IN (1, 2) THEN 1 ELSE 2 END,
  e.term,
  'active'
FROM courses c
JOIN exams e ON e.course_id = c.id
WHERE e.term IS NOT NULL
  AND c.academic_year IS NOT NULL
ON CONFLICT DO NOTHING;

-- Insert Semester records
INSERT INTO academic_periods (
  academic_year,
  period_type,
  semester,
  status
)
SELECT DISTINCT
  academic_year,
  'semester',
  semester,
  'active'
FROM academic_periods
WHERE period_type = 'term'
ON CONFLICT DO NOTHING;

-- Insert Year records
INSERT INTO academic_periods (
  academic_year,
  period_type,
  status
)
SELECT DISTINCT
  academic_year,
  'year',
  'active'
FROM academic_periods
WHERE period_type = 'semester'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 8. Add comment for documentation
-- =====================================================
COMMENT ON TABLE academic_periods IS 'Academic period management for year lifecycle control. Supports hierarchical locking (Year > Semester > Term).';
COMMENT ON COLUMN academic_periods.status IS 'Period state: preparing (admin only), active (editable), closing (warning), locked (read-only), archived (compressed)';
COMMENT ON COLUMN academic_periods.period_type IS 'Hierarchy level: year contains semesters, semester contains terms';
COMMENT ON FUNCTION is_period_editable(TEXT, INTEGER) IS 'Check if a term is editable considering the full hierarchy. Used by RLS policies.';
