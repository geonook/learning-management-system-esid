-- Migration 008: Create Courses Table
-- Purpose: Enable one class to have three different course types (LT/IT/KCFS) taught by different teachers
-- Architecture: Preserves existing track (local/international) for administrative classification
--               Uses teacher_type for course specialization (LT/IT/KCFS)

-- Ensure update_updated_at_column() function exists
-- This function is used by triggers to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  course_type course_type NOT NULL,  -- LT, IT, or KCFS
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  academic_year TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one course per type per class per academic year
  UNIQUE(class_id, course_type, academic_year),

  -- Ensure teacher matches course type
  CONSTRAINT teacher_matches_course_type
    CHECK (
      teacher_id IS NULL OR
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = teacher_id
        AND users.teacher_type::text = course_type::text
      )
    )
);

-- Create index for performance
CREATE INDEX idx_courses_class ON courses(class_id);
CREATE INDEX idx_courses_teacher ON courses(teacher_id);
CREATE INDEX idx_courses_type ON courses(course_type);
CREATE INDEX idx_courses_academic_year ON courses(academic_year);

-- Add updated_at trigger
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE courses IS 'Course assignments - one class can have three course types (LT/IT/KCFS) with different teachers';
COMMENT ON COLUMN courses.course_type IS 'Type of course: LT (Local Teacher), IT (International Teacher), or KCFS';
COMMENT ON COLUMN courses.teacher_id IS 'Teacher assigned to this course (must match course_type)';
COMMENT ON COLUMN courses.academic_year IS 'Academic year for this course assignment';

-- Migration: Create default courses for existing classes
-- For each existing class, create three course records (LT, IT, KCFS)
-- Teacher assignments will be done manually by admin later
INSERT INTO courses (class_id, course_type, teacher_id, academic_year)
SELECT
  c.id AS class_id,
  ct.course_type,
  NULL AS teacher_id,  -- To be assigned by admin
  c.academic_year
FROM classes c
CROSS JOIN (
  VALUES ('LT'::course_type), ('IT'::course_type), ('KCFS'::course_type)
) AS ct(course_type)
WHERE c.is_active = TRUE
ON CONFLICT (class_id, course_type, academic_year) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 008 completed: courses table created with % records',
    (SELECT COUNT(*) FROM courses);
END $$;
