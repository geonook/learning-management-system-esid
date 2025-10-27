-- ========================================
-- Migration 014: Fix Track Column Type
-- Date: 2025-10-27
-- Purpose: Change users.track and students.track from track_type ENUM to course_type ENUM
-- Reason: Head Teachers need to store course type responsibility (LT/IT/KCFS), not track (local/international)
-- Reference: CLAUDE.md architecture design - "users.track stores HT's course_type responsibility"
-- ========================================

-- ========================================
-- Part 1: Change users.track type from track_type to course_type
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 014: Fix Track Column Type';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Step 1: Modifying users.track column type...';
END $$;

-- Change users.track from track_type to course_type (nullable)
-- This allows Head Teachers to store their course type responsibility (LT/IT/KCFS)
-- For non-Head users (admin, teacher, student), track will be NULL
ALTER TABLE users
    ALTER COLUMN track DROP DEFAULT,
    ALTER COLUMN track TYPE course_type USING NULL;

-- Add comment explaining the column usage
COMMENT ON COLUMN users.track IS 'Head Teacher course type responsibility (LT/IT/KCFS). NULL for non-Head users.';

DO $$
BEGIN
    RAISE NOTICE '✅ users.track changed from track_type to course_type';
END $$;

-- ========================================
-- Part 2: Change students.track type and set to NULL
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Step 2: Modifying students.track column type...';
END $$;

-- First, drop NOT NULL constraint if it exists
ALTER TABLE students
    ALTER COLUMN track DROP NOT NULL;

-- Change students.track from track_type to course_type (nullable)
-- In the "one class, three teachers" architecture, students don't belong to a specific track
-- They belong to a class which has three course types (LT/IT/KCFS)
ALTER TABLE students
    ALTER COLUMN track DROP DEFAULT,
    ALTER COLUMN track TYPE course_type USING NULL;

-- Set all existing students.track to NULL
UPDATE students SET track = NULL;

-- Add comment explaining the column is deprecated
COMMENT ON COLUMN students.track IS 'DEPRECATED: Students do not belong to a track. Use students.level (G1E1-G6E3) instead.';

DO $$
BEGIN
    RAISE NOTICE '✅ students.track changed to course_type and set to NULL';
END $$;

-- ========================================
-- Part 3: Verify classes.track is already NULL
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Step 3: Verifying classes.track status...';

    -- Check if classes.track allows NULL (should be TRUE from Migration 010)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'classes'
        AND column_name = 'track'
        AND is_nullable = 'YES'
    ) THEN
        RAISE NOTICE '✅ classes.track already allows NULL (Migration 010)';
    ELSE
        RAISE WARNING '⚠️ classes.track does not allow NULL - may need manual fix';
    END IF;
END $$;

-- ========================================
-- Part 4: Verification queries
-- ========================================

DO $$
DECLARE
    users_track_type TEXT;
    students_track_type TEXT;
    students_track_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Verification Results';
    RAISE NOTICE '========================================';

    -- Check users.track type
    SELECT udt_name INTO users_track_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'track';

    RAISE NOTICE 'users.track type: %', users_track_type;

    -- Check students.track type
    SELECT udt_name INTO students_track_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'students'
    AND column_name = 'track';

    RAISE NOTICE 'students.track type: %', students_track_type;

    -- Count students with non-NULL track
    SELECT COUNT(*) INTO students_track_count
    FROM students
    WHERE track IS NOT NULL;

    RAISE NOTICE 'Students with non-NULL track: %', students_track_count;

    -- Validation
    IF users_track_type = 'course_type' AND students_track_type = 'course_type' THEN
        RAISE NOTICE '✅ Migration 014 completed successfully!';
        RAISE NOTICE '========================================';
    ELSE
        RAISE WARNING '⚠️ Migration 014 may have issues - please review';
    END IF;
END $$;

-- ========================================
-- Part 5: Update related ENUM type comments
-- ========================================

COMMENT ON TYPE course_type IS 'Course type: LT (Local Teacher ELA), IT (International Teacher ELA), KCFS (Kang Chiao Future Skills). Also used for Head Teacher course type responsibility.';
COMMENT ON TYPE track_type IS 'DEPRECATED: Legacy track type (local/international). Use course_type instead.';

-- ========================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ========================================

/*
-- To rollback this migration:

BEGIN;

-- 1. Restore users.track to track_type
ALTER TABLE users
    ALTER COLUMN track TYPE track_type USING NULL;

-- 2. Restore students.track to track_type with NOT NULL
ALTER TABLE students
    ALTER COLUMN track TYPE track_type USING 'local'::track_type,
    ALTER COLUMN track SET NOT NULL;

-- 3. Remove comments
COMMENT ON COLUMN users.track IS NULL;
COMMENT ON COLUMN students.track IS NULL;
COMMENT ON TYPE course_type IS 'Course type: LT (Local Teacher ELA), IT (International Teacher ELA), KCFS (Kang Chiao Future Skills)';
COMMENT ON TYPE track_type IS 'Track type: local or international';

COMMIT;
*/

-- ========================================
-- Success Message
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Migration 014 Complete!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Execute Migration 012 (with fixed RLS policy)';
    RAISE NOTICE '2. Execute Migration 013';
    RAISE NOTICE '3. Run: npm run gen:types';
    RAISE NOTICE '4. Update hardcoded track values in code';
    RAISE NOTICE '5. Test and verify';
    RAISE NOTICE '';
END $$;
