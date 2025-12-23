# NWEA National Norms

## Overview

NWEA provides national normative data based on millions of US student test records. KCIS uses these norms to compare school performance against national averages.

## Norm Values (2024-2025)

### Grade 3

| Term | Language Usage | Reading | Average |
|------|----------------|---------|---------|
| Fall 2024-2025 | 188 | 187 | 187.5 |
| Spring 2024-2025 | 198 | 197 | 197.5 |
| **Expected Growth** | +10 | +10 | +10 |

### Grade 4

| Term | Language Usage | Reading | Average |
|------|----------------|---------|---------|
| Fall 2024-2025 | 197 | 197 | 197 |
| Spring 2024-2025 | 205 | 205 | 205 |
| **Expected Growth** | +8 | +8 | +8 |

### Grade 5

| Term | Language Usage | Reading | Average |
|------|----------------|---------|---------|
| Fall 2024-2025 | 204 | 204 | 204 |
| Spring 2024-2025 | 210 | 211 | 210.5 |
| **Expected Growth** | +6 | +7 | +6.5 |

## Norm Table Schema

```sql
CREATE TABLE map_norms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year TEXT NOT NULL,        -- '2024-2025'
  map_term TEXT NOT NULL,             -- 'fall', 'winter', 'spring' (distinct from ELA term 1-4)
  grade INTEGER NOT NULL,             -- 3, 4, 5, 6
  course TEXT NOT NULL,               -- 'Reading', 'Language Usage'
  norm_rit INTEGER NOT NULL,          -- National average RIT
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(academic_year, map_term, grade, course)
);
```

## Seed Data

```sql
INSERT INTO map_norms (academic_year, map_term, grade, course, norm_rit) VALUES
-- Grade 3
('2024-2025', 'fall', 3, 'Language Usage', 188),
('2024-2025', 'fall', 3, 'Reading', 187),
('2024-2025', 'spring', 3, 'Language Usage', 198),
('2024-2025', 'spring', 3, 'Reading', 197),
-- Grade 4
('2024-2025', 'fall', 4, 'Language Usage', 197),
('2024-2025', 'fall', 4, 'Reading', 197),
('2024-2025', 'spring', 4, 'Language Usage', 205),
('2024-2025', 'spring', 4, 'Reading', 205),
-- Grade 5
('2024-2025', 'fall', 5, 'Language Usage', 204),
('2024-2025', 'fall', 5, 'Reading', 204),
('2024-2025', 'spring', 5, 'Language Usage', 210),
('2024-2025', 'spring', 5, 'Reading', 211);
```

## TypeScript Constants

```typescript
interface NormData {
  languageUsage: number;
  reading: number;
}

// MapTerm: NWEA testing period (fall/winter/spring)
// Note: Distinct from ELA Term (1/2/3/4) in types/academic-year.ts
type MapTerm = 'fall' | 'winter' | 'spring';
type MapTermNorms = Partial<Record<MapTerm, NormData>>;

const MAP_NORMS_2024_2025: Record<number, MapTermNorms> = {
  3: {
    fall: { languageUsage: 188, reading: 187 },
    spring: { languageUsage: 198, reading: 197 },
  },
  4: {
    fall: { languageUsage: 197, reading: 197 },
    spring: { languageUsage: 205, reading: 205 },
  },
  5: {
    fall: { languageUsage: 204, reading: 204 },
    spring: { languageUsage: 210, reading: 211 },
  },
};

function getNorm(
  grade: number,
  mapTerm: MapTerm,
  course: 'Language Usage' | 'Reading'
): number | null {
  const gradeNorms = MAP_NORMS_2024_2025[grade];
  if (!gradeNorms) return null;

  const termNorms = gradeNorms[mapTerm];
  if (!termNorms) return null;

  return course === 'Language Usage'
    ? termNorms.languageUsage
    : termNorms.reading;
}
```

## Comparison Query

```sql
-- Compare school average vs national norm
SELECT
  ma.grade,
  ma.map_term,
  ma.course,
  COUNT(*) as student_count,
  ROUND(AVG(ma.rit_score), 1) as school_avg,
  n.norm_rit as national_norm,
  ROUND(AVG(ma.rit_score) - n.norm_rit, 1) as diff_from_norm
FROM map_assessments ma
JOIN map_norms n ON
  n.academic_year = ma.academic_year
  AND n.map_term = ma.map_term
  AND n.grade = ma.grade
  AND n.course = ma.course
WHERE ma.academic_year = '2024-2025'
GROUP BY ma.grade, ma.map_term, ma.course, n.norm_rit
ORDER BY ma.grade, ma.map_term, ma.course;
```

## Expected Growth Calculation

```typescript
function getExpectedGrowth(grade: number, course: string): number | null {
  const norms = MAP_NORMS_2024_2025[grade];
  if (!norms) return null;
  
  const key = course === 'Language Usage' ? 'languageUsage' : 'reading';
  return norms.spring[key] - norms.fall[key];
}

// Usage
getExpectedGrowth(3, 'Language Usage'); // 10
getExpectedGrowth(4, 'Reading');        // 8
getExpectedGrowth(5, 'Reading');        // 7
```

## Notes

- Norms are updated by NWEA periodically (typically every few years)
- Current norms based on 2024-2025 academic year
- G6 norms not currently tracked (students graduate)
- Source: NWEA MAP Growth Normative Data
