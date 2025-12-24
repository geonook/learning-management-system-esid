# MAP Data Import

## Source File

**Recommended Source:** CDF (Combined Data File)
**Export From:** NWEA MAP Growth Platform
**Format:** CSV (comma-delimited, UTF-8)

## Import Script

```bash
# Dry run (verify data without inserting)
npx tsx scripts/import-map-cdf.ts \
  --file="Kang Chiao International School--Linkou Campus.csv" \
  --dry-run --verbose

# Production import
npx tsx scripts/import-map-cdf.ts \
  --file="Kang Chiao International School--Linkou Campus.csv"

# Staging import
npx tsx scripts/import-map-cdf.ts \
  --file="Kang Chiao International School--Linkou Campus.csv" \
  --staging
```

## CDF Columns (Combined Data File)

| Column Name | Type | Example | Maps To |
|-------------|------|---------|---------|
| `Student ID` | TEXT | `LE12176` | `student_number` |
| `Student Last Name` | TEXT | `Chen` | `student_last_name` |
| `Student First Name` | TEXT | `Una` | `student_first_name` |
| `Term Tested` | TEXT | `Fall 2025-2026` | `term_tested` |
| `School` | TEXT | `Kang Chiao...` | `school` |
| `Grade` | INTEGER | `3`, `4`, `5`, `6` | `grade` |
| `Course` | TEXT | `Reading`, `Language Usage` | `course` |
| `RIT Score` | INTEGER | `162` | `rit_score` |
| `TestPercentile` | INTEGER | `45` | `test_percentile` |
| `AchievementQuintile` | TEXT | `Avg` | `achievement_quintile` |
| `Rapid-Guessing %` | INTEGER | `7` | `rapid_guessing_percent` |
| `RIT Score 10 Point Range` | TEXT | `161-170` | `rit_score_range` |
| `LexileScore` | TEXT | `1190L`, `BR400` | `lexile_score` |
| `Test Name` | TEXT | `Growth: Reading 6+...` | `test_name` |

### Official Growth Data (CDF Only)

| Column Name | Maps To |
|-------------|---------|
| `FallToSpringProjectedGrowth` | `projected_growth` |
| `FallToSpringObservedGrowth` | `observed_growth` |
| `FallToSpringConditionalGrowthIndex` | `conditional_growth_index` |
| `FallToSpringGrowthQuintile` | `growth_quintile` |
| `FallToSpringMetProjectedGrowth` | `met_projected_growth` |

### Goal Area Columns

| CSV Column | Standardized Goal Name | Course |
|------------|------------------------|--------|
| `Language Arts: Informational Text` | `Informational Text` | Reading |
| `Language Arts: Literary Text` | `Literary Text` | Reading |
| `Language Arts: Vocabulary` | `Vocabulary` | Reading |
| `Language Arts: Language: Understand, Edit for Grammar, Usage` | `Grammar and Usage` | Language Usage |
| `Language Arts: Language: Understand, Edit for Mechanics` | `Mechanics` | Language Usage |
| `Language Arts: Writing: Write, Revise Texts for Purpose and Audience` | `Writing` | Language Usage |

**Note:** Goal values are RIT ranges (e.g., `161-170`), not single scores.

## Term Parsing Logic

```typescript
type MapTerm = 'fall' | 'winter' | 'spring';

function parseTermTested(termTested: string): {
  academicYear: string;
  mapTerm: MapTerm;
} {
  // Input: "Fall 2025-2026" or "Spring 2025-2026"
  const match = termTested.match(/^(Fall|Winter|Spring)\s+(\d{4}-\d{4})$/i);
  if (!match) throw new Error(`Invalid term format: ${termTested}`);

  return {
    mapTerm: match[1].toLowerCase() as MapTerm,
    academicYear: match[2]
  };
}
```

## Import Process

### 1. Parse CSV

```typescript
import Papa from 'papaparse';

const results = Papa.parse(csvText, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (header) => header.trim()
});
```

### 2. Link to Students Table

```typescript
const student = await supabase
  .from('students')
  .select('id')
  .eq('student_number', row.student_number)
  .single();

if (!student.data) {
  unmatchedStudents.push(row.student_number);
}
```

### 3. Insert/Update Assessment

```typescript
const { data: assessment } = await supabase
  .from('map_assessments')
  .upsert({
    student_id: student?.data?.id || null,
    student_number: row.student_number,
    // ... other fields
  }, {
    onConflict: 'student_number,course,term_tested'
  })
  .select('id')
  .single();
```

### 4. Insert Goal Scores

```typescript
if (assessment?.id && row.goals.length > 0) {
  await supabase
    .from('map_goal_scores')
    .upsert(
      row.goals.map(goal => ({
        assessment_id: assessment.id,
        goal_name: goal.goal_name,
        goal_rit_range: goal.goal_rit_range
      })),
      { onConflict: 'assessment_id,goal_name' }
    );
}
```

## Data Validation

| Field | Validation |
|-------|------------|
| `Student ID` | Required, format `LE\d{5}` |
| `Grade` | Required, must be 3, 4, 5, or 6 |
| `Course` | Required, 'Reading' or 'Language Usage' |
| `RIT Score` | Required, integer 100-350 |
| `Term Tested` | Required, format `(Fall|Spring) YYYY-YYYY` |

## Import Notes

1. **Unmatched Students**: Review current-year unmatched students individually
2. **Duplicates**: UPSERT handles updates to existing records
3. **Batch ID**: UUID generated per import for tracking
4. **CDF vs Grade Breakdown Report**: CDF contains official growth data; Grade Breakdown Report only has basic scores
