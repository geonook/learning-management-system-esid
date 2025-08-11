-- Fixed Sample data for LMS-ESID development and testing
-- Handles foreign key constraint issues with auth.users

-- ⚠️ IMPORTANT: This script temporarily disables foreign key constraints for development
-- In production, users should be created through Supabase Auth first

-- Step 1: Temporarily disable the foreign key constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Step 2: Insert sample users for testing
-- Note: In production, these IDs would come from real auth.users entries
INSERT INTO users (id, email, full_name, role, teacher_type, grade, track) VALUES
  -- Admin users
  ('00000000-0000-0000-0000-000000000001', 'admin@school.edu', 'System Administrator', 'admin', NULL, NULL, NULL),
  
  -- Head teachers (by grade and track)
  ('00000000-0000-0000-0000-000000000002', 'head.g7.local@school.edu', 'Grade 7 Local Head', 'head', 'LT', 7, 'local'),
  ('00000000-0000-0000-0000-000000000003', 'head.g7.intl@school.edu', 'Grade 7 International Head', 'head', 'IT', 7, 'international'),
  ('00000000-0000-0000-0000-000000000004', 'head.g12.local@school.edu', 'Grade 12 Local Head', 'head', 'LT', 12, 'local'),
  
  -- Local Teachers (LT)
  ('00000000-0000-0000-0000-000000000011', 'teacher.lt.1@school.edu', 'Local Teacher One', 'teacher', 'LT', NULL, NULL),
  ('00000000-0000-0000-0000-000000000012', 'teacher.lt.2@school.edu', 'Local Teacher Two', 'teacher', 'LT', NULL, NULL),
  
  -- International Teachers (IT)
  ('00000000-0000-0000-0000-000000000021', 'teacher.it.1@school.edu', 'International Teacher One', 'teacher', 'IT', NULL, NULL),
  ('00000000-0000-0000-0000-000000000022', 'teacher.it.2@school.edu', 'International Teacher Two', 'teacher', 'IT', NULL, NULL),
  
  -- KCFS Teachers
  ('00000000-0000-0000-0000-000000000031', 'teacher.kcfs.1@school.edu', 'KCFS Teacher One', 'teacher', 'KCFS', NULL, NULL);

-- Step 3: Insert sample classes
INSERT INTO classes (id, name, grade, track, teacher_id, academic_year) VALUES
  -- Grade 7 classes
  ('10000000-0000-0000-0000-000000000001', '7A Local English', 7, 'local', '00000000-0000-0000-0000-000000000011', '2024'),
  ('10000000-0000-0000-0000-000000000002', '7B Local English', 7, 'local', '00000000-0000-0000-0000-000000000012', '2024'),
  ('10000000-0000-0000-0000-000000000003', '7A International English', 7, 'international', '00000000-0000-0000-0000-000000000021', '2024'),
  
  -- Grade 8 classes  
  ('10000000-0000-0000-0000-000000000004', '8A Local English', 8, 'local', '00000000-0000-0000-0000-000000000011', '2024'),
  ('10000000-0000-0000-0000-000000000005', '8B International English', 8, 'international', '00000000-0000-0000-0000-000000000022', '2024'),
  
  -- Grade 12 classes
  ('10000000-0000-0000-0000-000000000006', '12A Local English', 12, 'local', '00000000-0000-0000-0000-000000000012', '2024'),
  ('10000000-0000-0000-0000-000000000007', '12A KCFS', 12, 'local', '00000000-0000-0000-0000-000000000031', '2024');

-- Step 4: Insert sample students
INSERT INTO students (id, student_id, full_name, grade, track, class_id) VALUES
  -- Grade 7 Local students
  ('20000000-0000-0000-0000-000000000001', 'STU001', 'Alice Chen', 7, 'local', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'STU002', 'Bob Wang', 7, 'local', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', 'STU003', 'Carol Liu', 7, 'local', '10000000-0000-0000-0000-000000000002'),
  
  -- Grade 7 International students
  ('20000000-0000-0000-0000-000000000011', 'STU011', 'David Smith', 7, 'international', '10000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000012', 'STU012', 'Emma Johnson', 7, 'international', '10000000-0000-0000-0000-000000000003'),
  
  -- Grade 8 students
  ('20000000-0000-0000-0000-000000000021', 'STU021', 'Frank Zhang', 8, 'local', '10000000-0000-0000-0000-000000000004'),
  ('20000000-0000-0000-0000-000000000022', 'STU022', 'Grace Wilson', 8, 'international', '10000000-0000-0000-0000-000000000005'),
  
  -- Grade 12 students  
  ('20000000-0000-0000-0000-000000000031', 'STU031', 'Henry Lee', 12, 'local', '10000000-0000-0000-0000-000000000006'),
  ('20000000-0000-0000-0000-000000000032', 'STU032', 'Isabel Wong', 12, 'local', '10000000-0000-0000-0000-000000000007');

-- Step 5: Insert sample exams
INSERT INTO exams (id, name, description, class_id, exam_date, is_published, created_by) VALUES
  ('30000000-0000-0000-0000-000000000001', 'Grade 7 Mid-Term Exam', 'First semester mid-term assessment', '10000000-0000-0000-0000-000000000001', '2024-10-15', true, '00000000-0000-0000-0000-000000000011'),
  ('30000000-0000-0000-0000-000000000002', 'Grade 8 Final Exam', 'First semester final assessment', '10000000-0000-0000-0000-000000000004', '2024-12-15', true, '00000000-0000-0000-0000-000000000011'),
  ('30000000-0000-0000-0000-000000000003', 'Grade 12 Mock Exam', 'University entrance preparation', '10000000-0000-0000-0000-000000000006', '2024-11-01', false, '00000000-0000-0000-0000-000000000012');

-- Step 6: Insert sample scores
INSERT INTO scores (student_id, exam_id, assessment_code, score, entered_by) VALUES
  -- Grade 7 Mid-Term scores
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'FA1', 85.0, '00000000-0000-0000-0000-000000000011'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'FA2', 88.5, '00000000-0000-0000-0000-000000000011'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'SA1', 82.0, '00000000-0000-0000-0000-000000000011'),
  
  ('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'FA1', 76.5, '00000000-0000-0000-0000-000000000011'),
  ('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'FA2', 79.0, '00000000-0000-0000-0000-000000000011'),
  ('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'SA1', 74.5, '00000000-0000-0000-0000-000000000011'),
  
  -- Grade 8 Final scores
  ('20000000-0000-0000-0000-000000000021', '30000000-0000-0000-0000-000000000002', 'FA3', 92.0, '00000000-0000-0000-0000-000000000011'),
  ('20000000-0000-0000-0000-000000000021', '30000000-0000-0000-0000-000000000002', 'SA2', 89.5, '00000000-0000-0000-0000-000000000011'),
  ('20000000-0000-0000-0000-000000000021', '30000000-0000-0000-0000-000000000002', 'FINAL', 91.0, '00000000-0000-0000-0000-000000000011');

-- Step 7: Insert sample assessment title overrides
INSERT INTO assessment_titles (assessment_code, display_name, context, class_id, created_by) VALUES
  ('FA1', 'First Formative Assessment', 'class', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011'),
  ('SA1', 'Mid-Semester Assessment', 'class', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011');

INSERT INTO assessment_titles (assessment_code, display_name, context, grade, track, created_by) VALUES
  ('FINAL', 'Year-End Examination', 'grade_track', 12, 'local', '00000000-0000-0000-0000-000000000004');

-- Step 8: Add some additional academic years for testing
INSERT INTO classes (id, name, grade, track, teacher_id, academic_year) VALUES
  ('10000000-0000-0000-0000-000000000101', '7A Local English', 7, 'local', '00000000-0000-0000-0000-000000000011', '2025'),
  ('10000000-0000-0000-0000-000000000102', '8A International English', 8, 'international', '00000000-0000-0000-0000-000000000021', '2025');

-- ✅ Data insertion complete!
-- ⚠️ Note: Foreign key constraint to auth.users has been removed for testing
-- 💡 For production: Create users through Supabase Auth first, then re-enable the constraint:
-- ALTER TABLE users ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;