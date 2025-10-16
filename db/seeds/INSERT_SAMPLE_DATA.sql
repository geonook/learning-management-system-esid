-- ========================================
-- LMS-ESID Sample Test Data
-- ========================================
-- Purpose: Create sample data for testing
-- Includes: Teachers, Classes, Courses, Students, Exams, Scores
-- Grade Range: G1-G6 (Primary School)
-- ========================================

-- ========================================
-- STEP 1: Create Teachers (3 types: LT, IT, KCFS)
-- ========================================
-- Note: You need to create these users in Supabase Authentication first,
-- then use their UIDs here. These are placeholder UUIDs.

-- For now, let's create placeholders that you can update with real UIDs later

-- LT Teacher (Local Teacher)
INSERT INTO users (id, email, full_name, role, teacher_type, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'lt.teacher@lms-esid.com', 'Local Teacher 1', 'teacher', 'LT', true)
ON CONFLICT (id) DO NOTHING;

-- IT Teacher (International Teacher)
INSERT INTO users (id, email, full_name, role, teacher_type, is_active) VALUES
('22222222-2222-2222-2222-222222222222', 'it.teacher@lms-esid.com', 'International Teacher 1', 'teacher', 'IT', true)
ON CONFLICT (id) DO NOTHING;

-- KCFS Teacher (Future Skills Teacher)
INSERT INTO users (id, email, full_name, role, teacher_type, is_active) VALUES
('33333333-3333-3333-3333-333333333333', 'kcfs.teacher@lms-esid.com', 'KCFS Teacher 1', 'teacher', 'KCFS', true)
ON CONFLICT (id) DO NOTHING;

-- Head Teacher (Local Campus, Grade 1)
INSERT INTO users (id, email, full_name, role, teacher_type, grade, track, is_active) VALUES
('44444444-4444-4444-4444-444444444444', 'head.local@lms-esid.com', 'Head Teacher Local', 'head', NULL, 1, 'local', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STEP 2: Create Sample Classes (G1-G6)
-- ========================================

INSERT INTO classes (id, name, grade, level, track, academic_year, is_active) VALUES
-- Grade 1 Classes
('c1111111-1111-1111-1111-111111111111', 'G1 Trailblazers', 1, 'E1', 'local', '2025-26', true),
('c1111111-1111-1111-1111-111111111112', 'G1 Discoverers', 1, 'E2', 'international', true),

-- Grade 2 Classes
('c2222222-2222-2222-2222-222222222221', 'G2 Adventurers', 2, 'E1', 'local', '2025-26', true),
('c2222222-2222-2222-2222-222222222222', 'G2 Innovators', 2, 'E2', 'international', true),

-- Grade 3 Classes
('c3333333-3333-3333-3333-333333333331', 'G3 Explorers', 3, 'E1', 'local', '2025-26', true),
('c3333333-3333-3333-3333-333333333332', 'G3 Navigators', 3, 'E2', 'international', true),

-- Grade 4 Classes
('c4444444-4444-4444-4444-444444444441', 'G4 Inventors', 4, 'E1', 'local', '2025-26', true),
('c4444444-4444-4444-4444-444444444442', 'G4 Voyagers', 4, 'E2', 'international', true),

-- Grade 5 Classes
('c5555555-5555-5555-5555-555555555551', 'G5 Pioneers', 5, 'E1', 'local', '2025-26', true),
('c5555555-5555-5555-5555-555555555552', 'G5 Guardians', 5, 'E2', 'international', true),

-- Grade 6 Classes
('c6666666-6666-6666-6666-666666666661', 'G6 Pathfinders', 6, 'E1', 'local', '2025-26', true),
('c6666666-6666-6666-6666-666666666662', 'G6 Seekers', 6, 'E2', 'international', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STEP 3: Create Courses (3 per class: LT, IT, KCFS)
-- ========================================

-- G1 Trailblazers Courses
INSERT INTO courses (id, class_id, course_type, teacher_id, academic_year, is_active) VALUES
('co111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'LT', '11111111-1111-1111-1111-111111111111', '2025-26', true),
('co111111-1111-1111-1111-111111111112', 'c1111111-1111-1111-1111-111111111111', 'IT', '22222222-2222-2222-2222-222222222222', '2025-26', true),
('co111111-1111-1111-1111-111111111113', 'c1111111-1111-1111-1111-111111111111', 'KCFS', '33333333-3333-3333-3333-333333333333', '2025-26', true),

-- G1 Discoverers Courses
('co111111-1111-1111-1111-111111111121', 'c1111111-1111-1111-1111-111111111112', 'LT', '11111111-1111-1111-1111-111111111111', '2025-26', true),
('co111111-1111-1111-1111-111111111122', 'c1111111-1111-1111-1111-111111111112', 'IT', '22222222-2222-2222-2222-222222222222', '2025-26', true),
('co111111-1111-1111-1111-111111111123', 'c1111111-1111-1111-1111-111111111112', 'KCFS', '33333333-3333-3333-3333-333333333333', '2025-26', true),

-- G2 Adventurers Courses
('co222222-2222-2222-2222-222222222221', 'c2222222-2222-2222-2222-222222222221', 'LT', '11111111-1111-1111-1111-111111111111', '2025-26', true),
('co222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222221', 'IT', '22222222-2222-2222-2222-222222222222', '2025-26', true),
('co222222-2222-2222-2222-222222222223', 'c2222222-2222-2222-2222-222222222221', 'KCFS', '33333333-3333-3333-3333-333333333333', '2025-26', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STEP 4: Create Sample Students
-- ========================================

INSERT INTO students (id, student_id, full_name, grade, level, track, class_id, is_active) VALUES
-- G1 Trailblazers Students
('s1000001-0000-0000-0000-000000000001', 'S100001', 'Student Alice Chen', 1, 'E1', 'local', 'c1111111-1111-1111-1111-111111111111', true),
('s1000002-0000-0000-0000-000000000002', 'S100002', 'Student Bob Lin', 1, 'E1', 'local', 'c1111111-1111-1111-1111-111111111111', true),
('s1000003-0000-0000-0000-000000000003', 'S100003', 'Student Carol Wang', 1, 'E1', 'local', 'c1111111-1111-1111-1111-111111111111', true),

-- G1 Discoverers Students
('s1000011-0000-0000-0000-000000000011', 'S100011', 'Student David Lee', 1, 'E2', 'international', 'c1111111-1111-1111-1111-111111111112', true),
('s1000012-0000-0000-0000-000000000012', 'S100012', 'Student Emma Wu', 1, 'E2', 'international', 'c1111111-1111-1111-1111-111111111112', true),
('s1000013-0000-0000-0000-000000000013', 'S100013', 'Student Frank Chang', 1, 'E2', 'international', 'c1111111-1111-1111-1111-111111111112', true),

-- G2 Adventurers Students
('s2000001-0000-0000-0000-000000000001', 'S200001', 'Student Grace Liu', 2, 'E1', 'local', 'c2222222-2222-2222-2222-222222222221', true),
('s2000002-0000-0000-0000-000000000002', 'S200002', 'Student Henry Huang', 2, 'E1', 'local', 'c2222222-2222-2222-2222-222222222221', true),
('s2000003-0000-0000-0000-000000000003', 'S200003', 'Student Ivy Chen', 2, 'E1', 'local', 'c2222222-2222-2222-2222-222222222221', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STEP 5: Enroll Students in Courses
-- ========================================

-- G1 Trailblazers students in all 3 courses
INSERT INTO student_courses (student_id, course_id, is_active) VALUES
-- Student Alice Chen
('s1000001-0000-0000-0000-000000000001', 'co111111-1111-1111-1111-111111111111', true),
('s1000001-0000-0000-0000-000000000001', 'co111111-1111-1111-1111-111111111112', true),
('s1000001-0000-0000-0000-000000000001', 'co111111-1111-1111-1111-111111111113', true),
-- Student Bob Lin
('s1000002-0000-0000-0000-000000000002', 'co111111-1111-1111-1111-111111111111', true),
('s1000002-0000-0000-0000-000000000002', 'co111111-1111-1111-1111-111111111112', true),
('s1000002-0000-0000-0000-000000000002', 'co111111-1111-1111-1111-111111111113', true),
-- Student Carol Wang
('s1000003-0000-0000-0000-000000000003', 'co111111-1111-1111-1111-111111111111', true),
('s1000003-0000-0000-0000-000000000003', 'co111111-1111-1111-1111-111111111112', true),
('s1000003-0000-0000-0000-000000000003', 'co111111-1111-1111-1111-111111111113', true),

-- G1 Discoverers students
('s1000011-0000-0000-0000-000000000011', 'co111111-1111-1111-1111-111111111121', true),
('s1000011-0000-0000-0000-000000000011', 'co111111-1111-1111-1111-111111111122', true),
('s1000011-0000-0000-0000-000000000011', 'co111111-1111-1111-1111-111111111123', true),

-- G2 Adventurers students
('s2000001-0000-0000-0000-000000000001', 'co222222-2222-2222-2222-222222222221', true),
('s2000001-0000-0000-0000-000000000001', 'co222222-2222-2222-2222-222222222222', true),
('s2000001-0000-0000-0000-000000000001', 'co222222-2222-2222-2222-222222222223', true)
ON CONFLICT (student_id, course_id) DO NOTHING;

-- ========================================
-- STEP 6: Create Sample Exams
-- ========================================

INSERT INTO exams (id, course_id, name, description, exam_date, created_by, is_active) VALUES
-- G1 Trailblazers LT Course Exams
('e1111111-1111-1111-1111-111111111111', 'co111111-1111-1111-1111-111111111111', 'Midterm Assessment', 'First semester midterm', '2025-11-15', '11111111-1111-1111-1111-111111111111', true),
('e1111111-1111-1111-1111-111111111112', 'co111111-1111-1111-1111-111111111111', 'Final Assessment', 'First semester final', '2026-01-20', '11111111-1111-1111-1111-111111111111', true),

-- G1 Trailblazers IT Course Exams
('e1111111-1111-1111-1111-111111111121', 'co111111-1111-1111-1111-111111111112', 'Midterm Assessment', 'First semester midterm', '2025-11-15', '22222222-2222-2222-2222-222222222222', true),

-- G2 Adventurers LT Course Exams
('e2222222-2222-2222-2222-222222222221', 'co222222-2222-2222-2222-222222222221', 'Midterm Assessment', 'First semester midterm', '2025-11-15', '11111111-1111-1111-1111-111111111111', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STEP 7: Create Sample Scores
-- ========================================

INSERT INTO scores (student_id, exam_id, assessment_code, score, entered_by) VALUES
-- Alice Chen - Midterm scores (G1 LT)
('s1000001-0000-0000-0000-000000000001', 'e1111111-1111-1111-1111-111111111111', 'FA1', 85.50, '11111111-1111-1111-1111-111111111111'),
('s1000001-0000-0000-0000-000000000001', 'e1111111-1111-1111-1111-111111111111', 'FA2', 88.00, '11111111-1111-1111-1111-111111111111'),
('s1000001-0000-0000-0000-000000000001', 'e1111111-1111-1111-1111-111111111111', 'SA1', 90.00, '11111111-1111-1111-1111-111111111111'),

-- Bob Lin - Midterm scores (G1 LT)
('s1000002-0000-0000-0000-000000000002', 'e1111111-1111-1111-1111-111111111111', 'FA1', 78.00, '11111111-1111-1111-1111-111111111111'),
('s1000002-0000-0000-0000-000000000002', 'e1111111-1111-1111-1111-111111111111', 'FA2', 82.50, '11111111-1111-1111-1111-111111111111'),
('s1000002-0000-0000-0000-000000000002', 'e1111111-1111-1111-1111-111111111111', 'SA1', 85.00, '11111111-1111-1111-1111-111111111111'),

-- Carol Wang - Midterm scores (G1 LT)
('s1000003-0000-0000-0000-000000000003', 'e1111111-1111-1111-1111-111111111111', 'FA1', 92.00, '11111111-1111-1111-1111-111111111111'),
('s1000003-0000-0000-0000-000000000003', 'e1111111-1111-1111-1111-111111111111', 'FA2', 94.50, '11111111-1111-1111-1111-111111111111'),
('s1000003-0000-0000-0000-000000000003', 'e1111111-1111-1111-1111-111111111111', 'SA1', 95.00, '11111111-1111-1111-1111-111111111111'),

-- David Lee - IT Course scores
('s1000011-0000-0000-0000-000000000011', 'e1111111-1111-1111-1111-111111111121', 'FA1', 88.00, '22222222-2222-2222-2222-222222222222'),
('s1000011-0000-0000-0000-000000000011', 'e1111111-1111-1111-1111-111111111121', 'FA2', 90.00, '22222222-2222-2222-2222-222222222222'),
('s1000011-0000-0000-0000-000000000011', 'e1111111-1111-1111-1111-111111111121', 'SA1', 92.00, '22222222-2222-2222-2222-222222222222'),

-- Grace Liu - G2 scores
('s2000001-0000-0000-0000-000000000001', 'e2222222-2222-2222-2222-222222222221', 'FA1', 87.00, '11111111-1111-1111-1111-111111111111'),
('s2000001-0000-0000-0000-000000000001', 'e2222222-2222-2222-2222-222222222221', 'FA2', 89.50, '11111111-1111-1111-1111-111111111111'),
('s2000001-0000-0000-0000-000000000001', 'e2222222-2222-2222-2222-222222222221', 'SA1', 91.00, '11111111-1111-1111-1111-111111111111')
ON CONFLICT (student_id, exam_id, assessment_code) DO UPDATE SET
    score = EXCLUDED.score,
    entered_by = EXCLUDED.entered_by;

-- ========================================
-- DEPLOYMENT VERIFICATION
-- ========================================

-- Verify data counts
SELECT 'Users' AS table_name, COUNT(*) AS count FROM users
UNION ALL
SELECT 'Classes', COUNT(*) FROM classes
UNION ALL
SELECT 'Courses', COUNT(*) FROM courses
UNION ALL
SELECT 'Students', COUNT(*) FROM students
UNION ALL
SELECT 'Student Courses', COUNT(*) FROM student_courses
UNION ALL
SELECT 'Exams', COUNT(*) FROM exams
UNION ALL
SELECT 'Scores', COUNT(*) FROM scores
ORDER BY table_name;

-- ========================================
-- SAMPLE DATA DEPLOYMENT COMPLETE
-- ========================================
-- Summary:
-- - 5 Users (1 Admin + 3 Teachers + 1 Head)
-- - 12 Classes (G1-G6, Local + International)
-- - 9 Courses (3 classes × 3 course types)
-- - 9 Students (3 per test class)
-- - Student enrollments in courses
-- - 4 Exams
-- - 15 Sample scores
-- ========================================
