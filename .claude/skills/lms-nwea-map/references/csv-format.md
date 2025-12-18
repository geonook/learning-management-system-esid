# CSV Format & Import Logic

## Source File

**Report Name:** Grade Breakdown Report  
**Export From:** NWEA MAP Growth Platform  
**Format:** CSV (comma-delimited, UTF-8)

## CSV Columns

| Column Name | Type | Example | Maps To |
|-------------|------|---------|---------|
| `Student ID` | TEXT | `LE12176` | `student_number` |
| `Student Last Name` | TEXT | `Chen` | `student_last_name` |
| `Student First Name` | TEXT | `Una_LE12176` | `student_first_name` |
| `Student Middle Initial` | TEXT | _(empty)_ | _(ignored)_ |
| `Term Tested` | TEXT | `Fall 2025-2026` | `term_tested` |
| `Term Rostered` | TEXT | `Fall 2025-2026` | _(ignored)_ |
| `School` | TEXT | `Kang Chiao International School--Linkou Campus` | `school` |
| `Grade` | INTEGER | `3`, `4`, `5`, `6` | `grade` |
| `Subject` | TEXT | `Language Arts` | _(ignored, always same)_ |
| `Course` | TEXT | `Reading`, `Language Usage` | `course` |
| `RIT Score` | INTEGER | `162` | `rit_score` |
| `Rapid-Guessing %` | INTEGER | `0`, `7`, `14` | `rapid_guessing_percent` |
| `RIT Score 10 Point Range` | TEXT | `161-170` | `rit_score_range` |
| `LexileScore` | TEXT | `1190L`, `BR400` | `lexile_score` |
| `LexileRange` | TEXT | `1090L-1240L` | `lexile_range` |
| `QuantileScore` | TEXT | _(empty)_ | _(ignored, no Math)_ |
| `QuantileRange` | TEXT | _(empty)_ | _(ignored)_ |
| `Test Name` | TEXT | `Growth: Reading 6+ AERO 2015 1.1` | `test_name` |

### Goal Area Columns

| Column Name | Standardized Goal Name | Applicable Course |
|-------------|------------------------|-------------------|
| `Language Arts: Informational Text` | `Informational Text` | Reading |
| `Language Arts: Literary Text` | `Literary Text` | Reading |
| `Language Arts: Vocabulary` | `Vocabulary` | Reading |
| `Language Arts: Language: Understand, Edit for Grammar, Usage` | `Grammar and Usage` | Language Usage |
| `Language Arts: Language: Understand, Edit for Mechanics` | `Mechanics` | Language Usage |
| `Language Arts: Writing: Write, Revise Texts for Purpose and Audience` | `Writing` | Language Usage |

**Note:** Goal values are RIT ranges (e.g., `161-170`), not single scores. Empty values indicate goal not applicable to that course.

## Term Parsing Logic

Extract `academic_year` and `term` from `term_tested`:

```typescript
function parseTermTested(termTested: string): { academicYear: string; term: string } {
  // Input: "Fall 2025-2026" or "Spring 2025-2026"
  const match = termTested.match(/^(Fall|Spring)\s+(\d{4}-\d{4})$/i);
  if (!match) throw new Error(`Invalid term format: ${termTested}`);
  
  return {
    term: match[1].toLowerCase(),      // 'fall' or 'spring'
    academicYear: match[2]              // '2025-2026'
  };
}
```

## Import Process

### Step 1: Parse CSV

```typescript
import Papa from 'papaparse';

const results = Papa.parse(csvText, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (header) => header.trim()
});
```

### Step 2: Validate & Transform Each Row

```typescript
interface MapAssessmentRow {
  student_number: string;
  student_last_name: string;
  student_first_name: string;
  grade: number;
  school: string;
  term_tested: string;
  academic_year: string;
  term: string;
  course: string;
  test_name: string;
  rit_score: number;
  rit_score_range: string;
  rapid_guessing_percent: number | null;
  lexile_score: string | null;
  lexile_range: string | null;
  goals: Array<{ goal_name: string; goal_rit_range: string }>;
}

function transformRow(row: Record<string, string>): MapAssessmentRow {
  const { term, academicYear } = parseTermTested(row['Term Tested']);
  
  // Extract goals based on course
  const goals: Array<{ goal_name: string; goal_rit_range: string }> = [];
  
  const goalMappings = [
    { csv: 'Language Arts: Informational Text', name: 'Informational Text' },
    { csv: 'Language Arts: Literary Text', name: 'Literary Text' },
    { csv: 'Language Arts: Vocabulary', name: 'Vocabulary' },
    { csv: 'Language Arts: Language: Understand, Edit for Grammar, Usage', name: 'Grammar and Usage' },
    { csv: 'Language Arts: Language: Understand, Edit for Mechanics', name: 'Mechanics' },
    { csv: 'Language Arts: Writing: Write, Revise Texts for Purpose and Audience', name: 'Writing' },
  ];
  
  for (const mapping of goalMappings) {
    const value = row[mapping.csv]?.trim();
    if (value) {
      goals.push({ goal_name: mapping.name, goal_rit_range: value });
    }
  }
  
  return {
    student_number: row['Student ID'].trim(),
    student_last_name: row['Student Last Name']?.trim() || null,
    student_first_name: row['Student First Name']?.trim() || null,
    grade: parseInt(row['Grade'], 10),
    school: row['School']?.trim() || null,
    term_tested: row['Term Tested'].trim(),
    academic_year: academicYear,
    term: term,
    course: row['Course'].trim(),
    test_name: row['Test Name']?.trim() || null,
    rit_score: parseInt(row['RIT Score'], 10),
    rit_score_range: row['RIT Score 10 Point Range']?.trim() || null,
    rapid_guessing_percent: row['Rapid-Guessing %'] ? parseInt(row['Rapid-Guessing %'], 10) : null,
    lexile_score: row['LexileScore']?.trim() || null,
    lexile_range: row['LexileRange']?.trim() || null,
    goals
  };
}
```

### Step 3: Link to Students Table

```typescript
// Match by student_number
const student = await supabase
  .from('students')
  .select('id')
  .eq('student_number', row.student_number)
  .single();

if (!student.data) {
  // Log unmatched student for review
  unmatchedStudents.push(row.student_number);
}
```

### Step 4: Insert Data

```typescript
// Insert assessment
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

// Insert goals
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

## Data Validation Rules

| Field | Validation |
|-------|------------|
| `Student ID` | Required, format `LE\d{5}` |
| `Grade` | Required, must be 3, 4, 5, or 6 |
| `Course` | Required, must be 'Reading' or 'Language Usage' |
| `RIT Score` | Required, integer 100-350 |
| `Term Tested` | Required, format `(Fall|Spring) YYYY-YYYY` |

## Import Considerations

1. **Unmatched Students:** Current-year unmatched students should be reviewed individually. Previous-year unmatched students likely left the school.

2. **Duplicate Handling:** Use UPSERT with unique constraint `(student_number, course, term_tested)` to update existing records.

3. **Batch ID:** Generate UUID for each import batch to track which records were imported together.
