-- Migration 003b: Add Courses Architecture
-- Date: 2025-08-11
-- Purpose: Create courses architecture for independent English programs
-- PREREQUISITE: Must run 003a_add_enum_values.sql FIRST to ensure ENUM values are committed

-- Create courses table for independent English programs within each class
CREATE TABLE IF NOT EXISTS courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    course_type course_type NOT NULL,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    academic_year VARCHAR(5) NOT NULL DEFAULT '24-25',
    course_name VARCHAR(100) GENERATED ALWAYS AS (
        CASE course_type
            WHEN 'LT' THEN 'Local Track English'
            WHEN 'IT' THEN 'International Track English'  
            WHEN 'KCFS' THEN 'KCFS English'
        END
    ) STORED,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique course type per class
    UNIQUE(class_id, course_type)
);

-- Create student_courses junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS student_courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Ensure unique student per course
    UNIQUE(student_id, course_id)
);

-- Add course_id to scores table (will migrate existing scores later)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scores' AND column_name = 'course_id') THEN
        ALTER TABLE scores ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_courses_class_id ON courses(class_id);
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_type ON courses(course_type);
CREATE INDEX IF NOT EXISTS idx_student_courses_student_id ON student_courses(student_id);
CREATE INDEX IF NOT EXISTS idx_student_courses_course_id ON student_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_scores_course_id ON scores(course_id);

-- Add RLS policies for courses
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Admin can see all courses
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'courses' AND policyname = 'Admin full access to courses') THEN
        CREATE POLICY "Admin full access to courses" ON courses
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.role = 'admin'
                )
            );
    END IF;
END $$;

-- Teachers can see courses they teach
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'courses' AND policyname = 'Teachers can see their courses') THEN
        CREATE POLICY "Teachers can see their courses" ON courses
            FOR SELECT USING (
                teacher_id = auth.uid()
            );
    END IF;
END $$;

-- Heads can see courses in their grade and track
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'courses' AND policyname = 'Heads can see courses in their jurisdiction') THEN
        CREATE POLICY "Heads can see courses in their jurisdiction" ON courses
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM users u
                    JOIN classes c ON courses.class_id = c.id
                    WHERE u.id = auth.uid()
                    AND u.role = 'head' 
                    AND u.grade = c.grade
                    AND u.track = c.track
                )
            );
    END IF;
END $$;

-- Add RLS policies for student_courses
ALTER TABLE student_courses ENABLE ROW LEVEL SECURITY;

-- Admin can see all student-course relationships
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_courses' AND policyname = 'Admin full access to student_courses') THEN
        CREATE POLICY "Admin full access to student_courses" ON student_courses
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.role = 'admin'
                )
            );
    END IF;
END $$;

-- Teachers can see student enrollments in their courses
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_courses' AND policyname = 'Teachers can see their course enrollments') THEN
        CREATE POLICY "Teachers can see their course enrollments" ON student_courses
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM courses
                    WHERE courses.id = student_courses.course_id
                    AND courses.teacher_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Students can see their own course enrollments (via students table)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_courses' AND policyname = 'Students can see their enrollments') THEN
        CREATE POLICY "Students can see their enrollments" ON student_courses
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM students s 
                    JOIN users u ON s.id = student_courses.student_id
                    WHERE u.id = auth.uid() AND u.role = 'student'
                )
            );
    END IF;
END $$;

-- Update scores RLS to use course_id when available
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scores' AND policyname = 'Scores via course access') THEN
        CREATE POLICY "Scores via course access" ON scores
            FOR SELECT USING (
                CASE 
                    -- If course_id exists, check course permissions
                    WHEN course_id IS NOT NULL THEN
                        EXISTS (
                            SELECT 1 FROM courses c
                            JOIN users u ON u.id = auth.uid()
                            WHERE c.id = scores.course_id
                            AND (
                                -- Admin can see all
                                u.role = 'admin'
                                -- Teacher can see their course scores  
                                OR c.teacher_id = auth.uid()
                                -- Head can see scores in their jurisdiction
                                OR (u.role = 'head' AND EXISTS (
                                    SELECT 1 FROM classes cl
                                    WHERE cl.id = c.class_id
                                    AND cl.grade = u.grade
                                    AND cl.track = u.track
                                ))
                                -- Student can see their own scores (via students table)
                                OR (u.role = 'student' AND EXISTS (
                                    SELECT 1 FROM students s
                                    WHERE s.id = scores.student_id
                                    AND EXISTS (
                                        SELECT 1 FROM users su
                                        WHERE su.id = auth.uid() AND su.role = 'student'
                                        -- Additional logic to link user to student record would go here
                                        -- For now, this is a placeholder that needs proper implementation
                                    )
                                ))
                            )
                        )
                    -- Fallback to existing class-based permissions for legacy data
                    ELSE true
                END
            );
    END IF;
END $$;

-- Create function to automatically enroll students in all class courses
CREATE OR REPLACE FUNCTION enroll_student_in_class_courses()
RETURNS TRIGGER AS $$
BEGIN
    -- When a student is assigned to a class, enroll them in all courses of that class
    IF NEW.class_id IS NOT NULL THEN
        INSERT INTO student_courses (student_id, course_id)
        SELECT NEW.id, c.id
        FROM courses c
        WHERE c.class_id = NEW.class_id
        ON CONFLICT (student_id, course_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic course enrollment
DROP TRIGGER IF EXISTS trigger_enroll_student_in_courses ON students;
CREATE TRIGGER trigger_enroll_student_in_courses
    AFTER INSERT OR UPDATE OF class_id ON students
    FOR EACH ROW
    EXECUTE FUNCTION enroll_student_in_class_courses();

-- Create function to create default courses for new classes
CREATE OR REPLACE FUNCTION create_default_courses_for_class()
RETURNS TRIGGER AS $$
BEGIN
    -- Create three default courses (LT, IT, KCFS) for each new class
    INSERT INTO courses (class_id, course_type, academic_year)
    VALUES 
        (NEW.id, 'LT', NEW.academic_year),
        (NEW.id, 'IT', NEW.academic_year), 
        (NEW.id, 'KCFS', NEW.academic_year);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic course creation
DROP TRIGGER IF EXISTS trigger_create_default_courses ON classes;
CREATE TRIGGER trigger_create_default_courses
    AFTER INSERT ON classes
    FOR EACH ROW
    EXECUTE FUNCTION create_default_courses_for_class();

-- Add helpful views
CREATE OR REPLACE VIEW course_details AS
SELECT 
    c.id,
    c.course_type,
    c.course_name,
    c.academic_year,
    c.is_active,
    cl.name as class_name,
    cl.grade,
    cl.level,
    cl.track as class_track,
    u.full_name as teacher_name,
    u.email as teacher_email,
    (SELECT COUNT(*) FROM student_courses sc WHERE sc.course_id = c.id AND sc.is_active = true) as student_count
FROM courses c
JOIN classes cl ON c.class_id = cl.id
LEFT JOIN users u ON c.teacher_id = u.id
ORDER BY cl.grade, cl.name, c.course_type;

-- Add view for student course enrollments
CREATE OR REPLACE VIEW student_course_enrollments AS
SELECT 
    sc.id as enrollment_id,
    s.id as student_id,
    s.full_name as student_name,
    s.student_id as external_student_id,
    c.id as course_id,
    c.course_type,
    c.course_name,
    cl.name as class_name,
    cl.grade,
    cl.level,
    t.full_name as teacher_name,
    t.email as teacher_email,
    sc.enrolled_at,
    sc.is_active as enrollment_active
FROM student_courses sc
JOIN students s ON sc.student_id = s.id
JOIN courses c ON sc.course_id = c.id
JOIN classes cl ON c.class_id = cl.id
LEFT JOIN users t ON c.teacher_id = t.id
ORDER BY cl.grade, cl.name, c.course_type, s.full_name;

-- Comment on tables
COMMENT ON TABLE courses IS 'Independent English courses within each class (LT/IT/KCFS)';
COMMENT ON TABLE student_courses IS 'Many-to-many relationship between students and courses';
COMMENT ON COLUMN scores.course_id IS 'Links scores to specific courses for independent grading';