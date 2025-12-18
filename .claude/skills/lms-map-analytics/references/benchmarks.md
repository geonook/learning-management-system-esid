# Benchmark Classification Rules

## Overview

Students are classified into three English Levels (E1/E2/E3) based on their **Spring semester** RIT scores. This classification is used for:
- English class placement for the following year
- Progress tracking against level expectations
- Identifying students needing intervention

## Classification Rules by Grade

### Grade 3 → Grade 4

| Level | Language Usage | Reading |
|-------|----------------|---------|
| **E1** (Advanced) | ≥ 206 | ≥ 203 |
| **E2** (Intermediate) | ≥ 183 and < 206 | ≥ 180 and < 203 |
| **E3** (Developing) | < 183 | < 180 |

### Grade 4 → Grade 5

| Level | Language Usage | Reading |
|-------|----------------|---------|
| **E1** (Advanced) | ≥ 213 | ≥ 210 |
| **E2** (Intermediate) | ≥ 191 and < 213 | ≥ 188 and < 210 |
| **E3** (Developing) | < 191 | < 188 |

### Grade 5 → Grade 6

| Level | Language Usage | Reading |
|-------|----------------|---------|
| **E1** (Advanced) | ≥ 218 | ≥ 215 |
| **E2** (Intermediate) | ≥ 194 and < 218 | ≥ 191 and < 215 |
| **E3** (Developing) | < 194 | < 191 |

## Benchmark Pattern

Reading benchmark is consistently **3 points lower** than Language Usage:

```
Reading Benchmark = Language Usage Benchmark - 3
```

## Classification SQL

```sql
-- Classify students based on Spring Language Usage scores
CREATE OR REPLACE FUNCTION classify_english_level(
  grade INTEGER,
  course TEXT,
  rit_score INTEGER
) RETURNS TEXT AS $$
BEGIN
  IF course = 'Language Usage' THEN
    CASE grade
      WHEN 3 THEN
        IF rit_score >= 206 THEN RETURN 'E1';
        ELSIF rit_score >= 183 THEN RETURN 'E2';
        ELSE RETURN 'E3';
        END IF;
      WHEN 4 THEN
        IF rit_score >= 213 THEN RETURN 'E1';
        ELSIF rit_score >= 191 THEN RETURN 'E2';
        ELSE RETURN 'E3';
        END IF;
      WHEN 5 THEN
        IF rit_score >= 218 THEN RETURN 'E1';
        ELSIF rit_score >= 194 THEN RETURN 'E2';
        ELSE RETURN 'E3';
        END IF;
    END CASE;
  ELSIF course = 'Reading' THEN
    CASE grade
      WHEN 3 THEN
        IF rit_score >= 203 THEN RETURN 'E1';
        ELSIF rit_score >= 180 THEN RETURN 'E2';
        ELSE RETURN 'E3';
        END IF;
      WHEN 4 THEN
        IF rit_score >= 210 THEN RETURN 'E1';
        ELSIF rit_score >= 188 THEN RETURN 'E2';
        ELSE RETURN 'E3';
        END IF;
      WHEN 5 THEN
        IF rit_score >= 215 THEN RETURN 'E1';
        ELSIF rit_score >= 191 THEN RETURN 'E2';
        ELSE RETURN 'E3';
        END IF;
    END CASE;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

## TypeScript Implementation

```typescript
interface BenchmarkConfig {
  e1Threshold: number;
  e2Threshold: number;
}

const BENCHMARKS: Record<number, Record<string, BenchmarkConfig>> = {
  3: {
    'Language Usage': { e1Threshold: 206, e2Threshold: 183 },
    'Reading': { e1Threshold: 203, e2Threshold: 180 },
  },
  4: {
    'Language Usage': { e1Threshold: 213, e2Threshold: 191 },
    'Reading': { e1Threshold: 210, e2Threshold: 188 },
  },
  5: {
    'Language Usage': { e1Threshold: 218, e2Threshold: 194 },
    'Reading': { e1Threshold: 215, e2Threshold: 191 },
  },
};

function classifyEnglishLevel(
  grade: number,
  course: string,
  ritScore: number
): 'E1' | 'E2' | 'E3' | null {
  const config = BENCHMARKS[grade]?.[course];
  if (!config) return null;
  
  if (ritScore >= config.e1Threshold) return 'E1';
  if (ritScore >= config.e2Threshold) return 'E2';
  return 'E3';
}
```

## Benchmark Distribution Query

```sql
-- Count students in each benchmark category
SELECT 
  ma.grade,
  ma.course,
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
  END as benchmark_level,
  COUNT(*) as student_count
FROM map_assessments ma
WHERE ma.term = 'spring'
  AND ma.grade IN (3, 4, 5)
GROUP BY ma.grade, ma.course, benchmark_level
ORDER BY ma.grade, ma.course, benchmark_level;
```

## Notes

- G6 does not have benchmark classification (students graduate)
- Classification is based on **Spring** scores only
- Used for **next year's** English Level placement
