# KCFS Configuration

## Category Codes

| Code | Full Name | Grades |
|------|-----------|--------|
| COMM | Communication | All |
| COLLAB | Collaboration | All |
| SD | Self-Direction | All |
| CT | Critical Thinking | All |
| BW | Book Work | G3-4 only |
| PORT | Portfolio | G5-6 only |
| PRES | Presentation | G5-6 only |

## TypeScript Configuration

```typescript
const KCFS_GRADE_CONFIG = {
  '1-2': {
    categories: ['COMM', 'COLLAB', 'SD', 'CT'],
    categoryNames: {
      COMM: 'Communication',
      COLLAB: 'Collaboration',
      SD: 'Self-Direction',
      CT: 'Critical Thinking'
    },
    weight: 2.5
  },
  '3-4': {
    categories: ['COMM', 'COLLAB', 'SD', 'CT', 'BW'],
    categoryNames: {
      COMM: 'Communication',
      COLLAB: 'Collaboration',
      SD: 'Self-Direction',
      CT: 'Critical Thinking',
      BW: 'Book Work'
    },
    weight: 2.0
  },
  '5-6': {
    categories: ['COMM', 'COLLAB', 'SD', 'CT', 'PORT', 'PRES'],
    categoryNames: {
      COMM: 'Communication',
      COLLAB: 'Collaboration',
      SD: 'Self-Direction',
      CT: 'Critical Thinking',
      PORT: 'Portfolio',
      PRES: 'Presentation'
    },
    weight: 5 / 3  // 1.6667
  }
} as const;

const BASE_SCORE = 50;
```

## Database Schema

### kcfs_categories table

```sql
CREATE TABLE kcfs_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_range_start INTEGER NOT NULL CHECK (grade_range_start BETWEEN 1 AND 6),
  grade_range_end INTEGER NOT NULL CHECK (grade_range_end BETWEEN 1 AND 6),
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  weight NUMERIC(5,4) NOT NULL,
  sequence_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (grade_range_start, grade_range_end, category_code),
  CHECK (grade_range_start <= grade_range_end)
);
```

### Seed Data

```sql
INSERT INTO kcfs_categories (grade_range_start, grade_range_end, category_code, category_name, weight, sequence_order) VALUES
  -- G1-2: 4 categories, weight = 2.5
  (1, 2, 'COMM', 'Communication', 2.5, 1),
  (1, 2, 'COLLAB', 'Collaboration', 2.5, 2),
  (1, 2, 'SD', 'Self-Direction', 2.5, 3),
  (1, 2, 'CT', 'Critical Thinking', 2.5, 4),
  -- G3-4: 5 categories, weight = 2.0
  (3, 4, 'COMM', 'Communication', 2.0, 1),
  (3, 4, 'COLLAB', 'Collaboration', 2.0, 2),
  (3, 4, 'SD', 'Self-Direction', 2.0, 3),
  (3, 4, 'CT', 'Critical Thinking', 2.0, 4),
  (3, 4, 'BW', 'Book Work', 2.0, 5),
  -- G5-6: 6 categories, weight = 5/3 = 1.6667
  (5, 6, 'COMM', 'Communication', 1.6667, 1),
  (5, 6, 'COLLAB', 'Collaboration', 1.6667, 2),
  (5, 6, 'SD', 'Self-Direction', 1.6667, 3),
  (5, 6, 'CT', 'Critical Thinking', 1.6667, 4),
  (5, 6, 'PORT', 'Portfolio', 1.6667, 5),
  (5, 6, 'PRES', 'Presentation', 1.6667, 6);
```

### scores table extension

```sql
-- Add is_absent column for KCFS absent tracking
ALTER TABLE scores ADD COLUMN is_absent BOOLEAN DEFAULT FALSE;

-- Constraint: score should be NULL when is_absent is TRUE
ALTER TABLE scores ADD CONSTRAINT check_absent_score
  CHECK (NOT (is_absent = TRUE AND score IS NOT NULL));
```

## Summary Table

| Grade | Categories | Weight | BW | PORT | PRES |
|-------|------------|--------|----|------|------|
| G1 | 4 | 2.5 | No | No | No |
| G2 | 4 | 2.5 | No | No | No |
| G3 | 5 | 2.0 | Yes | No | No |
| G4 | 5 | 2.0 | Yes | No | No |
| G5 | 6 | 5/3 | No | Yes | Yes |
| G6 | 6 | 5/3 | No | Yes | Yes |
