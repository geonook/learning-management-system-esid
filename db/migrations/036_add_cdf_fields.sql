-- Migration 036: Add official NWEA CDF fields to map_assessments
-- Purpose: Store official NWEA data from Combined Data File (CDF)
-- Date: 2025-12-23

-- ============================================================
-- Basic test metadata
-- ============================================================
ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS test_percentile INTEGER;

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS achievement_quintile TEXT;

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS percent_correct DECIMAL(5,2);

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS test_start_date DATE;

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS test_duration_minutes INTEGER;

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS test_standard_error DECIMAL(5,2);

-- ============================================================
-- Growth data (Fall to Spring)
-- ============================================================
ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS projected_growth INTEGER;

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS observed_growth INTEGER;

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS observed_growth_se DECIMAL(5,2);

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS met_projected_growth TEXT;

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS conditional_growth_index DECIMAL(5,2);

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS conditional_growth_percentile INTEGER;

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS growth_quintile TEXT;

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS typical_growth INTEGER;

-- ============================================================
-- Projected Proficiency (first 3 studies)
-- ============================================================
ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS projected_proficiency_study1 TEXT;

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS projected_proficiency_level1 TEXT;

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS projected_proficiency_study2 TEXT;

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS projected_proficiency_level2 TEXT;

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS projected_proficiency_study3 TEXT;

ALTER TABLE map_assessments
ADD COLUMN IF NOT EXISTS projected_proficiency_level3 TEXT;

-- ============================================================
-- Add comments for documentation
-- ============================================================
COMMENT ON COLUMN map_assessments.test_percentile IS 'Official NWEA percentile (1-99)';
COMMENT ON COLUMN map_assessments.achievement_quintile IS 'Achievement quintile: Low/LoAvg/Avg/HiAvg/High';
COMMENT ON COLUMN map_assessments.percent_correct IS 'Percentage of correct answers';
COMMENT ON COLUMN map_assessments.test_start_date IS 'Date when the test was taken';
COMMENT ON COLUMN map_assessments.test_duration_minutes IS 'Test duration in minutes';
COMMENT ON COLUMN map_assessments.test_standard_error IS 'RIT score standard error';

COMMENT ON COLUMN map_assessments.projected_growth IS 'Expected growth from Fall to Spring';
COMMENT ON COLUMN map_assessments.observed_growth IS 'Actual observed growth';
COMMENT ON COLUMN map_assessments.observed_growth_se IS 'Standard error of observed growth';
COMMENT ON COLUMN map_assessments.met_projected_growth IS 'Whether projected growth was met: Yes/No';
COMMENT ON COLUMN map_assessments.conditional_growth_index IS 'Conditional growth index (ratio)';
COMMENT ON COLUMN map_assessments.conditional_growth_percentile IS 'Growth percentile compared to peers';
COMMENT ON COLUMN map_assessments.growth_quintile IS 'Growth quintile: Low/LoAvg/Avg/HiAvg/High';
COMMENT ON COLUMN map_assessments.typical_growth IS 'Typical growth for this grade/term';

COMMENT ON COLUMN map_assessments.projected_proficiency_study1 IS 'First projected proficiency study name (e.g., ACT)';
COMMENT ON COLUMN map_assessments.projected_proficiency_level1 IS 'First projected proficiency level (e.g., On Track)';
COMMENT ON COLUMN map_assessments.projected_proficiency_study2 IS 'Second projected proficiency study name';
COMMENT ON COLUMN map_assessments.projected_proficiency_level2 IS 'Second projected proficiency level';
COMMENT ON COLUMN map_assessments.projected_proficiency_study3 IS 'Third projected proficiency study name';
COMMENT ON COLUMN map_assessments.projected_proficiency_level3 IS 'Third projected proficiency level';
