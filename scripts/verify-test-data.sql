-- Test Data Verification Script
-- Run this to check current state of test data

SELECT '🔍 CURRENT DATA STATUS VERIFICATION' as message;

-- Check existing users
SELECT '📊 Current Users:' as message;
SELECT 
  role,
  teacher_type,
  COUNT(*) as count,
  STRING_AGG(email, ', ' ORDER BY email) as sample_emails
FROM users 
WHERE email LIKE '%@esid.edu'
GROUP BY role, teacher_type
ORDER BY role, teacher_type;

-- Check classes
SELECT '🏫 Current Classes:' as message;
SELECT 
  grade,
  track,
  COUNT(*) as class_count,
  STRING_AGG(name, ', ' ORDER BY name) as class_names
FROM classes 
WHERE is_active = TRUE
GROUP BY grade, track
ORDER BY grade, track;

-- Check courses per class
SELECT '📚 Courses per Class:' as message;
SELECT 
  c.name as class_name,
  c.grade,
  c.track,
  COUNT(co.id) as course_count,
  STRING_AGG(co.course_type, ', ' ORDER BY co.course_type) as course_types
FROM classes c
LEFT JOIN courses co ON c.id = co.class_id
WHERE c.is_active = TRUE
GROUP BY c.id, c.name, c.grade, c.track
ORDER BY c.grade, c.track, c.name
LIMIT 10;

-- Check students
SELECT '👥 Students per Class:' as message;
SELECT 
  c.name as class_name,
  c.grade,
  c.track,
  COUNT(s.id) as student_count
FROM classes c
LEFT JOIN students s ON c.id = s.class_id AND s.is_active = TRUE
WHERE c.is_active = TRUE
GROUP BY c.id, c.name, c.grade, c.track
ORDER BY c.grade, c.track, c.name
LIMIT 10;

-- Check sample scores
SELECT '📝 Sample Scores:' as message;
SELECT COUNT(*) as total_scores FROM scores;

-- Check if we have the test accounts we need
SELECT '🔐 Required Test Accounts Status:' as message;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM users WHERE email = 'admin@esid.edu') THEN '✅ admin@esid.edu exists'
    ELSE '❌ admin@esid.edu MISSING'
  END as admin_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM users WHERE email = 'lt.g1@esid.edu') THEN '✅ lt.g1@esid.edu exists'
    ELSE '❌ lt.g1@esid.edu MISSING'
  END as lt_teacher_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM users WHERE email = 'it.g1@esid.edu') THEN '✅ it.g1@esid.edu exists'
    ELSE '❌ it.g1@esid.edu MISSING'  
  END as it_teacher_status;

-- Check ELA course architecture
SELECT '🎯 ELA Course Architecture Status:' as message;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM courses 
      WHERE course_type = 'LT' AND name LIKE '%English Language Arts%'
    ) THEN '✅ LT English courses exist'
    ELSE '❌ LT English courses MISSING'
  END as lt_courses,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM courses 
      WHERE course_type = 'IT' AND name LIKE '%English Language Arts%'
    ) THEN '✅ IT English courses exist'
    ELSE '❌ IT English courses MISSING'
  END as it_courses,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM courses 
      WHERE course_type = 'KCFS'
    ) THEN '✅ KCFS courses exist'
    ELSE '❌ KCFS courses MISSING'
  END as kcfs_courses;

SELECT '
📋 NEXT STEPS:
1. If test accounts are MISSING, you need to:
   a) Go to Supabase Auth Users panel
   b) Create users manually OR
   c) Run the primary school test data script
   
2. If courses are MISSING, you need to:
   a) Import the full test data script
   b) Or manually create courses for testing
   
3. Once data is ready, test at: http://localhost:3000

🎯 Expected for full testing:
- 1 Admin account
- 12 Head Teacher accounts (G1-G6 × Local/International)  
- 18 Teacher accounts (G1-G6 × LT/IT/KCFS)
- 24 Classes (G1-G6 × 4 classes each)
- 72 Courses (24 classes × 3 courses each)
- 480+ Students (24 classes × 20 students each)
' as instructions;