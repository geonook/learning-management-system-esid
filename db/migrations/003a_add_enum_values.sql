-- Migration 003a: Add ENUM Values
-- Date: 2025-08-11
-- Purpose: Add new ENUM values that must be committed before use
-- IMPORTANT: Run this migration FIRST, then run 003b_add_courses_architecture.sql

-- First, ensure user_role ENUM includes 'student' value
DO $$ 
BEGIN
    -- Check if user_role enum exists and add 'student' if missing
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        -- If it exists, check if 'student' is already added
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'user_role' AND e.enumlabel = 'student') THEN
            -- Add 'student' to existing enum
            ALTER TYPE user_role ADD VALUE 'student';
        END IF;
    ELSE
        -- Create new user_role enum if it doesn't exist (unlikely in existing system)
        CREATE TYPE user_role AS ENUM ('admin', 'head', 'teacher', 'student');
    END IF;
END $$;

-- Update teacher_type to include KCFS
-- First check if teacher_type enum exists and what values it has
DO $$ 
BEGIN
    -- Check if teacher_type enum exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'teacher_type') THEN
        -- If it exists, check if KCFS is already added
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'teacher_type' AND e.enumlabel = 'KCFS') THEN
            -- Add KCFS to existing enum
            ALTER TYPE teacher_type ADD VALUE 'KCFS';
        END IF;
    ELSE
        -- Create new teacher_type enum if it doesn't exist
        CREATE TYPE teacher_type AS ENUM ('LT', 'IT', 'KCFS');
    END IF;
END $$;

-- Create course_type enum (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'course_type') THEN
        CREATE TYPE course_type AS ENUM ('LT', 'IT', 'KCFS');
    END IF;
END $$;

-- Ensure users table has teacher_type column with correct type
DO $$
BEGIN
    -- Check if teacher_type column exists in users table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'teacher_type') THEN
        -- Add teacher_type column if it doesn't exist
        ALTER TABLE users ADD COLUMN teacher_type teacher_type;
    ELSE
        -- Update existing column type if needed (safe operation)
        BEGIN
            ALTER TABLE users ALTER COLUMN teacher_type TYPE teacher_type USING teacher_type::text::teacher_type;
        EXCEPTION
            WHEN others THEN
                -- If conversion fails, the column might already be correct type
                RAISE NOTICE 'teacher_type column type conversion skipped - likely already correct type';
        END;
    END IF;
END $$;

-- Update academic_year format in classes table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'academic_year') THEN
        ALTER TABLE classes ALTER COLUMN academic_year SET DEFAULT '24-25';
    END IF;
END $$;

-- Add comment explaining the two-part migration
COMMENT ON TYPE user_role IS 'User roles: admin, head, teacher, student. Extended in migration 003a.';
COMMENT ON TYPE teacher_type IS 'Teacher specializations: LT (Local Teacher), IT (International Teacher), KCFS (Kang Chiao Future Skill). Extended in migration 003a.';
COMMENT ON TYPE course_type IS 'Course types matching teacher specializations: LT, IT, KCFS. Created in migration 003a.';