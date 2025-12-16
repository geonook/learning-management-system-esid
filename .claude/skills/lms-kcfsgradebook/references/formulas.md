# KCFS Gradebook Calculation Formulas

## Term Grade Calculation

### Formula

```
Term Grade = BASE_SCORE + Σ(category_score × weight)
```

Where:
- `BASE_SCORE` = 50 (fixed)
- `weight` = varies by grade level (2.5, 2.0, or 5/3)
- `category_score` = individual score per category (0-5)

### Grade Range

| All Scores | Calculation | Result |
|------------|-------------|--------|
| 3.0 | 50 + (n × 3.0 × w) | **80** |
| 4.0 | 50 + (n × 4.0 × w) | **90** |
| 5.0 | 50 + (n × 5.0 × w) | **100** |

Where `n × w` always equals 10 (4×2.5, 5×2.0, or 6×5/3).

## Pseudocode Implementation

### Get KCFS Categories by Grade

```typescript
function getKCFSGradeRange(grade: number): '1-2' | '3-4' | '5-6' {
  if (grade <= 2) return '1-2';
  if (grade <= 4) return '3-4';
  return '5-6';
}

function getKCFSCategories(grade: number) {
  const range = getKCFSGradeRange(grade);
  return KCFS_GRADE_CONFIG[range];
}
```

### Calculate Term Grade

```typescript
function calculateKCFSTermGrade(
  scores: Record<string, { value: number | null; isAbsent: boolean }>,
  grade: number
): number | null {
  const config = getKCFSCategories(grade);
  const { categories, weight } = config;
  const BASE_SCORE = 50;

  let weightedSum = 0;
  let validCount = 0;

  for (const category of categories) {
    const scoreData = scores[category];

    // Skip if absent or null
    if (!scoreData || scoreData.isAbsent || scoreData.value === null) {
      continue;
    }

    // Include score (even if 0)
    weightedSum += scoreData.value * weight;
    validCount++;
  }

  // No valid scores → return null
  if (validCount === 0) return null;

  const termGrade = BASE_SCORE + weightedSum;
  return Number(termGrade.toFixed(1));
}
```

### Validate KCFS Score

```typescript
function isValidKCFSScore(score: number | null): boolean {
  if (score === null) return true; // null is valid (not entered)
  if (score < 0 || score > 5) return false;
  // Check 0.5 increments
  return score % 0.5 === 0;
}
```

## Score Handling Rules

### Valid Score Inputs

| Input | Type | In Average? | Example |
|-------|------|-------------|---------|
| 5.0 | Numeric | Yes | Exceeds standard |
| 4.5 | Numeric | Yes | Between meets/exceeds |
| 4.0 | Numeric | Yes | Meets standard |
| 3.5 | Numeric | Yes | Approaching standard |
| 3.0 | Numeric | Yes | Approaching |
| 2.5 | Numeric | Yes | Below standard |
| 2.0 | Numeric | Yes | Below standard |
| 0 | Numeric | Yes | Zero (counts, lowers avg) |
| null/blank | Empty | No | Not assessed |
| Absent | Boolean | No | Student absent |

### Key Rules

1. **Zero counts**: A score of 0 is included and will lower the term grade
2. **Blank excluded**: Empty/null scores are excluded from calculation
3. **Absent excluded**: "Absent" marks are excluded from calculation
4. **0.5 increments**: Scores must be in 0.5 increments (0, 0.5, 1, 1.5, ..., 5)

## Calculation Examples

### Example 1: G2 Student (4 categories) - All Scores Entered

| Category | Score |
|----------|-------|
| Communication | 4.0 |
| Collaboration | 4.5 |
| Self-Direction | 4.0 |
| Critical Thinking | 4.5 |

**Term Grade:**
```
= 50 + (4.0 × 2.5) + (4.5 × 2.5) + (4.0 × 2.5) + (4.5 × 2.5)
= 50 + 10.0 + 11.25 + 10.0 + 11.25
= 92.5
```

### Example 2: G4 Student with Absent (5 categories)

| Category | Score |
|----------|-------|
| Communication | 4.0 |
| Collaboration | Absent |
| Self-Direction | 4.5 |
| Critical Thinking | 4.0 |
| Book Work | 4.5 |

**Term Grade** (Collaboration excluded):
```
= 50 + (4.0 × 2.0) + (4.5 × 2.0) + (4.0 × 2.0) + (4.5 × 2.0)
= 50 + 8.0 + 9.0 + 8.0 + 9.0
= 84.0
```

Note: Only 4 categories counted (Collaboration excluded due to Absent).

### Example 3: G5 Student with Zero (6 categories)

| Category | Score |
|----------|-------|
| Communication | 4.0 |
| Collaboration | 4.0 |
| Self-Direction | 4.0 |
| Critical Thinking | 4.0 |
| Portfolio | 4.0 |
| Presentation | 0 |

**Term Grade:**
```
= 50 + (4.0 × 1.667) + (4.0 × 1.667) + (4.0 × 1.667) + (4.0 × 1.667) + (4.0 × 1.667) + (0 × 1.667)
= 50 + 6.67 + 6.67 + 6.67 + 6.67 + 6.67 + 0
= 83.35
```

Note: The zero in Presentation significantly lowered the grade from 90 to 83.35.

### Example 4: G1 Student - Partial Entry

| Category | Score |
|----------|-------|
| Communication | 4.0 |
| Collaboration | null |
| Self-Direction | 3.5 |
| Critical Thinking | null |

**Term Grade** (only 2 categories with scores):
```
= 50 + (4.0 × 2.5) + (3.5 × 2.5)
= 50 + 10.0 + 8.75
= 68.75
```

Note: This is a partial calculation. When more scores are entered, the term grade will change.

## Comparison with LT/IT Formula

| Aspect | KCFS | LT/IT |
|--------|------|-------|
| Score Range | 0-5 | 0-100 |
| Base Score | 50 | N/A |
| Categories | 4-6 (by grade) | FA1-8, SA1-4, MID |
| Formula | `50 + Σ(score × weight)` | `(FA_avg × 0.15 + SA_avg × 0.20 + MID × 0.10) ÷ 0.45` |
| Absent Support | Yes | Yes |
