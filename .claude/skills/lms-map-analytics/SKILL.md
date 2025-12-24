---
name: lms-map-analytics
description: KCIS MAP Growth statistical analysis and reporting logic. Use this skill when implementing MAP data analysis features including group averages by English Level, benchmark classification (E1/E2/E3), term-over-term growth comparison, and norm comparison for G3-G6 Reading and Language Usage courses.
---

# MAP Growth Analytics

## Overview

Statistical analysis framework for NWEA MAP Growth data at KCIS, enabling comparison across English Levels, terms, and against national norms.

## Core Analysis Dimensions

| Dimension | Values |
|-----------|--------|
| **Grade** | G3, G4, G5, G6 |
| **English Level** | E1 (Advanced), E2 (Intermediate), E3 (Developing) |
| **Course** | Reading, Language Usage |
| **MapTerm** | fall, winter, spring (distinct from ELA Term 1-4) |
| **Metrics** | RIT Score, Average (両科平均) |

## Key Statistics

### 1. Group Averages

Calculate mean RIT by:
- Grade × English Level × Course × Term
- Grade × Course × Term (All students)

### 2. Benchmark Classification

Categorize students into E1/E2/E3 based on **Spring Average (兩科平均)**.

**Important**: Classification uses the Average of Language Usage + Reading, NOT individual course scores.

See `references/benchmarks.md` for classification rules by grade.

### 3. Term Growth

Compare Fall → Spring performance for same student cohort.

### 4. Norm Comparison

Compare school averages against NWEA national norms.

See `references/norms.md` for norm values.

## Data Model

### Aggregated View: `map_analytics_summary`

```sql
CREATE VIEW map_analytics_summary AS
SELECT
  ma.academic_year,
  ma.map_term,
  ma.grade,
  s.english_level,
  ma.course,
  COUNT(DISTINCT ma.student_number) as student_count,
  ROUND(AVG(ma.rit_score), 2) as avg_rit,
  MIN(ma.rit_score) as min_rit,
  MAX(ma.rit_score) as max_rit,
  ROUND(STDDEV(ma.rit_score), 2) as stddev_rit
FROM map_assessments ma
JOIN students s ON s.id = ma.student_id
GROUP BY ma.academic_year, ma.map_term, ma.grade, s.english_level, ma.course;
```

### Student Combined Scores View

```sql
CREATE VIEW map_student_combined AS
SELECT
  student_number,
  academic_year,
  map_term,
  term_tested,
  grade,
  MAX(CASE WHEN course = 'Language Usage' THEN rit_score END) as language_usage,
  MAX(CASE WHEN course = 'Reading' THEN rit_score END) as reading,
  ROUND((
    MAX(CASE WHEN course = 'Language Usage' THEN rit_score END) +
    MAX(CASE WHEN course = 'Reading' THEN rit_score END)
  ) / 2.0, 1) as average
FROM map_assessments
GROUP BY student_number, academic_year, map_term, term_tested, grade;
```

## Analysis Queries

See `references/queries.md` for complete SQL examples.

## Student-Level Analytics (Student Detail Page)

The student detail page (`/student/[id]`) includes a MAP Analytics Tab for G3-G6 students with the following components:

### Peer Comparison

**Important**: As of v1.55.0, peer comparison uses **English Level (E1/E2/E3)** grouping instead of class grouping to avoid sharing class-specific averages with parents.

| Comparison Type | Description |
|-----------------|-------------|
| **Level Rank** | Ranking within same grade + same English Level |
| **Grade Rank** | Ranking within same grade (all levels) |
| **vs Level Avg** | Difference from English Level average |
| **vs Grade Avg** | Difference from grade average |
| **vs NWEA Norm** | Difference from national norm |

**Implementation**: `lib/api/map-student-analytics.ts`
- `getStudentRankings()` - Calculates Level and Grade rankings
- `extractEnglishLevel()` - Extracts E1/E2/E3 from class level (e.g., "G3E2" → "E2")

### UI Components (v1.60.0+)

All components include teacher-friendly explanations for non-technical users.

| Component | Description |
|-----------|-------------|
| **ScoreSummaryCards** | Hero cards with RIT, Percentile, Achievement Status, Growth |
| **ProjectedProficiency** | Spring projection with dynamic title (On Track / Exceeding / Needs Support) |
| **StudentGrowthIndex** | Consecutive test growth including cross-year SP→FA transitions |
| **StudentProgressCharts** | NWEA-style bar charts with Student RIT, Level Avg, Norm |
| **StudentBenchmarkStatus** | E1/E2/E3 classification with progress bar |
| **StudentGoalAreas** | Instructional areas with ★ Strength / ◆ Focus markers |
| **StudentPeerComparison** | Level/Grade ranks (uses English Level grouping for privacy) |
| **StudentLexileLevel** | Lexile score, band, recommended book range |
| **TestValidityWarning** | Rapid Guessing alerts (>15%, >25% thresholds) |
| **StudentBenchmarkHistory** | Historical benchmark trend across terms |
| **StudentAssessmentTables** | Complete raw assessment data tables |
| **CollapsibleSection** | UI wrapper for organizing 4 page sections |

### StudentProgressCharts (v1.60.0+)

**NWEA 官方風格柱狀圖**（非折線圖）：

**視覺設計**：
- **柱狀圖** with three data series
- Student RIT: Blue (#5B8BD9)
- Level Avg: Yellow (#E6B800) - English Level 分組平均
- NWEA Norm: Navy (#3D5A80)
- Projection: Same blue with diagonal stripe pattern

**X 軸格式**：
- `FA25 (G4)` - 簡短格式
- 格式函數：`formatTermLabel(termTested, grade)`

**資料表格**（右側）：

| Term | RIT | Growth | Percentile |
|------|-----|--------|------------|
| FA25 (G4) | 215 | +8 | 65 |
| SP25 (G3) | 207 | +12 | 58 |

**Y 軸設計**：
- 最小值：100 或 (最小數據 - 20)，取較大者
- 最大值：(最大數據 + 15)，預留標籤空間

### StudentGrowthIndex (v1.60.0+)

**連續測驗成長歷史**（含跨學年）：

| 成長類型 | 時間跨度 | 官方資料 | 顯示內容 |
|---------|---------|---------|---------|
| `fallToSpring` | ~6 個月 | ✅ 有 CDF | Growth, Expected, Index, Met/Not Met, Quintile |
| `springToFall` | ~4 個月 | ❌ 無 CDF | 僅 Growth |

**計算邏輯**：
- Fall → Spring: 優先使用官方 `observed_growth`, `conditional_growth_index`
- Spring → Fall: 計算 `toRit - fromRit`，不計算 Expected/Index（無官方基準）

**顯示格式**：
- `FA24 → SP25 (G3)` - 同學年，完整顯示
- `SP25 → FA25 (G4)` - 跨學年，簡化顯示
- 按時間倒序排列（最新在上）

**UI 設計**：
- `FallToSpringCard`: 完整顯示（有官方 CDF）
- `SpringToFallCard`: 簡化顯示（僅 Growth，較大字體）

**解釋文字**：
- Growth: RIT score change between consecutive tests.
- Fall → Spring: Full metrics available from official NWEA data.
- Spring → Fall: Only Growth shown (no official NWEA benchmarks for summer growth).
- Index: Actual growth ÷ Expected growth. ≥1.0 means exceeded expectations.
- Quintile: Growth compared to similar students nationally (High = top 20%, Low = bottom 20%).

### Data Sources

Components prioritize **official CDF data** when available:
- `test_percentile` → Official percentile (over calculated)
- `achievement_quintile` → Official quintile (Low/LoAvg/Avg/HiAvg/High)
- `conditional_growth_index` → Official growth index
- `growth_quintile` → Official growth quintile
- `met_projected_growth` → Official met/not met status

Falls back to calculated values when CDF data is not available.

See `references/student-components.md` for complete component specifications.

## Visualization

See `references/charts.md` for chart specifications.
