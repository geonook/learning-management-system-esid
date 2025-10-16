-- ========================================
-- Insert Admin User into users table
-- ========================================
-- User: tsehungchen@kcislk.ntpc.edu.tw
-- UID: ecb4dc7d-c6d1-4466-b67a-35261340fef0
-- Role: admin (full system access)
-- ========================================

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
    'ecb4dc7d-c6d1-4466-b67a-35261340fef0',
    'tsehungchen@kcislk.ntpc.edu.tw',
    'Admin User',
    'admin',
    NULL,  -- Admin doesn't need teacher_type
    NULL,  -- Admin doesn't need grade
    NULL,  -- Admin doesn't need track
    true
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- Verify the insertion
SELECT
    id,
    email,
    full_name,
    role,
    teacher_type,
    grade,
    track,
    is_active,
    created_at
FROM users
WHERE id = 'ecb4dc7d-c6d1-4466-b67a-35261340fef0';
