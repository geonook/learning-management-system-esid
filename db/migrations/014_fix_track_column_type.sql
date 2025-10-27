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
-- Part 6: Recreate Analytics Views with updated track column types
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'Step 6: Recreating Analytics Views with updated track column types...';
END $$;

-- These views were dropped in Part 0A
-- Now we recreate them with the same definitions (track columns will use new types)

-- ========================================
-- STUDENT GRADE AGGREGATES VIEW
-- ========================================

CREATE OR REPLACE VIEW student_grade_aggregates AS
SELECT
  s.id as student_id,
  s.student_id as student_number,
  s.full_name as student_name,
  s.grade,
  s.track,  -- Now course_type ENUM (nullable)
  s.level,
  c.id as class_id,
  c.name as class_name,
  co.id as course_id,
  co.course_type,
  co.course_name,
  u.id as teacher_id,
  u.full_name as teacher_name,
  c.academic_year,

  -- Assessment counts by category
  COUNT(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN 1 END) as fa_count,
  COUNT(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN 1 END) as sa_count,
  COUNT(CASE WHEN sc.assessment_code = 'FINAL' AND sc.score > 0 THEN 1 END) as final_count,

  -- Calculated averages (following /lib/grade logic)
  ROUND(
      CASE
          WHEN COUNT(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN 1 END) > 0
          THEN AVG(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN sc.score END)::numeric
          ELSE NULL
      END, 2
  ) as formative_average,

  ROUND(
      CASE
          WHEN COUNT(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN 1 END) > 0
          THEN AVG(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN sc.score END)::numeric
          ELSE NULL
      END, 2
  ) as summative_average,

  -- Final score
  MAX(CASE WHEN sc.assessment_code = 'FINAL' THEN sc.score END) as final_score,

  -- Semester grade calculation: (F×0.15 + S×0.2 + Final×0.1) ÷ 0.45
  ROUND(
      CASE
          WHEN AVG(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN sc.score END) IS NOT NULL
              AND AVG(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN sc.score END) IS NOT NULL
              AND MAX(CASE WHEN sc.assessment_code = 'FINAL' THEN sc.score END) IS NOT NULL
              AND MAX(CASE WHEN sc.assessment_code = 'FINAL' THEN sc.score END) > 0
          THEN (
              AVG(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN sc.score END)::numeric * 0.15 +
              AVG(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN sc.score END)::numeric * 0.20 +
              MAX(CASE WHEN sc.assessment_code = 'FINAL' THEN sc.score END)::numeric * 0.10
          ) / 0.45
          ELSE NULL
      END, 2
  ) as semester_grade,

  -- Performance indicators
  CASE
      WHEN AVG(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN sc.score END) < 60 THEN true
      WHEN AVG(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN sc.score END) < 60 THEN true
      WHEN COUNT(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN 1 END) < 3 THEN true
      ELSE false
  END as at_risk,

  -- Last assessment date
  MAX(sc.entered_at) as last_assessment_date,

  -- Total assessments completed
  COUNT(CASE WHEN sc.score > 0 THEN 1 END) as total_assessments_completed

FROM students s
LEFT JOIN classes c ON s.class_id = c.id
LEFT JOIN courses co ON c.id = co.class_id
LEFT JOIN users u ON co.teacher_id = u.id
LEFT JOIN student_courses sc_rel ON s.id = sc_rel.student_id AND co.id = sc_rel.course_id
LEFT JOIN scores sc ON s.id = sc.student_id AND sc.course_id = co.id
WHERE s.is_active = true
    AND (c.is_active = true OR c.id IS NULL)
    AND (co.is_active = true OR co.id IS NULL)
GROUP BY s.id, s.student_id, s.full_name, s.grade, s.track, s.level,
         c.id, c.name, co.id, co.course_type, co.course_name,
         u.id, u.full_name, c.academic_year;

-- ========================================
-- CLASS STATISTICS VIEW
-- ========================================

CREATE OR REPLACE VIEW class_statistics AS
SELECT
  c.id as class_id,
  c.name as class_name,
  c.grade,
  c.track,  -- Remains track_type ENUM (nullable)
  c.level as class_level,
  c.academic_year,
  co.id as course_id,
  co.course_type,
  co.course_name,
  u.id as teacher_id,
  u.full_name as teacher_name,
  u.teacher_type,

  -- Student counts
  COUNT(DISTINCT s.id) as total_students,
  COUNT(DISTINCT CASE WHEN s.is_active = true THEN s.id END) as active_students,

  -- Assessment completion statistics
  COUNT(DISTINCT CASE WHEN sc.score > 0 THEN s.id END) as students_with_scores,
  ROUND(
      COUNT(DISTINCT CASE WHEN sc.score > 0 THEN s.id END)::decimal /
      NULLIF(COUNT(DISTINCT CASE WHEN s.is_active = true THEN s.id END), 0) * 100, 1
  ) as completion_rate_percent,

  -- Grade statistics
  ROUND(AVG(CASE WHEN sc.score > 0 THEN sc.score END)::numeric, 2) as class_average,
  ROUND(
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CASE WHEN sc.score > 0 THEN sc.score END)::numeric, 2
  ) as class_median,
  MIN(CASE WHEN sc.score > 0 THEN sc.score END) as class_min,
  MAX(sc.score) as class_max,

  -- Standard deviation
  ROUND(
      STDDEV_POP(CASE WHEN sc.score > 0 THEN sc.score END)::numeric, 2
  ) as class_stddev,

  -- Assessment type averages
  ROUND(
      AVG(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN sc.score END)::numeric, 2
  ) as formative_class_avg,
  ROUND(
      AVG(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN sc.score END)::numeric, 2
  ) as summative_class_avg,
  ROUND(
      AVG(CASE WHEN sc.assessment_code = 'FINAL' AND sc.score > 0 THEN sc.score END)::numeric, 2
  ) as final_class_avg,

  -- Last update
  MAX(sc.entered_at) as last_update

FROM classes c
LEFT JOIN courses co ON c.id = co.class_id
LEFT JOIN users u ON co.teacher_id = u.id
LEFT JOIN students s ON c.id = s.class_id
LEFT JOIN scores sc ON s.id = sc.student_id AND sc.course_id = co.id
WHERE c.is_active = true
    AND (co.is_active = true OR co.id IS NULL)
GROUP BY c.id, c.name, c.grade, c.track, c.level, c.academic_year,
         co.id, co.course_type, co.course_name,
         u.id, u.full_name, u.teacher_type;

-- ========================================
-- TEACHER PERFORMANCE VIEW
-- ========================================

CREATE OR REPLACE VIEW teacher_performance AS
SELECT
  u.id as teacher_id,
  u.full_name as teacher_name,
  u.email as teacher_email,
  u.teacher_type,
  u.grade as assigned_grade,
  u.track as assigned_track,  -- Now course_type ENUM (nullable)

  -- Course load
  COUNT(DISTINCT co.id) as courses_taught,
  COUNT(DISTINCT c.id) as classes_taught,
  COUNT(DISTINCT s.id) as total_students_taught,

  -- Grade performance metrics
  ROUND(AVG(CASE WHEN sc.score > 0 THEN sc.score END)::numeric, 2) as overall_class_average,
  ROUND(
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CASE WHEN sc.score > 0 THEN sc.score END)::numeric, 2
  ) as overall_median,

  -- Assessment completion tracking
  COUNT(DISTINCT sc.exam_id) as exams_conducted,
  COUNT(CASE WHEN sc.score > 0 THEN 1 END) as assessments_completed,

  -- Performance distribution
  ROUND(
      COUNT(CASE WHEN sc.score >= 80 THEN 1 END)::decimal /
      NULLIF(COUNT(CASE WHEN sc.score > 0 THEN 1 END), 0) * 100, 1
  ) as students_above_80_percent,

  ROUND(
      COUNT(CASE WHEN sc.score < 60 AND sc.score > 0 THEN 1 END)::decimal /
      NULLIF(COUNT(CASE WHEN sc.score > 0 THEN 1 END), 0) * 100, 1
  ) as students_below_60_percent,

  -- Assessment frequency
  ROUND(
      COUNT(CASE WHEN sc.score > 0 THEN 1 END)::decimal /
      NULLIF(COUNT(DISTINCT s.id), 0), 1
  ) as assessments_per_student,

  -- Recent activity
  MAX(sc.entered_at) as last_grade_entry,

  -- Risk management
  COUNT(DISTINCT CASE
      WHEN sc.score > 0 AND sc.score < 60 THEN s.id
  END) as at_risk_students

FROM users u
LEFT JOIN courses co ON u.id = co.teacher_id
LEFT JOIN classes c ON co.class_id = c.id
LEFT JOIN students s ON c.id = s.class_id AND s.is_active = true
LEFT JOIN scores sc ON s.id = sc.student_id AND sc.course_id = co.id
WHERE u.role = 'teacher'
    AND u.is_active = true
    AND (co.is_active = true OR co.id IS NULL)
    AND (c.is_active = true OR c.id IS NULL)
GROUP BY u.id, u.full_name, u.email, u.teacher_type, u.grade, u.track;

-- Add view comments
COMMENT ON VIEW student_grade_aggregates IS
'Comprehensive student performance view with individual scores, averages, and analytics metrics. Follows /lib/grade calculation logic.';

COMMENT ON VIEW class_statistics IS
'Class-level performance statistics including averages, distributions, completion rates, and teacher metrics.';

COMMENT ON VIEW teacher_performance IS
'Teacher effectiveness metrics including class averages, student performance distribution, and consistency measures.';

DO $$
BEGIN
    RAISE NOTICE '✅ Analytics views recreated with updated track column types';
END $$;

-- ========================================
-- Part 7: Update related ENUM type comments
-- ========================================

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
    RAISE NOTICE '  ✅ Dropped 3 Analytics Views (student_grade_aggregates, class_statistics, teacher_performance)';
    RAISE NOTICE '  ✅ Dropped dependent RLS policies';
    RAISE NOTICE '  ✅ Changed users.track: track_type → course_type';
    RAISE NOTICE '  ✅ Changed students.track: track_type → course_type (NULL)';
    RAISE NOTICE '  ✅ Recreated RLS policies with correct types';
    RAISE NOTICE '  ✅ Recreated Analytics Views with updated track column types';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Execute Migration 012 (with fixed RLS policy)';
    RAISE NOTICE '2. Execute Migration 013 (RLS security)';
    RAISE NOTICE '3. Run: npm run gen:types';
    RAISE NOTICE '4. Test and verify';
    RAISE NOTICE '';
END $$;
