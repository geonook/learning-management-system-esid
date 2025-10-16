-- ========================================
-- LMS-ESID Complete Database Deployment Script
-- ========================================
-- Purpose: Deploy complete database schema to Supabase Cloud
-- Version: 1.0
-- Date: 2025-10-16
-- Instructions: Copy and paste this ENTIRE file into Supabase SQL Editor and execute
-- ========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- STEP 1: CUSTOM TYPES (Clean Definitions)
-- ========================================

-- User roles for primary school environment
DO $$
BEGIN
    DROP TYPE IF EXISTS user_role CASCADE;
    CREATE TYPE user_role AS ENUM ('admin', 'head', 'teacher', 'student');
END$$;

-- Teacher specialization types for English courses
DO $$
BEGIN
    DROP TYPE IF EXISTS teacher_type CASCADE;
    CREATE TYPE teacher_type AS ENUM ('LT', 'IT', 'KCFS');
END$$;

-- Course types matching teacher specializations
DO $$
BEGIN
    DROP TYPE IF EXISTS course_type CASCADE;
    CREATE TYPE course_type AS ENUM ('LT', 'IT', 'KCFS');
END$$;

-- Track types for local vs international programs
DO $$
BEGIN
    DROP TYPE IF EXISTS track_type CASCADE;
    CREATE TYPE track_type AS ENUM ('local', 'international');
END$$;

-- English proficiency levels (independent of grade)
DO $$
BEGIN
    DROP TYPE IF EXISTS level_type CASCADE;
    CREATE TYPE level_type AS ENUM ('E1', 'E2', 'E3');
END$$;

-- Assessment code types for consistent grading
DO $$
BEGIN
    DROP TYPE IF EXISTS assessment_code CASCADE;
    CREATE TYPE assessment_code AS ENUM (
        'FA1', 'FA2', 'FA3', 'FA4', 'FA5', 'FA6', 'FA7', 'FA8',
        'SA1', 'SA2', 'SA3', 'SA4',
        'FINAL'
    );
END$$;

-- ========================================
-- STEP 2: CORE TABLES
-- ========================================

-- Users table (extends Supabase auth.users for primary school)
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'teacher',
    teacher_type teacher_type, -- NULL for non-teachers
    grade INTEGER CHECK (grade BETWEEN 1 AND 6), -- NULL for users not tied to specific grade
    track track_type, -- NULL for admin/non-grade-specific users
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Business rules
    CONSTRAINT users_teacher_type_consistency
        CHECK ((role = 'teacher' AND teacher_type IS NOT NULL) OR
               (role != 'teacher' AND teacher_type IS NULL)),
    CONSTRAINT users_head_grade_required
        CHECK ((role = 'head' AND grade IS NOT NULL AND track IS NOT NULL) OR
               (role != 'head'))
);

-- Classes table for primary school (G1-G6)
DROP TABLE IF EXISTS classes CASCADE;
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 6),
    level level_type, -- English level assignment (can be NULL)
    track track_type NOT NULL,
    academic_year TEXT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD((EXTRACT(YEAR FROM NOW()) + 1)::TEXT, 2, '0'),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Business rules and constraints
    UNIQUE(name, academic_year)
);

-- Courses table (independent English courses for each class)
DROP TABLE IF EXISTS courses CASCADE;
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    course_type course_type NOT NULL,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    academic_year TEXT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD((EXTRACT(YEAR FROM NOW()) + 1)::TEXT, 2, '0'),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Business rules
    UNIQUE(class_id, course_type, academic_year)
);

-- Students table for primary school
DROP TABLE IF EXISTS students CASCADE;
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id TEXT UNIQUE NOT NULL, -- External student identifier
    full_name TEXT NOT NULL,
    grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 6),
    level level_type, -- English proficiency level (can be NULL)
    track track_type NOT NULL,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student Courses junction table
DROP TABLE IF EXISTS student_courses CASCADE;
CREATE TABLE student_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,

    UNIQUE(student_id, course_id)
);

-- Exams table (assessment occasions)
DROP TABLE IF EXISTS exams CASCADE;
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    exam_date DATE,
    created_by UUID NOT NULL REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(course_id, name)
);

-- Assessment Codes lookup table
DROP TABLE IF EXISTS assessment_codes CASCADE;
CREATE TABLE assessment_codes (
    code assessment_code PRIMARY KEY,
    display_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('formative', 'summative', 'final')),
    weight DECIMAL(5,4) NOT NULL CHECK (weight >= 0 AND weight <= 1),
    sort_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Scores table (individual assessment scores)
DROP TABLE IF EXISTS scores CASCADE;
CREATE TABLE scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    assessment_code assessment_code NOT NULL REFERENCES assessment_codes(code),
    score DECIMAL(5,2) CHECK (score >= 0 AND score <= 100),
    entered_by UUID NOT NULL REFERENCES users(id),
    entered_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(student_id, exam_id, assessment_code)
);

-- Assessment Titles table (customizable display names)
DROP TABLE IF EXISTS assessment_titles CASCADE;
CREATE TABLE assessment_titles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    grade INTEGER CHECK (grade BETWEEN 1 AND 6),
    track track_type,
    assessment_code assessment_code NOT NULL,
    display_title TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(class_id, grade, track, assessment_code)
);

-- ========================================
-- STEP 3: INDEXES FOR PERFORMANCE
-- ========================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_teacher_type ON users(teacher_type);
CREATE INDEX IF NOT EXISTS idx_users_grade_track ON users(grade, track);

-- Classes indexes
CREATE INDEX IF NOT EXISTS idx_classes_grade ON classes(grade);
CREATE INDEX IF NOT EXISTS idx_classes_track ON classes(track);
CREATE INDEX IF NOT EXISTS idx_classes_academic_year ON classes(academic_year);

-- Courses indexes
CREATE INDEX IF NOT EXISTS idx_courses_class_id ON courses(class_id);
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_type ON courses(course_type);

-- Students indexes
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);

-- Student Courses indexes
CREATE INDEX IF NOT EXISTS idx_student_courses_student_id ON student_courses(student_id);
CREATE INDEX IF NOT EXISTS idx_student_courses_course_id ON student_courses(course_id);

-- Exams indexes
CREATE INDEX IF NOT EXISTS idx_exams_course_id ON exams(course_id);
CREATE INDEX IF NOT EXISTS idx_exams_exam_date ON exams(exam_date);
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON exams(created_by);

-- Scores indexes (critical for analytics performance)
CREATE INDEX IF NOT EXISTS idx_scores_student_id ON scores(student_id);
CREATE INDEX IF NOT EXISTS idx_scores_exam_id ON scores(exam_id);
CREATE INDEX IF NOT EXISTS idx_scores_assessment_code ON scores(assessment_code);
CREATE INDEX IF NOT EXISTS idx_scores_composite ON scores(student_id, exam_id, assessment_code);

-- ========================================
-- STEP 4: ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_titles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS policy_admin_all ON ' || r.tablename;
        EXECUTE 'DROP POLICY IF EXISTS policy_head_read ON ' || r.tablename;
        EXECUTE 'DROP POLICY IF EXISTS policy_head_write ON ' || r.tablename;
        EXECUTE 'DROP POLICY IF EXISTS policy_teacher_read ON ' || r.tablename;
        EXECUTE 'DROP POLICY IF EXISTS policy_teacher_write ON ' || r.tablename;
        EXECUTE 'DROP POLICY IF EXISTS policy_student_read ON ' || r.tablename;
    END LOOP;
END$$;

-- Admin policies (full access)
CREATE POLICY policy_admin_all ON users FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY policy_admin_all ON classes FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY policy_admin_all ON courses FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY policy_admin_all ON students FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY policy_admin_all ON student_courses FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY policy_admin_all ON exams FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY policy_admin_all ON assessment_codes FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY policy_admin_all ON scores FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY policy_admin_all ON assessment_titles FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Head Teacher policies (grade + track scope)
CREATE POLICY policy_head_read ON classes FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'head'
        AND grade = classes.grade
        AND track = classes.track
    )
);

CREATE POLICY policy_head_read ON students FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'head'
        AND grade = students.grade
        AND track = students.track
    )
);

-- Teacher policies (own courses only)
CREATE POLICY policy_teacher_read ON courses FOR SELECT USING (
    teacher_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (
        SELECT 1 FROM users u
        JOIN classes c ON c.id = courses.class_id
        WHERE u.id = auth.uid()
        AND u.role = 'head'
        AND u.grade = c.grade
        AND u.track = c.track
    )
);

CREATE POLICY policy_teacher_write ON exams FOR ALL USING (
    EXISTS (
        SELECT 1 FROM courses
        WHERE courses.id = exams.course_id
        AND courses.teacher_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY policy_teacher_write ON scores FOR ALL USING (
    EXISTS (
        SELECT 1 FROM exams e
        JOIN courses c ON c.id = e.course_id
        WHERE e.id = scores.exam_id
        AND c.teacher_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Public read for assessment_codes
CREATE POLICY policy_public_read ON assessment_codes FOR SELECT USING (true);

-- ========================================
-- STEP 5: ANALYTICS VIEWS
-- ========================================

-- Student Grade Aggregates View
CREATE OR REPLACE VIEW student_grade_aggregates AS
SELECT
    s.id AS student_id,
    s.student_id AS student_number,
    s.full_name,
    s.grade,
    s.track,
    c.id AS class_id,
    c.name AS class_name,
    co.id AS course_id,
    co.course_type,

    -- Formative average (FA1-FA8, only >0)
    ROUND(AVG(CASE
        WHEN sc.assessment_code IN ('FA1','FA2','FA3','FA4','FA5','FA6','FA7','FA8')
        AND sc.score > 0
        THEN sc.score::numeric
    END), 2) AS formative_avg,

    -- Summative average (SA1-SA4, only >0)
    ROUND(AVG(CASE
        WHEN sc.assessment_code IN ('SA1','SA2','SA3','SA4')
        AND sc.score > 0
        THEN sc.score::numeric
    END), 2) AS summative_avg,

    -- Final score
    MAX(CASE WHEN sc.assessment_code = 'FINAL' THEN sc.score::numeric END) AS final_score,

    -- Semester average calculation
    ROUND((
        COALESCE(AVG(CASE
            WHEN sc.assessment_code IN ('FA1','FA2','FA3','FA4','FA5','FA6','FA7','FA8')
            AND sc.score > 0
            THEN sc.score::numeric
        END), 0) * 0.15 +
        COALESCE(AVG(CASE
            WHEN sc.assessment_code IN ('SA1','SA2','SA3','SA4')
            AND sc.score > 0
            THEN sc.score::numeric
        END), 0) * 0.2 +
        COALESCE(MAX(CASE WHEN sc.assessment_code = 'FINAL' THEN sc.score::numeric END), 0) * 0.1
    ) / 0.45, 2) AS semester_avg,

    -- Count of assessments taken
    COUNT(DISTINCT CASE WHEN sc.score > 0 THEN sc.assessment_code END) AS assessments_taken,

    -- Last update
    MAX(sc.updated_at) AS last_updated

FROM students s
LEFT JOIN classes c ON c.id = s.class_id
LEFT JOIN student_courses stc ON stc.student_id = s.id
LEFT JOIN courses co ON co.id = stc.course_id
LEFT JOIN exams e ON e.course_id = co.id
LEFT JOIN scores sc ON sc.student_id = s.id AND sc.exam_id = e.id

WHERE s.is_active = true

GROUP BY
    s.id, s.student_id, s.full_name, s.grade, s.track,
    c.id, c.name, co.id, co.course_type;

-- Class Statistics View
CREATE OR REPLACE VIEW class_statistics AS
SELECT
    c.id AS class_id,
    c.name AS class_name,
    c.grade,
    c.track,
    co.course_type,

    -- Student counts
    COUNT(DISTINCT s.id) AS total_students,
    COUNT(DISTINCT CASE WHEN s.is_active = true THEN s.id END) AS active_students,

    -- Average scores
    ROUND(AVG(CASE
        WHEN sc.assessment_code IN ('FA1','FA2','FA3','FA4','FA5','FA6','FA7','FA8')
        AND sc.score > 0
        THEN sc.score::numeric
    END), 2) AS class_formative_avg,

    ROUND(AVG(CASE
        WHEN sc.assessment_code IN ('SA1','SA2','SA3','SA4')
        AND sc.score > 0
        THEN sc.score::numeric
    END), 2) AS class_summative_avg,

    -- Exam completion rate
    ROUND(100.0 * COUNT(DISTINCT CASE WHEN sc.score > 0 THEN sc.id END)::numeric /
        NULLIF(COUNT(DISTINCT s.id) * COUNT(DISTINCT e.id), 0), 2) AS completion_rate,

    -- Last activity
    MAX(sc.updated_at) AS last_activity

FROM classes c
LEFT JOIN courses co ON co.class_id = c.id
LEFT JOIN student_courses stc ON stc.course_id = co.id
LEFT JOIN students s ON s.id = stc.student_id
LEFT JOIN exams e ON e.course_id = co.id
LEFT JOIN scores sc ON sc.student_id = s.id AND sc.exam_id = e.id

WHERE c.is_active = true

GROUP BY c.id, c.name, c.grade, c.track, co.course_type;

-- Teacher Performance View
CREATE OR REPLACE VIEW teacher_performance AS
SELECT
    u.id AS teacher_id,
    u.full_name AS teacher_name,
    u.teacher_type,

    -- Course counts
    COUNT(DISTINCT co.id) AS total_courses,
    COUNT(DISTINCT c.id) AS total_classes,

    -- Student counts
    COUNT(DISTINCT s.id) AS total_students,

    -- Exam statistics
    COUNT(DISTINCT e.id) AS total_exams,
    ROUND(100.0 * COUNT(DISTINCT CASE WHEN sc.score > 0 THEN sc.id END)::numeric /
        NULLIF(COUNT(DISTINCT s.id) * COUNT(DISTINCT e.id), 0), 2) AS avg_completion_rate,

    -- Average class performance
    ROUND(AVG(CASE WHEN sc.score > 0 THEN sc.score::numeric END), 2) AS avg_student_score,

    -- Last activity
    MAX(e.updated_at) AS last_exam_created,
    MAX(sc.updated_at) AS last_score_entered

FROM users u
LEFT JOIN courses co ON co.teacher_id = u.id
LEFT JOIN classes c ON c.id = co.class_id
LEFT JOIN student_courses stc ON stc.course_id = co.id
LEFT JOIN students s ON s.id = stc.student_id
LEFT JOIN exams e ON e.course_id = co.id
LEFT JOIN scores sc ON sc.student_id = s.id AND sc.exam_id = e.id

WHERE u.role = 'teacher' AND u.is_active = true

GROUP BY u.id, u.full_name, u.teacher_type;

-- ========================================
-- STEP 6: SEED DATA - Assessment Codes
-- ========================================

INSERT INTO assessment_codes (code, display_name, category, weight, sort_order) VALUES
    ('FA1', 'Formative Assessment 1', 'formative', 0.0187, 1),
    ('FA2', 'Formative Assessment 2', 'formative', 0.0187, 2),
    ('FA3', 'Formative Assessment 3', 'formative', 0.0187, 3),
    ('FA4', 'Formative Assessment 4', 'formative', 0.0187, 4),
    ('FA5', 'Formative Assessment 5', 'formative', 0.0187, 5),
    ('FA6', 'Formative Assessment 6', 'formative', 0.0187, 6),
    ('FA7', 'Formative Assessment 7', 'formative', 0.0187, 7),
    ('FA8', 'Formative Assessment 8', 'formative', 0.0187, 8),
    ('SA1', 'Summative Assessment 1', 'summative', 0.0500, 11),
    ('SA2', 'Summative Assessment 2', 'summative', 0.0500, 12),
    ('SA3', 'Summative Assessment 3', 'summative', 0.0500, 13),
    ('SA4', 'Summative Assessment 4', 'summative', 0.0500, 14),
    ('FINAL', 'Final Examination', 'final', 0.1000, 20)
ON CONFLICT (code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    weight = EXCLUDED.weight;

-- ========================================
-- DEPLOYMENT COMPLETE
-- ========================================
-- Next steps:
-- 1. Create test users in Supabase Authentication
-- 2. Insert user records into users table
-- 3. Create sample classes, courses, students
-- 4. Test RLS policies with different user roles
-- ========================================
