# Growth Tracking

## Overview

Track student RIT score progression across multiple terms to visualize academic growth in Reading and Language Usage.

## Data Requirements

Each student may have up to 4 assessment records per course:
- Fall 2024-2025
- Spring 2024-2025
- Fall 2025-2026
- Spring 2025-2026

## Growth Calculation

### Simple Growth (Between Two Terms)

```typescript
interface GrowthData {
  startTerm: string;
  endTerm: string;
  startRit: number;
  endRit: number;
  growth: number;
}

function calculateGrowth(
  assessments: MapAssessment[],
  startTermTested: string,
  endTermTested: string
): GrowthData | null {
  const start = assessments.find(a => a.term_tested === startTermTested);
  const end = assessments.find(a => a.term_tested === endTermTested);
  
  if (!start || !end) return null;
  
  return {
    startTerm: startTermTested,
    endTerm: endTermTested,
    startRit: start.rit_score,
    endRit: end.rit_score,
    growth: end.rit_score - start.rit_score
  };
}
```

### Growth Trend (All Available Terms)

```typescript
// MapTerm: NWEA testing period (fall/winter/spring)
// Note: Distinct from ELA Term (1/2/3/4) in types/academic-year.ts
type MapTerm = 'fall' | 'winter' | 'spring';

interface TrendPoint {
  termTested: string;
  academicYear: string;
  mapTerm: MapTerm;
  ritScore: number;
  sortOrder: number;  // For chronological sorting
}

function getGrowthTrend(
  assessments: MapAssessment[],
  course: string
): TrendPoint[] {
  const termOrder: Record<string, number> = {
    'Fall 2024-2025': 1,
    'Spring 2024-2025': 2,
    'Fall 2025-2026': 3,
    'Spring 2025-2026': 4,
  };
  
  return assessments
    .filter(a => a.course === course)
    .map(a => ({
      termTested: a.term_tested,
      academicYear: a.academic_year,
      mapTerm: a.map_term,
      ritScore: a.rit_score,
      sortOrder: termOrder[a.term_tested] || 99
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
```

## Chart Visualization

### Line Chart Specifications

```typescript
interface ChartConfig {
  xAxis: {
    type: 'category';
    data: string[];  // ['Fall 24-25', 'Spring 24-25', 'Fall 25-26', 'Spring 25-26']
  };
  yAxis: {
    type: 'value';
    min: number;     // Dynamic based on data, e.g., lowest RIT - 10
    max: number;     // Dynamic based on data, e.g., highest RIT + 10
  };
  series: {
    type: 'line';
    data: number[];  // RIT scores in order
    markPoint?: {
      data: Array<{ type: 'max' } | { type: 'min' }>;
    };
  };
}
```

### Term Label Formatting

```typescript
function formatTermLabel(termTested: string): string {
  // 'Fall 2025-2026' -> 'Fall 25-26'
  const match = termTested.match(/^(Fall|Spring)\s+(\d{4})-(\d{4})$/);
  if (!match) return termTested;
  
  const [, season, startYear, endYear] = match;
  return `${season} ${startYear.slice(2)}-${endYear.slice(2)}`;
}
```

## Query Examples

### Get Student's Complete MAP History

```sql
SELECT
  ma.term_tested,
  ma.academic_year,
  ma.map_term,
  ma.course,
  ma.rit_score,
  ma.lexile_score,
  json_agg(
    json_build_object(
      'goal_name', mg.goal_name,
      'goal_rit_range', mg.goal_rit_range
    )
  ) as goals
FROM map_assessments ma
LEFT JOIN map_goal_scores mg ON mg.assessment_id = ma.id
WHERE ma.student_number = 'LE12001'
GROUP BY ma.id
ORDER BY
  ma.academic_year,
  CASE ma.map_term WHEN 'fall' THEN 1 WHEN 'winter' THEN 2 WHEN 'spring' THEN 3 END;
```

### Get Class Average by Term

```sql
SELECT 
  ma.term_tested,
  ma.course,
  ma.grade,
  COUNT(*) as student_count,
  ROUND(AVG(ma.rit_score), 1) as avg_rit,
  MIN(ma.rit_score) as min_rit,
  MAX(ma.rit_score) as max_rit
FROM map_assessments ma
WHERE ma.grade = 4
  AND ma.course = 'Reading'
GROUP BY ma.term_tested, ma.course, ma.grade
ORDER BY ma.term_tested;
```

### Calculate Growth Between Terms

```sql
WITH fall_scores AS (
  SELECT student_number, rit_score as fall_rit
  FROM map_assessments
  WHERE term_tested = 'Fall 2025-2026'
    AND course = 'Reading'
),
spring_scores AS (
  SELECT student_number, rit_score as spring_rit
  FROM map_assessments
  WHERE term_tested = 'Spring 2025-2026'
    AND course = 'Reading'
)
SELECT 
  f.student_number,
  f.fall_rit,
  s.spring_rit,
  (s.spring_rit - f.fall_rit) as growth
FROM fall_scores f
JOIN spring_scores s ON f.student_number = s.student_number
ORDER BY growth DESC;
```

## Display Components

### Student MAP Card

Display for individual student view:

```
┌─────────────────────────────────────────┐
│  Reading                    Fall 25-26  │
│  ───────────────────────────────────── │
│  RIT Score: 215                         │
│  Lexile: 850L                           │
│  Growth: +8 from Spring 24-25           │
│                                         │
│  Goals:                                 │
│  • Informational Text: 211-220          │
│  • Literary Text: 221-230               │
│  • Vocabulary: 211-220                  │
└─────────────────────────────────────────┘
```

### Growth Trend Chart

```
RIT Score
    ^
230 |                         ●
220 |              ●
210 |     ●
200 | ●
    +----------------------------> Term
      Fall   Spring  Fall   Spring
      24-25  24-25   25-26  25-26
```

## Access Control

| Role | Access Level |
|------|--------------|
| **Teacher** | View own class students' MAP data |
| **Admin / Office** | View all students, generate statistics |

### Teacher Query Filter

```sql
-- Get teacher's class students' MAP data
SELECT ma.*
FROM map_assessments ma
JOIN students s ON s.id = ma.student_id
JOIN class_students cs ON cs.student_id = s.id
JOIN classes c ON c.id = cs.class_id
WHERE c.teacher_id = :current_teacher_id
  AND c.academic_year = '2025-2026';
```
