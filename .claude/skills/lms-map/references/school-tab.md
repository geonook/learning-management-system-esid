# MAP School Tab Reference

> Added in v1.65+  
> Date: 2025-12-30

## Overview

The School Tab provides cross-grade (G3-G6) analysis for school administrators and decision-makers who need to see school-wide MAP performance at a glance.

## Tab Structure

```
[School] [Grades] [Growth] [Goals] [Lexile] [Quality] [Transitions]
   NEW    renamed
          from
          Overview
```

## Components

### P1: Cross-Grade Performance Chart

**File**: `components/map/school/CrossGradeChart.tsx`

Displays G3-G6 mean RIT scores compared to NWEA national norms.

| Element         | Color           | Description                            |
| --------------- | --------------- | -------------------------------------- |
| KCISLK Students | Green (#16a34a) | School average with error bars (±1 SD) |
| NWEA Norm       | Gray (#64748b)  | National average (dashed line)         |

### P2: Summary Table

**File**: `components/map/school/SchoolSummaryTable.tsx`

| Column   | Description                         |
| -------- | ----------------------------------- |
| Grade    | G3, G4, G5, G6                      |
| Count    | Number of students                  |
| Mean RIT | Average RIT score                   |
| Std Dev  | Standard deviation                  |
| Norm     | NWEA national norm                  |
| vs Norm  | Difference (green=above, red=below) |

### P3: Growth Distribution

**File**: `components/map/school/GrowthDistributionChart.tsx`

Fall-to-Fall growth histogram showing:

- Distribution buckets (< -5, -5 to 0, 0 to 5, etc.)
- Red highlighting for negative growth
- Student count and percentage per bucket
- Mean growth statistic
- Alert for negative growth students

### P4: RIT-Growth Scatter

**File**: `components/map/school/RitGrowthScatterChart.tsx`

Correlation analysis between starting RIT and growth:

- Points colored by grade (G3=blue, G4=green, G5=amber, G6=purple)
- Pearson correlation coefficient with interpretation
- Reference line at y=0 (no growth)
- Identifies ceiling effect (negative correlation)

## API Functions

**File**: `lib/api/map-school-analytics.ts`

| Function                        | Returns                        | Description                        |
| ------------------------------- | ------------------------------ | ---------------------------------- |
| `getCrossGradeStats(params)`    | `SchoolOverviewData`           | Cross-grade statistics for a term  |
| `getAvailableSchoolTerms()`     | `string[]`                     | Available terms (newest first)     |
| `getSchoolGrowthDistribution()` | `SchoolGrowthDistributionData` | Growth distribution buckets        |
| `getRitGrowthScatterData()`     | `RitGrowthScatterData`         | Scatter plot data with correlation |

### Dynamic Term Detection

P3 and P4 APIs dynamically detect available Fall terms:

1. Query all Fall terms from `map_assessments`
2. Sort chronologically using `compareTermTested()`
3. Use the two most recent Fall terms for growth calculation
4. Return null if < 2 Fall terms available

## UI Behavior

### Grade Selector

| Tab Selected | Grade Selector State                  |
| ------------ | ------------------------------------- |
| School       | Shows "All Grades (G3-G6)" (disabled) |
| Other tabs   | Normal G3/G4/G5/G6 buttons            |

### Term Selector

- Sorted newest first
- Default: most recent available term
- Affects P1 and P2 only (P3/P4 use Fall-to-Fall)

## Data Source

All data comes from existing `map_assessments` table:

- No new database tables required
- Filters by `is_active = true` students only
- Groups by grade (3, 4, 5, 6)
