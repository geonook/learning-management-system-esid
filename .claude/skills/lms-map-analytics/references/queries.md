# Analysis Queries

## 1. Group Averages

### By English Level × Grade × Term

```sql
SELECT 
  ma.academic_year,
  ma.term,
  ma.grade,
  s.english_level,
  ma.course,
  COUNT(*) as student_count,
  ROUND(AVG(ma.rit_score), 2) as avg_rit
FROM map_assessments ma
JOIN students s ON s.id = ma.student_id
WHERE ma.academic_year = '2024-2025'
GROUP BY ma.academic_year, ma.term, ma.grade, s.english_level, ma.course
ORDER BY ma.grade, s.english_level, ma.course, ma.term;
```

### Grade-Level Totals

```sql
SELECT 
  ma.academic_year,
  ma.term,
  ma.grade,
  ma.course,
  COUNT(*) as student_count,
  ROUND(AVG(ma.rit_score), 2) as avg_rit,
  MIN(ma.rit_score) as min_rit,
  MAX(ma.rit_score) as max_rit
FROM map_assessments ma
WHERE ma.academic_year = '2024-2025'
GROUP BY ma.academic_year, ma.term, ma.grade, ma.course
ORDER BY ma.grade, ma.course, ma.term;
```

## 2. Combined Student Scores

### Create Pivot Table (Language Usage + Reading + Average)

```sql
SELECT 
  ma.student_number,
  s.chinese_name,
  s.english_name,
  s.english_level,
  s.homeroom,
  ma.academic_year,
  ma.term,
  ma.term_tested,
  ma.grade,
  MAX(CASE WHEN ma.course = 'Language Usage' THEN ma.rit_score END) as language_usage,
  MAX(CASE WHEN ma.course = 'Reading' THEN ma.rit_score END) as reading,
  ROUND((
    COALESCE(MAX(CASE WHEN ma.course = 'Language Usage' THEN ma.rit_score END), 0) +
    COALESCE(MAX(CASE WHEN ma.course = 'Reading' THEN ma.rit_score END), 0)
  ) / 2.0, 1) as average
FROM map_assessments ma
JOIN students s ON s.id = ma.student_id
WHERE ma.academic_year = '2024-2025'
GROUP BY 
  ma.student_number, s.chinese_name, s.english_name, 
  s.english_level, s.homeroom,
  ma.academic_year, ma.term, ma.term_tested, ma.grade
ORDER BY ma.grade, s.english_level, ma.student_number, ma.term;
```

## 3. Term-over-Term Growth

### Individual Student Growth

```sql
WITH fall_scores AS (
  SELECT 
    student_number,
    course,
    rit_score as fall_rit
  FROM map_assessments
  WHERE term = 'fall' AND academic_year = '2024-2025'
),
spring_scores AS (
  SELECT 
    student_number,
    course,
    rit_score as spring_rit
  FROM map_assessments
  WHERE term = 'spring' AND academic_year = '2024-2025'
)
SELECT 
  f.student_number,
  f.course,
  f.fall_rit,
  s.spring_rit,
  (s.spring_rit - f.fall_rit) as growth
FROM fall_scores f
JOIN spring_scores s ON f.student_number = s.student_number AND f.course = s.course
ORDER BY f.course, growth DESC;
```

### Average Growth by English Level

```sql
WITH growth_data AS (
  SELECT 
    ma_fall.student_number,
    s.english_level,
    ma_fall.grade,
    ma_fall.course,
    ma_fall.rit_score as fall_rit,
    ma_spring.rit_score as spring_rit,
    (ma_spring.rit_score - ma_fall.rit_score) as growth
  FROM map_assessments ma_fall
  JOIN map_assessments ma_spring ON 
    ma_fall.student_number = ma_spring.student_number 
    AND ma_fall.course = ma_spring.course
    AND ma_fall.academic_year = ma_spring.academic_year
  JOIN students s ON s.id = ma_fall.student_id
  WHERE ma_fall.term = 'fall' 
    AND ma_spring.term = 'spring'
    AND ma_fall.academic_year = '2024-2025'
)
SELECT 
  grade,
  english_level,
  course,
  COUNT(*) as student_count,
  ROUND(AVG(fall_rit), 1) as avg_fall,
  ROUND(AVG(spring_rit), 1) as avg_spring,
  ROUND(AVG(growth), 1) as avg_growth
FROM growth_data
GROUP BY grade, english_level, course
ORDER BY grade, english_level, course;
```

## 4. Benchmark Distribution

### Count by Benchmark Category

```sql
WITH classified AS (
  SELECT 
    ma.grade,
    ma.course,
    ma.rit_score,
    CASE 
      WHEN ma.course = 'Language Usage' THEN
        CASE ma.grade
          WHEN 3 THEN CASE WHEN ma.rit_score >= 206 THEN 'E1' WHEN ma.rit_score >= 183 THEN 'E2' ELSE 'E3' END
          WHEN 4 THEN CASE WHEN ma.rit_score >= 213 THEN 'E1' WHEN ma.rit_score >= 191 THEN 'E2' ELSE 'E3' END
          WHEN 5 THEN CASE WHEN ma.rit_score >= 218 THEN 'E1' WHEN ma.rit_score >= 194 THEN 'E2' ELSE 'E3' END
        END
      WHEN ma.course = 'Reading' THEN
        CASE ma.grade
          WHEN 3 THEN CASE WHEN ma.rit_score >= 203 THEN 'E1' WHEN ma.rit_score >= 180 THEN 'E2' ELSE 'E3' END
          WHEN 4 THEN CASE WHEN ma.rit_score >= 210 THEN 'E1' WHEN ma.rit_score >= 188 THEN 'E2' ELSE 'E3' END
          WHEN 5 THEN CASE WHEN ma.rit_score >= 215 THEN 'E1' WHEN ma.rit_score >= 191 THEN 'E2' ELSE 'E3' END
        END
    END as benchmark
  FROM map_assessments ma
  WHERE ma.term = 'spring' 
    AND ma.academic_year = '2024-2025'
    AND ma.grade IN (3, 4, 5)
)
SELECT 
  grade,
  course,
  benchmark,
  COUNT(*) as count
FROM classified
WHERE benchmark IS NOT NULL
GROUP BY grade, course, benchmark
ORDER BY grade, course, benchmark;
```

## 5. Norm Comparison

### School vs National Average

```sql
SELECT 
  ma.grade,
  ma.term,
  ma.course,
  COUNT(*) as student_count,
  ROUND(AVG(ma.rit_score), 1) as school_avg,
  n.norm_rit as national_norm,
  ROUND(AVG(ma.rit_score) - n.norm_rit, 1) as difference,
  CASE 
    WHEN AVG(ma.rit_score) >= n.norm_rit THEN 'Above Norm'
    ELSE 'Below Norm'
  END as status
FROM map_assessments ma
JOIN map_norms n ON 
  n.academic_year = ma.academic_year 
  AND n.term = ma.term 
  AND n.grade = ma.grade 
  AND n.course = ma.course
WHERE ma.academic_year = '2024-2025'
GROUP BY ma.grade, ma.term, ma.course, n.norm_rit
ORDER BY ma.grade, ma.term, ma.course;
```

## 6. Overview Report Query

### Complete Overview Data (Matching Excel Structure)

```sql
WITH student_combined AS (
  SELECT 
    ma.student_number,
    ma.academic_year,
    ma.term,
    ma.term_tested,
    ma.grade,
    s.english_level,
    MAX(CASE WHEN ma.course = 'Language Usage' THEN ma.rit_score END) as language_usage,
    MAX(CASE WHEN ma.course = 'Reading' THEN ma.rit_score END) as reading
  FROM map_assessments ma
  JOIN students s ON s.id = ma.student_id
  GROUP BY ma.student_number, ma.academic_year, ma.term, ma.term_tested, ma.grade, s.english_level
)
SELECT 
  grade,
  english_level,
  term,
  COUNT(*) as student_count,
  ROUND(AVG(language_usage), 2) as avg_language_usage,
  ROUND(AVG(reading), 2) as avg_reading,
  ROUND((AVG(language_usage) + AVG(reading)) / 2, 2) as avg_map_average
FROM student_combined
WHERE language_usage IS NOT NULL AND reading IS NOT NULL
GROUP BY grade, english_level, term
ORDER BY grade, english_level, term;
```
