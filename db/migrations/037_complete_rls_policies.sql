-- Migration 037: Complete RLS Policies for All Tables
-- Date: 2025-12-29
-- Description:
--   Add RLS policies to 12 tables that were missed in Migration 036.
--   These tables had RLS enabled but no policies, causing all queries to return empty results.
--
--   Affected tables:
--   - map_assessments, map_goal_scores (MAP data)
--   - attendance, behavior_tags, student_behaviors (Attendance & Behavior)
--   - communications (Communication)
--   - gradebook_expectations, academic_periods, kcfs_categories (Gradebook & Academic)
--   - timetable_entries, timetable_periods (Timetable)
--   - course_tasks, admin_audit_logs (Task & Audit)
--
-- Author: Claude Code

-- ═══════════════════════════════════════════════════════════════════════════
-- MAP Tables
-- ═══════════════════════════════════════════════════════════════════════════

-- map_assessments
CREATE POLICY "admin_full_access" ON map_assessments FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read" ON map_assessments FOR SELECT USING (auth.uid() IS NOT NULL);

-- map_goal_scores
CREATE POLICY "admin_full_access" ON map_goal_scores FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read" ON map_goal_scores FOR SELECT USING (auth.uid() IS NOT NULL);

-- ═══════════════════════════════════════════════════════════════════════════
-- Attendance & Behavior Tables
-- ═══════════════════════════════════════════════════════════════════════════

-- attendance
CREATE POLICY "admin_full_access" ON attendance FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read" ON attendance FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "teacher_manage_own" ON attendance FOR ALL USING (
  course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid())
);

-- behavior_tags
CREATE POLICY "admin_full_access" ON behavior_tags FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read" ON behavior_tags FOR SELECT USING (auth.uid() IS NOT NULL);

-- student_behaviors
CREATE POLICY "admin_full_access" ON student_behaviors FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read" ON student_behaviors FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "teacher_manage_own" ON student_behaviors FOR ALL USING (recorded_by = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- Communication Tables
-- ═══════════════════════════════════════════════════════════════════════════

-- communications
CREATE POLICY "admin_full_access" ON communications FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read" ON communications FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "teacher_manage_own" ON communications FOR ALL USING (teacher_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- Gradebook & Academic Tables
-- ═══════════════════════════════════════════════════════════════════════════

-- gradebook_expectations
CREATE POLICY "admin_full_access" ON gradebook_expectations FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read" ON gradebook_expectations FOR SELECT USING (auth.uid() IS NOT NULL);

-- academic_periods
CREATE POLICY "admin_full_access" ON academic_periods FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read" ON academic_periods FOR SELECT USING (auth.uid() IS NOT NULL);

-- kcfs_categories
CREATE POLICY "admin_full_access" ON kcfs_categories FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read" ON kcfs_categories FOR SELECT USING (auth.uid() IS NOT NULL);

-- ═══════════════════════════════════════════════════════════════════════════
-- Timetable Tables
-- ═══════════════════════════════════════════════════════════════════════════

-- timetable_entries
CREATE POLICY "admin_full_access" ON timetable_entries FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read" ON timetable_entries FOR SELECT USING (auth.uid() IS NOT NULL);

-- timetable_periods
CREATE POLICY "admin_full_access" ON timetable_periods FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read" ON timetable_periods FOR SELECT USING (auth.uid() IS NOT NULL);

-- ═══════════════════════════════════════════════════════════════════════════
-- Task & Audit Tables
-- ═══════════════════════════════════════════════════════════════════════════

-- course_tasks (replace incomplete policy)
DROP POLICY IF EXISTS "Users can manage tasks for their courses" ON course_tasks;
CREATE POLICY "admin_full_access" ON course_tasks FOR ALL USING (is_admin());
CREATE POLICY "authenticated_read" ON course_tasks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "teacher_manage_own" ON course_tasks FOR ALL USING (
  course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid())
);

-- admin_audit_logs (Admin only)
CREATE POLICY "admin_only" ON admin_audit_logs FOR ALL USING (is_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- Verification (run manually)
-- ═══════════════════════════════════════════════════════════════════════════
-- SELECT c.relname as table_name, COUNT(p.policyname) as policy_count
-- FROM pg_class c
-- LEFT JOIN pg_policies p ON c.relname = p.tablename
-- WHERE c.relnamespace = 'public'::regnamespace
--   AND c.relkind = 'r'
--   AND c.relrowsecurity = true
-- GROUP BY c.relname
-- HAVING COUNT(p.policyname) = 0;
-- Should return 0 rows
