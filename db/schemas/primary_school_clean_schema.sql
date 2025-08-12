-- Primary School LMS Clean Schema
-- Date: 2025-08-12
-- Purpose: Clean, one-time schema for primary school G1-G6 without migration baggage
-- Based on: Analyzed requirements from existing CSV templates and business logic

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- CUSTOM TYPES (Clean Definitions)
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
-- CORE TABLES
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
    UNIQUE(name, academic_year),
    CONSTRAINT classes_name_format 
        CHECK (name ~ '^G[1-6] (Trailblazers|Discoverers|Adventurers|Innovators|Explorers|Navigators|Inventors|Voyagers|Pioneers|Guardians|Pathfinders|Seekers|Visionaries|Achievers)$'),
    CONSTRAINT classes_grade_name_consistency 
        CHECK (SUBSTRING(name, 2, 1)::INTEGER = grade)
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
    UNIQUE(class_id, course_type, academic_year),
    CONSTRAINT courses_teacher_specialization_match
        CHECK (EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = teacher_id 
            AND users.teacher_type = courses.course_type
        ))
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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Business rules
    CONSTRAINT students_grade_class_consistency 
        CHECK (class_id IS NULL OR EXISTS (
            SELECT 1 FROM classes 
            WHERE classes.id = students.class_id 
            AND classes.grade = students.grade
        ))
);

-- Exams table (assessment occasions)
DROP TABLE IF EXISTS exams CASCADE;
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    exam_date DATE,
    created_by UUID NOT NULL REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Business rules
    UNIQUE(class_id, name)
);

-- Scores table (individual assessment scores)
DROP TABLE IF EXISTS scores CASCADE;
CREATE TABLE scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    assessment_code assessment_code NOT NULL,
    score DECIMAL(5,2) CHECK (score >= 0 AND score <= 100),
    entered_by UUID NOT NULL REFERENCES users(id),
    entered_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Business rules
    UNIQUE(student_id, exam_id, assessment_code)
);

-- Assessment Titles table (customizable display names)
DROP TABLE IF EXISTS assessment_titles CASCADE;
CREATE TABLE assessment_titles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE, -- NULL = global default
    grade INTEGER CHECK (grade BETWEEN 1 AND 6), -- NULL = grade-independent
    track track_type, -- NULL = track-independent
    assessment_code assessment_code NOT NULL,
    display_title TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Business rules: Hierarchy of specificity (most specific wins)
    UNIQUE(class_id, grade, track, assessment_code)
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Users indexes
CREATE INDEX idx_users_email_hash ON users USING hash(email);
CREATE INDEX idx_users_role_active ON users(role) WHERE is_active = TRUE;
CREATE INDEX idx_users_teacher_type ON users(teacher_type) WHERE teacher_type IS NOT NULL;
CREATE INDEX idx_users_grade_track ON users(grade, track) WHERE grade IS NOT NULL;

-- Classes indexes
CREATE INDEX idx_classes_name_hash ON classes USING hash(name);
CREATE INDEX idx_classes_grade_track ON classes(grade, track);
CREATE INDEX idx_classes_academic_year ON classes(academic_year);
CREATE INDEX idx_classes_active ON classes(is_active);

-- Courses indexes
CREATE INDEX idx_courses_class_type ON courses(class_id, course_type);
CREATE INDEX idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX idx_courses_academic_year ON courses(academic_year);

-- Students indexes
CREATE INDEX idx_students_student_id_hash ON students USING hash(student_id);
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_students_grade_track ON students(grade, track);
CREATE INDEX idx_students_active ON students(is_active);

-- Exams indexes
CREATE INDEX idx_exams_class_id ON exams(class_id);
CREATE INDEX idx_exams_name_class ON exams(class_id, name);
CREATE INDEX idx_exams_created_by ON exams(created_by);

-- Scores indexes
CREATE INDEX idx_scores_student_exam ON scores(student_id, exam_id);
CREATE INDEX idx_scores_assessment_code ON scores(assessment_code);
CREATE INDEX idx_scores_entered_by ON scores(entered_by);

-- Assessment titles indexes
CREATE INDEX idx_assessment_titles_hierarchy ON assessment_titles(class_id, grade, track, assessment_code);

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_titles ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for imports and admin operations)
CREATE POLICY "service_role_bypass" ON users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_bypass" ON classes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_bypass" ON courses FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_bypass" ON students FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_bypass" ON exams FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_bypass" ON scores FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_bypass" ON assessment_titles FOR ALL USING (auth.role() = 'service_role');

-- Admin full access
CREATE POLICY "admin_full_access" ON users FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_full_access" ON classes FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_full_access" ON courses FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_full_access" ON students FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_full_access" ON exams FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_full_access" ON scores FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admin_full_access" ON assessment_titles FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Head grade+track access
CREATE POLICY "head_grade_track_access" ON classes FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = auth.uid() 
        AND u.role = 'head' 
        AND u.grade = classes.grade 
        AND u.track = classes.track
    )
);

CREATE POLICY "head_grade_track_access" ON students FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = auth.uid() 
        AND u.role = 'head' 
        AND u.grade = students.grade 
        AND u.track = students.track
    )
);

-- Teacher access to own courses and students
CREATE POLICY "teacher_own_courses" ON courses FOR ALL USING (
    teacher_id = auth.uid()
);

CREATE POLICY "teacher_course_students" ON students FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM courses c 
        WHERE c.teacher_id = auth.uid() 
        AND c.class_id = students.class_id
    )
);

-- ========================================
-- FUNCTIONS AND TRIGGERS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_scores_updated_at BEFORE UPDATE ON scores 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_assessment_titles_updated_at BEFORE UPDATE ON assessment_titles 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ========================================
-- SAMPLE DATA (Optional - for testing)
-- ========================================

-- NOTE: This will be populated via CSV import
-- Keeping this section for reference of expected data structure

-- ========================================
-- COMMENTS AND DOCUMENTATION
-- ========================================

-- Table comments
COMMENT ON TABLE users IS 'User accounts for primary school LMS - admin, head, teacher, student roles';
COMMENT ON TABLE classes IS 'Class definitions for grades 1-6 with standardized naming convention';
COMMENT ON TABLE courses IS 'Independent courses (LT/IT ELA + KCFS) assigned to classes with specialized teachers';
COMMENT ON TABLE students IS 'Student records with grade, level, and class assignments';
COMMENT ON TABLE exams IS 'Assessment occasions tied to classes';
COMMENT ON TABLE scores IS 'Individual student scores for specific assessments';
COMMENT ON TABLE assessment_titles IS 'Customizable display names for assessment codes with hierarchy support';

-- Key constraint comments
COMMENT ON CONSTRAINT users_teacher_type_consistency ON users 
    IS 'Teachers must have teacher_type; non-teachers must not';
COMMENT ON CONSTRAINT classes_name_format ON classes 
    IS 'Enforces standardized class naming: G[1-6] [StandardClassName]';
COMMENT ON CONSTRAINT courses_teacher_specialization_match ON courses 
    IS 'Teachers can only teach courses matching their specialization';

-- Schema version and metadata
CREATE TABLE IF NOT EXISTS schema_versions (
    version TEXT PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO schema_versions (version, description) VALUES 
    ('primary_school_clean_v1.0', 'Clean primary school schema without migration baggage');

-- Success message
SELECT 'Primary School Clean Schema v1.0 - Successfully deployed!' as status;