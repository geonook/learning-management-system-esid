---
name: lms-nwea-map
description: NWEA MAP Growth assessment data integration for KCIS LMS. Use this skill when implementing MAP assessment features including data import from Grade Breakdown Report CSV, displaying student RIT scores, tracking growth trends across terms, and showing goal area performance for Reading and Language Usage courses (G3-G6).
---

# NWEA MAP Growth Integration

## Overview

NWEA MAP Growth is a computer-adaptive assessment measuring student achievement and growth in Reading and Language Usage for G3-G6 students at KCIS Linkou Campus.

## Assessment Structure

| Item | Value |
|------|-------|
| **Courses** | Reading, Language Usage |
| **Grades** | G3, G4, G5, G6 |
| **Terms per Year** | 2 (Fall, Spring) |
| **Data Source** | Grade Breakdown Report (CSV) |
| **Student ID Format** | `LE12001` (school student number) |

## Core Metrics

### RIT Score
- Rasch Unit scale (~100-350)
- Cross-grade comparable
- Higher = more advanced

### Lexile Score (Reading only)
- Format: `1190L`, `BR400` (Beginning Reader)
- Indicates reading level

### Goal Areas by Course

**Reading:**
- Informational Text
- Literary Text
- Vocabulary

**Language Usage:**
- Grammar and Usage
- Mechanics
- Writing

Goal scores stored as RIT ranges (e.g., `161-170`, `221-230`).

## Database Schema

### Primary Table: `map_assessments`

```sql
CREATE TABLE map_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Student linking
  student_id UUID REFERENCES students(id),
  student_number TEXT NOT NULL,           -- 'LE12001'
  
  -- Student snapshot
  student_last_name TEXT,
  student_first_name TEXT,
  grade INTEGER NOT NULL,                 -- 3, 4, 5, 6
  school TEXT,
  
  -- Term identification
  term_tested TEXT NOT NULL,              -- 'Fall 2025-2026'
  academic_year TEXT NOT NULL,            -- '2025-2026'
  map_term TEXT NOT NULL,                 -- 'fall', 'winter', 'spring' (distinct from ELA term 1-4)
  
  -- Course & test info
  course TEXT NOT NULL,                   -- 'Reading', 'Language Usage'
  test_name TEXT,
  
  -- Scores
  rit_score INTEGER NOT NULL,
  rit_score_range TEXT,                   -- '161-170'
  rapid_guessing_percent INTEGER,
  
  -- Lexile (Reading only)
  lexile_score TEXT,                      -- '1190L' or 'BR400'
  lexile_range TEXT,
  
  -- Import tracking
  imported_at TIMESTAMPTZ DEFAULT now(),
  import_batch_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(student_number, course, term_tested)
);
```

### Goal Scores Table: `map_goal_scores`

```sql
CREATE TABLE map_goal_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES map_assessments(id) ON DELETE CASCADE,
  
  goal_name TEXT NOT NULL,                -- 'Informational Text', 'Grammar and Usage'
  goal_rit_range TEXT,                    -- '161-170'
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(assessment_id, goal_name)
);
```

### Indexes

```sql
CREATE INDEX idx_map_assessments_student_id ON map_assessments(student_id);
CREATE INDEX idx_map_assessments_student_number ON map_assessments(student_number);
CREATE INDEX idx_map_assessments_academic_year ON map_assessments(academic_year);
CREATE INDEX idx_map_assessments_map_term ON map_assessments(map_term);
CREATE INDEX idx_map_assessments_course ON map_assessments(course);
CREATE INDEX idx_map_assessments_grade ON map_assessments(grade);
CREATE INDEX idx_map_goal_scores_assessment ON map_goal_scores(assessment_id);
```

## CSV Import Specifications

See `references/csv-format.md` for complete field mapping and import logic.

## Growth Tracking

See `references/growth-tracking.md` for growth calculation and visualization requirements.
