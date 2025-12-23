-- Migration 038: Rename MAP 'term' to 'map_term'
-- Purpose: Avoid confusion with ELA 'term' (1,2,3,4) by using distinct naming
--
-- MapTerm: 'fall', 'winter', 'spring' (NWEA testing periods)
-- ELA Term: 1, 2, 3, 4 (school grading periods)

-- ============================================================
-- Rename Column: term -> map_term
-- ============================================================
ALTER TABLE map_assessments
  RENAME COLUMN term TO map_term;

-- ============================================================
-- Update Index Name
-- ============================================================
-- Drop old index and create new one with updated name
DROP INDEX IF EXISTS idx_map_assessments_term;
CREATE INDEX IF NOT EXISTS idx_map_assessments_map_term
  ON map_assessments(map_term);

-- ============================================================
-- Update Comments
-- ============================================================
COMMENT ON COLUMN map_assessments.map_term IS
  'NWEA MAP testing period: fall, winter, or spring (distinct from ELA term 1-4)';

COMMENT ON COLUMN map_assessments.term_tested IS
  'Full testing period display string (e.g., Fall 2025-2026)';

-- ============================================================
-- Add Support for Winter Testing Period (Optional)
-- ============================================================
-- NWEA supports Fall/Winter/Spring testing.
-- Current data only has Fall/Spring, but Winter may be added.
-- No constraint change needed as TEXT column accepts any value.
