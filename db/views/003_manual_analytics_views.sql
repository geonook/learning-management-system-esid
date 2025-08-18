-- Manual Analytics Views Creation for Zeabur Supabase
-- Execute these statements in Supabase Studio SQL Editor
-- Date: 2025-08-18

-- ========================================
-- STUDENT GRADE AGGREGATES VIEW (Core Analytics View)
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
  
  -- Calculated averages (following /lib/grade logic)
  ROUND(
      CASE 
          WHEN COUNT(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN 1 END) > 0
          THEN AVG(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN sc.score END)::numeric
          ELSE NULL
      END, 2
  ) as formative_average,
  
  ROUND(
      CASE 
          WHEN COUNT(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN 1 END) > 0
          THEN AVG(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN sc.score END)::numeric
          ELSE NULL
      END, 2
  ) as summative_average,
  
  -- Final score
  MAX(CASE WHEN sc.assessment_code = 'FINAL' THEN sc.score END) as final_score,
  
  -- Semester grade calculation: (F×0.15 + S×0.2 + Final×0.1) ÷ 0.45
  ROUND(
      CASE 
          WHEN AVG(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN sc.score END) IS NOT NULL
              AND AVG(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN sc.score END) IS NOT NULL
              AND MAX(CASE WHEN sc.assessment_code = 'FINAL' THEN sc.score END) IS NOT NULL
              AND MAX(CASE WHEN sc.assessment_code = 'FINAL' THEN sc.score END) > 0
          THEN (
              AVG(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN sc.score END)::numeric * 0.15 +
              AVG(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN sc.score END)::numeric * 0.20 +
              MAX(CASE WHEN sc.assessment_code = 'FINAL' THEN sc.score END)::numeric * 0.10
          ) / 0.45
          ELSE NULL
      END, 2
  ) as semester_grade,
  
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
  ROUND(AVG(CASE WHEN sc.score > 0 THEN sc.score END)::numeric, 2) as class_average,
  ROUND(
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CASE WHEN sc.score > 0 THEN sc.score END)::numeric, 2
  ) as class_median,
  MIN(CASE WHEN sc.score > 0 THEN sc.score END) as class_min,
  MAX(sc.score) as class_max,
  
  -- Standard deviation
  ROUND(
      STDDEV_POP(CASE WHEN sc.score > 0 THEN sc.score END)::numeric, 2
  ) as class_stddev,
  
  -- Assessment type averages
  ROUND(
      AVG(CASE WHEN sc.assessment_code LIKE 'FA%' AND sc.score > 0 THEN sc.score END)::numeric, 2
  ) as formative_class_avg,
  ROUND(
      AVG(CASE WHEN sc.assessment_code LIKE 'SA%' AND sc.score > 0 THEN sc.score END)::numeric, 2
  ) as summative_class_avg,
  ROUND(
      AVG(CASE WHEN sc.assessment_code = 'FINAL' AND sc.score > 0 THEN sc.score END)::numeric, 2
  ) as final_class_avg,
  
  -- Last update
  MAX(sc.entered_at) as last_update

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
  ROUND(AVG(CASE WHEN sc.score > 0 THEN sc.score END)::numeric, 2) as overall_class_average,
  ROUND(
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CASE WHEN sc.score > 0 THEN sc.score END)::numeric, 2
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
  END) as at_risk_students

FROM users u
LEFT JOIN courses co ON u.id = co.teacher_id
LEFT JOIN classes c ON co.class_id = c.id
LEFT JOIN students s ON c.id = s.class_id AND s.is_active = true
LEFT JOIN scores sc ON s.id = sc.student_id AND sc.course_id = co.id
WHERE u.role = 'teacher' 
    AND u.is_active = true
    AND (co.is_active = true OR co.id IS NULL)
    AND (c.is_active = true OR c.id IS NULL)
GROUP BY u.id, u.full_name, u.email, u.teacher_type, u.grade, u.track;

-- ========================================
-- ESSENTIAL ANALYTICS INDEXES (Create these too)
-- ========================================

-- Critical index for student grade aggregation queries
CREATE INDEX IF NOT EXISTS idx_analytics_students_grade_track_active 
    ON students(grade, track, is_active, class_id) 
    WHERE is_active = true;

-- Critical index for scores analysis by assessment patterns
CREATE INDEX IF NOT EXISTS idx_analytics_scores_assessment_pattern 
    ON scores(assessment_code, score, student_id) 
    WHERE score > 0;

-- Specialized index for formative assessment analysis
CREATE INDEX IF NOT EXISTS idx_analytics_scores_formative 
    ON scores(student_id, course_id, score) 
    WHERE assessment_code LIKE 'FA%' AND score > 0;

-- Specialized index for summative assessment analysis  
CREATE INDEX IF NOT EXISTS idx_analytics_scores_summative 
    ON scores(student_id, course_id, score) 
    WHERE assessment_code LIKE 'SA%' AND score > 0;

-- Specialized index for final assessment analysis
CREATE INDEX IF NOT EXISTS idx_analytics_scores_final 
    ON scores(student_id, course_id, score) 
    WHERE assessment_code = 'FINAL' AND score > 0;

-- Class-level aggregation optimization
CREATE INDEX IF NOT EXISTS idx_analytics_classes_performance 
    ON classes(grade, track, academic_year, is_active) 
    WHERE is_active = true;

-- Course-class relationship optimization
CREATE INDEX IF NOT EXISTS idx_analytics_courses_teacher_class 
    ON courses(teacher_id, class_id, course_type, is_active) 
    WHERE is_active = true;

-- Teacher assignment and performance tracking
CREATE INDEX IF NOT EXISTS idx_analytics_teachers_performance 
    ON users(teacher_type, grade, track, role, is_active) 
    WHERE role = 'teacher' AND is_active = true;

-- Performance monitoring (add this at the end to test)
-- SELECT 'Analytics Views Created Successfully!' as status;

-- ========================================
-- MANUAL EXECUTION INSTRUCTIONS
-- ========================================

/*
Instructions for Supabase Studio:

1. Open your Supabase project at: https://esid-lms.zeabur.app (or your Supabase Studio URL)
2. Go to SQL Editor
3. Copy and paste the above SQL statements one by one, or all at once
4. Execute each statement
5. Verify views are created by checking Database > Views in the sidebar

After creation, test with:
SELECT COUNT(*) FROM student_grade_aggregates;
SELECT COUNT(*) FROM class_statistics;
SELECT COUNT(*) FROM teacher_performance;

These views will provide the foundation for Phase 3A-1 Analytics system.
*/