---
name: lms-map-analytics
description: KCIS MAP Growth statistical analysis and reporting logic. Use this skill when implementing MAP data analysis features including group averages by English Level, benchmark classification (E1/E2/E3), term-over-term growth comparison, and norm comparison for G3-G6 Reading and Language Usage courses.
---

# MAP Growth Analytics

## Overview

Statistical analysis framework for NWEA MAP Growth data at KCIS, enabling comparison across English Levels, terms, and against national norms.

## Core Analysis Dimensions

| Dimension | Values |
|-----------|--------|
| **Grade** | G3, G4, G5, G6 |
| **English Level** | E1 (Advanced), E2 (Intermediate), E3 (Developing) |
| **Course** | Reading, Language Usage |
| **Term** | Fall, Spring |
| **Metrics** | RIT Score, Average (両科平均) |

## Key Statistics

### 1. Group Averages

Calculate mean RIT by:
- Grade × English Level × Course × Term
- Grade × Course × Term (All students)

### 2. Benchmark Classification

Categorize students into E1/E2/E3 based on **Spring Average (兩科平均)**.

**Important**: Classification uses the Average of Language Usage + Reading, NOT individual course scores.

See `references/benchmarks.md` for classification rules by grade.

### 3. Term Growth

Compare Fall → Spring performance for same student cohort.

### 4. Norm Comparison

Compare school averages against NWEA national norms.

See `references/norms.md` for norm values.

## Data Model

### Aggregated View: `map_analytics_summary`

```sql
CREATE VIEW map_analytics_summary AS
SELECT 
  ma.academic_year,
  ma.term,
  ma.grade,
  s.english_level,
  ma.course,
  COUNT(DISTINCT ma.student_number) as student_count,
  ROUND(AVG(ma.rit_score), 2) as avg_rit,
  MIN(ma.rit_score) as min_rit,
  MAX(ma.rit_score) as max_rit,
  ROUND(STDDEV(ma.rit_score), 2) as stddev_rit
FROM map_assessments ma
JOIN students s ON s.id = ma.student_id
GROUP BY ma.academic_year, ma.term, ma.grade, s.english_level, ma.course;
```

### Student Combined Scores View

```sql
CREATE VIEW map_student_combined AS
SELECT 
  student_number,
  academic_year,
  term,
  term_tested,
  grade,
  MAX(CASE WHEN course = 'Language Usage' THEN rit_score END) as language_usage,
  MAX(CASE WHEN course = 'Reading' THEN rit_score END) as reading,
  ROUND((
    MAX(CASE WHEN course = 'Language Usage' THEN rit_score END) +
    MAX(CASE WHEN course = 'Reading' THEN rit_score END)
  ) / 2.0, 1) as average
FROM map_assessments
GROUP BY student_number, academic_year, term, term_tested, grade;
```

## Analysis Queries

See `references/queries.md` for complete SQL examples.

## Visualization

See `references/charts.md` for chart specifications.
