-- Migration 041: Create student_class_history table
-- Purpose: Store historical student class assignments by academic year
-- This fixes the issue where G5 Class Comparison shows G6 class names
-- because students' current class_id points to their promoted grade

-- Create table
CREATE TABLE IF NOT EXISTS student_class_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_number TEXT NOT NULL,
  academic_year TEXT NOT NULL,  -- e.g., '2024-2025'
  grade INTEGER NOT NULL,
  english_class TEXT NOT NULL,  -- e.g., 'G5 Voyagers'
  homeroom TEXT,                -- e.g., '501'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_number, academic_year)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_student_class_history_academic_year
  ON student_class_history(academic_year);
CREATE INDEX IF NOT EXISTS idx_student_class_history_student_number
  ON student_class_history(student_number);
CREATE INDEX IF NOT EXISTS idx_student_class_history_grade
  ON student_class_history(grade);

-- Enable RLS
ALTER TABLE student_class_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: All authenticated users can read
CREATE POLICY "student_class_history_select_policy"
  ON student_class_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "student_class_history_admin_policy"
  ON student_class_history
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

COMMENT ON TABLE student_class_history IS 'Historical student class assignments by academic year. Used for accurate class-based analytics when students have been promoted.';
COMMENT ON COLUMN student_class_history.student_number IS 'Student ID (e.g., LE09068)';
COMMENT ON COLUMN student_class_history.academic_year IS 'Academic year in format YYYY-YYYY (e.g., 2024-2025)';
COMMENT ON COLUMN student_class_history.grade IS 'Grade level (1-6) during this academic year';
COMMENT ON COLUMN student_class_history.english_class IS 'English class name (e.g., G5 Voyagers)';
COMMENT ON COLUMN student_class_history.homeroom IS 'Homeroom number (e.g., 501)';
