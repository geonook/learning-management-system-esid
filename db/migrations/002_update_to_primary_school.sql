-- Migration: Update LMS system from secondary (G7-G12) to primary school (G1-G6)
-- Adds Level system (E1, E2, E3) and adjusts grade ranges

-- Step 1: Create Level enum type
CREATE TYPE level_type AS ENUM ('E1', 'E2', 'E3');

-- Step 2: Add level column to classes table
ALTER TABLE classes ADD COLUMN level level_type;

-- Step 3: Add level column to students table (inherited from class)
ALTER TABLE students ADD COLUMN level level_type;

-- Step 4: Update grade constraints for primary school (1-6)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_grade_check;
ALTER TABLE users ADD CONSTRAINT users_grade_check CHECK (grade BETWEEN 1 AND 6);

ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_grade_check;
ALTER TABLE classes ADD CONSTRAINT classes_grade_check CHECK (grade BETWEEN 1 AND 6);

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_grade_check;
ALTER TABLE students ADD CONSTRAINT students_grade_check CHECK (grade BETWEEN 1 AND 6);

-- Step 5: Add assessment_titles grade constraint for primary school
ALTER TABLE assessment_titles DROP CONSTRAINT IF EXISTS assessment_titles_grade_check;
ALTER TABLE assessment_titles ADD CONSTRAINT assessment_titles_grade_check CHECK (grade BETWEEN 1 AND 6);

-- Step 6: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_classes_level ON classes(level);
CREATE INDEX IF NOT EXISTS idx_students_level ON students(level);
CREATE INDEX IF NOT EXISTS idx_classes_grade_level ON classes(grade, level);

-- Step 7: Update class naming to support standard format (e.g., "G1 Trailblazers")
-- Add constraint to ensure proper naming format
ALTER TABLE classes ADD CONSTRAINT classes_name_format_check 
CHECK (name ~ '^G[1-6] (Trailblazers|Discoverers|Adventurers|Innovators|Explorers|Navigators|Inventors|Voyagers|Pioneers|Guardians|Pathfinders|Seekers|Visionaries|Achievers)$');

-- Step 8: Create view for standard class names mapping
CREATE OR REPLACE VIEW standard_class_names AS
SELECT 
  grade,
  unnest(ARRAY[
    'Trailblazers', 'Discoverers', 'Adventurers', 'Innovators', 
    'Explorers', 'Navigators', 'Inventors', 'Voyagers',
    'Pioneers', 'Guardians', 'Pathfinders', 'Seekers', 
    'Visionaries', 'Achievers'
  ]) AS class_base_name,
  'G' || grade || ' ' || unnest(ARRAY[
    'Trailblazers', 'Discoverers', 'Adventurers', 'Innovators',
    'Explorers', 'Navigators', 'Inventors', 'Voyagers', 
    'Pioneers', 'Guardians', 'Pathfinders', 'Seekers',
    'Visionaries', 'Achievers'
  ]) AS full_class_name
FROM generate_series(1, 6) AS grade;

-- Step 9: Add comments for documentation
COMMENT ON TYPE level_type IS 'Academic performance levels: E1 (highest), E2 (middle), E3 (foundation)';
COMMENT ON COLUMN classes.level IS 'Academic level classification for the class';
COMMENT ON COLUMN students.level IS 'Academic level inherited from class assignment';
COMMENT ON VIEW standard_class_names IS 'Standard class naming convention for G1-G6 with 14 base names per grade';

-- Migration completed successfully
-- Next steps: Update seed data and CSV import validation