/**
 * Migration 016: Add office_member Role to user_role ENUM
 *
 * Purpose: Support Info Hub office_member role with read-only access
 * Date: 2025-11-17
 *
 * Changes:
 * - Add 'office_member' value to user_role ENUM type
 *
 * Permissions:
 * - office_member: Read-only access to all grades (G1-G6) and course types (LT/IT/KCFS)
 *
 * WARNING: ENUM values cannot be removed once added in PostgreSQL
 * This operation is irreversible
 */

-- ============================================================================
-- Add office_member to user_role ENUM
-- ============================================================================

-- Check if 'office_member' already exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'office_member'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    -- Add new ENUM value
    -- Note: ALTER TYPE ADD VALUE cannot be executed inside a transaction block
    -- This must be run as a separate statement
    ALTER TYPE user_role ADD VALUE 'office_member';

    RAISE NOTICE 'Added office_member to user_role ENUM';
  ELSE
    RAISE NOTICE 'office_member already exists in user_role ENUM';
  END IF;
END$$;

-- ============================================================================
-- Verification
-- ============================================================================

-- List all values in user_role ENUM
DO $$
DECLARE
  role_values text[];
BEGIN
  SELECT array_agg(enumlabel ORDER BY enumsortorder)
  INTO role_values
  FROM pg_enum
  WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role');

  RAISE NOTICE 'Current user_role values: %', role_values;
END$$;

-- ============================================================================
-- Rollback Instructions (NOT POSSIBLE)
-- ============================================================================

/*
WARNING: PostgreSQL does not support removing ENUM values.
If you need to rollback this change, you would need to:

1. Drop all tables/columns using this ENUM
2. Drop the ENUM type entirely
3. Recreate the ENUM without 'office_member'
4. Recreate all affected tables/columns

This is NOT recommended for production databases.
Instead, simply avoid using the 'office_member' value if needed.
*/

-- ============================================================================
-- Expected Result
-- ============================================================================

/*
user_role ENUM should now contain:
- admin
- head
- teacher
- office_member

Query to verify:
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
ORDER BY enumsortorder;
*/
