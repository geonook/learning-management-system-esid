-- Migration: 036_create_timetable_system.sql
-- Description: Create teacher timetable system for schedule display
-- Date: 2024-12-22

-- ============================================================================
-- 1. Add teacher_name column to users table (for timetable join)
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_name TEXT;

-- Create index for teacher_name lookups
CREATE INDEX IF NOT EXISTS idx_users_teacher_name ON users(teacher_name);

-- ============================================================================
-- 2. Create timetable_periods table (period definitions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS timetable_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_number INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(period_number)
);

-- Seed period data
INSERT INTO timetable_periods (period_number, start_time, end_time) VALUES
  (1, '08:25', '09:05'),
  (2, '09:10', '09:50'),
  (3, '10:20', '11:00'),
  (4, '11:05', '11:45'),
  (5, '12:55', '13:35'),
  (6, '13:40', '14:20'),
  (7, '14:25', '15:05'),
  (8, '15:10', '15:50')
ON CONFLICT (period_number) DO NOTHING;

-- ============================================================================
-- 3. Create timetable_entries table (schedule entries)
-- ============================================================================

CREATE TABLE IF NOT EXISTS timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Teacher reference
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  teacher_name TEXT NOT NULL,

  -- Time slot
  day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  period INTEGER NOT NULL CHECK (period BETWEEN 1 AND 8),

  -- Class info
  class_name TEXT NOT NULL,
  course_type TEXT NOT NULL CHECK (course_type IN ('english', 'homeroom', 'ev')),
  course_name TEXT,
  classroom TEXT,

  -- LMS course link (optional)
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,

  -- Academic year
  academic_year TEXT NOT NULL DEFAULT '2024-2025',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(teacher_name, day, period, academic_year)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_timetable_teacher_id ON timetable_entries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_timetable_teacher_name ON timetable_entries(teacher_name);
CREATE INDEX IF NOT EXISTS idx_timetable_day_period ON timetable_entries(day, period);
CREATE INDEX IF NOT EXISTS idx_timetable_academic_year ON timetable_entries(academic_year);
CREATE INDEX IF NOT EXISTS idx_timetable_class_name ON timetable_entries(class_name);
CREATE INDEX IF NOT EXISTS idx_timetable_course_id ON timetable_entries(course_id);

-- ============================================================================
-- 4. Enable RLS
-- ============================================================================

ALTER TABLE timetable_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. RLS Policies for timetable_periods (read-only for all authenticated)
-- ============================================================================

-- Service role bypass
CREATE POLICY "service_role_bypass_timetable_periods"
ON timetable_periods FOR ALL TO service_role
USING (true);

-- All authenticated users can read periods
CREATE POLICY "authenticated_read_timetable_periods"
ON timetable_periods FOR SELECT TO authenticated
USING (true);

-- ============================================================================
-- 6. RLS Policies for timetable_entries
-- ============================================================================

-- Service role bypass
CREATE POLICY "service_role_bypass_timetable_entries"
ON timetable_entries FOR ALL TO service_role
USING (true);

-- Admin: full access
CREATE POLICY "admin_full_access_timetable_entries"
ON timetable_entries FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid())
    AND users.role = 'admin'
  )
);

-- Teachers: can view their own schedule
CREATE POLICY "teachers_read_own_timetable"
ON timetable_entries FOR SELECT TO authenticated
USING (
  teacher_id = (SELECT auth.uid())
  OR teacher_name = (
    SELECT teacher_name FROM users WHERE id = (SELECT auth.uid())
  )
);

-- Head teachers: can view all schedules in their grade band
CREATE POLICY "head_read_grade_band_timetable"
ON timetable_entries FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (SELECT auth.uid())
    AND u.role = 'head'
  )
);

-- Office members: read-only access to all
CREATE POLICY "office_read_all_timetable"
ON timetable_entries FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid())
    AND users.role = 'office_member'
  )
);

-- ============================================================================
-- 7. Updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_timetable_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_timetable_entries_updated_at ON timetable_entries;
CREATE TRIGGER trigger_update_timetable_entries_updated_at
  BEFORE UPDATE ON timetable_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_timetable_entries_updated_at();

-- ============================================================================
-- 8. Verification
-- ============================================================================

DO $$
BEGIN
  -- Verify tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'timetable_periods') THEN
    RAISE EXCEPTION 'timetable_periods table was not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'timetable_entries') THEN
    RAISE EXCEPTION 'timetable_entries table was not created';
  END IF;

  -- Verify period seed data
  IF (SELECT COUNT(*) FROM timetable_periods) < 8 THEN
    RAISE EXCEPTION 'timetable_periods seed data incomplete';
  END IF;

  -- Verify teacher_name column in users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'teacher_name'
  ) THEN
    RAISE EXCEPTION 'teacher_name column not added to users table';
  END IF;

  RAISE NOTICE 'Migration 036_create_timetable_system completed successfully';
END $$;
