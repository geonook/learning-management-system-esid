-- Migration 034: Create NWEA MAP Growth Assessment Tables
-- Purpose: Store MAP assessment data for G3-G6 students (Reading & Language Usage)

-- ============================================================
-- MAP Assessments Main Table
-- ============================================================
CREATE TABLE IF NOT EXISTS map_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Student linking (nullable for unmatched students)
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  student_number TEXT NOT NULL,           -- 'LE12001' - used for matching

  -- Student snapshot from CSV (denormalized for historical accuracy)
  student_last_name TEXT,
  student_first_name TEXT,
  grade INTEGER NOT NULL,                 -- 3, 4, 5, 6
  school TEXT,

  -- Term identification
  term_tested TEXT NOT NULL,              -- 'Fall 2025-2026'
  academic_year TEXT NOT NULL,            -- '2025-2026'
  term TEXT NOT NULL,                     -- 'fall', 'spring'

  -- Course & test info
  course TEXT NOT NULL,                   -- 'Reading', 'Language Usage'
  test_name TEXT,

  -- Scores
  rit_score INTEGER NOT NULL,
  rit_score_range TEXT,                   -- '161-170'
  rapid_guessing_percent INTEGER,

  -- Lexile (Reading only)
  lexile_score TEXT,                      -- '1190L' or 'BR400'
  lexile_range TEXT,

  -- Import tracking
  imported_at TIMESTAMPTZ DEFAULT now(),
  import_batch_id UUID,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint: one assessment per student/course/term
  UNIQUE(student_number, course, term_tested)
);

-- ============================================================
-- MAP Goal Scores Table
-- ============================================================
CREATE TABLE IF NOT EXISTS map_goal_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES map_assessments(id) ON DELETE CASCADE,

  goal_name TEXT NOT NULL,                -- 'Informational Text', 'Grammar and Usage', etc.
  goal_rit_range TEXT,                    -- '161-170'

  created_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint: one goal per assessment
  UNIQUE(assessment_id, goal_name)
);

-- ============================================================
-- Indexes for Performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_map_assessments_student_id ON map_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_map_assessments_student_number ON map_assessments(student_number);
CREATE INDEX IF NOT EXISTS idx_map_assessments_academic_year ON map_assessments(academic_year);
CREATE INDEX IF NOT EXISTS idx_map_assessments_term ON map_assessments(term);
CREATE INDEX IF NOT EXISTS idx_map_assessments_course ON map_assessments(course);
CREATE INDEX IF NOT EXISTS idx_map_assessments_grade ON map_assessments(grade);
CREATE INDEX IF NOT EXISTS idx_map_goal_scores_assessment ON map_goal_scores(assessment_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_map_assessments_student_course_term
  ON map_assessments(student_number, course, term_tested);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE map_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_goal_scores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for idempotency)
DROP POLICY IF EXISTS "Admin full access on map_assessments" ON map_assessments;
DROP POLICY IF EXISTS "Office member read access on map_assessments" ON map_assessments;
DROP POLICY IF EXISTS "Head view grade band students map" ON map_assessments;
DROP POLICY IF EXISTS "Teacher view own class students map" ON map_assessments;
DROP POLICY IF EXISTS "Admin full access on map_goal_scores" ON map_goal_scores;
DROP POLICY IF EXISTS "Users can view map_goal_scores for visible assessments" ON map_goal_scores;

-- Admin: Full access (CRUD)
CREATE POLICY "Admin full access on map_assessments"
  ON map_assessments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Office Member: Read access to all
CREATE POLICY "Office member read access on map_assessments"
  ON map_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'office_member'
    )
  );

-- Head Teacher: View Grade Band students
CREATE POLICY "Head view grade band students map"
  ON map_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'head'
        AND map_assessments.grade = u.grade
    )
  );

-- Teacher: View own class students via student_courses
CREATE POLICY "Teacher view own class students map"
  ON map_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN student_courses sc ON sc.course_id = c.id
      JOIN students s ON s.id = sc.student_id
      WHERE c.teacher_id = auth.uid()
        AND s.student_id = map_assessments.student_number
    )
  );

-- Goal Scores: Admin full access
CREATE POLICY "Admin full access on map_goal_scores"
  ON map_goal_scores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Goal Scores: Users can view if they can view the parent assessment
CREATE POLICY "Users can view map_goal_scores for visible assessments"
  ON map_goal_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM map_assessments ma
      WHERE ma.id = map_goal_scores.assessment_id
    )
  );

-- ============================================================
-- Updated At Trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_map_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_map_assessments_updated_at ON map_assessments;
CREATE TRIGGER trigger_update_map_assessments_updated_at
  BEFORE UPDATE ON map_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_map_assessments_updated_at();

-- ============================================================
-- Comments
-- ============================================================
COMMENT ON TABLE map_assessments IS 'NWEA MAP Growth assessment scores for Reading and Language Usage';
COMMENT ON TABLE map_goal_scores IS 'Goal area scores for each MAP assessment';
COMMENT ON COLUMN map_assessments.student_number IS 'School student ID (e.g., LE12001) used for matching';
COMMENT ON COLUMN map_assessments.rit_score IS 'Rasch Unit score (typically 100-350)';
COMMENT ON COLUMN map_assessments.lexile_score IS 'Lexile reading level (e.g., 1190L or BR400)';
COMMENT ON COLUMN map_goal_scores.goal_name IS 'Goal area name (e.g., Informational Text, Grammar and Usage)';
COMMENT ON COLUMN map_goal_scores.goal_rit_range IS 'RIT score range for this goal (e.g., 161-170)';
