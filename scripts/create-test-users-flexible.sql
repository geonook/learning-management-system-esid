-- Flexible Test Users Setup for LMS-ESID
-- This script works with existing Auth users or creates new ones

-- First, let's see what Auth users exist
SELECT 'Existing Auth users:' as message;
SELECT id, email, created_at FROM auth.users WHERE email LIKE '%@esid.edu' ORDER BY created_at;

-- Create a temporary table to map emails to UUIDs
CREATE TEMP TABLE user_mapping AS
SELECT 
  email,
  id,
  CASE 
    WHEN email = 'admin@esid.edu' THEN 'admin'
    WHEN email = 'head@esid.edu' THEN 'head' 
    WHEN email = 'teacher@esid.edu' THEN 'teacher'
    ELSE 'unknown'
  END as role_type
FROM auth.users 
WHERE email IN ('admin@esid.edu', 'head@esid.edu', 'teacher@esid.edu');

-- Show the mapping
SELECT 'User ID mapping:' as message;
SELECT * FROM user_mapping;

-- Insert users data using actual Auth UUIDs
INSERT INTO users (id, email, full_name, role, teacher_type, grade, track, is_active)
SELECT 
  um.id,
  um.email,
  CASE 
    WHEN um.role_type = 'admin' THEN 'System Administrator'
    WHEN um.role_type = 'head' THEN 'Head Teacher Grade 10'
    WHEN um.role_type = 'teacher' THEN 'Math Teacher'
    ELSE 'Unknown User'
  END as full_name,
  CASE 
    WHEN um.role_type = 'admin' THEN 'admin'::user_role
    WHEN um.role_type = 'head' THEN 'head'::user_role
    WHEN um.role_type = 'teacher' THEN 'teacher'::user_role
    ELSE 'teacher'::user_role
  END as role,
  CASE 
    WHEN um.role_type = 'teacher' THEN 'LT'::teacher_type
    ELSE NULL
  END as teacher_type,
  CASE 
    WHEN um.role_type = 'head' THEN 10
    ELSE NULL
  END as grade,
  CASE 
    WHEN um.role_type = 'head' THEN 'local'::track_type
    ELSE NULL
  END as track,
  TRUE as is_active
FROM user_mapping um
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  teacher_type = EXCLUDED.teacher_type,
  grade = EXCLUDED.grade,
  track = EXCLUDED.track;

-- Get the teacher's UUID for class creation
WITH teacher_uuid AS (
  SELECT id FROM user_mapping WHERE role_type = 'teacher' LIMIT 1
)
-- Test Classes for the teacher
INSERT INTO classes (
  id,
  name,
  grade,
  track,
  teacher_id,
  academic_year,
  is_active
)
SELECT 
  '10000000-0000-0000-0000-000000000001'::uuid,
  '10A Local',
  10,
  'local'::track_type,
  teacher_uuid.id,
  '2024',
  TRUE
FROM teacher_uuid
UNION ALL
SELECT 
  '10000000-0000-0000-0000-000000000002'::uuid,
  '10B Local',
  10,
  'local'::track_type,
  teacher_uuid.id,
  '2024',
  TRUE
FROM teacher_uuid
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  teacher_id = EXCLUDED.teacher_id;

-- Test Students for the classes
INSERT INTO students (
  id,
  student_id,
  full_name,
  grade,
  track,
  class_id,
  is_active
) VALUES
  -- Students in Class 10A Local
  (
    '20000000-0000-0000-0000-000000000001',
    'S2024001',
    'Alice Chen',
    10,
    'local',
    '10000000-0000-0000-0000-000000000001',
    TRUE
  ),
  (
    '20000000-0000-0000-0000-000000000002', 
    'S2024002',
    'Bob Wang',
    10,
    'local',
    '10000000-0000-0000-0000-000000000001',
    TRUE
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    'S2024003',
    'Carol Liu',
    10,
    'local',
    '10000000-0000-0000-0000-000000000001',
    TRUE
  ),
  -- Students in Class 10B Local
  (
    '20000000-0000-0000-0000-000000000004',
    'S2024004',
    'David Lin',
    10,
    'local',
    '10000000-0000-0000-0000-000000000002',
    TRUE
  ),
  (
    '20000000-0000-0000-0000-000000000005',
    'S2024005',
    'Emily Zhang',
    10,
    'local',
    '10000000-0000-0000-0000-000000000002',
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  student_id = EXCLUDED.student_id,
  full_name = EXCLUDED.full_name,
  class_id = EXCLUDED.class_id;

-- Test Exams
WITH teacher_uuid AS (
  SELECT id FROM user_mapping WHERE role_type = 'teacher' LIMIT 1
)
INSERT INTO exams (
  id,
  name,
  description,
  class_id,
  exam_date,
  is_published,
  created_by
)
SELECT 
  '30000000-0000-0000-0000-000000000001'::uuid,
  'Mid-term Math Exam',
  'First semester mathematics examination',
  '10000000-0000-0000-0000-000000000001'::uuid,
  '2024-03-15'::date,
  TRUE,
  teacher_uuid.id
FROM teacher_uuid
UNION ALL
SELECT 
  '30000000-0000-0000-0000-000000000002'::uuid,
  'Mid-term Math Exam',
  'First semester mathematics examination',
  '10000000-0000-0000-0000-000000000002'::uuid,
  '2024-03-15'::date,
  TRUE,
  teacher_uuid.id
FROM teacher_uuid
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  created_by = EXCLUDED.created_by;

-- Test Scores (sample data)
WITH teacher_uuid AS (
  SELECT id FROM user_mapping WHERE role_type = 'teacher' LIMIT 1
)
INSERT INTO scores (
  id,
  student_id,
  exam_id,
  assessment_code,
  score,
  entered_by
)
SELECT 
  '40000000-0000-0000-0000-000000000001'::uuid,
  '20000000-0000-0000-0000-000000000001'::uuid,
  '30000000-0000-0000-0000-000000000001'::uuid,
  'FA1',
  85.5,
  teacher_uuid.id
FROM teacher_uuid
UNION ALL
SELECT 
  '40000000-0000-0000-0000-000000000002'::uuid,
  '20000000-0000-0000-0000-000000000001'::uuid,
  '30000000-0000-0000-0000-000000000001'::uuid,
  'SA1',
  88.0,
  teacher_uuid.id
FROM teacher_uuid
UNION ALL
SELECT 
  '40000000-0000-0000-0000-000000000003'::uuid,
  '20000000-0000-0000-0000-000000000002'::uuid,
  '30000000-0000-0000-0000-000000000001'::uuid,
  'FA1',
  78.5,
  teacher_uuid.id
FROM teacher_uuid
UNION ALL
SELECT 
  '40000000-0000-0000-0000-000000000004'::uuid,
  '20000000-0000-0000-0000-000000000002'::uuid,
  '30000000-0000-0000-0000-000000000001'::uuid,
  'SA1',
  82.0,
  teacher_uuid.id
FROM teacher_uuid
ON CONFLICT (student_id, exam_id, assessment_code) DO UPDATE SET
  id = EXCLUDED.id,
  score = EXCLUDED.score,
  entered_by = EXCLUDED.entered_by;

-- Display final results
SELECT 'Test setup completed!' as message;

SELECT 'Users created/updated:' as message;
SELECT u.email, u.full_name, u.role, u.teacher_type, u.grade, u.track 
FROM users u 
WHERE u.email IN ('admin@esid.edu', 'head@esid.edu', 'teacher@esid.edu');

SELECT 'Classes created:' as message;
SELECT c.name, c.grade, c.track, u.full_name as teacher_name
FROM classes c
LEFT JOIN users u ON c.teacher_id = u.id
WHERE c.id IN (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002'
);

SELECT 'Students created:' as message;
SELECT s.student_id, s.full_name, s.grade, s.track, c.name as class_name
FROM students s
LEFT JOIN classes c ON s.class_id = c.id
WHERE s.id IN (
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000005'
);

SELECT 'Sample scores created:' as message;
SELECT s.full_name as student_name, sc.assessment_code, sc.score
FROM scores sc
JOIN students s ON sc.student_id = s.id
WHERE sc.id IN (
  '40000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000003',
  '40000000-0000-0000-0000-000000000004'
);

-- Clean up temp table
DROP TABLE user_mapping;

SELECT '
✅ Setup completed! You can now:
1. Login with: admin@esid.edu, head@esid.edu, teacher@esid.edu
2. Test at: /test-views-auth
3. Admin sees all data, Head sees Grade 10 Local, Teacher sees their classes
' as instructions;