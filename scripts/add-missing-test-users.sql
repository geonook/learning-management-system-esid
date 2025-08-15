-- Add Missing Test Users for G1 Testing
-- Quick fix to add essential test accounts

-- Grade 1 Head Teachers
INSERT INTO users (
  id, email, full_name, role, teacher_type, grade, track, is_active
) VALUES 
  ('11000000-0000-0000-0000-000000000001', 'head.g1.local@esid.edu', 'Grade 1 Head Teacher (Local Campus)', 'head', NULL, 1, 'local', TRUE),
  ('11000000-0000-0000-0000-000000000002', 'head.g1.intl@esid.edu', 'Grade 1 Head Teacher (International Campus)', 'head', NULL, 1, 'international', TRUE)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  grade = EXCLUDED.grade,
  track = EXCLUDED.track;

-- Grade 1 Teachers (LT/IT/KCFS)
INSERT INTO users (
  id, email, full_name, role, teacher_type, grade, track, is_active
) VALUES 
  ('21000000-0000-0000-0000-000000000001', 'lt.g1@esid.edu', 'Amy Chen (G1 LT Teacher)', 'teacher', 'LT', NULL, NULL, TRUE),
  ('21000000-0000-0000-0000-000000000002', 'it.g1@esid.edu', 'Brian Smith (G1 IT Teacher)', 'teacher', 'IT', NULL, NULL, TRUE),
  ('21000000-0000-0000-0000-000000000003', 'kcfs.g1@esid.edu', 'Carol Wang (G1 KCFS Teacher)', 'teacher', 'KCFS', NULL, NULL, TRUE)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  teacher_type = EXCLUDED.teacher_type;

-- Add some sample scores for testing Analytics
INSERT INTO scores (
  id, student_id, exam_id, assessment_code, score, entered_by
) 
SELECT 
  uuid_generate_v4() as id,
  s.id as student_id,
  e.id as exam_id,
  'FA1' as assessment_code,
  75 + (RANDOM() * 20)::integer as score, -- Random score between 75-95
  e.created_by as entered_by
FROM students s
CROSS JOIN exams e
WHERE s.grade = 1 
  AND e.exam_date IS NOT NULL
LIMIT 10
ON CONFLICT (student_id, exam_id, assessment_code) DO NOTHING;

-- Display results
SELECT '✅ MISSING TEST USERS ADDED!' as message;

SELECT 'New Test Accounts:' as message;
SELECT email, full_name, role, teacher_type
FROM users 
WHERE email IN (
  'head.g1.local@esid.edu',
  'head.g1.intl@esid.edu', 
  'lt.g1@esid.edu',
  'it.g1@esid.edu',
  'kcfs.g1@esid.edu'
);

SELECT '🎯 READY FOR TESTING:' as message;
SELECT '
Now you can test with these accounts:
- admin@esid.edu (System Admin)
- head.g1.local@esid.edu (Grade 1 Local Head)
- head.g1.intl@esid.edu (Grade 1 International Head)  
- lt.g1@esid.edu (Grade 1 LT Teacher)
- it.g1@esid.edu (Grade 1 IT Teacher)
- kcfs.g1@esid.edu (Grade 1 KCFS Teacher)

📝 Notes:
1. Auth users need to be created in Supabase Auth panel first
2. Use username (without @esid.edu) as password for testing
3. Each account will have appropriate role-based permissions
4. Test the ELA course architecture and Analytics features

🚀 Start testing at: http://localhost:3000
' as instructions;