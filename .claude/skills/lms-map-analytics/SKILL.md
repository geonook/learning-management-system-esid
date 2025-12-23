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
| **MapTerm** | Fall, Winter, Spring (distinct from ELA Term 1-4) |
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
  ma.map_term,
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
GROUP BY ma.academic_year, ma.map_term, ma.grade, s.english_level, ma.course;
```

### Student Combined Scores View

```sql
CREATE VIEW map_student_combined AS
SELECT
  student_number,
  academic_year,
  map_term,
  term_tested,
  grade,
  MAX(CASE WHEN course = 'Language Usage' THEN rit_score END) as language_usage,
  MAX(CASE WHEN course = 'Reading' THEN rit_score END) as reading,
  ROUND((
    MAX(CASE WHEN course = 'Language Usage' THEN rit_score END) +
    MAX(CASE WHEN course = 'Reading' THEN rit_score END)
  ) / 2.0, 1) as average
FROM map_assessments
GROUP BY student_number, academic_year, map_term, term_tested, grade;
```

## Analysis Queries

See `references/queries.md` for complete SQL examples.

## Student-Level Analytics (Student Detail Page)

The student detail page (`/student/[id]`) includes a MAP Analytics Tab for G3-G6 students with the following components:

### Peer Comparison

**Important**: As of v1.55.0, peer comparison uses **English Level (E1/E2/E3)** grouping instead of class grouping to avoid sharing class-specific averages with parents.

| Comparison Type | Description |
|-----------------|-------------|
| **Level Rank** | Ranking within same grade + same English Level |
| **Grade Rank** | Ranking within same grade (all levels) |
| **vs Level Avg** | Difference from English Level average |
| **vs Grade Avg** | Difference from grade average |
| **vs NWEA Norm** | Difference from national norm |

**Implementation**: `lib/api/map-student-analytics.ts`
- `getStudentRankings()` - Calculates Level and Grade rankings
- `extractEnglishLevel()` - Extracts E1/E2/E3 from class level (e.g., "G3E2" → "E2")

### Other Components

- **Benchmark Status**: E1/E2/E3 classification based on test grade thresholds
- **Growth Index**: Fall → Spring growth compared to expected growth
- **Goal Areas**: Reading/Language Usage goal performance vs overall RIT
- **Lexile Level**: Lexile score band and recommended reading range
- **Benchmark History**: Historical benchmark trend across terms

## Visualization

See `references/charts.md` for chart specifications.
