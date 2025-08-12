-- Migration 004b: Safely Migrate Grade Constraints for Primary School  
-- Date: 2025-08-11
-- Purpose: Safely update grade constraints from 7-12 to 1-6 by handling existing data conflicts
-- PREREQUISITE: Run 004a_check_existing_data.sql first to understand conflicts

SELECT '=== Safely Migrating Grade Constraints to Primary School ===' as status;

-- Step 1: Clean conflicting data (middle school grades 7-12)
SELECT 'Step 1: Cleaning conflicting data...' as step;

-- 1a. Clean users table conflicts
SELECT 'Cleaning users table conflicts...' as action;
DO $$
DECLARE
    conflict_count INTEGER;
BEGIN
    -- Count conflicts first
    SELECT COUNT(*) INTO conflict_count 
    FROM users 
    WHERE grade IS NOT NULL AND (grade < 1 OR grade > 6);
    
    RAISE NOTICE 'Found % conflicting records in users table', conflict_count;
    
    IF conflict_count > 0 THEN
        -- Option 1: Set conflicting grades to NULL (safe approach)
        UPDATE users 
        SET grade = NULL 
        WHERE grade IS NOT NULL AND (grade < 1 OR grade > 6);
        
        RAISE NOTICE 'Updated % users records: set conflicting grades to NULL', conflict_count;
        
        -- Alternative approach (commented out): Delete conflicting records
        -- DELETE FROM users WHERE grade IS NOT NULL AND (grade < 1 OR grade > 6);
        -- RAISE NOTICE 'Deleted % conflicting users records', conflict_count;
    ELSE
        RAISE NOTICE 'No conflicting records found in users table';
    END IF;
END $$;

-- 1b. Clean classes table conflicts (with proper foreign key handling)
SELECT 'Cleaning classes table conflicts...' as action;
DO $$
DECLARE
    conflict_count INTEGER;
    classes_to_delete INTEGER[];
BEGIN
    -- Count conflicts first
    SELECT COUNT(*) INTO conflict_count 
    FROM classes 
    WHERE grade < 1 OR grade > 6;
    
    RAISE NOTICE 'Found % conflicting records in classes table', conflict_count;
    
    IF conflict_count > 0 THEN
        -- Get list of class IDs to delete
        SELECT ARRAY(SELECT id FROM classes WHERE grade < 1 OR grade > 6) INTO classes_to_delete;
        
        -- Delete in proper order to respect foreign key constraints
        
        -- 1. Delete from assessment_titles (references classes.id)
        DELETE FROM assessment_titles WHERE class_id = ANY(classes_to_delete);
        RAISE NOTICE 'Deleted assessment_titles records for conflicting classes';
        
        -- 2. Delete from scores (references students.id, indirectly linked to classes)
        DELETE FROM scores WHERE student_id IN (
            SELECT id FROM students WHERE class_id = ANY(classes_to_delete)
        );
        RAISE NOTICE 'Deleted scores records for conflicting classes';
        
        -- 3. Delete from student_courses (references students.id and courses.id)
        DELETE FROM student_courses WHERE course_id IN (
            SELECT c.id FROM courses c WHERE c.class_id = ANY(classes_to_delete)
        );
        DELETE FROM student_courses WHERE student_id IN (
            SELECT id FROM students WHERE class_id = ANY(classes_to_delete)
        );
        RAISE NOTICE 'Deleted student_courses records for conflicting classes';
        
        -- 4. Delete from courses (references classes.id)
        DELETE FROM courses WHERE class_id = ANY(classes_to_delete);
        RAISE NOTICE 'Deleted courses records for conflicting classes';
        
        -- 5. Delete from students (references classes.id)
        DELETE FROM students WHERE class_id = ANY(classes_to_delete);
        RAISE NOTICE 'Deleted students records for conflicting classes';
        
        -- 6. Finally delete from classes (parent table)
        DELETE FROM classes WHERE grade < 1 OR grade > 6;
        
        RAISE NOTICE 'Deleted % conflicting classes and all related data', conflict_count;
    ELSE
        RAISE NOTICE 'No conflicting records found in classes table';
    END IF;
END $$;

-- 1c. Clean remaining students table conflicts (should be minimal after classes cleanup)
SELECT 'Cleaning remaining students table conflicts...' as action;
DO $$
DECLARE
    conflict_count INTEGER;
BEGIN
    -- Count conflicts first (should be 0 or very few after classes cleanup)
    SELECT COUNT(*) INTO conflict_count 
    FROM students 
    WHERE grade < 1 OR grade > 6;
    
    RAISE NOTICE 'Found % remaining conflicting records in students table', conflict_count;
    
    IF conflict_count > 0 THEN
        -- Clean up any remaining orphaned student records
        -- (These would be students not linked to classes, or missed in previous cleanup)
        
        -- Delete from dependent tables first
        DELETE FROM scores WHERE student_id IN (
            SELECT id FROM students WHERE grade < 1 OR grade > 6
        );
        DELETE FROM student_courses WHERE student_id IN (
            SELECT id FROM students WHERE grade < 1 OR grade > 6
        );
        
        -- Finally delete the students
        DELETE FROM students WHERE grade < 1 OR grade > 6;
        
        RAISE NOTICE 'Deleted % remaining conflicting students and related data', conflict_count;
    ELSE
        RAISE NOTICE 'No remaining conflicting records found in students table';
    END IF;
END $$;

-- 1d. Clean remaining assessment_titles table conflicts (non-class-specific ones)
SELECT 'Cleaning remaining assessment_titles table conflicts...' as action;
DO $$
DECLARE
    conflict_count INTEGER;
BEGIN
    -- Count remaining conflicts (after class-specific ones were deleted in step 1b)
    SELECT COUNT(*) INTO conflict_count 
    FROM assessment_titles 
    WHERE grade IS NOT NULL AND (grade < 1 OR grade > 6);
    
    RAISE NOTICE 'Found % remaining conflicting records in assessment_titles table', conflict_count;
    
    IF conflict_count > 0 THEN
        -- These would be global assessment titles not tied to specific classes
        -- Set conflicting grades to NULL (safe approach for global settings)
        UPDATE assessment_titles 
        SET grade = NULL 
        WHERE grade IS NOT NULL AND (grade < 1 OR grade > 6);
        
        RAISE NOTICE 'Updated % assessment_titles records: set conflicting grades to NULL', conflict_count;
    ELSE
        RAISE NOTICE 'No remaining conflicting records found in assessment_titles table';
    END IF;
END $$;

-- Step 2: Now safely apply the new constraints
SELECT 'Step 2: Applying new grade constraints...' as step;

-- 2a. Update users table constraint
SELECT 'Updating users table grade constraint...' as action;
DO $$
BEGIN
    -- Drop existing constraint if exists
    BEGIN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_grade_check;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;
    
    -- Add new constraint
    ALTER TABLE users ADD CONSTRAINT users_grade_check 
    CHECK (grade IS NULL OR (grade BETWEEN 1 AND 6));
    
    RAISE NOTICE 'Successfully updated users table grade constraint to 1-6';
END $$;

-- 2b. Update classes table constraint
SELECT 'Updating classes table grade constraint...' as action;
DO $$
BEGIN
    -- Drop existing constraint if exists
    BEGIN
        ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_grade_check;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;
    
    -- Add new constraint
    ALTER TABLE classes ADD CONSTRAINT classes_grade_check 
    CHECK (grade BETWEEN 1 AND 6);
    
    RAISE NOTICE 'Successfully updated classes table grade constraint to 1-6';
END $$;

-- 2c. Update students table constraint
SELECT 'Updating students table grade constraint...' as action;
DO $$
BEGIN
    -- Drop existing constraint if exists
    BEGIN
        ALTER TABLE students DROP CONSTRAINT IF EXISTS students_grade_check;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;
    
    -- Add new constraint
    ALTER TABLE students ADD CONSTRAINT students_grade_check 
    CHECK (grade BETWEEN 1 AND 6);
    
    RAISE NOTICE 'Successfully updated students table grade constraint to 1-6';
END $$;

-- 2d. Update assessment_titles table constraint
SELECT 'Updating assessment_titles table grade constraint...' as action;
DO $$
BEGIN
    -- Drop existing constraint if exists
    BEGIN
        ALTER TABLE assessment_titles DROP CONSTRAINT IF EXISTS assessment_titles_grade_check;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;
    
    -- Add new constraint
    ALTER TABLE assessment_titles ADD CONSTRAINT assessment_titles_grade_check 
    CHECK (grade IS NULL OR (grade BETWEEN 1 AND 6));
    
    RAISE NOTICE 'Successfully updated assessment_titles table grade constraint to 1-6';
END $$;

-- Step 3: Verify new constraints
SELECT 'Step 3: Verifying new constraints...' as step;
SELECT 
    table_name,
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%grade_check'
ORDER BY table_name;

-- Step 4: Test constraints with sample data
SELECT 'Step 4: Testing new constraints...' as step;
DO $$
BEGIN
    -- Test primary school grades (should succeed)
    BEGIN
        INSERT INTO classes (name, grade, track, academic_year) 
        VALUES ('TEST_PRIMARY_G3', 3, 'local', '24-25');
        DELETE FROM classes WHERE name = 'TEST_PRIMARY_G3';
        RAISE NOTICE 'SUCCESS: Primary school grade 3 accepted';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'ERROR: Primary school grade 3 rejected';
    END;
    
    -- Test middle school grades (should fail)
    BEGIN
        INSERT INTO classes (name, grade, track, academic_year) 
        VALUES ('TEST_MIDDLE_G8', 8, 'local', '24-25');
        DELETE FROM classes WHERE name = 'TEST_MIDDLE_G8';
        RAISE NOTICE 'ERROR: Middle school grade 8 incorrectly accepted';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'SUCCESS: Middle school grade 8 correctly rejected';
    END;
END $$;

SELECT '=== Primary School Grade Constraints Migration Complete ===' as status;
SELECT 'Database now supports only primary school grades 1-6 (G1-G6)' as result;
SELECT 'All conflicting data has been safely cleaned' as cleanup_status;
SELECT 'Ready for primary school CSV data import' as next_step;