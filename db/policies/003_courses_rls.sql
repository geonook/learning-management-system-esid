-- RLS Policies for courses table (Idempotent - 可安全重複執行)
-- Purpose: Control access to course assignments based on user roles

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
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

-- Policy 2: Head Teachers can view/manage courses in their grade and course_type
-- Note: HT manages specific grade + course_type (e.g., G4 LT Head Teacher)
-- users.track stores the HT's course_type responsibility (LT/IT/KCFS)
-- courses.course_type stores the actual course type
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
    AND u.grade = c.grade  -- Grade matching
    AND u.track::text = courses.course_type::text  -- Course type matching
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
COMMENT ON POLICY "head_teacher_access_courses" ON courses IS 'Head Teachers can manage courses in their grade and course_type';
COMMENT ON POLICY "teacher_view_own_courses" ON courses IS 'Teachers can view courses they are assigned to';
COMMENT ON POLICY "teacher_view_class_courses" ON courses IS 'Teachers can view all courses for classes they teach';

-- =====================================================
-- Additional RLS Policies for Classes Table
-- =====================================================

-- Enable RLS on classes table (if not already enabled)
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Drop existing Head Teacher policy on classes if exists
DROP POLICY IF EXISTS "head_teacher_view_classes" ON classes;

-- Policy: Head Teachers can view all classes in their grade
-- Note: HT can see all classes in their grade, but only manage specific course_type via courses table
CREATE POLICY "head_teacher_view_classes"
ON classes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'head'
    AND users.is_active = TRUE
    AND users.grade = classes.grade
  )
);

COMMENT ON POLICY "head_teacher_view_classes" ON classes IS 'Head Teachers can view all classes in their grade';
