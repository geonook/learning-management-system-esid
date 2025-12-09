-- Migration 029: Create course_tasks table (Kanban)
-- Purpose: Course-level task board (LT/IT/KCFS teachers see only their own)
-- Created: 2025-12-09

-- ============================================================================
-- STEP 1: Create course_tasks table
-- ============================================================================

CREATE TABLE IF NOT EXISTS course_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  due_date DATE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_course_tasks_course_id ON course_tasks(course_id);
CREATE INDEX IF NOT EXISTS idx_course_tasks_teacher_id ON course_tasks(teacher_id);
CREATE INDEX IF NOT EXISTS idx_course_tasks_status ON course_tasks(status);
CREATE INDEX IF NOT EXISTS idx_course_tasks_position ON course_tasks(course_id, status, position);

-- ============================================================================
-- STEP 3: Enable RLS
-- ============================================================================

ALTER TABLE course_tasks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Create RLS Policies
-- ============================================================================

-- Service role bypass (for admin operations)
CREATE POLICY "service_role_bypass" ON course_tasks
FOR ALL TO service_role USING (true);

-- Teachers can read tasks for courses they teach
CREATE POLICY "teachers_read_own_course_tasks" ON course_tasks
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_tasks.course_id
    AND courses.teacher_id = (SELECT auth.uid())
  )
);

-- Admin/Office can read all tasks
CREATE POLICY "admin_office_read_all_tasks" ON course_tasks
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (SELECT auth.uid())
    AND users.role IN ('admin', 'office_member')
  )
);

-- Teachers can create/update/delete their own tasks
CREATE POLICY "teachers_manage_own_tasks" ON course_tasks
FOR ALL TO authenticated
USING ((SELECT auth.uid()) = teacher_id)
WITH CHECK ((SELECT auth.uid()) = teacher_id);

-- ============================================================================
-- STEP 5: Create updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_course_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_course_tasks_updated_at ON course_tasks;
CREATE TRIGGER trigger_update_course_tasks_updated_at
  BEFORE UPDATE ON course_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_course_tasks_updated_at();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  -- Check table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_tasks') THEN
    RAISE EXCEPTION '❌ course_tasks table was not created';
  END IF;

  -- Check RLS is enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'course_tasks'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION '❌ RLS is not enabled on course_tasks';
  END IF;

  RAISE NOTICE '✅ Migration 029 completed successfully';
  RAISE NOTICE '✅ course_tasks table created with RLS policies';
END $$;
