# Growth Tracking & Growth Index

## Overview

Track student RIT score progression across multiple terms to visualize academic growth in Reading and Language Usage.

## Growth Types

| Growth Type | Time Span | Data Source | Displayed Metrics |
|-------------|-----------|-------------|-------------------|
| **Fall → Spring** | ~6 months | Official CDF | Growth, Expected, Index, Met/Not Met, Quintile |
| **Fall → Fall** | ~12 months | NWEA 2025 Norms | Growth, Expected, Index |
| **Spring → Fall** | ~4 months | Calculated | Growth only (no official benchmark) |

### Cross-Grade Growth (Fall-to-Fall)

Fall-to-Fall growth spans academic years and involves grade advancement:

| Period | Grade Change | Norm Source |
|--------|--------------|-------------|
| G3 Fall → G4 Fall | G3 → G4 | G3 norms (Technical Manual Table C.3/C.5) |
| G4 Fall → G5 Fall | G4 → G5 | G4 norms |
| G5 Fall → G6 Fall | G5 → G6 | G5 norms |

**NWEA 2025 Fall-to-Fall Expected Growth** (from `lib/map/norms.ts`):

| Starting Grade | Reading | Language Usage |
|----------------|---------|----------------|
| G3 | 9 | 9 |
| G4 | 5 | 6 |
| G5 | 4 | 4 |
| G6 | 3 | 3 |

**Key Implementation Files**:
- `lib/map/norms.ts` - `getExpectedGrowth()` function
- `lib/api/map-growth-analytics.ts` - Growth calculations

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

### fromGrade Tracking (v1.66.1+)

**Why track starting grade?**
- NWEA growth norms are based on the **starting grade**, not the ending grade
- Fall-to-Fall growth spans academic years (e.g., G3 Fall → G4 Fall)
- Must use G3 norms for a student who was G3 at the start, even if now G4

**Implementation**:
```typescript
interface StudentGrowth {
  fromGrade: number | null;  // Grade at start of growth period
  grade: number;             // Current grade (for display)
  // ...
}

// Use fromGrade for norm lookup
const expectedGrowth = getExpectedGrowth(fromTerm, toTerm, fromGrade, course);
```

**Example**:
- Student in G4 Fall 2025
- Looking at Fall 2024 → Fall 2025 growth
- Student was G3 in Fall 2024
- Use G3 norms (Reading: 9, LU: 9), NOT G4 norms

### Null Value Handling (v1.66.1+)

Growth Index returns `null` when:
1. **Spring → Fall**: No official NWEA benchmark for summer
2. **Missing norms**: Grade/course combination not in lookup table
3. **Invalid periods**: Unsupported term transitions

**Correct Implementation**:
```typescript
// ✅ Correct: Handle null gracefully
const expectedGrowth = getExpectedGrowth(fromTerm, toTerm, fromGrade, course);
const growthIndex = expectedGrowth !== null && expectedGrowth !== 0
  ? actualGrowth / expectedGrowth
  : null;

// ❌ Wrong: Never use ?? 1 fallback (causes Index distortion)
// const expectedGrowth = getExpectedGrowth(...) ?? 1;
```

**UI Display**:
- `null` Growth Index → Show "N/A"
- `null` vsNorm → Show "—"

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
