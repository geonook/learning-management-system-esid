-- Migration 031: Create 2026-2027 Academic Year
-- Creates classes and courses for the new academic year
-- Executed: 2025-12-12
-- Purpose: Allow system to work with multiple academic years

-- ============================================
-- PART 1: Create 2026-2027 Classes
-- ============================================

-- Copy all 84 classes from 2025-2026 to 2026-2027
-- Note: classes table doesn't have campus column, but has track column
INSERT INTO classes (name, grade, level, track, academic_year, is_active)
SELECT name, grade, level, track, '2026-2027', is_active
FROM classes
WHERE academic_year = '2025-2026';

-- ============================================
-- PART 2: Create 2026-2027 Courses
-- ============================================

-- Create LT/IT/KCFS courses for each new class (teacher_id = NULL)
-- Note: course_type column requires explicit cast to course_type enum
INSERT INTO courses (class_id, course_type, academic_year, teacher_id)
SELECT c.id, ct.course_type::course_type, '2026-2027', NULL
FROM classes c
CROSS JOIN (VALUES ('LT'), ('IT'), ('KCFS')) AS ct(course_type)
WHERE c.academic_year = '2026-2027';

-- ============================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================

-- SELECT academic_year, COUNT(*) as class_count
-- FROM classes
-- GROUP BY academic_year
-- ORDER BY academic_year;
-- Expected: 2025-2026: 84, 2026-2027: 84

-- SELECT academic_year, COUNT(*) as course_count
-- FROM courses
-- GROUP BY academic_year
-- ORDER BY academic_year;
-- Expected: 2025-2026: 252, 2026-2027: 252

-- ============================================
-- ROLLBACK (if needed)
-- ============================================

-- DELETE FROM courses WHERE academic_year = '2026-2027';
-- DELETE FROM classes WHERE academic_year = '2026-2027';
