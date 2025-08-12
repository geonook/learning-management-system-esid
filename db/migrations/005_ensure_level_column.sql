-- Migration 005: Ensure level column exists in classes and students tables
-- Date: 2025-08-12
-- Purpose: Add level column if it doesn't exist to support primary school system

-- Create level_type enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'level_type') THEN
        CREATE TYPE level_type AS ENUM ('E1', 'E2', 'E3');
        RAISE NOTICE 'Created level_type enum';
    ELSE
        RAISE NOTICE 'level_type enum already exists';
    END IF;
END $$;

-- Add level column to classes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'level'
    ) THEN
        ALTER TABLE classes ADD COLUMN level level_type;
        RAISE NOTICE 'Added level column to classes table';
    ELSE
        RAISE NOTICE 'level column already exists in classes table';
    END IF;
END $$;

-- Add level column to students table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name = 'level'
    ) THEN
        ALTER TABLE students ADD COLUMN level level_type;
        RAISE NOTICE 'Added level column to students table';
    ELSE
        RAISE NOTICE 'level column already exists in students table';
    END IF;
END $$;

-- Create indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_classes_level ON classes(level);
CREATE INDEX IF NOT EXISTS idx_students_level ON students(level);
CREATE INDEX IF NOT EXISTS idx_classes_grade_level ON classes(grade, level);

-- Add comments for documentation
COMMENT ON TYPE level_type IS 'Academic performance levels: E1 (highest), E2 (middle), E3 (foundation)';
COMMENT ON COLUMN classes.level IS 'Academic level classification for the class';
COMMENT ON COLUMN students.level IS 'Academic level inherited from class assignment';

SELECT '=== Migration 005 completed: level columns ensured ===' as status;