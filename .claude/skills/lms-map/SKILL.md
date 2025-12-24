---
name: lms-map
description: NWEA MAP Growth assessment data integration for KCIS LMS. Use this skill when implementing MAP assessment features including data import from CDF CSV, displaying student RIT scores, tracking growth trends across terms, showing goal area performance, benchmark classification (E1/E2/E3), and group statistics for Reading and Language Usage courses (G3-G6).
---

# NWEA MAP Growth - KCIS LMS

## Quick Reference

| Item | Value |
|------|-------|
| **Grades** | G3, G4, G5, G6 |
| **Courses** | Reading, Language Usage |
| **Terms** | Fall, Spring (per academic year) |
| **Student ID** | `LE12001` format (school student number) |
| **Data Source** | CDF (Combined Data File) CSV |

## Core Concepts

### Benchmark Classification (E1/E2/E3)

Students are classified based on **Spring semester Average RIT score**:
- **Average** = (Language Usage RIT + Reading RIT) / 2
- Classification used for **next year's English Level placement**
- E1 (Advanced), E2 (Intermediate), E3 (Developing)

→ See: [references/benchmarks.md](references/benchmarks.md)

### Growth Index

| Growth Type | Time Span | Data Source | Displayed Metrics |
|-------------|-----------|-------------|-------------------|
| Fall → Spring | ~6 months | Official CDF | Growth, Expected, Index, Met/Not Met, Quintile |
| Spring → Fall | ~4 months | Calculated | Growth only (no official benchmark) |

- Index = Actual Growth ÷ Expected Growth
- Index ≥ 1.0 means met or exceeded expectations

→ See: [references/growth.md](references/growth.md)

### NWEA Norms

National percentile reference values by grade and term for comparison.

→ See: [references/norms.md](references/norms.md)

## Data Flow

```
1. Import   : CDF CSV → map_assessments table
2. Link     : Match student_number → students.id
3. Analyze  : Group by English Level, calculate averages
4. Display  : Student page + Stats page
```

## Key Files

| Purpose | Location |
|---------|----------|
| **Import Script** | `scripts/import-map-cdf.ts` |
| **Database Types** | `types/database.ts` (map_assessments) |
| **Student API** | `lib/api/map-student-analytics.ts` |
| **Stats API** | `lib/api/map-analytics.ts` |
| **Chart Components** | `components/map/charts/` |
| **Student Components** | `components/map/student/` |
| **Color Constants** | `lib/map/colors.ts` |
| **Utility Functions** | `lib/map/utils.ts` |
| **Norm Lookup** | `lib/map/norms.ts` |

## Pages

### Stats Page (`/browse/stats/map`)

Group-level analysis with tabs:
- **Overview**: Growth trend charts by English Level (Grid/Single view toggle)
- **Growth**: Growth Index distribution, consecutive growth (FA→SP, SP→FA)
- **Goals**: Goal area performance (Radar + Table)
- **Lexile**: Reading level distribution
- **Quality**: Rapid guessing analysis
- **Transitions**: Benchmark level transitions

**Chart Features** (v1.64.0):
- Full-width line charts with end-point labels
- Hybrid view mode: Grid (3 charts) / Single (tabbed)
- Norm reference line (dashed)
- Enhanced tooltip with color indicators

### Student Page (`/student/[id]` → MAP Tab)

Individual student analysis with 4 collapsible sections:
1. **Current Performance**: Score cards, benchmark status, test validity
2. **Growth & Progress**: Progress charts, growth index, projections, peer comparison
3. **Instructional Focus**: Goal areas, Lexile level
4. **Historical Data**: Benchmark history, raw assessment tables

## Import Command

```bash
# Dry run
npx tsx scripts/import-map-cdf.ts \
  --file="Kang Chiao International School--Linkou Campus.csv" \
  --dry-run --verbose

# Production import
npx tsx scripts/import-map-cdf.ts \
  --file="Kang Chiao International School--Linkou Campus.csv"
```

## References

| Topic | File |
|-------|------|
| Data Import | [references/data-import.md](references/data-import.md) |
| Database Schema | [references/database.md](references/database.md) |
| Benchmark Rules | [references/benchmarks.md](references/benchmarks.md) |
| NWEA Norms | [references/norms.md](references/norms.md) |
| Growth Logic | [references/growth.md](references/growth.md) |
| Chart Specs | [references/charts.md](references/charts.md) |
| Student Page | [references/student-page.md](references/student-page.md) |
