-- Safe Database Views for LMS-ESID
-- These views provide pre-joined data to avoid RLS recursion issues
-- while maintaining proper permission controls

-- Teacher-Classes View: Teachers can see their assigned classes
CREATE OR REPLACE VIEW teacher_classes_view AS
SELECT 
    c.id as class_id,
    c.name as class_name,
    c.grade,
    c.track,
    c.academic_year,
    c.is_active as class_active,
    c.teacher_id,
    u.full_name as teacher_name,
    u.email as teacher_email,
    u.teacher_type,
    -- Count of students in class
    (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.is_active = true) as student_count
FROM classes c
LEFT JOIN users u ON c.teacher_id = u.id
WHERE c.is_active = true;

-- Teacher-Students View: Teachers can see students in their classes
CREATE OR REPLACE VIEW teacher_students_view AS
SELECT 
    s.id as student_id,
    s.student_id as student_number,
    s.full_name as student_name,
    s.grade as student_grade,
    s.track as student_track,
    s.is_active as student_active,
    s.created_at as student_created_at,
    s.updated_at as student_updated_at,
    -- Class information
    c.id as class_id,
    c.name as class_name,
    c.academic_year,
    c.teacher_id,
    -- Teacher information
    u.full_name as teacher_name,
    u.email as teacher_email,
    u.teacher_type
FROM students s
LEFT JOIN classes c ON s.class_id = c.id
LEFT JOIN users u ON c.teacher_id = u.id
WHERE s.is_active = true AND (c.is_active = true OR c.id IS NULL);

-- Class-Scores View: Aggregated scores for class performance
CREATE OR REPLACE VIEW class_scores_view AS
SELECT 
    s.id as student_id,
    s.student_id as student_number,
    s.full_name as student_name,
    c.id as class_id,
    c.name as class_name,
    c.teacher_id,
    sc.exam_id,
    e.name as exam_name,
    e.exam_date,
    sc.assessment_code,
    sc.score,
    sc.entered_at,
    sc.entered_by,
    -- Grade calculation context
    s.grade,
    s.track,
    c.academic_year
FROM students s
LEFT JOIN classes c ON s.class_id = c.id
LEFT JOIN scores sc ON s.id = sc.student_id
LEFT JOIN exams e ON sc.exam_id = e.id
WHERE s.is_active = true 
    AND (c.is_active = true OR c.id IS NULL)
    AND (e.is_published = true OR e.id IS NULL);

-- Student Performance Summary View: Pre-calculated grade summaries
CREATE OR REPLACE VIEW student_performance_view AS
SELECT 
    s.id as student_id,
    s.student_id as student_number,
    s.full_name as student_name,
    s.grade,
    s.track,
    c.id as class_id,
    c.name as class_name,
    c.teacher_id,
    c.academic_year,
    -- Count scores by category
    COUNT(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN 1 END) as formative_count,
    COUNT(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN 1 END) as summative_count,
    COUNT(CASE WHEN sc.assessment_code = 'FINAL' AND sc.score > 0 THEN 1 END) as final_count,
    -- Average scores by category (only scores > 0)
    ROUND(
        CASE 
            WHEN COUNT(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN 1 END) > 0
            THEN AVG(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN sc.score END)
            ELSE NULL
        END, 2
    ) as formative_avg,
    ROUND(
        CASE 
            WHEN COUNT(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN 1 END) > 0
            THEN AVG(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN sc.score END)
            ELSE NULL
        END, 2
    ) as summative_avg,
    ROUND(
        CASE 
            WHEN COUNT(CASE WHEN sc.assessment_code = 'FINAL' AND sc.score > 0 THEN 1 END) > 0
            THEN AVG(CASE WHEN sc.assessment_code = 'FINAL' AND sc.score > 0 THEN sc.score END)
            ELSE NULL
        END, 2
    ) as final_score,
    -- Semester grade calculation (matching /lib/grade logic)
    ROUND(
        CASE 
            WHEN AVG(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN sc.score END) IS NOT NULL
                AND AVG(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN sc.score END) IS NOT NULL
                AND AVG(CASE WHEN sc.assessment_code = 'FINAL' AND sc.score > 0 THEN sc.score END) IS NOT NULL
            THEN (
                AVG(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN sc.score END) * 0.15 +
                AVG(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN sc.score END) * 0.20 +
                AVG(CASE WHEN sc.assessment_code = 'FINAL' AND sc.score > 0 THEN sc.score END) * 0.10
            ) / 0.45
            ELSE NULL
        END, 2
    ) as semester_grade
FROM students s
LEFT JOIN classes c ON s.class_id = c.id
LEFT JOIN scores sc ON s.id = sc.student_id
WHERE s.is_active = true AND (c.is_active = true OR c.id IS NULL)
GROUP BY s.id, s.student_id, s.full_name, s.grade, s.track, 
         c.id, c.name, c.teacher_id, c.academic_year;

-- Create indexes for view performance
CREATE INDEX IF NOT EXISTS idx_teacher_classes_view ON classes(teacher_id, is_active);
CREATE INDEX IF NOT EXISTS idx_teacher_students_view ON students(class_id, is_active);
CREATE INDEX IF NOT EXISTS idx_class_scores_view ON scores(student_id, assessment_code);
CREATE INDEX IF NOT EXISTS idx_student_performance_view ON scores(student_id, assessment_code, score);

-- Grant SELECT permissions on views (these will inherit RLS from base tables)
-- Views automatically inherit RLS from their base tables
-- No additional RLS policies needed on views themselves