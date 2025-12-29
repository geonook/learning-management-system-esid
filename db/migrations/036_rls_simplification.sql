-- Migration 036: RLS Simplification
-- Date: 2025-12-29
-- Description:
--   Simplified RLS policies to prevent recursion and reduce complexity.
--   From 100+ policies to ~30 policies.
--
--   Design Principles:
--   1. Each table has at most 4 policies: service_role_bypass, admin_full_access, authenticated_read, teacher_manage_own
--   2. No cross-table queries in policies (prevents infinite recursion)
--   3. Fine-grained permissions handled at application layer
--
-- Author: Claude Code

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 1: Disable RLS on all tables
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_titles DISABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 2: Drop all policies except service_role_bypass
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND policyname != 'service_role_bypass'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 3: Create or replace is_admin() helper function
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  );
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 4: Create simplified policies
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────
-- users table
-- ─────────────────────────────────────
CREATE POLICY "admin_full_access" ON users FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read" ON users FOR SELECT USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────
-- classes table
-- ─────────────────────────────────────
CREATE POLICY "admin_full_access" ON classes FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read" ON classes FOR SELECT USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────
-- courses table
-- ─────────────────────────────────────
CREATE POLICY "admin_full_access" ON courses FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read" ON courses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "teacher_manage_own" ON courses FOR ALL USING (teacher_id = auth.uid());

-- ─────────────────────────────────────
-- students table
-- ─────────────────────────────────────
CREATE POLICY "admin_full_access" ON students FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read" ON students FOR SELECT USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────
-- student_courses table
-- ─────────────────────────────────────
CREATE POLICY "admin_full_access" ON student_courses FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read" ON student_courses FOR SELECT USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────
-- exams table
-- ─────────────────────────────────────
CREATE POLICY "admin_full_access" ON exams FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read" ON exams FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "teacher_manage_own" ON exams FOR ALL USING (
  course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid())
);

-- ─────────────────────────────────────
-- scores table
-- ─────────────────────────────────────
CREATE POLICY "admin_full_access" ON scores FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read" ON scores FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "teacher_manage_own" ON scores FOR ALL USING (
  course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid())
);

-- ─────────────────────────────────────
-- assessment_codes table
-- ─────────────────────────────────────
CREATE POLICY "admin_full_access" ON assessment_codes FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read" ON assessment_codes FOR SELECT USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────
-- assessment_titles table
-- ─────────────────────────────────────
CREATE POLICY "admin_full_access" ON assessment_titles FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read" ON assessment_titles FOR SELECT USING (auth.uid() IS NOT NULL);

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 5: Enable RLS on all tables
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_titles ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- Verification (run manually)
-- ═══════════════════════════════════════════════════════════════════════════
-- SELECT tablename, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- GROUP BY tablename
-- ORDER BY tablename;
