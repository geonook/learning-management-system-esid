-- Analytics Performance Indexes Migration
-- Date: 2025-08-18
-- Purpose: Add specialized indexes for Phase 3A-1 Analytics performance optimization
-- Focus: Optimize complex analytics queries for sub-500ms response times

-- ========================================
-- ANALYTICS-SPECIFIC COMPOSITE INDEXES
-- ========================================

-- Critical index for student grade aggregation queries
-- Covers: student lookup by grade/track + active filtering
CREATE INDEX IF NOT EXISTS idx_analytics_students_grade_track_active 
    ON students(grade, track, is_active, class_id) 
    INCLUDE (id, student_id, full_name, level)
    WHERE is_active = true;

-- Critical index for scores analysis by assessment patterns
-- Covers: FA/SA/FINAL pattern matching with performance filtering
CREATE INDEX IF NOT EXISTS idx_analytics_scores_assessment_pattern 
    ON scores(assessment_code, score, student_id) 
    INCLUDE (course_id, entered_at)
    WHERE score > 0;

-- Specialized index for formative assessment analysis
CREATE INDEX IF NOT EXISTS idx_analytics_scores_formative 
    ON scores(student_id, course_id, score) 
    INCLUDE (assessment_code, entered_at)
    WHERE assessment_code LIKE 'FA%' AND score > 0;

-- Specialized index for summative assessment analysis  
CREATE INDEX IF NOT EXISTS idx_analytics_scores_summative 
    ON scores(student_id, course_id, score) 
    INCLUDE (assessment_code, entered_at)
    WHERE assessment_code LIKE 'SA%' AND score > 0;

-- Specialized index for final assessment analysis
CREATE INDEX IF NOT EXISTS idx_analytics_scores_final 
    ON scores(student_id, course_id, score) 
    INCLUDE (entered_at)
    WHERE assessment_code = 'FINAL' AND score > 0;

-- ========================================
-- CLASS PERFORMANCE ANALYSIS INDEXES
-- ========================================

-- Class-level aggregation optimization
-- Covers: class stats by grade/track with student counts
CREATE INDEX IF NOT EXISTS idx_analytics_classes_performance 
    ON classes(grade, track, academic_year, is_active) 
    INCLUDE (id, name, level)
    WHERE is_active = true;

-- Course-class relationship optimization
-- Covers: course assignments and teacher relationships
CREATE INDEX IF NOT EXISTS idx_analytics_courses_teacher_class 
    ON courses(teacher_id, class_id, course_type, is_active) 
    INCLUDE (id, course_name, academic_year)
    WHERE is_active = true;

-- Student-course enrollment optimization
-- Covers: student course relationships for grade calculations
CREATE INDEX IF NOT EXISTS idx_analytics_student_courses_active 
    ON student_courses(student_id, course_id, is_active) 
    INCLUDE (enrolled_at)
    WHERE is_active = true;

-- ========================================
-- TEACHER PERFORMANCE ANALYSIS INDEXES
-- ========================================

-- Teacher assignment and performance tracking
-- Covers: teacher lookup by type/grade with active filtering
CREATE INDEX IF NOT EXISTS idx_analytics_teachers_performance 
    ON users(teacher_type, grade, track, role, is_active) 
    INCLUDE (id, full_name, email)
    WHERE role = 'teacher' AND is_active = true;

-- ========================================
-- TEMPORAL ANALYSIS INDEXES
-- ========================================

-- Score entry timeline analysis
-- Covers: trend analysis and recent activity tracking
CREATE INDEX IF NOT EXISTS idx_analytics_scores_timeline 
    ON scores(entered_at DESC, assessment_code, score) 
    INCLUDE (student_id, course_id)
    WHERE score > 0;

-- Exam frequency and scheduling analysis
CREATE INDEX IF NOT EXISTS idx_analytics_exams_timeline 
    ON exams(class_id, exam_date, is_active) 
    INCLUDE (id, name, created_by)
    WHERE is_active = true;

-- ========================================
-- RISK ASSESSMENT INDEXES
-- ========================================

-- At-risk student identification (scores < 60)
CREATE INDEX IF NOT EXISTS idx_analytics_risk_low_scores 
    ON scores(score, student_id, course_id) 
    INCLUDE (assessment_code, entered_at)
    WHERE score > 0 AND score < 60;

-- High-performing student identification (scores >= 90)
CREATE INDEX IF NOT EXISTS idx_analytics_high_performers 
    ON scores(score DESC, student_id, course_id) 
    INCLUDE (assessment_code, entered_at)
    WHERE score >= 90;

-- Assessment completion tracking
CREATE INDEX IF NOT EXISTS idx_analytics_completion_tracking 
    ON scores(student_id, course_id) 
    INCLUDE (assessment_code, score, entered_at)
    WHERE score > 0;

-- ========================================
-- GRADE CALCULATION OPTIMIZATION INDEXES
-- ========================================

-- Semester grade calculation optimization
-- Covers: all three components (FA avg, SA avg, FINAL) in one index
CREATE INDEX IF NOT EXISTS idx_analytics_semester_calculation 
    ON scores(student_id, course_id, assessment_code, score) 
    INCLUDE (entered_at)
    WHERE score > 0 AND (
        assessment_code LIKE 'FA%' OR 
        assessment_code LIKE 'SA%' OR 
        assessment_code = 'FINAL'
    );

-- ========================================
-- ANALYTICS QUERY PATTERN INDEXES
-- ========================================

-- Most common Analytics query pattern: student performance by class
CREATE INDEX IF NOT EXISTS idx_analytics_student_class_performance 
    ON students(class_id, grade, is_active) 
    INCLUDE (id, student_id, full_name, track, level)
    WHERE is_active = true;

-- Common pattern: course performance comparison
CREATE INDEX IF NOT EXISTS idx_analytics_course_comparison 
    ON courses(course_type, teacher_id, academic_year, is_active) 
    INCLUDE (id, class_id, course_name)
    WHERE is_active = true;

-- Common pattern: grade distribution analysis
CREATE INDEX IF NOT EXISTS idx_analytics_grade_distribution 
    ON scores(score, assessment_code, course_id) 
    INCLUDE (student_id, entered_at)
    WHERE score > 0;

-- ========================================
-- COVERING INDEXES FOR VIEW PERFORMANCE
-- ========================================

-- Covering index for student_grade_aggregates view
CREATE INDEX IF NOT EXISTS idx_analytics_cover_student_aggregates 
    ON scores(student_id, course_id) 
    INCLUDE (assessment_code, score, entered_at, exam_id)
    WHERE score > 0;

-- Covering index for class_statistics view
CREATE INDEX IF NOT EXISTS idx_analytics_cover_class_stats 
    ON scores(course_id, score) 
    INCLUDE (student_id, assessment_code, entered_at)
    WHERE score > 0;

-- Covering index for teacher_performance view  
CREATE INDEX IF NOT EXISTS idx_analytics_cover_teacher_performance 
    ON courses(teacher_id, is_active) 
    INCLUDE (id, class_id, course_type, course_name, academic_year)
    WHERE is_active = true;

-- ========================================
-- PARTIAL INDEXES FOR SPECIFIC ANALYTICS
-- ========================================

-- Recent activity tracking (last 30 days)
CREATE INDEX IF NOT EXISTS idx_analytics_recent_activity 
    ON scores(entered_at DESC, student_id, course_id) 
    INCLUDE (assessment_code, score)
    WHERE entered_at >= (CURRENT_DATE - INTERVAL '30 days') AND score > 0;

-- Current academic year focus
CREATE INDEX IF NOT EXISTS idx_analytics_current_year_classes 
    ON classes(academic_year, grade, track, is_active) 
    INCLUDE (id, name, level)
    WHERE academic_year = EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD((EXTRACT(YEAR FROM NOW()) + 1)::TEXT, 2, '0')
    AND is_active = true;

-- ========================================
-- EXPRESSION INDEXES FOR CALCULATIONS
-- ========================================

-- Index on calculated formative average expression
CREATE INDEX IF NOT EXISTS idx_analytics_formative_avg_expr 
    ON scores((CASE WHEN assessment_code LIKE 'FA%' AND score > 0 THEN score END), student_id, course_id);

-- Index on calculated summative average expression  
CREATE INDEX IF NOT EXISTS idx_analytics_summative_avg_expr 
    ON scores((CASE WHEN assessment_code LIKE 'SA%' AND score > 0 THEN score END), student_id, course_id);

-- ========================================
-- HASH INDEXES FOR EXACT LOOKUPS
-- ========================================

-- Fast exact lookups for Analytics filters
CREATE INDEX IF NOT EXISTS idx_analytics_hash_student_id 
    ON students USING hash(student_id) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_analytics_hash_course_type 
    ON courses USING hash(course_type) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_analytics_hash_assessment_code 
    ON scores USING hash(assessment_code) 
    WHERE score > 0;

-- ========================================
-- GIN INDEXES FOR MULTI-COLUMN SEARCHES
-- ========================================

-- Multi-dimensional Analytics searches
CREATE INDEX IF NOT EXISTS idx_analytics_gin_student_attributes 
    ON students USING gin((grade, track, level)) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_analytics_gin_class_attributes 
    ON classes USING gin((grade, track, level)) 
    WHERE is_active = true;

-- ========================================
-- INDEX MONITORING AND MAINTENANCE
-- ========================================

-- Create function to monitor Analytics index usage
CREATE OR REPLACE FUNCTION analytics_index_usage_stats()
RETURNS TABLE (
    index_name TEXT,
    table_name TEXT,
    usage_count BIGINT,
    size_mb NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        idx.indexrelname::TEXT as index_name,
        tab.relname::TEXT as table_name,
        idx_stat.idx_scan as usage_count,
        ROUND(pg_relation_size(idx.indexrelid) / 1024.0 / 1024.0, 2) as size_mb
    FROM pg_class idx
    JOIN pg_index i ON idx.oid = i.indexrelid
    JOIN pg_class tab ON i.indrelid = tab.oid
    JOIN pg_stat_user_indexes idx_stat ON idx.oid = idx_stat.indexrelid
    WHERE idx.relname LIKE 'idx_analytics_%'
    ORDER BY idx_stat.idx_scan DESC, size_mb DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ANALYTICS PERFORMANCE VALIDATION
-- ========================================

-- Create function to validate Analytics query performance
CREATE OR REPLACE FUNCTION validate_analytics_performance()
RETURNS TABLE (
    query_type TEXT,
    execution_time_ms NUMERIC,
    status TEXT
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
BEGIN
    -- Test 1: Student grade aggregates query
    start_time := clock_timestamp();
    PERFORM COUNT(*) FROM student_grade_aggregates WHERE grade = 1;
    end_time := clock_timestamp();
    
    RETURN QUERY SELECT 
        'student_grade_aggregates'::TEXT,
        EXTRACT(epoch FROM (end_time - start_time)) * 1000,
        CASE WHEN EXTRACT(epoch FROM (end_time - start_time)) * 1000 < 500 
             THEN 'PASS' ELSE 'SLOW' END;
    
    -- Test 2: Class statistics query
    start_time := clock_timestamp();
    PERFORM COUNT(*) FROM class_statistics WHERE course_type = 'LT';
    end_time := clock_timestamp();
    
    RETURN QUERY SELECT 
        'class_statistics'::TEXT,
        EXTRACT(epoch FROM (end_time - start_time)) * 1000,
        CASE WHEN EXTRACT(epoch FROM (end_time - start_time)) * 1000 < 500 
             THEN 'PASS' ELSE 'SLOW' END;
    
    -- Test 3: Teacher performance query
    start_time := clock_timestamp();
    PERFORM COUNT(*) FROM teacher_performance WHERE teacher_type = 'IT';
    end_time := clock_timestamp();
    
    RETURN QUERY SELECT 
        'teacher_performance'::TEXT,
        EXTRACT(epoch FROM (end_time - start_time)) * 1000,
        CASE WHEN EXTRACT(epoch FROM (end_time - start_time)) * 1000 < 500 
             THEN 'PASS' ELSE 'SLOW' END;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- INDEX CREATION SUMMARY
-- ========================================

-- Count and report created indexes
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE indexname LIKE 'idx_analytics_%'
    AND schemaname = current_schema();
    
    RAISE NOTICE 'Analytics Performance Indexes v1.0 - Successfully created!';
    RAISE NOTICE 'Total Analytics indexes: %', index_count;
    RAISE NOTICE 'Focus areas: Grade calculations, Performance analysis, Risk assessment';
    RAISE NOTICE 'Target: Sub-500ms query response times for Analytics views';
END $$;

-- Success confirmation
SELECT 'Analytics Performance Indexes Migration Complete' as status,
       (SELECT COUNT(*) FROM pg_indexes WHERE indexname LIKE 'idx_analytics_%') as total_indexes_created,
       'Ready for Phase 3A-1 Analytics testing' as next_step;