-- Migration 039: Add Fall-to-Fall Growth columns to map_assessments
-- Purpose: Store official NWEA CDF Fall-to-Fall growth data for Year-over-Year analysis
-- Date: 2025-12-24

-- ============================================================
-- Fall-to-Fall Growth Data
-- ============================================================
-- These columns store NWEA official FallToFall growth metrics
-- which are more accurate than calculated values as they use
-- personalized expected growth based on each student's starting RIT

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS fall_to_fall_projected_growth INTEGER;

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS fall_to_fall_observed_growth INTEGER;

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS fall_to_fall_observed_growth_se DECIMAL(5,2);

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS fall_to_fall_met_projected_growth TEXT;

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS fall_to_fall_conditional_growth_index DECIMAL(5,2);

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS fall_to_fall_conditional_growth_percentile INTEGER;

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS fall_to_fall_growth_quintile TEXT;

-- ============================================================
-- Add comments for documentation
-- ============================================================
COMMENT ON COLUMN map_assessments.fall_to_fall_projected_growth IS 'Official NWEA expected growth from previous Fall to current Fall (personalized)';
COMMENT ON COLUMN map_assessments.fall_to_fall_observed_growth IS 'Actual observed growth from previous Fall to current Fall';
COMMENT ON COLUMN map_assessments.fall_to_fall_observed_growth_se IS 'Standard error of Fall-to-Fall observed growth';
COMMENT ON COLUMN map_assessments.fall_to_fall_met_projected_growth IS 'Whether projected Fall-to-Fall growth was met: Yes/No/Yes*/No*';
COMMENT ON COLUMN map_assessments.fall_to_fall_conditional_growth_index IS 'Fall-to-Fall conditional growth index (Observed/Projected)';
COMMENT ON COLUMN map_assessments.fall_to_fall_conditional_growth_percentile IS 'Fall-to-Fall growth percentile compared to peers';
COMMENT ON COLUMN map_assessments.fall_to_fall_growth_quintile IS 'Fall-to-Fall growth quintile: Low/LoAvg/Avg/HiAvg/High';

-- ============================================================
-- Index for Year-over-Year queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_map_assessments_f2f_index
  ON map_assessments(fall_to_fall_conditional_growth_index)
  WHERE fall_to_fall_conditional_growth_index IS NOT NULL;
