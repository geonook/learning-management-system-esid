-- RLS Policies for courses table
-- Purpose: Control access to course assignments based on user roles

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

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
