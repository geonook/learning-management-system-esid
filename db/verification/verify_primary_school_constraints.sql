-- Primary School Constraints Verification Script
-- Date: 2025-08-12
-- Purpose: Verify that Migration 004b successfully applied primary school constraints (G1-G6)

SELECT '=== Verifying Primary School Grade Constraints ===' as status;

-- 1. Check all grade constraints are updated correctly
SELECT '1. Checking grade constraints...' as step;
SELECT 
    tc.table_name,
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_name LIKE '%grade_check'
ORDER BY tc.table_name;

-- 2. Test primary school grades (should succeed)
SELECT '2. Testing primary school grades (G1-G6)...' as step;

-- Test G1 (should succeed)
DO $$
BEGIN
    BEGIN
        INSERT INTO classes (name, grade, track, academic_year) 
        VALUES ('TEST_G1_VERIFY', 1, 'local', '24-25');
        DELETE FROM classes WHERE name = 'TEST_G1_VERIFY';
        RAISE NOTICE 'SUCCESS: Grade 1 (G1) accepted';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'ERROR: Grade 1 (G1) rejected - constraint issue';
    END;
END $$;

-- Test G3 (should succeed)
DO $$
BEGIN
    BEGIN
        INSERT INTO classes (name, grade, track, academic_year) 
        VALUES ('TEST_G3_VERIFY', 3, 'local', '24-25');
        DELETE FROM classes WHERE name = 'TEST_G3_VERIFY';
        RAISE NOTICE 'SUCCESS: Grade 3 (G3) accepted';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'ERROR: Grade 3 (G3) rejected - constraint issue';
    END;
END $$;

-- Test G6 (should succeed)
DO $$
BEGIN
    BEGIN
        INSERT INTO classes (name, grade, track, academic_year) 
        VALUES ('TEST_G6_VERIFY', 6, 'local', '24-25');
        DELETE FROM classes WHERE name = 'TEST_G6_VERIFY';
        RAISE NOTICE 'SUCCESS: Grade 6 (G6) accepted';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'ERROR: Grade 6 (G6) rejected - constraint issue';
    END;
END $$;

-- 3. Test middle school grades (should fail)
SELECT '3. Testing middle school grades (G7-G12) - should be rejected...' as step;

-- Test G7 (should fail)
DO $$
BEGIN
    BEGIN
        INSERT INTO classes (name, grade, track, academic_year) 
        VALUES ('TEST_G7_VERIFY', 7, 'local', '24-25');
        DELETE FROM classes WHERE name = 'TEST_G7_VERIFY';
        RAISE NOTICE 'ERROR: Grade 7 (G7) incorrectly accepted - constraint not working';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'SUCCESS: Grade 7 (G7) correctly rejected';
    END;
END $$;

-- Test G12 (should fail)
DO $$
BEGIN
    BEGIN
        INSERT INTO classes (name, grade, track, academic_year) 
        VALUES ('TEST_G12_VERIFY', 12, 'local', '24-25');
        DELETE FROM classes WHERE name = 'TEST_G12_VERIFY';
        RAISE NOTICE 'ERROR: Grade 12 (G12) incorrectly accepted - constraint not working';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'SUCCESS: Grade 12 (G12) correctly rejected';
    END;
END $$;

-- 4. Test invalid grades (should fail)
SELECT '4. Testing invalid grades (0, negative, >12) - should be rejected...' as step;

-- Test Grade 0 (should fail)
DO $$
BEGIN
    BEGIN
        INSERT INTO classes (name, grade, track, academic_year) 
        VALUES ('TEST_G0_VERIFY', 0, 'local', '24-25');
        DELETE FROM classes WHERE name = 'TEST_G0_VERIFY';
        RAISE NOTICE 'ERROR: Grade 0 incorrectly accepted - constraint not working';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'SUCCESS: Grade 0 correctly rejected';
    END;
END $$;

-- Test Grade 13 (should fail)
DO $$
BEGIN
    BEGIN
        INSERT INTO classes (name, grade, track, academic_year) 
        VALUES ('TEST_G13_VERIFY', 13, 'local', '24-25');
        DELETE FROM classes WHERE name = 'TEST_G13_VERIFY';
        RAISE NOTICE 'ERROR: Grade 13 incorrectly accepted - constraint not working';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'SUCCESS: Grade 13 correctly rejected';
    END;
END $$;

-- 5. Test users table constraints (grade can be NULL)
SELECT '5. Testing users table constraints...' as step;

-- Test NULL grade for users (should succeed)
DO $$
BEGIN
    BEGIN
        INSERT INTO users (id, email, full_name, role, grade) 
        VALUES ('00000000-0000-0000-0000-000000000099', 'test@verify.com', 'Test User', 'teacher', NULL);
        DELETE FROM users WHERE email = 'test@verify.com';
        RAISE NOTICE 'SUCCESS: NULL grade accepted for users';
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE 'ERROR: NULL grade rejected for users - %', SQLERRM;
    END;
END $$;

-- Test valid grade for users (should succeed)
DO $$
BEGIN
    BEGIN
        INSERT INTO users (id, email, full_name, role, grade) 
        VALUES ('00000000-0000-0000-0000-000000000099', 'test2@verify.com', 'Test User 2', 'teacher', 3);
        DELETE FROM users WHERE email = 'test2@verify.com';
        RAISE NOTICE 'SUCCESS: Grade 3 accepted for users';
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE 'ERROR: Grade 3 rejected for users - %', SQLERRM;
    END;
END $$;

-- 6. Final status
SELECT '=== Primary School Constraints Verification Complete ===' as status;
SELECT 'Expected results:' as info;
SELECT '- G1, G3, G6: ACCEPTED ✅' as expected_1;
SELECT '- G7, G12: REJECTED ✅' as expected_2;
SELECT '- G0, G13: REJECTED ✅' as expected_3;
SELECT '- Users NULL grade: ACCEPTED ✅' as expected_4;
SELECT '- Users valid grade: ACCEPTED ✅' as expected_5;
SELECT 'System is ready for primary school data (G1-G6) ✅' as conclusion;