-- Migration 044: Create iSchool Comments Table
-- Purpose: Store Teacher Comments for iSchool export (separate from communications system)
-- Only used for Term 2 and Term 4 exports

-- ============================================================
-- Table: ischool_comments
-- ============================================================
CREATE TABLE IF NOT EXISTS ischool_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  -- Term tracking (Term 1-4 system)
  academic_year TEXT NOT NULL,  -- e.g., '2025-2026'
  term INTEGER NOT NULL CHECK (term IN (2, 4)),  -- Only Term 2 and 4 need comments

  -- Content (plain text for iSchool paste, max 400 chars as per iSchool limit)
  comment TEXT NOT NULL CHECK (char_length(comment) <= 400),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one comment per student per course per term
  UNIQUE (student_id, course_id, academic_year, term)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ischool_comments_course
  ON ischool_comments(course_id);

CREATE INDEX IF NOT EXISTS idx_ischool_comments_term
  ON ischool_comments(academic_year, term);

CREATE INDEX IF NOT EXISTS idx_ischool_comments_student
  ON ischool_comments(student_id);

CREATE INDEX IF NOT EXISTS idx_ischool_comments_teacher
  ON ischool_comments(teacher_id);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE ischool_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can manage comments for their own courses
CREATE POLICY teacher_own_ischool_comments ON ischool_comments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = ischool_comments.course_id
      AND c.teacher_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = ischool_comments.course_id
      AND c.teacher_id = (SELECT auth.uid())
    )
  );

-- Policy: Admin full access
CREATE POLICY admin_full_access_ischool_comments ON ischool_comments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- Policy: Office members can read all (for reporting)
CREATE POLICY office_read_ischool_comments ON ischool_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role = 'office_member'
    )
  );

-- ============================================================
-- Trigger: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_ischool_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ischool_comments_updated_at
  BEFORE UPDATE ON ischool_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_ischool_comments_updated_at();

-- ============================================================
-- Comments
-- ============================================================
COMMENT ON TABLE ischool_comments IS 'Teacher comments for iSchool grade export (Term 2 and 4 only)';
COMMENT ON COLUMN ischool_comments.term IS 'Only 2 or 4 allowed - comments are only needed for semester end terms';
COMMENT ON COLUMN ischool_comments.comment IS 'Max 400 characters as per iSchool input limit';
