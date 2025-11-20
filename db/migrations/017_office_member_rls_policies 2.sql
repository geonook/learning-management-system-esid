/**
 * Migration 017: RLS Policies for office_member Role
 *
 * Purpose: Grant read-only access to office_member for all grades and course types
 * Date: 2025-11-17
 *
 * Permissions:
 * - office_member: SELECT on all tables (read-only)
 * - office_member: NO INSERT/UPDATE/DELETE (enforced by absence of policies)
 *
 * Scope:
 * - All grades (G1-G6)
 * - All course types (LT/IT/KCFS)
 * - All campuses
 */

-- ============================================================================
-- USERS TABLE: Read-only access
-- ============================================================================

CREATE POLICY "office_member_read_users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- office_member can view all users
    (SELECT auth.uid()) IN (
      SELECT id FROM users WHERE role = 'office_member'
    )
  );

-- ============================================================================
-- CLASSES TABLE: Read-only access to all classes
-- ============================================================================

CREATE POLICY "office_member_read_classes"
  ON classes
  FOR SELECT
  TO authenticated
  USING (
    -- office_member can view all classes (all grades, all levels)
    (SELECT auth.uid()) IN (
      SELECT id FROM users WHERE role = 'office_member'
    )
  );

-- ============================================================================
-- COURSES TABLE: Read-only access to all courses
-- ============================================================================

CREATE POLICY "office_member_read_courses"
  ON courses
  FOR SELECT
  TO authenticated
  USING (
    -- office_member can view all courses (all course types)
    (SELECT auth.uid()) IN (
      SELECT id FROM users WHERE role = 'office_member'
    )
  );

-- ============================================================================
-- STUDENTS TABLE: Read-only access to all students
-- ============================================================================

CREATE POLICY "office_member_read_students"
  ON students
  FOR SELECT
  TO authenticated
  USING (
    -- office_member can view all students
    (SELECT auth.uid()) IN (
      SELECT id FROM users WHERE role = 'office_member'
    )
  );

-- ============================================================================
-- STUDENT_COURSES TABLE: Read-only access to all student-course relationships
-- ============================================================================

CREATE POLICY "office_member_read_student_courses"
  ON student_courses
  FOR SELECT
  TO authenticated
  USING (
    -- office_member can view all student-course relationships
    (SELECT auth.uid()) IN (
      SELECT id FROM users WHERE role = 'office_member'
    )
  );

-- ============================================================================
-- EXAMS TABLE: Read-only access to all exams
-- ============================================================================

CREATE POLICY "office_member_read_exams"
  ON exams
  FOR SELECT
  TO authenticated
  USING (
    -- office_member can view all exams
    (SELECT auth.uid()) IN (
      SELECT id FROM users WHERE role = 'office_member'
    )
  );

-- ============================================================================
-- SCORES TABLE: Read-only access to all scores
-- ============================================================================

CREATE POLICY "office_member_read_scores"
  ON scores
  FOR SELECT
  TO authenticated
  USING (
    -- office_member can view all scores
    (SELECT auth.uid()) IN (
      SELECT id FROM users WHERE role = 'office_member'
    )
  );

-- ============================================================================
-- ASSESSMENT_TITLES TABLE: Read-only access
-- ============================================================================

CREATE POLICY "office_member_read_assessment_titles"
  ON assessment_titles
  FOR SELECT
  TO authenticated
  USING (
    -- office_member can view all assessment titles
    (SELECT auth.uid()) IN (
      SELECT id FROM users WHERE role = 'office_member'
    )
  );

-- ============================================================================
-- ASSESSMENT_CODES TABLE: Read-only access
-- ============================================================================

CREATE POLICY "office_member_read_assessment_codes"
  ON assessment_codes
  FOR SELECT
  TO authenticated
  USING (
    -- office_member can view all assessment codes
    (SELECT auth.uid()) IN (
      SELECT id FROM users WHERE role = 'office_member'
    )
  );

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- List all policies for office_member
/*
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE policyname LIKE '%office_member%'
ORDER BY tablename, policyname;
*/

-- Count policies per table
/*
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE policyname LIKE '%office_member%'
GROUP BY tablename
ORDER BY tablename;
*/

-- ============================================================================
-- Rollback Instructions
-- ============================================================================

/*
-- Drop all office_member policies
DROP POLICY IF EXISTS "office_member_read_users" ON users;
DROP POLICY IF EXISTS "office_member_read_classes" ON classes;
DROP POLICY IF EXISTS "office_member_read_courses" ON courses;
DROP POLICY IF EXISTS "office_member_read_students" ON students;
DROP POLICY IF EXISTS "office_member_read_student_courses" ON student_courses;
DROP POLICY IF EXISTS "office_member_read_exams" ON exams;
DROP POLICY IF EXISTS "office_member_read_scores" ON scores;
DROP POLICY IF EXISTS "office_member_read_assessment_titles" ON assessment_titles;
DROP POLICY IF EXISTS "office_member_read_assessment_codes" ON assessment_codes;
*/

-- ============================================================================
-- Expected Result
-- ============================================================================

/*
office_member users should be able to:
✅ SELECT from all tables (users, classes, courses, students, student_courses, exams, scores, assessment_titles, assessment_codes)
✅ View all grades (G1-G6)
✅ View all course types (LT/IT/KCFS)
✅ View all campuses

office_member users should NOT be able to:
❌ INSERT into any table (no INSERT policies)
❌ UPDATE any table (no UPDATE policies)
❌ DELETE from any table (no DELETE policies)

Testing:
1. Login as office_member user
2. Try to SELECT from each table (should succeed)
3. Try to INSERT/UPDATE/DELETE (should fail with 403 Forbidden)
*/
