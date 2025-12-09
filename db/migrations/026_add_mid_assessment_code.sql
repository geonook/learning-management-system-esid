-- Migration 026: Add MID assessment code
-- Purpose: Add MID (Midterm) assessment code for Term 1 gradebook import
--
-- Created: 2025-12-08
-- Related: Gradebook import feature for 25 Fall Midterm

-- ============================================================
-- Step 1: Add MID to assessment_code ENUM type
-- ============================================================

ALTER TYPE assessment_code ADD VALUE IF NOT EXISTS 'MID' AFTER 'FINAL';

-- ============================================================
-- Step 2: Add MID assessment code record
-- ============================================================

INSERT INTO public.assessment_codes (code, display_name, category, weight, sort_order, sequence_order, is_active)
VALUES ('MID', 'Midterm', 'final', 0.10, 0, 14, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Verification
-- ============================================================

DO $$
DECLARE
  mid_exists BOOLEAN;
  total_codes INTEGER;
BEGIN
  -- Check if MID code exists
  SELECT EXISTS (
    SELECT 1 FROM public.assessment_codes
    WHERE code = 'MID'
  ) INTO mid_exists;

  -- Get total active codes
  SELECT COUNT(*) FROM public.assessment_codes
  WHERE is_active = true
  INTO total_codes;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 026 Verification:';
  RAISE NOTICE '  MID code exists: %', CASE WHEN mid_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE '  Total active codes: %', total_codes;
  RAISE NOTICE '========================================';

  -- Show all assessment codes
  RAISE NOTICE 'Current assessment codes:';
END $$;

-- List all assessment codes for reference
SELECT code, category, sequence_order, is_active
FROM public.assessment_codes
ORDER BY sequence_order;
