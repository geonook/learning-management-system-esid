-- =====================================================
-- 一鍵執行所有待執行的 Migrations
-- 日期：2025-10-17
-- 版本：包含 Migration 007 + 008 + RLS 003
-- 特性：Idempotent（可安全重複執行）
-- =====================================================

-- 說明：
-- 這個腳本合併了三個 migration 檔案：
-- 1. Migration 007: 用戶自主註冊 RLS 政策
-- 2. Migration 008: Courses 表建立
-- 3. RLS 003: Courses 表權限政策

-- 您可以安全地在 Supabase Dashboard 執行此腳本
-- 即使某些部分已經執行過，也不會產生錯誤

-- =====================================================
-- PART 1: Migration 007 - 用戶自主註冊 RLS 政策
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== Executing Migration 007: User Self Registration ===';
END $$;

-- 先刪除舊政策（如果存在）
DROP POLICY IF EXISTS "allow_authenticated_user_self_insert" ON public.users;

-- 建立新政策
CREATE POLICY "allow_authenticated_user_self_insert"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id  -- 安全限制：用戶只能插入自己的 UUID
);

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 007 completed: User self-registration policy created';
END $$;

-- =====================================================
-- PART 2: Migration 008 - Courses 表建立
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== Executing Migration 008: Create Courses Table ===';
END $$;

-- Create courses table (Idempotent - IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  course_type teacher_type NOT NULL,  -- LT, IT, or KCFS
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
        AND users.teacher_type = course_type
      )
    )
);

-- Create indexes (Idempotent - IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_courses_class ON courses(class_id);
CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_type ON courses(course_type);
CREATE INDEX IF NOT EXISTS idx_courses_academic_year ON courses(academic_year);

-- Add updated_at trigger (Idempotent - DROP IF EXISTS)
DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
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
  VALUES ('LT'::teacher_type), ('IT'::teacher_type), ('KCFS'::teacher_type)
) AS ct(course_type)
WHERE c.is_active = TRUE
ON CONFLICT (class_id, course_type, academic_year) DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 008 completed: courses table created with % records',
    (SELECT COUNT(*) FROM courses);
END $$;

-- =====================================================
-- PART 3: RLS 003 - Courses 表權限政策
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== Executing RLS 003: Courses Table Policies ===';
END $$;

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (Idempotent)
DROP POLICY IF EXISTS "admin_full_access_courses" ON courses;
DROP POLICY IF EXISTS "head_teacher_access_courses" ON courses;
DROP POLICY IF EXISTS "teacher_view_own_courses" ON courses;
DROP POLICY IF EXISTS "teacher_view_class_courses" ON courses;

-- Policy 1: Admin can do everything
CREATE POLICY "admin_full_access_courses"
ON courses
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
    AND users.is_active = TRUE
  )
);

-- Policy 2: Head Teachers can view/manage courses in their grade and track
CREATE POLICY "head_teacher_access_courses"
ON courses
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN classes c ON courses.class_id = c.id
    WHERE u.id = auth.uid()
    AND u.role = 'head'
    AND u.is_active = TRUE
    AND u.grade = c.grade
    AND u.track = c.track
  )
);

-- Policy 3: Teachers can view courses they are assigned to
CREATE POLICY "teacher_view_own_courses"
ON courses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'teacher'
    AND users.is_active = TRUE
    AND courses.teacher_id = users.id
  )
);

-- Policy 4: Teachers can view all courses for classes they teach (any course type)
CREATE POLICY "teacher_view_class_courses"
ON courses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN courses my_courses ON my_courses.teacher_id = u.id
    WHERE u.id = auth.uid()
    AND u.role = 'teacher'
    AND u.is_active = TRUE
    AND my_courses.class_id = courses.class_id
  )
);

-- Add comments
COMMENT ON POLICY "admin_full_access_courses" ON courses IS 'Admin can manage all courses';
COMMENT ON POLICY "head_teacher_access_courses" ON courses IS 'Head Teachers can manage courses in their grade and track';
COMMENT ON POLICY "teacher_view_own_courses" ON courses IS 'Teachers can view courses they are assigned to';
COMMENT ON POLICY "teacher_view_class_courses" ON courses IS 'Teachers can view all courses for classes they teach';

DO $$
BEGIN
  RAISE NOTICE '✅ RLS 003 completed: 4 policies created for courses table';
END $$;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

DO $$
DECLARE
  course_count INTEGER;
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '=== Final Verification ===';

  -- Check courses table
  SELECT COUNT(*) INTO course_count FROM courses;
  RAISE NOTICE 'Total courses created: %', course_count;

  -- Check RLS policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'courses';
  RAISE NOTICE 'Total RLS policies on courses table: %', policy_count;

  -- Check user self-registration policy
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'users'
  AND policyname = 'allow_authenticated_user_self_insert';
  RAISE NOTICE 'User self-registration policy: %',
    CASE WHEN policy_count > 0 THEN '✅ Active' ELSE '❌ Missing' END;

  RAISE NOTICE '=== All Migrations Completed Successfully ✅ ===';
END $$;

-- =====================================================
-- OPTIONAL: Detailed Verification Queries
-- =====================================================

-- Uncomment below to see detailed verification results

-- -- Check courses table structure
-- SELECT
--   column_name,
--   data_type,
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'courses'
-- ORDER BY ordinal_position;

-- -- Check course distribution by type
-- SELECT
--   course_type,
--   COUNT(*) as total_courses,
--   COUNT(teacher_id) as assigned_courses,
--   COUNT(*) - COUNT(teacher_id) as unassigned_courses
-- FROM courses
-- GROUP BY course_type
-- ORDER BY course_type;

-- -- Check all RLS policies
-- SELECT
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd
-- FROM pg_policies
-- WHERE tablename IN ('users', 'courses')
-- ORDER BY tablename, policyname;
