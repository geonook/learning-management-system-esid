-- SIMPLIFIED RLS POLICIES WITHOUT RECURSION
-- This replaces the complex policies with simple, non-recursive ones

-- First, drop all existing policies and functions to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Head teachers can view users in their grade/track" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

DROP POLICY IF EXISTS "Teachers can view their own classes" ON classes;
DROP POLICY IF EXISTS "Admins can view all classes" ON classes;
DROP POLICY IF EXISTS "Head teachers can view classes in their grade/track" ON classes;
DROP POLICY IF EXISTS "Admins can manage all classes" ON classes;
DROP POLICY IF EXISTS "Head teachers can manage classes in their grade/track" ON classes;

DROP POLICY IF EXISTS "Teachers can view students in their classes" ON students;
DROP POLICY IF EXISTS "Admins can view all students" ON students;
DROP POLICY IF EXISTS "Head teachers can view students in their grade/track" ON students;
DROP POLICY IF EXISTS "Admins can manage all students" ON students;
DROP POLICY IF EXISTS "Head teachers can manage students in their grade/track" ON students;

DROP POLICY IF EXISTS "Teachers can view exams for their classes" ON exams;
DROP POLICY IF EXISTS "Teachers can manage exams for their classes" ON exams;
DROP POLICY IF EXISTS "Admins can view all exams" ON exams;
DROP POLICY IF EXISTS "Admins can manage all exams" ON exams;
DROP POLICY IF EXISTS "Head teachers can view exams in their grade/track" ON exams;

DROP POLICY IF EXISTS "Teachers can view scores for their classes" ON scores;
DROP POLICY IF EXISTS "Teachers can manage scores for their classes" ON scores;
DROP POLICY IF EXISTS "Admins can view all scores" ON scores;
DROP POLICY IF EXISTS "Admins can manage all scores" ON scores;
DROP POLICY IF EXISTS "Head teachers can view scores in their grade/track" ON scores;

DROP POLICY IF EXISTS "All authenticated users can view assessment codes" ON assessment_codes;

-- Drop problematic helper functions
DROP FUNCTION IF EXISTS get_current_user_details();
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_head_teacher();
DROP FUNCTION IF EXISTS can_access_grade_track(INTEGER, track_type);
DROP FUNCTION IF EXISTS teaches_class(UUID);

-- Drop the problematic view
DROP VIEW IF EXISTS student_scores_with_grades;

-- SIMPLE POLICIES FOR ANONYMOUS ACCESS (TESTING ONLY)
-- These policies allow read access for anonymous users for testing purposes

-- USERS table - Allow anonymous read access
CREATE POLICY "Anonymous can view users" ON users
  FOR SELECT USING (true);

-- CLASSES table - Allow anonymous read access  
CREATE POLICY "Anonymous can view classes" ON classes
  FOR SELECT USING (true);

-- STUDENTS table - Allow anonymous read access
CREATE POLICY "Anonymous can view students" ON students
  FOR SELECT USING (true);

-- EXAMS table - Allow anonymous read access
CREATE POLICY "Anonymous can view exams" ON exams
  FOR SELECT USING (true);

-- SCORES table - Allow anonymous read access
CREATE POLICY "Anonymous can view scores" ON scores
  FOR SELECT USING (true);

-- ASSESSMENT_CODES table - Allow anonymous read access
CREATE POLICY "Anonymous can view assessment codes" ON assessment_codes
  FOR SELECT USING (true);

-- ASSESSMENT_TITLES table - Allow anonymous read access
CREATE POLICY "Anonymous can view assessment titles" ON assessment_titles
  FOR SELECT USING (true);

-- Note: This is for testing purposes only
-- In production, you should implement proper authentication and role-based policies