-- ============================================
-- Insert Test Teacher Accounts to Info Hub
-- Run this in Info Hub's Supabase SQL Editor
-- ============================================
-- These test accounts match Head Teacher grade bands
-- After insertion, users can SSO login to LMS
-- ============================================

-- Insert 8 test teacher accounts
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  teacher_type,
  grade_band,
  is_active,
  created_at,
  updated_at
) VALUES
  -- G1 LT Test (matches kassieshih - G1 LT Head)
  (gen_random_uuid(), 'kcislkg1lt@kcislk.ntpc.edu.tw', 'Test G1 LT', 'teacher', 'LT', '1', true, now(), now()),

  -- G2 LT Test (matches kimshen - G2 LT Head)
  (gen_random_uuid(), 'kcislkg2lt@kcislk.ntpc.edu.tw', 'Test G2 LT', 'teacher', 'LT', '2', true, now(), now()),

  -- G1-2 IT Test (matches jonathanperry - G1-2 IT Head)
  (gen_random_uuid(), 'kcislkg12it@kcislk.ntpc.edu.tw', 'Test G12 IT', 'teacher', 'IT', '1-2', true, now(), now()),

  -- G3-4 LT Test (matches angelpeng - G3-4 LT Head)
  (gen_random_uuid(), 'kcislkg34lt@kcislk.ntpc.edu.tw', 'Test G34 LT', 'teacher', 'LT', '3-4', true, now(), now()),

  -- G3-4 IT Test (matches janeabasalie - G3-4 IT Head)
  (gen_random_uuid(), 'kcislkg34it@kcislk.ntpc.edu.tw', 'Test G34 IT', 'teacher', 'IT', '3-4', true, now(), now()),

  -- G5-6 LT Test (matches josselynfu - G5-6 LT Head)
  (gen_random_uuid(), 'kcislkg56lt@kcislk.ntpc.edu.tw', 'Test G56 LT', 'teacher', 'LT', '5-6', true, now(), now()),

  -- G5-6 IT Test (matches richmondrapelo - G5-6 IT Head)
  (gen_random_uuid(), 'kcislkg56it@kcislk.ntpc.edu.tw', 'Test G56 IT', 'teacher', 'IT', '5-6', true, now(), now()),

  -- G1-6 KCFS Test (matches carolegodfrey - G1-6 KCFS Head)
  (gen_random_uuid(), 'kcislkkcfs@kcislk.ntpc.edu.tw', 'Test KCFS', 'teacher', 'KCFS', '1-6', true, now(), now())

ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  teacher_type = EXCLUDED.teacher_type,
  grade_band = EXCLUDED.grade_band,
  updated_at = now();

-- Verify insertion
SELECT email, full_name, role, teacher_type, grade_band
FROM public.users
WHERE email LIKE 'kcislk%@kcislk.ntpc.edu.tw'
ORDER BY email;
