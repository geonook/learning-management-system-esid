-- ========================================
-- Migration 012: Add Missing Architecture Components
-- Date: 2025-10-27
-- Purpose: Add student_courses table and scores.course_id column that were missing from Migration 008
-- Reference: Migration 003b had these components, but Migration 008 was simplified
-- ========================================

-- ========================================
-- Part 1: Create student_courses junction table
-- ========================================

-- Create student_courses table for many-to-many relationship between students and courses
CREATE TABLE IF NOT EXISTS student_courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique student per course
    UNIQUE(student_id, course_id)
);

-- Add comment for documentation
COMMENT ON TABLE student_courses IS 'Junction table for many-to-many relationship between students and courses';
COMMENT ON COLUMN student_courses.student_id IS 'Reference to the student';
COMMENT ON COLUMN student_courses.course_id IS 'Reference to the course (LT/IT/KCFS)';
COMMENT ON COLUMN student_courses.enrolled_at IS 'When the student was enrolled in this course';

-- ========================================
-- Part 2: Add course_id column to scores table
-- ========================================

-- Add course_id to scores table (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'scores'
        AND column_name = 'course_id'
    ) THEN
        ALTER TABLE scores ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;

        RAISE NOTICE 'Added course_id column to scores table';
    ELSE
        RAISE NOTICE 'course_id column already exists in scores table';
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN scores.course_id IS 'Reference to the specific course (LT/IT/KCFS) this score belongs to';

-- ========================================
-- Part 3: Add course_name generated column to courses
-- ========================================

-- Add course_name as a generated column (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'courses'
        AND column_name = 'course_name'
    ) THEN
        ALTER TABLE courses ADD COLUMN course_name TEXT GENERATED ALWAYS AS (
            CASE course_type
                WHEN 'LT' THEN 'LT English Language Arts (ELA)'
                WHEN 'IT' THEN 'IT English Language Arts (ELA)'
                WHEN 'KCFS' THEN 'KCFS'
            END
        ) STORED;

        RAISE NOTICE 'Added course_name generated column to courses table';
    ELSE
        RAISE NOTICE 'course_name column already exists in courses table';
    END IF;
END $$;

-- ========================================
-- Part 4: Add performance indexes
-- ========================================

-- Indexes for student_courses table
CREATE INDEX IF NOT EXISTS idx_student_courses_student_id ON student_courses(student_id);
CREATE INDEX IF NOT EXISTS idx_student_courses_course_id ON student_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_student_courses_active ON student_courses(student_id, course_id) WHERE is_active = TRUE;

-- Index for scores.course_id
CREATE INDEX IF NOT EXISTS idx_scores_course_id ON scores(course_id);
CREATE INDEX IF NOT EXISTS idx_scores_student_course ON scores(student_id, course_id);

-- ========================================
-- Part 5: Enable RLS on student_courses table
-- ========================================

ALTER TABLE student_courses ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Part 6: Add RLS policies for student_courses
-- ========================================

-- Admin can see all student course enrollments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'student_courses'
        AND policyname = 'Admin full access to student_courses'
    ) THEN
        CREATE POLICY "Admin full access to student_courses" ON student_courses
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE users.id = auth.uid()
                    AND users.role = 'admin'
                )
            );

        RAISE NOTICE 'Created Admin RLS policy for student_courses';
    END IF;
END $$;

-- Teachers can see enrollments for their courses
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'student_courses'
        AND policyname = 'Teachers can see their course enrollments'
    ) THEN
        CREATE POLICY "Teachers can see their course enrollments" ON student_courses
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM courses
                    WHERE courses.id = student_courses.course_id
                    AND courses.teacher_id = auth.uid()
                )
            );

        RAISE NOTICE 'Created Teacher RLS policy for student_courses';
    END IF;
END $$;

-- Head teachers can see enrollments in their grade and course type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'student_courses'
        AND policyname = 'Heads can see enrollments in their jurisdiction'
    ) THEN
        CREATE POLICY "Heads can see enrollments in their jurisdiction" ON student_courses
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM users u
                    JOIN courses c ON student_courses.course_id = c.id
                    JOIN classes cls ON c.class_id = cls.id
                    WHERE u.id = auth.uid()
                    AND u.role = 'head'
                    AND u.grade = cls.grade
                    AND u.track = c.course_type  -- ✅ Fixed: Both are course_type ENUM (after Migration 014)
                )
            );

        RAISE NOTICE 'Created Head Teacher RLS policy for student_courses';
    END IF;
END $$;

-- Students can see their own enrollments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'student_courses'
        AND policyname = 'Students can see their own enrollments'
    ) THEN
        CREATE POLICY "Students can see their own enrollments" ON student_courses
            FOR SELECT
            USING (student_id = auth.uid());

        RAISE NOTICE 'Created Student RLS policy for student_courses';
    END IF;
END $$;

-- ========================================
-- Part 7: Data migration - Create student_courses records
-- ========================================

-- Auto-enroll all active students in all courses of their class
-- This ensures every student is enrolled in LT, IT, and KCFS courses
INSERT INTO student_courses (student_id, course_id, enrolled_at, is_active)
SELECT DISTINCT
    s.id AS student_id,
    c.id AS course_id,
    NOW() AS enrolled_at,
    TRUE AS is_active
FROM students s
INNER JOIN classes cls ON s.class_id = cls.id
INNER JOIN courses c ON c.class_id = cls.id
WHERE s.is_active = TRUE
  AND c.is_active = TRUE
ON CONFLICT (student_id, course_id) DO NOTHING;

-- ========================================
-- Part 8: Data migration - Update scores.course_id
-- ========================================

-- Update existing scores to link them to the appropriate course
-- Logic: Match exam's class with the course, assuming scores belong to the first matching course
-- Note: This is a best-effort migration. Manual review may be needed.
UPDATE scores
SET course_id = (
    SELECT c.id
    FROM courses c
    WHERE c.class_id = (
        SELECT class_id
        FROM exams
        WHERE id = scores.exam_id
    )
    LIMIT 1  -- Take first matching course (may need manual refinement)
)
WHERE course_id IS NULL
  AND EXISTS (
      SELECT 1 FROM exams
      WHERE id = scores.exam_id
  );

-- ========================================
-- Recreate Analytics Views (dropped in Migration 014)
-- ========================================
-- Note: These views were dropped in Migration 014 because they depended on track columns
-- Now that scores.course_id is added and track types are corrected, we recreate them

-- ========================================
-- STUDENT GRADE AGGREGATES VIEW
-- ========================================

CREATE OR REPLACE VIEW student_grade_aggregates AS
SELECT
  s.id as student_id,
  s.student_id as student_number,
  s.full_name as student_name,
  s.grade,
  s.track,  -- Now course_type ENUM (changed in Migration 014)
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
  COUNT(CASE WHEN sc.assessment_code IN ('FA1', 'FA2', 'FA3', 'FA4', 'FA5', 'FA6', 'FA7', 'FA8') AND sc.score > 0 THEN 1 END) as fa_count,
  COUNT(CASE WHEN sc.assessment_code IN ('SA1', 'SA2', 'SA3', 'SA4') AND sc.score > 0 THEN 1 END) as sa_count,
  COUNT(CASE WHEN sc.assessment_code = 'FINAL' AND sc.score > 0 THEN 1 END) as final_count,

  -- Calculated averages (following /lib/grade logic)
  ROUND(
      CASE
          WHEN COUNT(CASE WHEN sc.assessment_code IN ('FA1', 'FA2', 'FA3', 'FA4', 'FA5', 'FA6', 'FA7', 'FA8') AND sc.score > 0 THEN 1 END) > 0
          THEN AVG(CASE WHEN sc.assessment_code IN ('FA1', 'FA2', 'FA3', 'FA4', 'FA5', 'FA6', 'FA7', 'FA8') AND sc.score > 0 THEN sc.score END)::numeric
          ELSE NULL
      END, 2
  ) as formative_average,

  ROUND(
      CASE
          WHEN COUNT(CASE WHEN sc.assessment_code IN ('SA1', 'SA2', 'SA3', 'SA4') AND sc.score > 0 THEN 1 END) > 0
          THEN AVG(CASE WHEN sc.assessment_code IN ('SA1', 'SA2', 'SA3', 'SA4') AND sc.score > 0 THEN sc.score END)::numeric
          ELSE NULL
      END, 2
  ) as summative_average,

  -- Final score
  MAX(CASE WHEN sc.assessment_code = 'FINAL' THEN sc.score END) as final_score,

  -- Semester grade calculation: (F×0.15 + S×0.2 + Final×0.1) ÷ 0.45
  ROUND(
      CASE
          WHEN AVG(CASE WHEN sc.assessment_code IN ('FA1', 'FA2', 'FA3', 'FA4', 'FA5', 'FA6', 'FA7', 'FA8') AND sc.score > 0 THEN sc.score END) IS NOT NULL
              AND AVG(CASE WHEN sc.assessment_code IN ('SA1', 'SA2', 'SA3', 'SA4') AND sc.score > 0 THEN sc.score END) IS NOT NULL
              AND MAX(CASE WHEN sc.assessment_code = 'FINAL' THEN sc.score END) IS NOT NULL
              AND MAX(CASE WHEN sc.assessment_code = 'FINAL' THEN sc.score END) > 0
          THEN (
              AVG(CASE WHEN sc.assessment_code IN ('FA1', 'FA2', 'FA3', 'FA4', 'FA5', 'FA6', 'FA7', 'FA8') AND sc.score > 0 THEN sc.score END)::numeric * 0.15 +
              AVG(CASE WHEN sc.assessment_code IN ('SA1', 'SA2', 'SA3', 'SA4') AND sc.score > 0 THEN sc.score END)::numeric * 0.20 +
              MAX(CASE WHEN sc.assessment_code = 'FINAL' THEN sc.score END)::numeric * 0.10
          ) / 0.45
          ELSE NULL
      END, 2
  ) as semester_grade,

  -- Performance indicators
  CASE
      WHEN AVG(CASE WHEN sc.assessment_code IN ('FA1', 'FA2', 'FA3', 'FA4', 'FA5', 'FA6', 'FA7', 'FA8') AND sc.score > 0 THEN sc.score END) < 60 THEN true
      WHEN AVG(CASE WHEN sc.assessment_code IN ('SA1', 'SA2', 'SA3', 'SA4') AND sc.score > 0 THEN sc.score END) < 60 THEN true
      WHEN COUNT(CASE WHEN sc.assessment_code IN ('FA1', 'FA2', 'FA3', 'FA4', 'FA5', 'FA6', 'FA7', 'FA8') AND sc.score > 0 THEN 1 END) < 3 THEN true
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
  c.track,  -- Remains track_type ENUM (unchanged)
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
      AVG(CASE WHEN sc.assessment_code IN ('FA1', 'FA2', 'FA3', 'FA4', 'FA5', 'FA6', 'FA7', 'FA8') AND sc.score > 0 THEN sc.score END)::numeric, 2
  ) as formative_class_avg,
  ROUND(
      AVG(CASE WHEN sc.assessment_code IN ('SA1', 'SA2', 'SA3', 'SA4') AND sc.score > 0 THEN sc.score END)::numeric, 2
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
  u.track as assigned_track,  -- Now course_type ENUM (changed in Migration 014)

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


-- ========================================
-- Success summary
-- ========================================

DO $$
DECLARE
    student_courses_count INTEGER;
    scores_with_course_id INTEGER;
    scores_without_course_id INTEGER;
BEGIN
    SELECT COUNT(*) INTO student_courses_count FROM student_courses;
    SELECT COUNT(*) INTO scores_with_course_id FROM scores WHERE course_id IS NOT NULL;
    SELECT COUNT(*) INTO scores_without_course_id FROM scores WHERE course_id IS NULL;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 012 Completed Successfully';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Student Course Enrollments: %', student_courses_count;
    RAISE NOTICE 'Scores with course_id: %', scores_with_course_id;
    RAISE NOTICE 'Scores without course_id: % (may need manual review)', scores_without_course_id;
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Analytics Views Recreated:';
    RAISE NOTICE '   - student_grade_aggregates';
    RAISE NOTICE '   - class_statistics';
    RAISE NOTICE '   - teacher_performance';
    RAISE NOTICE '========================================';
END $$;
