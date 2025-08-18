-- Analytics Database Views for LMS-ESID
-- Date: 2025-08-18
-- Purpose: Specialized views for Phase 3A-1 Analytics system
-- Focus: Performance optimization for complex analytics queries

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ========================================
-- STUDENT GRADE AGGREGATES VIEW
-- ========================================

CREATE OR REPLACE VIEW student_grade_aggregates AS
SELECT 
    s.id as student_id,
    s.student_id as student_number,
    s.full_name as student_name,
    s.grade,
    s.track,
    s.level,
    c.id as class_id,
    c.name as class_name,
    co.id as course_id,
    co.course_type,
    co.course_name,
    u.id as teacher_id,
    u.full_name as teacher_name,
    c.academic_year,
    
    -- Assessment counts by category
    COUNT(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN 1 END) as fa_count,
    COUNT(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN 1 END) as sa_count,
    COUNT(CASE WHEN sc.assessment_code = 'FINAL' AND sc.score > 0 THEN 1 END) as final_count,
    
    -- Individual FA scores (for detailed analysis)
    MAX(CASE WHEN sc.assessment_code = 'FA1' THEN sc.score END) as fa1_score,
    MAX(CASE WHEN sc.assessment_code = 'FA2' THEN sc.score END) as fa2_score,
    MAX(CASE WHEN sc.assessment_code = 'FA3' THEN sc.score END) as fa3_score,
    MAX(CASE WHEN sc.assessment_code = 'FA4' THEN sc.score END) as fa4_score,
    MAX(CASE WHEN sc.assessment_code = 'FA5' THEN sc.score END) as fa5_score,
    MAX(CASE WHEN sc.assessment_code = 'FA6' THEN sc.score END) as fa6_score,
    MAX(CASE WHEN sc.assessment_code = 'FA7' THEN sc.score END) as fa7_score,
    MAX(CASE WHEN sc.assessment_code = 'FA8' THEN sc.score END) as fa8_score,
    
    -- Individual SA scores
    MAX(CASE WHEN sc.assessment_code = 'SA1' THEN sc.score END) as sa1_score,
    MAX(CASE WHEN sc.assessment_code = 'SA2' THEN sc.score END) as sa2_score,
    MAX(CASE WHEN sc.assessment_code = 'SA3' THEN sc.score END) as sa3_score,
    MAX(CASE WHEN sc.assessment_code = 'SA4' THEN sc.score END) as sa4_score,
    
    -- Final score
    MAX(CASE WHEN sc.assessment_code = 'FINAL' THEN sc.score END) as final_score,
    
    -- Calculated averages (following /lib/grade logic)
    ROUND(
        CASE 
            WHEN COUNT(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN 1 END) > 0
            THEN AVG(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN sc.score END)
            ELSE NULL
        END, 2
    ) as formative_average,
    
    ROUND(
        CASE 
            WHEN COUNT(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN 1 END) > 0
            THEN AVG(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN sc.score END)
            ELSE NULL
        END, 2
    ) as summative_average,
    
    -- Semester grade calculation (F×0.15 + S×0.2 + Final×0.1) ÷ 0.45
    ROUND(
        CASE 
            WHEN AVG(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN sc.score END) IS NOT NULL
                AND AVG(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN sc.score END) IS NOT NULL
                AND MAX(CASE WHEN sc.assessment_code = 'FINAL' THEN sc.score END) IS NOT NULL
                AND MAX(CASE WHEN sc.assessment_code = 'FINAL' THEN sc.score END) > 0
            THEN (
                AVG(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN sc.score END) * 0.15 +
                AVG(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN sc.score END) * 0.20 +
                MAX(CASE WHEN sc.assessment_code = 'FINAL' THEN sc.score END) * 0.10
            ) / 0.45
            ELSE NULL
        END, 2
    ) as semester_grade,
    
    -- Analytics metrics
    MIN(CASE WHEN sc.score > 0 THEN sc.score END) as min_score,
    MAX(sc.score) as max_score,
    
    -- Performance indicators
    CASE 
        WHEN AVG(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN sc.score END) < 60 THEN true
        WHEN AVG(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN sc.score END) < 60 THEN true
        WHEN COUNT(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN 1 END) < 3 THEN true
        ELSE false
    END as at_risk,
    
    -- Last assessment date
    MAX(sc.entered_at) as last_assessment_date,
    
    -- Total assessments completed
    COUNT(CASE WHEN sc.score > 0 THEN 1 END) as total_assessments_completed

FROM students s
LEFT JOIN classes c ON s.class_id = c.id
LEFT JOIN courses co ON c.id = co.class_id
LEFT JOIN users u ON co.teacher_id = u.id
LEFT JOIN student_courses sc_rel ON s.id = sc_rel.student_id AND co.id = sc_rel.course_id
LEFT JOIN scores sc ON s.id = sc.student_id AND sc.course_id = co.id
WHERE s.is_active = true 
    AND (c.is_active = true OR c.id IS NULL)
    AND (co.is_active = true OR co.id IS NULL)
GROUP BY s.id, s.student_id, s.full_name, s.grade, s.track, s.level,
         c.id, c.name, co.id, co.course_type, co.course_name,
         u.id, u.full_name, c.academic_year;

-- ========================================
-- CLASS STATISTICS VIEW
-- ========================================

CREATE OR REPLACE VIEW class_statistics AS
SELECT 
    c.id as class_id,
    c.name as class_name,
    c.grade,
    c.track,
    c.level as class_level,
    c.academic_year,
    co.id as course_id,
    co.course_type,
    co.course_name,
    u.id as teacher_id,
    u.full_name as teacher_name,
    u.teacher_type,
    
    -- Student counts
    COUNT(DISTINCT s.id) as total_students,
    COUNT(DISTINCT CASE WHEN s.is_active = true THEN s.id END) as active_students,
    
    -- Assessment completion statistics
    COUNT(DISTINCT CASE WHEN sc.score > 0 THEN s.id END) as students_with_scores,
    ROUND(
        COUNT(DISTINCT CASE WHEN sc.score > 0 THEN s.id END)::decimal / 
        NULLIF(COUNT(DISTINCT CASE WHEN s.is_active = true THEN s.id END), 0) * 100, 1
    ) as completion_rate_percent,
    
    -- Grade statistics
    ROUND(AVG(CASE WHEN sc.score > 0 THEN sc.score END), 2) as class_average,
    ROUND(
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CASE WHEN sc.score > 0 THEN sc.score END), 2
    ) as class_median,
    MIN(CASE WHEN sc.score > 0 THEN sc.score END) as class_min,
    MAX(sc.score) as class_max,
    
    -- Standard deviation
    ROUND(
        STDDEV_POP(CASE WHEN sc.score > 0 THEN sc.score END), 2
    ) as class_stddev,
    
    -- Grade distribution
    COUNT(CASE WHEN sc.score >= 90 THEN 1 END) as grades_90_plus,
    COUNT(CASE WHEN sc.score >= 80 AND sc.score < 90 THEN 1 END) as grades_80_89,
    COUNT(CASE WHEN sc.score >= 70 AND sc.score < 80 THEN 1 END) as grades_70_79,
    COUNT(CASE WHEN sc.score >= 60 AND sc.score < 70 THEN 1 END) as grades_60_69,
    COUNT(CASE WHEN sc.score < 60 AND sc.score > 0 THEN 1 END) as grades_below_60,
    
    -- Assessment type averages
    ROUND(
        AVG(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN sc.score END), 2
    ) as formative_class_avg,
    ROUND(
        AVG(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN sc.score END), 2
    ) as summative_class_avg,
    ROUND(
        AVG(CASE WHEN sc.assessment_code = 'FINAL' AND sc.score > 0 THEN sc.score END), 2
    ) as final_class_avg,
    
    -- Risk indicators
    COUNT(CASE 
        WHEN sc.score > 0 AND sc.score < 60 THEN 1 
    END) as failing_assessments,
    
    -- Trends (requires historical data comparison)
    MAX(sc.entered_at) as last_update,
    COUNT(DISTINCT sc.exam_id) as total_exams

FROM classes c
LEFT JOIN courses co ON c.id = co.class_id
LEFT JOIN users u ON co.teacher_id = u.id
LEFT JOIN students s ON c.id = s.class_id
LEFT JOIN scores sc ON s.id = sc.student_id AND sc.course_id = co.id
WHERE c.is_active = true
    AND (co.is_active = true OR co.id IS NULL)
GROUP BY c.id, c.name, c.grade, c.track, c.level, c.academic_year,
         co.id, co.course_type, co.course_name,
         u.id, u.full_name, u.teacher_type;

-- ========================================
-- TEACHER PERFORMANCE VIEW
-- ========================================

CREATE OR REPLACE VIEW teacher_performance AS
SELECT 
    u.id as teacher_id,
    u.full_name as teacher_name,
    u.email as teacher_email,
    u.teacher_type,
    u.grade as assigned_grade,
    u.track as assigned_track,
    
    -- Course load
    COUNT(DISTINCT co.id) as courses_taught,
    COUNT(DISTINCT c.id) as classes_taught,
    COUNT(DISTINCT s.id) as total_students_taught,
    
    -- Grade performance metrics
    ROUND(AVG(CASE WHEN sc.score > 0 THEN sc.score END), 2) as overall_class_average,
    ROUND(
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CASE WHEN sc.score > 0 THEN sc.score END), 2
    ) as overall_median,
    
    -- Assessment completion tracking
    COUNT(DISTINCT sc.exam_id) as exams_conducted,
    COUNT(CASE WHEN sc.score > 0 THEN 1 END) as assessments_completed,
    
    -- Performance distribution
    ROUND(
        COUNT(CASE WHEN sc.score >= 80 THEN 1 END)::decimal /
        NULLIF(COUNT(CASE WHEN sc.score > 0 THEN 1 END), 0) * 100, 1
    ) as students_above_80_percent,
    
    ROUND(
        COUNT(CASE WHEN sc.score < 60 AND sc.score > 0 THEN 1 END)::decimal /
        NULLIF(COUNT(CASE WHEN sc.score > 0 THEN 1 END), 0) * 100, 1
    ) as students_below_60_percent,
    
    -- Grade consistency (standard deviation across classes)
    ROUND(
        STDDEV_POP(class_avgs.class_average), 2
    ) as class_consistency,
    
    -- Assessment frequency
    ROUND(
        COUNT(CASE WHEN sc.score > 0 THEN 1 END)::decimal /
        NULLIF(COUNT(DISTINCT s.id), 0), 1
    ) as assessments_per_student,
    
    -- Recent activity
    MAX(sc.entered_at) as last_grade_entry,
    
    -- Risk management
    COUNT(DISTINCT CASE 
        WHEN sc.score > 0 AND sc.score < 60 THEN s.id 
    END) as at_risk_students,
    
    -- Course type specific metrics
    CASE u.teacher_type
        WHEN 'LT' THEN 'Local English Language Arts'
        WHEN 'IT' THEN 'International English Language Arts'
        WHEN 'KCFS' THEN 'Kang Chiao Future Skills'
    END as subject_specialization

FROM users u
LEFT JOIN courses co ON u.id = co.teacher_id
LEFT JOIN classes c ON co.class_id = c.id
LEFT JOIN students s ON c.id = s.class_id AND s.is_active = true
LEFT JOIN scores sc ON s.id = sc.student_id AND sc.course_id = co.id
LEFT JOIN (
    -- Subquery for class averages (for consistency calculation)
    SELECT 
        co_sub.teacher_id,
        c_sub.id as class_id,
        AVG(CASE WHEN sc_sub.score > 0 THEN sc_sub.score END) as class_average
    FROM courses co_sub
    LEFT JOIN classes c_sub ON co_sub.class_id = c_sub.id
    LEFT JOIN students s_sub ON c_sub.id = s_sub.class_id
    LEFT JOIN scores sc_sub ON s_sub.id = sc_sub.student_id AND sc_sub.course_id = co_sub.id
    WHERE co_sub.is_active = true AND c_sub.is_active = true
    GROUP BY co_sub.teacher_id, c_sub.id
) class_avgs ON u.id = class_avgs.teacher_id
WHERE u.role = 'teacher' 
    AND u.is_active = true
    AND (co.is_active = true OR co.id IS NULL)
    AND (c.is_active = true OR c.id IS NULL)
GROUP BY u.id, u.full_name, u.email, u.teacher_type, u.grade, u.track;

-- ========================================
-- ANALYTICS PERFORMANCE INDEXES
-- ========================================

-- Indexes for student_grade_aggregates performance
CREATE INDEX IF NOT EXISTS idx_analytics_students_composite 
    ON students(id, grade, track, is_active) INCLUDE (student_id, full_name, level);

CREATE INDEX IF NOT EXISTS idx_analytics_scores_composite 
    ON scores(student_id, course_id, assessment_code) INCLUDE (score, entered_at)
    WHERE score > 0;

CREATE INDEX IF NOT EXISTS idx_analytics_courses_composite 
    ON courses(class_id, teacher_id, course_type) INCLUDE (course_name, is_active);

-- Indexes for class_statistics performance
CREATE INDEX IF NOT EXISTS idx_analytics_classes_composite 
    ON classes(id, grade, track, is_active) INCLUDE (name, level, academic_year);

-- Indexes for teacher_performance
CREATE INDEX IF NOT EXISTS idx_analytics_users_teachers 
    ON users(id, teacher_type, role, is_active) INCLUDE (full_name, email, grade, track)
    WHERE role = 'teacher';

-- Additional performance indexes for Analytics queries
CREATE INDEX IF NOT EXISTS idx_scores_assessment_type_pattern 
    ON scores(assessment_code) 
    WHERE assessment_code LIKE 'FA%' OR assessment_code LIKE 'SA%' OR assessment_code = 'FINAL';

CREATE INDEX IF NOT EXISTS idx_scores_performance_analysis 
    ON scores(score, entered_at) 
    WHERE score > 0;

-- Partial indexes for risk analysis
CREATE INDEX IF NOT EXISTS idx_scores_failing 
    ON scores(student_id, course_id, score) 
    WHERE score > 0 AND score < 60;

CREATE INDEX IF NOT EXISTS idx_scores_excellent 
    ON scores(student_id, course_id, score) 
    WHERE score >= 90;

-- ========================================
-- VIEW COMMENTS AND DOCUMENTATION
-- ========================================

COMMENT ON VIEW student_grade_aggregates IS 
'Comprehensive student performance view with individual scores, averages, and analytics metrics. 
Follows /lib/grade calculation logic for consistency.';

COMMENT ON VIEW class_statistics IS 
'Class-level performance statistics including averages, distributions, completion rates, and teacher metrics.
Used for class comparison and performance monitoring.';

COMMENT ON VIEW teacher_performance IS 
'Teacher effectiveness metrics including class averages, student performance distribution, and consistency measures.
Supports teacher evaluation and professional development insights.';

-- Grant appropriate permissions (views inherit RLS from base tables)
-- No additional RLS policies needed as views automatically inherit from base tables

-- Success message
SELECT 'Analytics Views v1.0 - Successfully created!' as status,
       'Created: student_grade_aggregates, class_statistics, teacher_performance' as views_created,
       'Optimized with ' || (
           SELECT COUNT(*) FROM pg_indexes 
           WHERE tablename IN ('students', 'scores', 'courses', 'classes', 'users')
           AND indexname LIKE 'idx_analytics_%'
       ) || ' analytics-specific indexes' as performance_note;