-- Migration 006: Support Primary School CSV Import
-- Date: 2025-08-12
-- Purpose: Ensure database can handle primary school CSV import constraints

-- Update users table grade constraint to support primary school (G1-G6)
DO $$
BEGIN
    -- Drop existing check constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'users' AND constraint_name LIKE '%grade%'
    ) THEN
        -- Get the actual constraint name
        DECLARE
            constraint_name_var TEXT;
        BEGIN
            SELECT constraint_name INTO constraint_name_var
            FROM information_schema.table_constraints 
            WHERE table_name = 'users' 
            AND constraint_type = 'CHECK' 
            AND constraint_name LIKE '%grade%'
            LIMIT 1;
            
            IF constraint_name_var IS NOT NULL THEN
                EXECUTE 'ALTER TABLE users DROP CONSTRAINT ' || constraint_name_var;
                RAISE NOTICE 'Dropped users grade constraint: %', constraint_name_var;
            END IF;
        END;
    END IF;
    
    -- Add new constraint for primary school (G1-G6)
    ALTER TABLE users ADD CONSTRAINT users_grade_check CHECK (grade BETWEEN 1 AND 6);
    RAISE NOTICE 'Added primary school grade constraint to users table (G1-G6)';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating users grade constraint: %', SQLERRM;
END $$;

-- Update classes table grade constraint to support primary school (G1-G6)
DO $$
BEGIN
    -- Drop existing check constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'classes' AND constraint_name LIKE '%grade%'
    ) THEN
        -- Get the actual constraint name
        DECLARE
            constraint_name_var TEXT;
        BEGIN
            SELECT constraint_name INTO constraint_name_var
            FROM information_schema.table_constraints 
            WHERE table_name = 'classes' 
            AND constraint_type = 'CHECK' 
            AND constraint_name LIKE '%grade%'
            LIMIT 1;
            
            IF constraint_name_var IS NOT NULL THEN
                EXECUTE 'ALTER TABLE classes DROP CONSTRAINT ' || constraint_name_var;
                RAISE NOTICE 'Dropped classes grade constraint: %', constraint_name_var;
            END IF;
        END;
    END IF;
    
    -- Add new constraint for primary school (G1-G6)
    ALTER TABLE classes ADD CONSTRAINT classes_grade_check CHECK (grade BETWEEN 1 AND 6);
    RAISE NOTICE 'Added primary school grade constraint to classes table (G1-G6)';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating classes grade constraint: %', SQLERRM;
END $$;

-- Update students table grade constraint to support primary school (G1-G6)
DO $$
BEGIN
    -- Drop existing check constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'students' AND constraint_name LIKE '%grade%'
    ) THEN
        -- Get the actual constraint name
        DECLARE
            constraint_name_var TEXT;
        BEGIN
            SELECT constraint_name INTO constraint_name_var
            FROM information_schema.table_constraints 
            WHERE table_name = 'students' 
            AND constraint_type = 'CHECK' 
            AND constraint_name LIKE '%grade%'
            LIMIT 1;
            
            IF constraint_name_var IS NOT NULL THEN
                EXECUTE 'ALTER TABLE students DROP CONSTRAINT ' || constraint_name_var;
                RAISE NOTICE 'Dropped students grade constraint: %', constraint_name_var;
            END IF;
        END;
    END IF;
    
    -- Add new constraint for primary school (G1-G6)
    ALTER TABLE students ADD CONSTRAINT students_grade_check CHECK (grade BETWEEN 1 AND 6);
    RAISE NOTICE 'Added primary school grade constraint to students table (G1-G6)';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating students grade constraint: %', SQLERRM;
END $$;

-- Update assessment_titles table grade constraint to support primary school (G1-G6)
DO $$
BEGIN
    -- Drop existing check constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'assessment_titles' AND constraint_name LIKE '%grade%'
    ) THEN
        -- Get the actual constraint name
        DECLARE
            constraint_name_var TEXT;
        BEGIN
            SELECT constraint_name INTO constraint_name_var
            FROM information_schema.table_constraints 
            WHERE table_name = 'assessment_titles' 
            AND constraint_type = 'CHECK' 
            AND constraint_name LIKE '%grade%'
            LIMIT 1;
            
            IF constraint_name_var IS NOT NULL THEN
                EXECUTE 'ALTER TABLE assessment_titles DROP CONSTRAINT ' || constraint_name_var;
                RAISE NOTICE 'Dropped assessment_titles grade constraint: %', constraint_name_var;
            END IF;
        END;
    END IF;
    
    -- Add new constraint for primary school (G1-G6)
    ALTER TABLE assessment_titles ADD CONSTRAINT assessment_titles_grade_check CHECK (grade BETWEEN 1 AND 6);
    RAISE NOTICE 'Added primary school grade constraint to assessment_titles table (G1-G6)';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating assessment_titles grade constraint: %', SQLERRM;
END $$;

-- Add student role to user_role enum if it doesn't exist (needed for CSV import)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'student' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE user_role ADD VALUE 'student';
        RAISE NOTICE 'Added student role to user_role enum';
    ELSE
        RAISE NOTICE 'student role already exists in user_role enum';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding student role: %', SQLERRM;
END $$;

-- Ensure course_type enum exists and has required values
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'course_type') THEN
        CREATE TYPE course_type AS ENUM ('LT', 'IT', 'KCFS');
        RAISE NOTICE 'Created course_type enum';
    ELSE
        RAISE NOTICE 'course_type enum already exists';
    END IF;
    
    -- Ensure all required values exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'LT' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'course_type')
    ) THEN
        ALTER TYPE course_type ADD VALUE 'LT';
        RAISE NOTICE 'Added LT to course_type enum';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'IT' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'course_type')
    ) THEN
        ALTER TYPE course_type ADD VALUE 'IT';
        RAISE NOTICE 'Added IT to course_type enum';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'KCFS' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'course_type')
    ) THEN
        ALTER TYPE course_type ADD VALUE 'KCFS';
        RAISE NOTICE 'Added KCFS to course_type enum';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error with course_type enum: %', SQLERRM;
END $$;

-- Add useful indexes for CSV import performance
CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users USING hash(email);
CREATE INDEX IF NOT EXISTS idx_classes_name_hash ON classes USING hash(name);
CREATE INDEX IF NOT EXISTS idx_students_student_id_hash ON students USING hash(student_id);

-- Add comments for CSV import
COMMENT ON CONSTRAINT users_grade_check ON users IS 'Primary school grades 1-6 for CSV import compatibility';
COMMENT ON CONSTRAINT classes_grade_check ON classes IS 'Primary school grades 1-6 for CSV import compatibility';
COMMENT ON CONSTRAINT students_grade_check ON students IS 'Primary school grades 1-6 for CSV import compatibility';

SELECT '=== Migration 006 completed: Primary school CSV import support enabled ===' as status;