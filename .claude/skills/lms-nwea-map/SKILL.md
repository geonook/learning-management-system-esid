---
name: lms-nwea-map
description: NWEA MAP Growth assessment data integration for KCIS LMS. Use this skill when implementing MAP assessment features including data import from CDF (Combined Data File) or Grade Breakdown Report CSV, displaying student RIT scores, tracking growth trends across terms, and showing goal area performance for Reading and Language Usage courses (G3-G6).
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
| **Data Sources** | **CDF (Combined Data File)** - 推薦, Grade Breakdown Report |
| **Student ID Format** | `LE12001` (school student number) |

## Data Import Methods

### 1. CDF Import (推薦 - 官方完整資料)

**Script**: `scripts/import-map-cdf.ts`

```bash
# Dry run 測試
npx tsx scripts/import-map-cdf.ts \
  --file="Kang Chiao International School--Linkou Campus.csv" \
  --dry-run --verbose

# 正式匯入（Staging）
npx tsx scripts/import-map-cdf.ts \
  --file="Kang Chiao International School--Linkou Campus.csv" \
  --staging

# 正式匯入（Production）需設定 SUPABASE_SERVICE_ROLE_KEY
npx tsx scripts/import-map-cdf.ts \
  --file="Kang Chiao International School--Linkou Campus.csv"
```

**CDF 包含官方資料**：
- `TestPercentile` - 官方百分位數
- `AchievementQuintile` - Low/LoAvg/Avg/HiAvg/High
- `FallToSpringConditionalGrowthIndex` - 官方成長指數
- `FallToSpringGrowthQuintile` - 成長五分位
- `FallToSpringMetProjectedGrowth` - 是否達成預期成長
- `RapidGuessingPercentage` - 測驗效度警告

### 2. Grade Breakdown Report Import

**Script**: `scripts/import-map-scores.ts`

較簡單的 CSV 格式，僅包含基本分數資料。

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
  map_term TEXT NOT NULL,                 -- 'fall', 'winter', 'spring'

  -- Course & test info
  course TEXT NOT NULL,                   -- 'Reading', 'Language Usage'
  test_name TEXT,

  -- Core scores
  rit_score INTEGER NOT NULL,
  rit_score_range TEXT,                   -- '161-170'
  test_standard_error DECIMAL(5,2),
  rapid_guessing_percent DECIMAL(5,2),

  -- Official CDF data (from Combined Data File)
  test_percentile INTEGER,                -- 官方百分位數 (1-99)
  achievement_quintile TEXT,              -- 'Low', 'LoAvg', 'Avg', 'HiAvg', 'High'
  percent_correct DECIMAL(5,2),
  test_start_date DATE,
  test_duration_minutes INTEGER,

  -- Growth data (Fall to Spring)
  projected_growth INTEGER,               -- 預期成長
  observed_growth INTEGER,                -- 實際成長
  observed_growth_se DECIMAL(5,2),
  met_projected_growth TEXT,              -- 'Yes' / 'No'
  conditional_growth_index DECIMAL(5,2),  -- 成長指數 (1.0 = met expectations)
  conditional_growth_percentile INTEGER,
  growth_quintile TEXT,                   -- 'Low', 'LoAvg', 'Avg', 'HiAvg', 'High'
  typical_growth INTEGER,

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

## UI Components (v1.60.0+)

The student detail page includes rich MAP analysis components organized in 4 collapsible sections with teacher-friendly explanations.

### Score Summary Cards (Hero)
- Large RIT scores with achievement status
- Official percentile from CDF data (priority over calculated)
- Achievement Quintile badges (Low/LoAvg/Avg/HiAvg/High)
- Growth from previous term
- Explanation footer for teachers

### Projected Proficiency
- Spring projection based on Fall + expected growth
- Dynamic title: `SP25 (G4) Projection`
- Status: On Track / Exceeding / Needs Support
- Only shown for Fall term data (hidden when Spring data exists)

### Growth Index (v1.60.0+)

**支援連續測驗成長（含跨學年）**：

| 成長類型 | 顯示內容 | 數據來源 |
|---------|---------|---------|
| `fallToSpring` | Growth, Expected, Index, Met/Not Met, Quintile | 官方 CDF |
| `springToFall` | 僅 Growth | 計算值 |

- Label format: `FA24 → SP25 (G3)` or `SP25 → FA25 (G4)`
- Official `conditional_growth_index` from CDF (priority)
- Growth Quintile badge
- Explanation of 1.0 = met expectations

### Benchmark Status
- E1/E2/E3 classification for next grade readiness
- Progress bar visualization
- Distance to E1 and buffer from E3
- Based on Average = (Reading + Language Usage) / 2

### Progress Charts (v1.60.0+)

**NWEA 官方風格柱狀圖**：
- Three Bar groups: Student RIT (blue #5B8BD9), Level Avg (yellow #E6B800), Norm (navy #3D5A80)
- X-axis format: `FA25 (G4)`
- Projection uses diagonal stripe pattern
- Side table: Term, RIT, Growth, Percentile
- Separate charts for Reading and Language Usage

### Instructional Areas (Goal Areas)
- Per-subject goal performance vs overall RIT
- ★ Relative Strength / ◆ Suggested Focus markers
- Quintile badges per goal (Low/LoAvg/Avg/HiAvg/High)
- Tooltip explanations

### Peer Comparison (v1.55.0+)

**Privacy Design**: Uses English Level grouping (not class)
- Level Rank (within same grade + English Level)
- Grade Rank (within same grade, all levels)
- Comparison vs Level/Grade averages and NWEA Norm

### Lexile Level (Reading only)
- Lexile score with visual band indicator
- Recommended book range (50L below to 100L above)
- Growth from previous term

### Test Validity Warning
- Shown when `rapid_guessing_percent > 15%` (yellow) or > 25% (red)
- Combined version shows both subjects
- Alerts teachers to potential test validity concerns

### Page Structure (4 Sections)

```
Section 1: Current Performance (default: open)
├── ScoreSummaryCards
├── StudentBenchmarkStatus
└── CombinedTestValidityWarning

Section 2: Growth & Progress (default: open)
├── StudentProgressCharts
├── StudentGrowthIndex
├── ProjectedProficiency
└── StudentPeerComparison

Section 3: Instructional Focus (default: open)
├── StudentGoalAreas
└── StudentLexileLevel

Section 4: Historical Data (default: collapsed)
├── StudentBenchmarkHistory
└── StudentAssessmentTables
```
