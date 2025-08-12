-- Migration 004: Update Grade Constraints for Primary School
-- Date: 2025-08-11
-- Purpose: Change grade constraints from 7-12 (middle school) to 1-6 (primary school)
-- This system is designed for primary school education (G1-G6)

SELECT '=== Updating Grade Constraints for Primary School ===' as status;

-- 1. Update users table grade constraint
SELECT 'Updating users table grade constraint...' as step;
DO $$
BEGIN
    -- Drop the existing constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'users' 
        AND constraint_name = 'users_grade_check'
        AND constraint_type = 'CHECK'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_grade_check;
    END IF;
    
    -- Add new constraint for primary school (grades 1-6)
    ALTER TABLE users ADD CONSTRAINT users_grade_check 
    CHECK (grade IS NULL OR (grade BETWEEN 1 AND 6));
    
    RAISE NOTICE 'Updated users table grade constraint to 1-6';
END $$;

-- 2. Update classes table grade constraint  
SELECT 'Updating classes table grade constraint...' as step;
DO $$
BEGIN
    -- Drop the existing constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'classes' 
        AND constraint_name = 'classes_grade_check'
        AND constraint_type = 'CHECK'
    ) THEN
        ALTER TABLE classes DROP CONSTRAINT classes_grade_check;
    END IF;
    
    -- Add new constraint for primary school (grades 1-6)
    ALTER TABLE classes ADD CONSTRAINT classes_grade_check 
    CHECK (grade BETWEEN 1 AND 6);
    
    RAISE NOTICE 'Updated classes table grade constraint to 1-6';
END $$;

-- 3. Update students table grade constraint
SELECT 'Updating students table grade constraint...' as step;
DO $$
BEGIN
    -- Drop the existing constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'students' 
        AND constraint_name = 'students_grade_check'
        AND constraint_type = 'CHECK'
    ) THEN
        ALTER TABLE students DROP CONSTRAINT students_grade_check;
    END IF;
    
    -- Add new constraint for primary school (grades 1-6)
    ALTER TABLE students ADD CONSTRAINT students_grade_check 
    CHECK (grade BETWEEN 1 AND 6);
    
    RAISE NOTICE 'Updated students table grade constraint to 1-6';
END $$;

-- 4. Update assessment_titles table grade constraint
SELECT 'Updating assessment_titles table grade constraint...' as step;
DO $$
BEGIN
    -- Drop the existing constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'assessment_titles' 
        AND constraint_name = 'assessment_titles_grade_check'
        AND constraint_type = 'CHECK'
    ) THEN
        ALTER TABLE assessment_titles DROP CONSTRAINT assessment_titles_grade_check;
    END IF;
    
    -- Add new constraint for primary school (grades 1-6)
    ALTER TABLE assessment_titles ADD CONSTRAINT assessment_titles_grade_check 
    CHECK (grade IS NULL OR (grade BETWEEN 1 AND 6));
    
    RAISE NOTICE 'Updated assessment_titles table grade constraint to 1-6';
END $$;

-- 5. Verify all constraints have been updated
SELECT 'Verifying updated grade constraints...' as step;
SELECT 
    table_name,
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%grade_check'
ORDER BY table_name;

-- 6. Test the new constraints with sample data
SELECT 'Testing new constraints...' as step;
SELECT 'Testing classes table constraint...' as test;

-- This should succeed (grade 1-6 allowed)
DO $$
BEGIN
    BEGIN
        INSERT INTO classes (name, grade, track, academic_year, is_active)
        VALUES ('TEST_CONSTRAINT_G1', 1, 'local', '24-25', true);
        
        DELETE FROM classes WHERE name = 'TEST_CONSTRAINT_G1';
        RAISE NOTICE 'SUCCESS: Grade 1 accepted for classes table';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'ERROR: Grade 1 still rejected for classes table';
    END;
END $$;

-- This should succeed (grade 6 allowed)
DO $$
BEGIN
    BEGIN
        INSERT INTO classes (name, grade, track, academic_year, is_active)
        VALUES ('TEST_CONSTRAINT_G6', 6, 'local', '24-25', true);
        
        DELETE FROM classes WHERE name = 'TEST_CONSTRAINT_G6';
        RAISE NOTICE 'SUCCESS: Grade 6 accepted for classes table';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'ERROR: Grade 6 still rejected for classes table';
    END;
END $$;

-- This should fail (grade 7 no longer allowed)
DO $$
BEGIN
    BEGIN
        INSERT INTO classes (name, grade, track, academic_year, is_active)
        VALUES ('TEST_CONSTRAINT_G7', 7, 'local', '24-25', true);
        
        DELETE FROM classes WHERE name = 'TEST_CONSTRAINT_G7';
        RAISE NOTICE 'ERROR: Grade 7 incorrectly accepted for classes table';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'SUCCESS: Grade 7 correctly rejected for classes table';
    END;
END $$;

SELECT '=== Primary School Grade Constraints Update Complete ===' as status;
SELECT 'System now supports primary school grades 1-6 (G1-G6)' as result;
SELECT 'Test CSV data with grades 1-6 can now be imported successfully' as next_step;