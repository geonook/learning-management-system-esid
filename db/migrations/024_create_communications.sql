-- Migration 024: Create Communications Table
-- Purpose: Parent communication tracking for LT teachers (phone calls) and IT/KCFS teachers (memos)
-- Created: 2025-12-04

-- ==============================================================================
-- PART 1: Create communications table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  -- Semester tracking (2025-2026 School Year = 2025 Fall + 2026 Spring)
  academic_year TEXT NOT NULL,  -- e.g., '2025-2026'
  semester TEXT NOT NULL CHECK (semester IN ('fall', 'spring')),

  -- Communication details
  communication_type TEXT NOT NULL CHECK (
    communication_type IN ('phone_call', 'email', 'in_person', 'message', 'other')
  ),
  contact_period TEXT CHECK (
    contact_period IN ('semester_start', 'midterm', 'final', 'ad_hoc')
  ),

  -- Content
  subject TEXT,           -- Optional subject/title
  content TEXT NOT NULL,  -- Main content/notes

  -- Metadata
  communication_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_lt_required BOOLEAN DEFAULT FALSE,  -- True if this is an LT required phone call

  -- Audit timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE communications IS 'Parent communication records for teachers. LT teachers have 3 required phone calls per semester (semester_start, midterm, final). IT/KCFS teachers use this for ad-hoc memos.';

-- ==============================================================================
-- PART 2: Create indexes for performance
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_communications_student ON communications(student_id);
CREATE INDEX IF NOT EXISTS idx_communications_teacher ON communications(teacher_id);
CREATE INDEX IF NOT EXISTS idx_communications_course ON communications(course_id);
CREATE INDEX IF NOT EXISTS idx_communications_date ON communications(communication_date DESC);
CREATE INDEX IF NOT EXISTS idx_communications_semester ON communications(academic_year, semester);
CREATE INDEX IF NOT EXISTS idx_communications_period ON communications(contact_period) WHERE contact_period IS NOT NULL;

-- ==============================================================================
-- PART 3: Enable Row Level Security
-- ==============================================================================

ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- PART 4: Create RLS Policies
-- ==============================================================================

-- Policy 1: Service role bypass (for admin operations)
CREATE POLICY service_role_bypass_communications ON communications
  FOR ALL TO service_role
  USING (true);

-- Policy 2: Teachers can manage communications for their own courses
CREATE POLICY teacher_own_communications ON communications
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = communications.course_id
      AND c.teacher_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = communications.course_id
      AND c.teacher_id = (SELECT auth.uid())
    )
  );

-- Policy 3: Admin can manage all communications
CREATE POLICY admin_full_access_communications ON communications
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- Policy 4: Office members can read all communications
CREATE POLICY office_member_read_communications ON communications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid())
      AND role = 'office_member'
    )
  );

-- Policy 5: Head teachers can read communications in their grade band
-- Note: Using SECURITY DEFINER function pattern to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_head_teacher_grades()
RETURNS INT[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT CASE
    WHEN grade_band LIKE '%-%' THEN
      ARRAY(SELECT generate_series(
        split_part(grade_band, '-', 1)::int,
        split_part(grade_band, '-', 2)::int
      ))
    WHEN grade_band IS NOT NULL AND grade_band ~ '^\d+$' THEN
      ARRAY[grade_band::int]
    ELSE
      ARRAY[]::int[]
  END
  FROM public.users
  WHERE id = auth.uid() AND role = 'head';
$$;

CREATE POLICY head_read_grade_band_communications ON communications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM courses c
      JOIN classes cl ON cl.id = c.class_id
      WHERE c.id = communications.course_id
        AND cl.grade = ANY(public.get_head_teacher_grades())
        AND EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = (SELECT auth.uid())
          AND u.role = 'head'
        )
    )
  );

-- ==============================================================================
-- PART 5: Create updated_at trigger
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_communications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER communications_updated_at
  BEFORE UPDATE ON communications
  FOR EACH ROW
  EXECUTE FUNCTION update_communications_updated_at();

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================

-- Verify table creation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'communications') THEN
    RAISE NOTICE '✅ Communications table created successfully';
  ELSE
    RAISE EXCEPTION '❌ Communications table was not created';
  END IF;
END $$;

-- Verify RLS is enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'communications'
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✅ RLS enabled on communications table';
  ELSE
    RAISE EXCEPTION '❌ RLS is not enabled on communications table';
  END IF;
END $$;

-- Verify policies exist
DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'communications';

  IF policy_count >= 5 THEN
    RAISE NOTICE '✅ % RLS policies created for communications table', policy_count;
  ELSE
    RAISE EXCEPTION '❌ Expected at least 5 policies, found %', policy_count;
  END IF;
END $$;
