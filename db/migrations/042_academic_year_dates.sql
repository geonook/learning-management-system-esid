-- =====================================================
-- Migration 042: Academic Year Date Configuration
-- 學年度日期設定系統
-- =====================================================
-- This migration extends the academic_periods table to support
-- dynamic academic year date configuration.
--
-- Key changes:
-- 1. Add semester date columns for year-level periods
-- 2. Populate existing academic years with default dates
-- 3. Create helper functions for date-based lookups
-- =====================================================

-- =====================================================
-- 1. Add semester date columns to academic_periods
-- =====================================================
-- These columns are only used for period_type = 'year'
-- They provide quick access to semester dates without
-- having to query child semester periods.

ALTER TABLE academic_periods
ADD COLUMN IF NOT EXISTS fall_start_date DATE,
ADD COLUMN IF NOT EXISTS fall_end_date DATE,
ADD COLUMN IF NOT EXISTS spring_start_date DATE,
ADD COLUMN IF NOT EXISTS spring_end_date DATE;

-- Add documentation
COMMENT ON COLUMN academic_periods.fall_start_date IS 'Fall semester start date (for year-type periods only)';
COMMENT ON COLUMN academic_periods.fall_end_date IS 'Fall semester end date (for year-type periods only)';
COMMENT ON COLUMN academic_periods.spring_start_date IS 'Spring semester start date (for year-type periods only)';
COMMENT ON COLUMN academic_periods.spring_end_date IS 'Spring semester end date (for year-type periods only)';

-- =====================================================
-- 2. Populate existing academic years with default dates
-- =====================================================

-- Academic year 2024-2025
UPDATE academic_periods
SET
  start_date = '2024-08-01',
  end_date = '2025-07-31',
  fall_start_date = '2024-09-02',
  fall_end_date = '2025-01-17',
  spring_start_date = '2025-02-10',
  spring_end_date = '2025-06-30'
WHERE academic_year = '2024-2025' AND period_type = 'year';

-- Academic year 2025-2026
UPDATE academic_periods
SET
  start_date = '2025-08-01',
  end_date = '2026-07-31',
  fall_start_date = '2025-09-01',
  fall_end_date = '2026-01-16',
  spring_start_date = '2026-02-09',
  spring_end_date = '2026-06-30'
WHERE academic_year = '2025-2026' AND period_type = 'year';

-- Academic year 2026-2027 (if exists)
UPDATE academic_periods
SET
  start_date = '2026-08-01',
  end_date = '2027-07-31',
  fall_start_date = '2026-09-01',
  fall_end_date = '2027-01-15',
  spring_start_date = '2027-02-08',
  spring_end_date = '2027-06-30'
WHERE academic_year = '2026-2027' AND period_type = 'year';

-- =====================================================
-- 3. Create helper function: get_current_academic_year_from_config
-- =====================================================
-- Returns the academic year string for a given date based on
-- the configured start_date and end_date in academic_periods.
-- Falls back to NULL if no matching period is found.

CREATE OR REPLACE FUNCTION get_current_academic_year_from_config(
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT academic_year
  FROM academic_periods
  WHERE period_type = 'year'
    AND start_date IS NOT NULL
    AND end_date IS NOT NULL
    AND start_date <= p_date
    AND end_date >= p_date
  ORDER BY start_date DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_current_academic_year_from_config(DATE) IS
  'Get current academic year based on database configuration. Returns NULL if no matching period found.';

-- =====================================================
-- 4. Create helper function: get_current_semester_from_config
-- =====================================================
-- Returns the current semester (1=Fall, 2=Spring) based on
-- the configured semester dates in academic_periods.
-- Falls back to NULL if dates are not configured.

CREATE OR REPLACE FUNCTION get_current_semester_from_config(
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    CASE
      WHEN p_date >= fall_start_date AND p_date <= fall_end_date THEN 1
      WHEN p_date >= spring_start_date AND p_date <= spring_end_date THEN 2
      ELSE NULL
    END
  FROM academic_periods
  WHERE period_type = 'year'
    AND start_date IS NOT NULL
    AND end_date IS NOT NULL
    AND start_date <= p_date
    AND end_date >= p_date
  ORDER BY start_date DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_current_semester_from_config(DATE) IS
  'Get current semester (1=Fall, 2=Spring) based on database configuration. Returns NULL if not in semester period.';

-- =====================================================
-- 5. Create helper function: get_academic_year_config
-- =====================================================
-- Returns all date configuration for a specific academic year.
-- Useful for API layer to fetch complete config in one query.

CREATE OR REPLACE FUNCTION get_academic_year_config(
  p_academic_year TEXT
)
RETURNS TABLE (
  academic_year TEXT,
  start_date DATE,
  end_date DATE,
  fall_start_date DATE,
  fall_end_date DATE,
  spring_start_date DATE,
  spring_end_date DATE
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    ap.academic_year,
    ap.start_date,
    ap.end_date,
    ap.fall_start_date,
    ap.fall_end_date,
    ap.spring_start_date,
    ap.spring_end_date
  FROM academic_periods ap
  WHERE ap.period_type = 'year'
    AND ap.academic_year = p_academic_year
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_academic_year_config(TEXT) IS
  'Get complete date configuration for a specific academic year.';

-- =====================================================
-- 6. Create index for date-based queries
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_periods_date_range
  ON academic_periods(start_date, end_date)
  WHERE period_type = 'year' AND start_date IS NOT NULL AND end_date IS NOT NULL;
