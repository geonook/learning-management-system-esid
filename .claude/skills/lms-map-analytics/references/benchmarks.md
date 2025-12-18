# Benchmark Classification Rules

## Overview

Students are classified into three English Levels (E1/E2/E3) based on their **Spring semester Average RIT score** (兩科平均). This classification is used for:
- English class placement for the following year
- Progress tracking against level expectations
- Identifying students needing intervention

## Important: Classification is Based on Average

**Benchmark 分類是看 Average（兩科平均）來判斷，不是分別看 Language Usage 和 Reading。**

```
Average = (Language Usage RIT + Reading RIT) / 2
```

## Classification Rules by Grade

### Grade 3 → Grade 4

| Level | Average RIT |
|-------|-------------|
| **E1** (Advanced) | ≥ 206 |
| **E2** (Intermediate) | ≥ 183 and < 206 |
| **E3** (Developing) | < 183 |

### Grade 4 → Grade 5

| Level | Average RIT |
|-------|-------------|
| **E1** (Advanced) | ≥ 213 |
| **E2** (Intermediate) | ≥ 191 and < 213 |
| **E3** (Developing) | < 191 |

### Grade 5 → Grade 6

| Level | Average RIT |
|-------|-------------|
| **E1** (Advanced) | ≥ 218 |
| **E2** (Intermediate) | ≥ 194 and < 218 |
| **E3** (Developing) | < 194 |

## Summary Table

| Grade | E1 Threshold | E2 Threshold |
|-------|--------------|--------------|
| G3 | ≥ 206 | ≥ 183 |
| G4 | ≥ 213 | ≥ 191 |
| G5 | ≥ 218 | ≥ 194 |

## TypeScript Implementation

```typescript
interface BenchmarkThreshold {
  e1Threshold: number;  // Average >= e1 → E1
  e2Threshold: number;  // e2 <= Average < e1 → E2, else E3
}

// Thresholds apply to Average (兩科平均)
const BENCHMARKS: Record<number, BenchmarkThreshold> = {
  3: { e1Threshold: 206, e2Threshold: 183 },
  4: { e1Threshold: 213, e2Threshold: 191 },
  5: { e1Threshold: 218, e2Threshold: 194 },
};

// Calculate two-subject average
export function calculateMapAverage(
  languageUsage: number,
  reading: number
): number {
  return (languageUsage + reading) / 2;
}

// Classify benchmark based on average score
export function classifyBenchmark(
  grade: number,
  average: number  // Pre-calculated average of both subjects
): 'E1' | 'E2' | 'E3' | null {
  const thresholds = BENCHMARKS[grade];
  if (!thresholds) return null;

  if (average >= thresholds.e1Threshold) return 'E1';
  if (average >= thresholds.e2Threshold) return 'E2';
  return 'E3';
}

// Get benchmark thresholds for display
export function getBenchmarkThresholds(grade: number): BenchmarkThreshold | null {
  return BENCHMARKS[grade] || null;
}
```

## SQL Implementation

```sql
-- Calculate student average and classify benchmark
WITH student_averages AS (
  SELECT
    ma.student_number,
    ma.grade,
    ROUND((
      MAX(CASE WHEN ma.course = 'Language Usage' THEN ma.rit_score END) +
      MAX(CASE WHEN ma.course = 'Reading' THEN ma.rit_score END)
    ) / 2.0, 2) as average
  FROM map_assessments ma
  WHERE ma.term = 'spring'
    AND ma.academic_year = '2024-2025'
  GROUP BY ma.student_number, ma.grade
  HAVING
    MAX(CASE WHEN ma.course = 'Language Usage' THEN ma.rit_score END) IS NOT NULL
    AND MAX(CASE WHEN ma.course = 'Reading' THEN ma.rit_score END) IS NOT NULL
)
SELECT
  student_number,
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
ORDER BY grade, benchmark;
```

## Benchmark Distribution Query

```sql
-- Count students in each benchmark category (based on Average)
WITH student_averages AS (
  SELECT
    ma.student_number,
    ma.grade,
    ROUND((
      MAX(CASE WHEN ma.course = 'Language Usage' THEN ma.rit_score END) +
      MAX(CASE WHEN ma.course = 'Reading' THEN ma.rit_score END)
    ) / 2.0, 2) as average
  FROM map_assessments ma
  WHERE ma.term = 'spring'
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

## Notes

- G6 does not have benchmark classification (students graduate)
- Classification is based on **Spring** scores only
- Both Language Usage AND Reading scores must exist to calculate Average
- Used for **next year's** English Level placement
