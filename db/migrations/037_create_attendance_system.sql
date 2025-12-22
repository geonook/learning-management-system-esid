-- Migration: 037_create_attendance_system.sql
-- Description: Create attendance tracking and behavior management system
-- Date: 2024-12-22

-- ============================================================================
-- 1. Create attendance table
-- ============================================================================

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  -- Record info
  date DATE NOT NULL,
  period INTEGER DEFAULT 0 CHECK (period BETWEEN 0 AND 8),
  status TEXT NOT NULL CHECK (status IN ('P', 'L', 'A', 'S')),
  note TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint: one record per student/course/date/period
  -- period=0 means daily record, period=1-8 means per-period record
  UNIQUE (student_id, course_id, date, period)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_course ON attendance(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_course_date ON attendance(course_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_recorded_by ON attendance(recorded_by);

-- ============================================================================
-- 2. Create behavior_tags table (preset tag definitions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS behavior_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_zh TEXT,
  type TEXT NOT NULL CHECK (type IN ('positive', 'negative')),
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_behavior_tags_name ON behavior_tags(name);

-- Seed default behavior tags
INSERT INTO behavior_tags (name, name_zh, type, icon, sort_order) VALUES
  ('Good Performance', '表現優良', 'positive', 'star', 1),
  ('Active Participation', '積極參與', 'positive', 'hand', 2),
  ('Helping Others', '幫助同學', 'positive', 'heart', 3),
  ('Talking in Class', '上課談話', 'negative', 'message-circle', 4),
  ('Late Assignment', '遲交作業', 'negative', 'clock', 5),
  ('Rule Violation', '違規行為', 'negative', 'alert-triangle', 6)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. Create student_behaviors table (behavior records)
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_behaviors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES behavior_tags(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  -- Record info
  date DATE NOT NULL,
  period INTEGER CHECK (period IS NULL OR (period BETWEEN 1 AND 8)),
  note TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_behaviors_student ON student_behaviors(student_id);
CREATE INDEX IF NOT EXISTS idx_behaviors_course ON student_behaviors(course_id);
CREATE INDEX IF NOT EXISTS idx_behaviors_date ON student_behaviors(date);
CREATE INDEX IF NOT EXISTS idx_behaviors_tag ON student_behaviors(tag_id);
CREATE INDEX IF NOT EXISTS idx_behaviors_course_date ON student_behaviors(course_id, date);

-- ============================================================================
-- 4. Enable RLS
-- ============================================================================

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_behaviors ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. RLS Policies for attendance
-- ============================================================================

-- Service role bypass
CREATE POLICY "service_role_bypass_attendance"
ON attendance FOR ALL TO service_role
USING (true);

-- Admin: full access
CREATE POLICY "admin_full_access_attendance"
ON attendance FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid())
    AND users.role = 'admin'
  )
);

-- Teachers: manage their own courses
CREATE POLICY "teachers_manage_own_attendance"
ON attendance FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = attendance.course_id
    AND courses.teacher_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = attendance.course_id
    AND courses.teacher_id = (SELECT auth.uid())
  )
);

-- Head teachers: read access to their grade band
CREATE POLICY "head_read_grade_band_attendance"
ON attendance FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses c
    JOIN classes cl ON cl.id = c.class_id
    JOIN users u ON u.id = (SELECT auth.uid())
    WHERE c.id = attendance.course_id
    AND u.role = 'head'
    AND cl.grade = ANY(public.get_head_teacher_grades())
  )
);

-- Office members: read-only
CREATE POLICY "office_read_attendance"
ON attendance FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid())
    AND users.role = 'office_member'
  )
);

-- ============================================================================
-- 6. RLS Policies for behavior_tags (read-only for all authenticated)
-- ============================================================================

-- Service role bypass
CREATE POLICY "service_role_bypass_behavior_tags"
ON behavior_tags FOR ALL TO service_role
USING (true);

-- All authenticated can read active tags
CREATE POLICY "authenticated_read_behavior_tags"
ON behavior_tags FOR SELECT TO authenticated
USING (is_active = true);

-- Admin can manage tags
CREATE POLICY "admin_manage_behavior_tags"
ON behavior_tags FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid())
    AND users.role = 'admin'
  )
);

-- ============================================================================
-- 7. RLS Policies for student_behaviors
-- ============================================================================

-- Service role bypass
CREATE POLICY "service_role_bypass_student_behaviors"
ON student_behaviors FOR ALL TO service_role
USING (true);

-- Admin: full access
CREATE POLICY "admin_full_access_student_behaviors"
ON student_behaviors FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid())
    AND users.role = 'admin'
  )
);

-- Teachers: manage their own courses
CREATE POLICY "teachers_manage_own_behaviors"
ON student_behaviors FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = student_behaviors.course_id
    AND courses.teacher_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = student_behaviors.course_id
    AND courses.teacher_id = (SELECT auth.uid())
  )
);

-- Head teachers: read access to their grade band
CREATE POLICY "head_read_grade_band_behaviors"
ON student_behaviors FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses c
    JOIN classes cl ON cl.id = c.class_id
    JOIN users u ON u.id = (SELECT auth.uid())
    WHERE c.id = student_behaviors.course_id
    AND u.role = 'head'
    AND cl.grade = ANY(public.get_head_teacher_grades())
  )
);

-- Office members: read-only
CREATE POLICY "office_read_student_behaviors"
ON student_behaviors FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid())
    AND users.role = 'office_member'
  )
);

-- ============================================================================
-- 8. Updated_at triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_attendance_updated_at ON attendance;
CREATE TRIGGER trigger_update_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_updated_at();

-- ============================================================================
-- 9. Verification
-- ============================================================================

DO $$
BEGIN
  -- Verify tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance') THEN
    RAISE EXCEPTION 'attendance table was not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'behavior_tags') THEN
    RAISE EXCEPTION 'behavior_tags table was not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_behaviors') THEN
    RAISE EXCEPTION 'student_behaviors table was not created';
  END IF;

  -- Verify behavior tags seed data
  IF (SELECT COUNT(*) FROM behavior_tags) < 6 THEN
    RAISE EXCEPTION 'behavior_tags seed data incomplete';
  END IF;

  RAISE NOTICE 'Migration 037_create_attendance_system completed successfully';
END $$;
