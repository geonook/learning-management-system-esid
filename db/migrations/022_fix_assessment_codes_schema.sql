-- Migration 022: Fix assessment_codes schema
-- Purpose: Add sequence_order column and seed data
-- Created: 2025-11-28
--
-- Issue: assessment_codes table exists but missing sequence_order column and seed data
-- This migration adds the column and inserts the required assessment codes

-- Step 1: Add sequence_order column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessment_codes'
    AND column_name = 'sequence_order'
  ) THEN
    ALTER TABLE assessment_codes ADD COLUMN sequence_order INTEGER;
  END IF;
END $$;

-- Step 2: Add is_active column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessment_codes'
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE assessment_codes ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Step 3: Insert assessment codes (idempotent - ON CONFLICT DO UPDATE)
INSERT INTO assessment_codes (code, category, sequence_order, is_active) VALUES
  ('FA1', 'formative', 1, TRUE),
  ('FA2', 'formative', 2, TRUE),
  ('FA3', 'formative', 3, TRUE),
  ('FA4', 'formative', 4, TRUE),
  ('FA5', 'formative', 5, TRUE),
  ('FA6', 'formative', 6, TRUE),
  ('FA7', 'formative', 7, TRUE),
  ('FA8', 'formative', 8, TRUE),
  ('SA1', 'summative', 9, TRUE),
  ('SA2', 'summative', 10, TRUE),
  ('SA3', 'summative', 11, TRUE),
  ('SA4', 'summative', 12, TRUE),
  ('FINAL', 'final', 13, TRUE)
ON CONFLICT (code) DO UPDATE SET
  category = EXCLUDED.category,
  sequence_order = EXCLUDED.sequence_order,
  is_active = EXCLUDED.is_active;

-- Step 4: Verify the migration
DO $$
DECLARE
  code_count INTEGER;
  seq_exists BOOLEAN;
BEGIN
  -- Check sequence_order column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessment_codes'
    AND column_name = 'sequence_order'
  ) INTO seq_exists;

  IF NOT seq_exists THEN
    RAISE EXCEPTION 'Migration failed: sequence_order column not created';
  END IF;

  -- Check all 13 codes exist
  SELECT COUNT(*) FROM assessment_codes INTO code_count;

  IF code_count < 13 THEN
    RAISE EXCEPTION 'Migration failed: Expected 13 assessment codes, found %', code_count;
  END IF;

  RAISE NOTICE 'Migration 022 completed successfully: % assessment codes with sequence_order', code_count;
END $$;
