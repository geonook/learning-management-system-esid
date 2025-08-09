-- Row Level Security (RLS) Policies for LMS-ESID
-- Implements role-based access control: admin, head, teacher

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_titles ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role and details
CREATE OR REPLACE FUNCTION get_current_user_details()
RETURNS TABLE(user_id UUID, role user_role, grade INTEGER, track track_type, teacher_type teacher_type)
LANGUAGE SQL STABLE
AS $$
  SELECT id, role, grade, track, teacher_type 
  FROM users 
  WHERE id = auth.uid();
$$;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Helper function to check if user is head teacher
CREATE OR REPLACE FUNCTION is_head_teacher()
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'head'
  );
$$;

-- Helper function to check if user can access grade/track
CREATE OR REPLACE FUNCTION can_access_grade_track(target_grade INTEGER, target_track track_type)
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT 
    is_admin() OR 
    (is_head_teacher() AND EXISTS(
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
        AND grade = target_grade 
        AND track = target_track
    ));
$$;

-- Helper function to check if user teaches a class
CREATE OR REPLACE FUNCTION teaches_class(class_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM classes 
    WHERE id = class_id AND teacher_id = auth.uid()
  );
$$;

-- USERS table policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (is_admin());

CREATE POLICY "Head teachers can view users in their grade/track" ON users
  FOR SELECT USING (
    is_head_teacher() AND 
    can_access_grade_track(grade, track)
  );

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage all users" ON users
  FOR ALL USING (is_admin());

-- CLASSES table policies  
CREATE POLICY "Teachers can view their own classes" ON classes
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "Admins can view all classes" ON classes
  FOR SELECT USING (is_admin());

CREATE POLICY "Head teachers can view classes in their grade/track" ON classes
  FOR SELECT USING (can_access_grade_track(grade, track));

CREATE POLICY "Admins can manage all classes" ON classes
  FOR ALL USING (is_admin());

CREATE POLICY "Head teachers can manage classes in their grade/track" ON classes
  FOR ALL USING (can_access_grade_track(grade, track));

-- STUDENTS table policies
CREATE POLICY "Teachers can view students in their classes" ON students
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM classes 
      WHERE id = students.class_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all students" ON students
  FOR SELECT USING (is_admin());

CREATE POLICY "Head teachers can view students in their grade/track" ON students
  FOR SELECT USING (can_access_grade_track(grade, track));

CREATE POLICY "Admins can manage all students" ON students
  FOR ALL USING (is_admin());

CREATE POLICY "Head teachers can manage students in their grade/track" ON students
  FOR ALL USING (can_access_grade_track(grade, track));

-- EXAMS table policies
CREATE POLICY "Teachers can view exams for their classes" ON exams
  FOR SELECT USING (teaches_class(class_id));

CREATE POLICY "Teachers can manage exams for their classes" ON exams
  FOR ALL USING (teaches_class(class_id));

CREATE POLICY "Admins can view all exams" ON exams
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can manage all exams" ON exams
  FOR ALL USING (is_admin());

CREATE POLICY "Head teachers can view exams in their grade/track" ON exams
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM classes 
      WHERE id = exams.class_id 
        AND can_access_grade_track(grade, track)
    )
  );

-- SCORES table policies
CREATE POLICY "Teachers can view scores for their classes" ON scores
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM exams e
      JOIN classes c ON e.class_id = c.id
      WHERE e.id = scores.exam_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage scores for their classes" ON scores
  FOR ALL USING (
    EXISTS(
      SELECT 1 FROM exams e
      JOIN classes c ON e.class_id = c.id
      WHERE e.id = scores.exam_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all scores" ON scores
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can manage all scores" ON scores
  FOR ALL USING (is_admin());

CREATE POLICY "Head teachers can view scores in their grade/track" ON scores
  FOR SELECT USING (
    EXISTS(
      SELECT 1 FROM exams e
      JOIN classes c ON e.class_id = c.id
      WHERE e.id = scores.exam_id 
        AND can_access_grade_track(c.grade, c.track)
    )
  );

-- ASSESSMENT_TITLES table policies (HT display name overrides)
CREATE POLICY "Teachers can view assessment titles for their classes" ON assessment_titles
  FOR SELECT USING (
    (context = 'default') OR
    (context = 'class' AND teaches_class(class_id)) OR
    (context = 'grade_track' AND EXISTS(
      SELECT 1 FROM classes 
      WHERE teacher_id = auth.uid() 
        AND classes.grade = assessment_titles.grade 
        AND classes.track = assessment_titles.track
    ))
  );

CREATE POLICY "Admins can manage all assessment titles" ON assessment_titles
  FOR ALL USING (is_admin());

CREATE POLICY "Head teachers can manage assessment titles in their grade/track" ON assessment_titles
  FOR ALL USING (
    (context = 'default' AND is_head_teacher()) OR
    (context = 'grade_track' AND can_access_grade_track(grade, track)) OR
    (context = 'class' AND EXISTS(
      SELECT 1 FROM classes 
      WHERE id = assessment_titles.class_id 
        AND can_access_grade_track(classes.grade, classes.track)
    ))
  );

-- ASSESSMENT_CODES table (read-only for all authenticated users)
ALTER TABLE assessment_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can view assessment codes" ON assessment_codes
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create views for common queries with RLS built-in
CREATE VIEW student_scores_with_grades AS
SELECT 
  s.id as student_id,
  s.full_name as student_name,
  s.student_id as student_number,
  c.name as class_name,
  c.grade,
  c.track,
  e.id as exam_id,
  e.name as exam_name,
  sc.assessment_code,
  sc.score,
  sc.entered_at
FROM students s
JOIN classes c ON s.class_id = c.id
JOIN exams e ON e.class_id = c.id
LEFT JOIN scores sc ON sc.student_id = s.id AND sc.exam_id = e.id
WHERE s.is_active = true AND c.is_active = true;

-- Enable RLS on the view
ALTER VIEW student_scores_with_grades SET (security_invoker = on);