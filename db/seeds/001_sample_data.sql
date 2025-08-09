-- Sample data for LMS-ESID development and testing
-- Creates realistic test data for all roles and scenarios

-- Insert sample users (these would normally be created via Supabase Auth)
-- Note: In production, these IDs would come from auth.users
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

-- Insert sample classes
INSERT INTO classes (id, name, grade, track, teacher_id, academic_year) VALUES
  -- Grade 7 classes
  ('10000000-0000-0000-0000-000000000001', '7A Local English', 7, 'local', '00000000-0000-0000-0000-000000000011', '2024'),
  ('10000000-0000-0000-0000-000000000002', '7B Local English', 7, 'local', '00000000-0000-0000-0000-000000000012', '2024'),
  ('10000000-0000-0000-0000-000000000003', '7A International English', 7, 'international', '00000000-0000-0000-0000-000000000021', '2024'),
  ('10000000-0000-0000-0000-000000000004', '7B International English', 7, 'international', '00000000-0000-0000-0000-000000000022', '2024'),
  
  -- Grade 12 classes
  ('10000000-0000-0000-0000-000000000011', '12A Local English', 12, 'local', '00000000-0000-0000-0000-000000000011', '2024'),
  ('10000000-0000-0000-0000-000000000012', '12A International English', 12, 'international', '00000000-0000-0000-0000-000000000021', '2024');

-- Insert sample students
INSERT INTO students (id, student_id, full_name, grade, track, class_id) VALUES
  -- Grade 7 Local students
  ('20000000-0000-0000-0000-000000000001', 'STU-7L-001', 'Alice Chen', 7, 'local', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'STU-7L-002', 'Bob Li', 7, 'local', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', 'STU-7L-003', 'Carol Wang', 7, 'local', '10000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000004', 'STU-7L-004', 'David Zhang', 7, 'local', '10000000-0000-0000-0000-000000000002'),
  
  -- Grade 7 International students
  ('20000000-0000-0000-0000-000000000011', 'STU-7I-001', 'Emma Johnson', 7, 'international', '10000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000012', 'STU-7I-002', 'Frank Smith', 7, 'international', '10000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000013', 'STU-7I-003', 'Grace Wilson', 7, 'international', '10000000-0000-0000-0000-000000000004'),
  ('20000000-0000-0000-0000-000000000014', 'STU-7I-004', 'Henry Davis', 7, 'international', '10000000-0000-0000-0000-000000000004'),
  
  -- Grade 12 students
  ('20000000-0000-0000-0000-000000000021', 'STU-12L-001', 'Ivy Liu', 12, 'local', '10000000-0000-0000-0000-000000000011'),
  ('20000000-0000-0000-0000-000000000022', 'STU-12L-002', 'Jack Wu', 12, 'local', '10000000-0000-0000-0000-000000000011'),
  ('20000000-0000-0000-0000-000000000031', 'STU-12I-001', 'Kate Brown', 12, 'international', '10000000-0000-0000-0000-000000000012'),
  ('20000000-0000-0000-0000-000000000032', 'STU-12I-002', 'Liam Miller', 12, 'international', '10000000-0000-0000-0000-000000000012');

-- Insert sample exams
INSERT INTO exams (id, name, description, class_id, exam_date, is_published, created_by) VALUES
  -- Grade 7 Local exams
  ('30000000-0000-0000-0000-000000000001', 'Term 1 Assessment', 'First term comprehensive assessment', '10000000-0000-0000-0000-000000000001', '2024-03-15', true, '00000000-0000-0000-0000-000000000011'),
  ('30000000-0000-0000-0000-000000000002', 'Term 2 Assessment', 'Second term comprehensive assessment', '10000000-0000-0000-0000-000000000001', '2024-06-15', true, '00000000-0000-0000-0000-000000000011'),
  
  -- Grade 7 International exams
  ('30000000-0000-0000-0000-000000000011', 'Semester 1 Exam', 'First semester examination', '10000000-0000-0000-0000-000000000003', '2024-04-20', true, '00000000-0000-0000-0000-000000000021'),
  
  -- Grade 12 exams
  ('30000000-0000-0000-0000-000000000021', 'Final Year Assessment', 'Comprehensive final year assessment', '10000000-0000-0000-0000-000000000011', '2024-05-30', true, '00000000-0000-0000-0000-000000000011');

-- Insert sample scores (showing various scenarios)
INSERT INTO scores (student_id, exam_id, assessment_code, score, entered_by) VALUES
  -- Alice Chen (STU-7L-001) - Complete scores
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'FA1', 85.5, '00000000-0000-0000-0000-000000000011'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'FA2', 78.0, '00000000-0000-0000-0000-000000000011'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'FA3', 92.5, '00000000-0000-0000-0000-000000000011'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'SA1', 88.0, '00000000-0000-0000-0000-000000000011'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'SA2', 91.5, '00000000-0000-0000-0000-000000000011'),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'FINAL', 89.0, '00000000-0000-0000-0000-000000000011'),
  
  -- Bob Li (STU-7L-002) - Partial scores (some missing)
  ('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'FA1', 72.0, '00000000-0000-0000-0000-000000000011'),
  ('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'FA3', 80.5, '00000000-0000-0000-0000-000000000011'),
  ('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'SA1', 75.0, '00000000-0000-0000-0000-000000000011'),
  ('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'FINAL', 77.5, '00000000-0000-0000-0000-000000000011'),
  
  -- Carol Wang (STU-7L-003) - Mix of scores including some 0s (should be excluded from averages)
  ('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'FA1', 0, '00000000-0000-0000-0000-000000000012'), -- Should be excluded
  ('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'FA2', 95.0, '00000000-0000-0000-0000-000000000012'),
  ('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'FA4', 87.5, '00000000-0000-0000-0000-000000000012'),
  ('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'SA1', 90.0, '00000000-0000-0000-0000-000000000012'),
  ('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'SA2', 0, '00000000-0000-0000-0000-000000000012'), -- Should be excluded
  ('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'FINAL', 85.5, '00000000-0000-0000-0000-000000000012'),
  
  -- Emma Johnson (STU-7I-001) - International student scores
  ('20000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000011', 'FA1', 88.5, '00000000-0000-0000-0000-000000000021'),
  ('20000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000011', 'FA2', 92.0, '00000000-0000-0000-0000-000000000021'),
  ('20000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000011', 'SA1', 94.5, '00000000-0000-0000-0000-000000000021'),
  ('20000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000011', 'FINAL', 91.0, '00000000-0000-0000-0000-000000000021');

-- Insert sample assessment title overrides (HT feature)
INSERT INTO assessment_titles (assessment_code, display_name, context, class_id, grade, track, created_by) VALUES
  -- Default overrides
  ('FA1', 'Reading Comprehension 1', 'default', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000001'),
  ('FA2', 'Writing Assessment 1', 'default', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000001'),
  ('SA1', 'Midterm Examination', 'default', NULL, NULL, NULL, '00000000-0000-0000-0000-000000000001'),
  
  -- Grade 7 Local track specific
  ('FA1', 'Local Reading Test 1', 'grade_track', NULL, 7, 'local', '00000000-0000-0000-0000-000000000002'),
  ('SA1', 'Local Midterm Assessment', 'grade_track', NULL, 7, 'local', '00000000-0000-0000-0000-000000000002'),
  
  -- Grade 7 International track specific
  ('FA1', 'International Reading Assessment 1', 'grade_track', NULL, 7, 'international', '00000000-0000-0000-0000-000000000003'),
  ('SA1', 'International Midterm Exam', 'grade_track', NULL, 7, 'international', '00000000-0000-0000-0000-000000000003'),
  
  -- Class-specific override (7A Local English)
  ('FINAL', 'Term Final Examination', 'class', '10000000-0000-0000-0000-000000000001', NULL, NULL, '00000000-0000-0000-0000-000000000002');