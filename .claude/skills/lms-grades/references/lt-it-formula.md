# LT/IT Grade Calculation (English Language Arts)

## Assessment Codes (14 total)

| Code | Type | Weight |
|------|------|--------|
| FA1-FA8 | Formative Assessment | 0.0188 each (15% total) |
| SA1-SA4 | Summative Assessment | 0.05 each (20% total) |
| FINAL | Final Exam | 0.10 |
| MID | Midterm | 0.10 |

**Note**: Both FINAL and MID exist in database. Which one to use depends on calculation engine.

## Calculation Engines

| Engine | File | Uses |
|--------|------|------|
| Core Grade | `lib/grade/calculations.ts` | **FINAL** |
| Formula Engine | `lib/gradebook/FormulaEngine.ts` | **MID** |

## Formula

```typescript
// Formative Average (FA1-FA8 where score > 0)
FormativeAvg = avg(FA where FA > 0)

// Summative Average (SA1-SA4 where score > 0)
SummativeAvg = avg(SA where SA > 0)

// Semester Grade
Semester = (FormativeAvg × 0.15 + SummativeAvg × 0.20 + FINAL/MID × 0.10) ÷ 0.45
```

## Calculation Rules

1. **Only scores >0 included**
2. **All zeros → average is null**
3. **Round to 2 decimals** (lib/grade) or **1 decimal** (FormulaEngine)

## Usage Example

```typescript
import { FormulaEngine } from '@/lib/gradebook/FormulaEngine';

// Calculate term grade (uses MID)
const termGrade = FormulaEngine.calculateTermGrade(scores);

// Get Formative average
const faAvg = FormulaEngine.getFormativeAverage(scores);

// Get Summative average
const saAvg = FormulaEngine.getSummativeAverage(scores);
```

## Assessment Title Override

Heads can customize display names without affecting calculation.

```sql
CREATE TABLE assessment_titles (
  id UUID PRIMARY KEY,
  context TEXT NOT NULL,           -- 'class:{id}' or 'grade:{n}:track:{type}'
  assessment_code TEXT NOT NULL,   -- 'FA1', 'SA2', 'MID', etc.
  display_name TEXT NOT NULL,
  UNIQUE(context, assessment_code)
);
```

**Priority**: Class Level > Grade×Track Level > Default
