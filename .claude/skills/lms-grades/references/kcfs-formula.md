# KCFS Grade Calculation (Kang Chiao Future Skill)

## Core Formula

```
Term Grade = 50 + Σ(category_score × weight)
```

- **Base Score**: 50 (fixed)
- **Score Range**: 0-5 (input) → 50-100 (output)
- **Increments**: 0.5 (0, 0.5, 1, 1.5, ..., 5)

## Grade Configuration

| Grade | Categories | Weight | Example |
|-------|------------|--------|---------|
| G1-2 | 4 | 2.5 | `50 + (4 × 4.0 × 2.5) = 90` |
| G3-4 | 5 | 2.0 | `50 + (5 × 4.0 × 2.0) = 90` |
| G5-6 | 6 | 5/3 | `50 + (6 × 4.0 × 1.667) = 90` |

All grades: n × weight = 10, so score 4.0 always = 90.

## Score Handling Rules

| Input | In Average? | Note |
|-------|-------------|------|
| 0-5 (numeric) | Yes | Including 0 |
| Zero (0) | Yes | Lowers grade |
| Blank/null | No | Not assessed |
| Absent | No | Student absent |

## Calculation Examples

### G4 Student - All Entered
```
COMM: 4.0, COLLAB: 4.5, SD: 4.0, CT: 4.5, BW: 4.0
= 50 + (4.0 + 4.5 + 4.0 + 4.5 + 4.0) × 2.0
= 50 + 42.0 = 92.0
```

### G5 Student - With Zero
```
COMM: 4.0, COLLAB: 4.0, SD: 4.0, CT: 4.0, PORT: 4.0, PRES: 0
= 50 + (4.0 + 4.0 + 4.0 + 4.0 + 4.0 + 0) × 1.667
= 50 + 33.34 = 83.34
```
Zero in PRES lowered grade from 90 to 83.

### G4 Student - With Absent
```
COMM: 4.0, COLLAB: Absent, SD: 4.5, CT: 4.0, BW: 4.5
= 50 + (4.0 + 4.5 + 4.0 + 4.5) × 2.0  // Only 4 categories
= 50 + 34.0 = 84.0
```

## Pseudocode

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

  if (validCount === 0) return null;

  return Number((BASE_SCORE + weightedSum).toFixed(1));
}
```

## Comparison: KCFS vs LT/IT

| Aspect | KCFS | LT/IT |
|--------|------|-------|
| Score Range | 0-5 | 0-100 |
| Base Score | 50 | N/A |
| Categories | 4-6 (by grade) | FA1-8, SA1-4, MID |
| Zero Handling | Counts | Excluded |
| Absent Support | Yes | Yes |
