-- Execute Migration 005: Ensure level column exists
-- This script should be run via Supabase SQL editor

\echo 'Executing Migration 005: Ensure level column exists'

-- Read and execute the migration
\i ../db/migrations/005_ensure_level_column.sql

\echo 'Migration 005 completed. Verifying results...'

-- Verify the level column exists
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('classes', 'students') 
  AND column_name = 'level'
ORDER BY table_name, column_name;

-- Verify level_type enum exists
SELECT 
    typname as enum_name,
    enumlabel as enum_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE typname = 'level_type'
ORDER BY enumsortorder;

\echo 'Migration 005 verification completed.'