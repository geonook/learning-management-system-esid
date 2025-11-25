-- ========================================
-- Migration 014: Fix Track Column Type
-- Date: 2025-10-27
-- Purpose: Change users.track and students.track from track_type ENUM to course_type ENUM
-- Reason: Head Teachers need to store course type responsibility (LT/IT/KCFS), not track (local/international)
-- Reference: CLAUDE.md architecture design - "users.track stores HT's course_type responsibility"
-- ========================================

-- ========================================
-- Part 0A: Drop Analytics Views that depend on track columns
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 014: Fix Track Column Type';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Step 0A: Dropping Analytics Views that depend on track columns...';
END $$;

-- These views reference students.track, classes.track, and users.track
-- They must be dropped before we can alter the column types
DROP VIEW IF EXISTS student_grade_aggregates CASCADE;
DROP VIEW IF EXISTS class_statistics CASCADE;
DROP VIEW IF EXISTS teacher_performance CASCADE;

DO $$
BEGIN
    RAISE NOTICE '✅ Analytics views dropped (will be recreated in Part 6)';
END $$;

-- ========================================
-- Part 0B: Drop RLS policies that depend on users.track
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Step 0B: Dropping RLS policies that depend on users.track...';
END $$;

-- Drop the head_teacher_access_courses policy (depends on users.track)
-- This policy uses: u.track::text = courses.course_type::text
DROP POLICY IF EXISTS "head_teacher_access_courses" ON courses;
DROP POLICY IF EXISTS "Heads can see courses in their jurisdiction" ON courses;
DROP POLICY IF EXISTS "Scores via course access" ON scores;

-- Drop the Head Teacher policy on student_courses if it exists
-- This policy might be created by Migration 012
DROP POLICY IF EXISTS "Heads can see enrollments in their jurisdiction" ON student_courses;

DO $$
BEGIN
    RAISE NOTICE '✅ Dependent RLS policies dropped';
END $$;

-- ========================================
-- Part 1: Change users.track type from track_type to course_type
-- ========================================

DO $$
BEGIN
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
-- Part 5: Recreate RLS policies with corrected types
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Step 5: Recreating RLS policies with corrected types...';
END $$;

-- Recreate head_teacher_access_courses policy
-- Now u.track and courses.course_type are both course_type ENUM
-- No more type casting needed!
CREATE POLICY "head_teacher_access_courses"
ON courses
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN classes c ON courses.class_id = c.id
    WHERE u.id = auth.uid()
    AND u.role = 'head'
    AND u.is_active = TRUE
    AND u.grade = c.grade
    AND u.track = courses.course_type  -- ✅ Both are course_type ENUM now
  )
);

COMMENT ON POLICY "head_teacher_access_courses" ON courses
IS 'Head Teachers can manage courses in their grade and course_type';

DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies recreated with correct types';
END $$;

-- Note: Migration 012 will recreate the student_courses Head Teacher policy
-- with the correct type comparison

-- ========================================
-- Part 6: Update related ENUM type comments
-- ========================================
-- Note: Analytics Views will be recreated in Migration 012
-- after scores.course_id column is added, since the views depend on that column

COMMENT ON TYPE course_type IS 'Course type: LT (Local Teacher ELA), IT (International Teacher ELA), KCFS (Kang Chiao Future Skills). Also used for Head Teacher course type responsibility.';
COMMENT ON TYPE track_type IS 'DEPRECATED: Legacy track type (local/international). Use course_type instead.';

-- ========================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ========================================

/*
-- To rollback this migration:

BEGIN;

-- 0. Drop Analytics Views first (to allow column type changes)
DROP VIEW IF EXISTS student_grade_aggregates CASCADE;
DROP VIEW IF EXISTS class_statistics CASCADE;
DROP VIEW IF EXISTS teacher_performance CASCADE;

-- 1. Drop policies (to allow type change)
DROP POLICY IF EXISTS "head_teacher_access_courses" ON courses;
DROP POLICY IF EXISTS "Heads can see enrollments in their jurisdiction" ON student_courses;

-- 2. Restore users.track to track_type
ALTER TABLE users
    ALTER COLUMN track TYPE track_type USING NULL;

-- 3. Restore students.track to track_type with NOT NULL
ALTER TABLE students
    ALTER COLUMN track TYPE track_type USING 'local'::track_type,
    ALTER COLUMN track SET NOT NULL;

-- 4. Recreate policy with old type casting
CREATE POLICY "head_teacher_access_courses" ON courses
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN classes c ON courses.class_id = c.id
    WHERE u.id = auth.uid()
    AND u.role = 'head'
    AND u.is_active = TRUE
    AND u.grade = c.grade
    AND u.track::text = courses.course_type::text
  )
);

COMMENT ON POLICY "head_teacher_access_courses" ON courses
IS 'Head Teachers can manage courses in their grade and track';

-- 5. Recreate Analytics Views with old track column types
-- Execute: db/views/003_manual_analytics_views.sql
-- (Views will use the restored track_type for students.track and users.track)

-- 6. Remove comments
COMMENT ON COLUMN users.track IS NULL;
COMMENT ON COLUMN students.track IS NULL;
COMMENT ON TYPE course_type IS 'Course type: LT (Local Teacher ELA), IT (International Teacher ELA), KCFS (Kang Chiao Future Skills)';
COMMENT ON TYPE track_type IS 'Track type: local or international';

COMMIT;

-- Note: After rollback, you may need to manually execute db/views/003_manual_analytics_views.sql
-- to restore the Analytics Views with the original track column types.
*/

-- ========================================
-- Success Message
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Migration 014 Complete!';
    RAISE NOTICE '';
    RAISE NOTICE 'What was done:';
    RAISE NOTICE '  ✅ Dropped 3 Analytics Views (will be recreated in Migration 012)';
    RAISE NOTICE '  ✅ Dropped dependent RLS policies';
    RAISE NOTICE '  ✅ Changed users.track: track_type → course_type';
    RAISE NOTICE '  ✅ Changed students.track: track_type → course_type (NULL)';
    RAISE NOTICE '  ✅ Recreated RLS policies with correct types';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Execute Migration 012 (will add scores.course_id AND recreate Analytics Views)';
    RAISE NOTICE '2. Execute Migration 013 (RLS security)';
    RAISE NOTICE '3. Run: npm run gen:types';
    RAISE NOTICE '4. Test and verify';
    RAISE NOTICE '';
END $$;
