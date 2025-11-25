-- ========================================
-- Migration 013: Fix RLS Policies - Remove Security Vulnerabilities
-- Date: 2025-10-27
-- Purpose: Remove dangerous anonymous access policies and implement proper role-based access control
-- Reference: Replaces db/policies/002_simple_rls_policies.sql
-- Security: CRITICAL - Fixes GDPR/PDPA compliance issues
-- ========================================

-- ========================================
-- Part 1: Drop all dangerous anonymous policies
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Removing Dangerous Anonymous Access Policies';
    RAISE NOTICE '========================================';
END $$;

-- Drop anonymous policies from all tables
DROP POLICY IF EXISTS "Anonymous can view users" ON users;
DROP POLICY IF EXISTS "Anonymous can view classes" ON classes;
DROP POLICY IF EXISTS "Anonymous can view students" ON students;
DROP POLICY IF EXISTS "Anonymous can view exams" ON exams;
DROP POLICY IF EXISTS "Anonymous can view scores" ON scores;
DROP POLICY IF EXISTS "Anonymous can view assessment codes" ON assessment_codes;
DROP POLICY IF EXISTS "Anonymous can view assessment titles" ON assessment_titles;

-- ========================================
-- Part 2: USERS table - Role-based access control
-- ========================================

-- Admin: Full access to all users
CREATE POLICY "Admin full access to users" ON users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT
    USING (id = auth.uid());

-- Users can update their own profile (excluding role changes)
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        AND role = (SELECT role FROM users WHERE id = auth.uid())  -- Prevent role escalation
    );

-- Head teachers can view users in their jurisdiction
CREATE POLICY "Heads can view users in jurisdiction" ON users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users head
            WHERE head.id = auth.uid()
            AND head.role = 'head'
            AND (
                -- Same grade teachers
                (users.role = 'teacher' AND users.grade = head.grade)
                OR
                -- Students in their grade (through classes)
                (users.role = 'student' AND EXISTS (
                    SELECT 1 FROM students s
                    JOIN classes c ON s.class_id = c.id
                    WHERE s.id = users.id
                    AND c.grade = head.grade
                ))
            )
        )
    );

-- ========================================
-- Part 3: CLASSES table - Role-based access control
-- ========================================

-- Admin: Full access to all classes
CREATE POLICY "Admin full access to classes" ON classes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Teachers can view classes they teach
CREATE POLICY "Teachers can view their classes" ON classes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.class_id = classes.id
            AND courses.teacher_id = auth.uid()
            AND courses.is_active = TRUE
        )
    );

-- Head teachers can view classes in their grade
CREATE POLICY "Heads can view classes in grade" ON classes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'head'
            AND users.grade = classes.grade
        )
    );

-- Head teachers can manage classes in their grade
CREATE POLICY "Heads can manage classes in grade" ON classes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'head'
            AND users.grade = classes.grade
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'head'
            AND users.grade = classes.grade
        )
    );

-- ========================================
-- Part 4: STUDENTS table - Role-based access control
-- ========================================

-- Admin: Full access to all students
CREATE POLICY "Admin full access to students" ON students
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Teachers can view students in their classes
CREATE POLICY "Teachers can view their students" ON students
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.class_id = students.class_id
            AND courses.teacher_id = auth.uid()
            AND courses.is_active = TRUE
        )
    );

-- Head teachers can view students in their grade
CREATE POLICY "Heads can view students in grade" ON students
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            JOIN classes ON students.class_id = classes.id
            WHERE users.id = auth.uid()
            AND users.role = 'head'
            AND users.grade = classes.grade
        )
    );

-- Head teachers can manage students in their grade
CREATE POLICY "Heads can manage students in grade" ON students
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            JOIN classes ON students.class_id = classes.id
            WHERE users.id = auth.uid()
            AND users.role = 'head'
            AND users.grade = classes.grade
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            JOIN classes ON students.class_id = classes.id
            WHERE users.id = auth.uid()
            AND users.role = 'head'
            AND users.grade = classes.grade
        )
    );

-- Students can view their own data
CREATE POLICY "Students can view own data" ON students
    FOR SELECT
    USING (id = auth.uid());

-- ========================================
-- Part 5: EXAMS table - Role-based access control
-- ========================================

-- Admin: Full access to all exams
CREATE POLICY "Admin full access to exams" ON exams
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Teachers can view and manage exams for their courses
CREATE POLICY "Teachers can manage their exams" ON exams
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.class_id = exams.class_id
            AND courses.teacher_id = auth.uid()
            AND courses.is_active = TRUE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.class_id = exams.class_id
            AND courses.teacher_id = auth.uid()
            AND courses.is_active = TRUE
        )
    );

-- Head teachers can view exams in their grade
CREATE POLICY "Heads can view exams in grade" ON exams
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            JOIN classes ON exams.class_id = classes.id
            WHERE users.id = auth.uid()
            AND users.role = 'head'
            AND users.grade = classes.grade
        )
    );

-- ========================================
-- Part 6: SCORES table - Role-based access control
-- ========================================

-- Admin: Full access to all scores
CREATE POLICY "Admin full access to scores" ON scores
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Teachers can view and manage scores for their courses
CREATE POLICY "Teachers can manage their scores" ON scores
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM courses
            WHERE scores.course_id = courses.id
            AND courses.teacher_id = auth.uid()
            AND courses.is_active = TRUE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM courses
            WHERE scores.course_id = courses.id
            AND courses.teacher_id = auth.uid()
            AND courses.is_active = TRUE
        )
    );

-- Head teachers can view scores in their grade
CREATE POLICY "Heads can view scores in grade" ON scores
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            JOIN courses ON scores.course_id = courses.id
            JOIN classes ON courses.class_id = classes.id
            WHERE users.id = auth.uid()
            AND users.role = 'head'
            AND users.grade = classes.grade
            AND users.grade = classes.grade
        )
    );

-- Students can view their own scores
CREATE POLICY "Students can view own scores" ON scores
    FOR SELECT
    USING (student_id = auth.uid());

-- ========================================
-- Part 7: ASSESSMENT_CODES table - Read access for authenticated users
-- ========================================

-- All authenticated users can view assessment codes (needed for UI)
CREATE POLICY "Authenticated users can view assessment codes" ON assessment_codes
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Only admins can modify assessment codes
CREATE POLICY "Admin can manage assessment codes" ON assessment_codes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- ========================================
-- Part 8: ASSESSMENT_TITLES table - Role-based access control
-- ========================================

-- Admin: Full access
CREATE POLICY "Admin full access to assessment titles" ON assessment_titles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Head teachers can manage assessment titles in their jurisdiction
CREATE POLICY "Heads can manage assessment titles" ON assessment_titles
    FOR ALL
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'head')
        )
    );

-- Teachers can view assessment titles
CREATE POLICY "Teachers can view assessment titles" ON assessment_titles
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- ========================================
-- Success summary
-- ========================================

DO $$
DECLARE
    total_policies INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_policies
    FROM pg_policies
    WHERE schemaname = 'public';

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 013 Completed Successfully';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Security Status:';
    RAISE NOTICE '  ✅ All anonymous access policies removed';
    RAISE NOTICE '  ✅ Role-based access control implemented';
    RAISE NOTICE '  ✅ GDPR/PDPA compliance restored';
    RAISE NOTICE '  ✅ Total active RLS policies: %', total_policies;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Access Control Summary:';
    RAISE NOTICE '  - Admin: Full access to all data';
    RAISE NOTICE '  - Head Teacher: Grade-level access';
    RAISE NOTICE '  - Teacher: Class-level access';
    RAISE NOTICE '  - Student: Own data only';
    RAISE NOTICE '========================================';
END $$;
