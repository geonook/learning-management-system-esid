# Growth Tracking & Growth Index

## Overview

Track student RIT score progression across multiple terms to visualize academic growth in Reading and Language Usage.

## Growth Types

| Growth Type | Time Span | Data Source | Displayed Metrics |
|-------------|-----------|-------------|-------------------|
| **Fall → Spring** | ~6 months | Official CDF | Growth, Expected, Index, Met/Not Met, Quintile |
| **Spring → Fall** | ~4 months | Calculated | Growth only (no official benchmark) |

## Growth Index Calculation

### Official CDF Data (Fall → Spring)

When CDF data is available:
- `observed_growth` - Actual RIT change
- `projected_growth` - Expected growth for student's starting RIT
- `conditional_growth_index` - Actual ÷ Expected (1.0 = met expectations)
- `growth_quintile` - Low, LoAvg, Avg, HiAvg, High
- `met_projected_growth` - 'Yes' or 'No'

### Calculated Growth (Spring → Fall)

When crossing academic years (no official CDF):
```typescript
// Only calculate simple growth
const growth = toRit - fromRit;
// DO NOT calculate expected or index (no official benchmark for summer)
```

## Growth Data Structure

```typescript
interface GrowthRecord {
  fromTerm: string;         // 'Fall 2024-2025'
  toTerm: string;           // 'Spring 2024-2025'
  fromTermLabel: string;    // 'FA24'
  toTermLabel: string;      // 'SP25'
  grade: number;
  growthType: 'fallToSpring' | 'springToFall';
  academicYear: string;

  languageUsage: {
    fromScore: number | null;
    toScore: number | null;
    actualGrowth: number | null;
    expectedGrowth: number | null;       // null for springToFall
    growthIndex: number | null;          // null for springToFall
    officialObservedGrowth: number | null;
    officialProjectedGrowth: number | null;
    officialConditionalGrowthIndex: number | null;
    officialGrowthQuintile: string | null;
    officialMetProjectedGrowth: boolean | null;
  };

  reading: {
    // Same structure as languageUsage
  };
}
```

## Display Logic

### Fall → Spring (Full Display)

Show all metrics:
- Growth: +12 (actual RIT change)
- Expected: +10 (from NWEA norms)
- Index: 1.20 (above expected)
- Met: Yes/No badge
- Quintile: High/HiAvg/Avg/LoAvg/Low badge

### Spring → Fall (Simple Display)

Show only:
- Growth: +5 (calculated RIT change)
- Note: "No official benchmark for summer growth"

## Index Color Coding

| Index Value | Color | Label |
|-------------|-------|-------|
| ≥ 1.0 | Green | Above Expected |
| 0.8 - 0.99 | Amber | Near Expected |
| < 0.8 | Red | Below Expected |

## Implementation

### API Function: `getGrowthRecords`

```typescript
// lib/api/map-student-analytics.ts
export async function getGrowthRecords(studentId: string): Promise<GrowthRecord[]> {
  // 1. Fetch all assessments for student
  // 2. Pair consecutive terms
  // 3. Calculate or use official growth data
  // 4. Return sorted by time (newest first)
}
```

### UI Component: `StudentGrowthIndex`

```typescript
// components/map/student/StudentGrowthIndex.tsx
function FallToSpringCard({ record }: { record: GrowthRecord }) {
  // Full display with all metrics
}

function SpringToFallCard({ record }: { record: GrowthRecord }) {
  // Simple display with growth only
}
```

## Consecutive Growth (Stats Page)

For group-level analysis, use `MapConsecutiveGrowth` component which shows:
- Growth by English Level (E1, E2, E3, All)
- Both courses (Language Usage, Reading)
- Multiple term transitions

### Data Structure

```typescript
interface ConsecutiveGrowthRecord {
  fromTerm: string;
  toTerm: string;
  fromTermLabel: string;
  toTermLabel: string;
  fromGrade: number;
  toGrade: number;
  growthType: 'fallToSpring' | 'springToFall';

  byLevel: Array<{
    englishLevel: string;  // 'E1', 'E2', 'E3', 'All'
    languageUsage: {
      actualGrowth: number | null;
      expectedGrowth: number | null;
      growthIndex: number | null;
      studentCount: number;
    };
    reading: {
      // Same structure
    };
  }>;
}
```

## Chart Visualization

### Progress Chart (Bar Chart - Student Page)

```
RIT Score
    ^
230 |  [■]     [■]     [■]
220 |  [■]    [■][□]  [■][□]
210 | [■][□]  [■][□]  [■][□]
200 |  ────────────────────  Norm
    +-------------------------> Term
      FA24    SP25    FA25

■ = Student RIT
□ = Level Average
─ = NWEA Norm (dashed)
```

### Growth Trend (Line Chart - Stats Page)

```
RIT Score
    ^
230 |              ●─●─●  E1
220 |         ●─●─●       E2
210 |    ●─●─●            E3
200 | ─ ─ ─ ─ ─ ─ ─ ─ ─   Norm
    +-------------------------> Term
      FA24   SP25   FA25
```
