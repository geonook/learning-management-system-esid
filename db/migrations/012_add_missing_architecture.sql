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
                    AND u.track = c.course_type::text  -- Head's track matches course type
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
    FROM exams e
    INNER JOIN courses c ON c.class_id = e.class_id
    WHERE e.id = scores.exam_id
    LIMIT 1  -- Take first matching course (may need manual refinement)
)
WHERE course_id IS NULL
  AND EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = scores.exam_id
  );

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
END $$;
