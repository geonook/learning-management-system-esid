# MAP Database Schema & Queries

## Tables

### Primary Table: `map_assessments`

```sql
CREATE TABLE map_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Student linking
  student_id UUID REFERENCES students(id),
  student_number TEXT NOT NULL,           -- 'LE12001'

  -- Student snapshot
  student_last_name TEXT,
  student_first_name TEXT,
  grade INTEGER NOT NULL,                 -- 3, 4, 5, 6
  school TEXT,

  -- Term identification
  term_tested TEXT NOT NULL,              -- 'Fall 2025-2026'
  academic_year TEXT NOT NULL,            -- '2025-2026'
  map_term TEXT NOT NULL,                 -- 'fall', 'winter', 'spring'

  -- Course & test info
  course TEXT NOT NULL,                   -- 'Reading', 'Language Usage'
  test_name TEXT,

  -- Core scores
  rit_score INTEGER NOT NULL,
  rit_score_range TEXT,                   -- '161-170'
  test_standard_error DECIMAL(5,2),
  rapid_guessing_percent DECIMAL(5,2),

  -- Official CDF data (from Combined Data File)
  test_percentile INTEGER,                -- 官方百分位數 (1-99)
  achievement_quintile TEXT,              -- 'Low', 'LoAvg', 'Avg', 'HiAvg', 'High'
  percent_correct DECIMAL(5,2),
  test_start_date DATE,
  test_duration_minutes INTEGER,

  -- Growth data (Fall to Spring)
  projected_growth INTEGER,               -- 預期成長
  observed_growth INTEGER,                -- 實際成長
  observed_growth_se DECIMAL(5,2),
  met_projected_growth TEXT,              -- 'Yes' / 'No'
  conditional_growth_index DECIMAL(5,2),  -- 成長指數 (1.0 = met expectations)
  conditional_growth_percentile INTEGER,
  growth_quintile TEXT,                   -- 'Low', 'LoAvg', 'Avg', 'HiAvg', 'High'
  typical_growth INTEGER,

  -- Lexile (Reading only)
  lexile_score TEXT,                      -- '1190L' or 'BR400'
  lexile_range TEXT,

  -- Import tracking
  imported_at TIMESTAMPTZ DEFAULT now(),
  import_batch_id UUID,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(student_number, course, term_tested)
);
```

### Goal Scores Table: `map_goal_scores`

```sql
CREATE TABLE map_goal_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES map_assessments(id) ON DELETE CASCADE,

  goal_name TEXT NOT NULL,                -- 'Informational Text', 'Grammar and Usage'
  goal_rit_range TEXT,                    -- '161-170'

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(assessment_id, goal_name)
);
```

### Indexes

```sql
CREATE INDEX idx_map_assessments_student_id ON map_assessments(student_id);
CREATE INDEX idx_map_assessments_student_number ON map_assessments(student_number);
CREATE INDEX idx_map_assessments_academic_year ON map_assessments(academic_year);
CREATE INDEX idx_map_assessments_map_term ON map_assessments(map_term);
CREATE INDEX idx_map_assessments_course ON map_assessments(course);
CREATE INDEX idx_map_assessments_grade ON map_assessments(grade);
CREATE INDEX idx_map_goal_scores_assessment ON map_goal_scores(assessment_id);
```

---

## Analysis Queries

### Group Averages by English Level

```sql
SELECT
  ma.academic_year,
  ma.map_term,
  ma.grade,
  s.english_level,
  ma.course,
  COUNT(*) as student_count,
  ROUND(AVG(ma.rit_score), 2) as avg_rit
FROM map_assessments ma
JOIN students s ON s.id = ma.student_id
WHERE ma.academic_year = '2024-2025'
GROUP BY ma.academic_year, ma.map_term, ma.grade, s.english_level, ma.course
ORDER BY ma.grade, s.english_level, ma.course, ma.map_term;
```

### Combined Student Scores (Pivot Table)

```sql
SELECT
  ma.student_number,
  s.chinese_name,
  s.english_level,
  ma.academic_year,
  ma.map_term,
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
  ma.student_number, s.chinese_name, s.english_level,
  ma.academic_year, ma.map_term, ma.grade
ORDER BY ma.grade, s.english_level, ma.student_number;
```

### Benchmark Distribution (Based on Average)

**Important**: Classification uses **Average (兩科平均)**, not individual course scores.

```sql
WITH student_averages AS (
  SELECT
    ma.student_number,
    ma.grade,
    ROUND((
      MAX(CASE WHEN ma.course = 'Language Usage' THEN ma.rit_score END) +
      MAX(CASE WHEN ma.course = 'Reading' THEN ma.rit_score END)
    ) / 2.0, 2) as average
  FROM map_assessments ma
  WHERE ma.map_term = 'spring'
    AND ma.academic_year = '2024-2025'
    AND ma.grade IN (3, 4, 5)
  GROUP BY ma.student_number, ma.grade
  HAVING
    MAX(CASE WHEN ma.course = 'Language Usage' THEN ma.rit_score END) IS NOT NULL
    AND MAX(CASE WHEN ma.course = 'Reading' THEN ma.rit_score END) IS NOT NULL
),
classified AS (
  SELECT
    grade,
    average,
    CASE
      WHEN grade = 3 THEN
        CASE WHEN average >= 206 THEN 'E1' WHEN average >= 183 THEN 'E2' ELSE 'E3' END
      WHEN grade = 4 THEN
        CASE WHEN average >= 213 THEN 'E1' WHEN average >= 191 THEN 'E2' ELSE 'E3' END
      WHEN grade = 5 THEN
        CASE WHEN average >= 218 THEN 'E1' WHEN average >= 194 THEN 'E2' ELSE 'E3' END
    END as benchmark
  FROM student_averages
)
SELECT
  grade,
  benchmark,
  COUNT(*) as student_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY grade), 1) as percentage
FROM classified
GROUP BY grade, benchmark
ORDER BY grade, benchmark;
```

### Growth: Fall → Spring

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
  WHERE ma_fall.map_term = 'fall'
    AND ma_spring.map_term = 'spring'
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
