-- Create Test Users for LMS-ESID
-- These users can be used to test authentication and permissions

-- Note: You need to create the auth users first in Supabase Auth UI or via API
-- Then insert corresponding records in the users table with the same UUIDs

-- Test User 1: Admin
INSERT INTO users (
  id,
  email, 
  full_name,
  role,
  teacher_type,
  grade,
  track,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@esid.edu',
  'System Administrator', 
  'admin',
  NULL,
  NULL,
  NULL,
  TRUE
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Test User 2: Head Teacher (Grade 1 Local Track)  
INSERT INTO users (
  id,
  email,
  full_name, 
  role,
  teacher_type,
  grade,
  track,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'head@esid.edu',
  'Head Teacher Grade 1',
  'head', 
  NULL,
  1,
  'local',
  TRUE
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  grade = EXCLUDED.grade,
  track = EXCLUDED.track;

-- Test User 3: Regular Teacher (LT)
INSERT INTO users (
  id,
  email,
  full_name,
  role, 
  teacher_type,
  grade,
  track,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000003',
  'teacher@esid.edu',
  'English Teacher (LT)',
  'teacher',
  'LT',
  NULL,
  NULL,
  TRUE
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  teacher_type = EXCLUDED.teacher_type;

-- Test Classes for the teacher
INSERT INTO classes (
  id,
  name,
  grade,
  track,
  teacher_id,
  academic_year,
  is_active
) VALUES 
  (
    '10000000-0000-0000-0000-000000000001',
    'G1 Trailblazers',
    1,
    'local', 
    '00000000-0000-0000-0000-000000000003', -- English Teacher (LT)
    '24-25',
    TRUE
  ),
  (
    '10000000-0000-0000-0000-000000000002', 
    'G1 Discoverers',
    1,
    'international',
    '00000000-0000-0000-0000-000000000003', -- English Teacher (LT)
    '24-25',
    TRUE
  )
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
  -- Students in G1 Trailblazers (Local)
  (
    '20000000-0000-0000-0000-000000000001',
    'P001',
    'Alice Chen',
    1,
    'local',
    '10000000-0000-0000-0000-000000000001',
    TRUE
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'P002', 
    'Bob Wang',
    1,
    'local',
    '10000000-0000-0000-0000-000000000001',
    TRUE
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    'P003',
    'Carol Liu',
    1,
    'international',
    '10000000-0000-0000-0000-000000000002', 
    TRUE
  ),
  -- Students in G1 Discoverers (International)
  (
    '20000000-0000-0000-0000-000000000004',
    'P004',
    'David Lin',
    1,
    'international',
    '10000000-0000-0000-0000-000000000002',
    TRUE
  ),
  (
    '20000000-0000-0000-0000-000000000005',
    'P005',
    'Emily Zhang',
    1,
    'international',
    '10000000-0000-0000-0000-000000000002',
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  student_id = EXCLUDED.student_id,
  full_name = EXCLUDED.full_name,
  class_id = EXCLUDED.class_id;

-- Test Exams
INSERT INTO exams (
  id,
  name,
  description,
  class_id,
  exam_date,
  is_published,
  created_by
) VALUES
  (
    '30000000-0000-0000-0000-000000000001',
    'Mid-term English Exam',
    'First semester English examination',
    '10000000-0000-0000-0000-000000000001', -- G1 Trailblazers
    '2025-03-15',
    TRUE,
    '00000000-0000-0000-0000-000000000003' -- English Teacher (LT)
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    'Mid-term English Exam',
    'First semester English examination', 
    '10000000-0000-0000-0000-000000000002', -- G1 Discoverers
    '2025-03-15',
    TRUE,
    '00000000-0000-0000-0000-000000000003' -- English Teacher (LT)
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Test Scores (sample data)
INSERT INTO scores (
  id,
  student_id,
  exam_id,
  assessment_code,
  score,
  entered_by
) VALUES
  -- Alice Chen scores
  (
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001', -- Alice
    '30000000-0000-0000-0000-000000000001', -- Mid-term 10A
    'FA1',
    85.5,
    '00000000-0000-0000-0000-000000000003' -- English Teacher (LT)
  ),
  (
    '40000000-0000-0000-0000-000000000002', 
    '20000000-0000-0000-0000-000000000001', -- Alice
    '30000000-0000-0000-0000-000000000001', -- Mid-term 10A
    'SA1',
    88.0,
    '00000000-0000-0000-0000-000000000003' -- English Teacher (LT)
  ),
  -- Bob Wang scores
  (
    '40000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000002', -- Bob
    '30000000-0000-0000-0000-000000000001', -- Mid-term 10A
    'FA1',
    78.5,
    '00000000-0000-0000-0000-000000000003' -- English Teacher (LT)
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000002', -- Bob
    '30000000-0000-0000-0000-000000000001', -- Mid-term 10A
    'SA1', 
    82.0,
    '00000000-0000-0000-0000-000000000003' -- English Teacher (LT)
  )
ON CONFLICT (student_id, exam_id, assessment_code) DO UPDATE SET
  id = EXCLUDED.id,
  score = EXCLUDED.score,
  entered_by = EXCLUDED.entered_by;

-- Display created test data
SELECT 'Test Users Created:' as message;
SELECT email, full_name, role, teacher_type, grade, track 
FROM users 
WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002', 
  '00000000-0000-0000-0000-000000000003'
);

SELECT 'Test Classes Created:' as message;
SELECT name, grade, track, teacher_id
FROM classes
WHERE teacher_id = '00000000-0000-0000-0000-000000000003';

SELECT 'Test Students Created:' as message;
SELECT student_id, full_name, grade, track, class_id
FROM students  
WHERE class_id IN (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002'
);

-- Instructions for Supabase Auth setup
SELECT '
NEXT STEPS:
1. Go to Supabase Auth Users panel
2. Create these users manually:
   - admin@esid.edu (password: admin123) with UUID: 00000000-0000-0000-0000-000000000001
   - head@esid.edu (password: head123) with UUID: 00000000-0000-0000-0000-000000000002  
   - teacher@esid.edu (password: teacher123) with UUID: 00000000-0000-0000-0000-000000000003
3. Or use the auth.users insert statements if you have admin access
4. Test login at /auth/login then visit /test-views-auth
' as instructions;