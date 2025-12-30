# NWEA National Norms

## Overview

NWEA provides national normative data based on millions of US student test records. KCIS uses these norms to compare school performance against national averages.

**Data Source**: NWEA 2025 Norms Quick Reference (Official)
- 116 million scores from 13.8 million students across 30,000 schools
- Testing period: Fall 2022 - Spring 2024
- URL: https://www.nwea.org/resource-center/fact-sheet/87992/MAP-Growth-2025-norms-quick-reference_NWEA_onesheet.pdf

## 2025 Student Achievement Norms (G3-G6)

### Reading

| Grade | Fall Mean | Fall SD | Winter Mean | Winter SD | Spring Mean | Spring SD |
|-------|-----------|---------|-------------|-----------|-------------|-----------|
| 3 | 185 | 18 | 190 | 18 | 194 | 18 |
| 4 | 196 | 18 | 199 | 18 | 202 | 18 |
| 5 | 204 | 17 | 206 | 17 | 208 | 17 |
| 6 | 209 | 17 | 211 | 17 | 212 | 17 |

### Language Usage

| Grade | Fall Mean | Fall SD | Winter Mean | Winter SD | Spring Mean | Spring SD |
|-------|-----------|---------|-------------|-----------|-------------|-----------|
| 3 | 184 | 17 | 190 | 17 | 193 | 17 |
| 4 | 195 | 17 | 198 | 16 | 201 | 16 |
| 5 | 202 | 16 | 205 | 16 | 207 | 16 |
| 6 | 206 | 16 | 209 | 16 | 210 | 16 |

## 2025 Student Growth Norms (G3-G6)

### Reading Growth (Within-Year)

| Grade | Fall-to-Winter Mean | SD | Winter-to-Spring Mean | SD | Fall-to-Spring Mean | SD |
|-------|---------------------|----|-----------------------|----|---------------------|-------|
| 3 | 5 | 9 | 4 | 9 | 9 | 9 |
| 4 | 4 | 8 | 3 | 8 | 6 | 9 |
| 5 | 3 | 8 | 2 | 8 | 5 | 9 |
| 6 | 2 | 8 | 1 | 8 | 3 | 8 |

### Language Usage Growth (Within-Year)

| Grade | Fall-to-Winter Mean | SD | Winter-to-Spring Mean | SD | Fall-to-Spring Mean | SD |
|-------|---------------------|----|-----------------------|----|---------------------|-------|
| 3 | 5 | 8 | 4 | 8 | 9 | 9 |
| 4 | 4 | 8 | 3 | 8 | 7 | 8 |
| 5 | 3 | 8 | 2 | 7 | 5 | 8 |
| 6 | 2 | 8 | 2 | 8 | 4 | 8 |

### Fall-to-Fall Growth (Cross-Year / Grade Advancement)

**資料來源**: NWEA 2025 Technical Manual Table C.3 & C.5

Fall-to-Fall 代表學生從一個年級的秋季到下一個年級的秋季的預期成長。

#### Reading Growth (Fall-to-Fall)

| From Grade → To Grade | Mean | SD |
|----------------------|------|-----|
| G3 → G4 | 11.20 | 9.69 |
| G4 → G5 | 7.68 | 9.11 |
| G5 → G6 | 5.75 | 8.96 |
| G6 → G7 | 3.86 | 8.85 |

#### Language Usage Growth (Fall-to-Fall)

| From Grade → To Grade | Mean | SD |
|----------------------|------|-----|
| G3 → G4 | 10.46 | 9.18 |
| G4 → G5 | 7.62 | 8.39 |
| G5 → G6 | 5.34 | 8.25 |
| G6 → G7 | 3.99 | 8.42 |

## TypeScript Implementation

**File**: `lib/map/norms.ts`

### Interfaces

```typescript
export interface NormData {
  languageUsage: number;
  reading: number;
}

export interface NormDataWithStdDev {
  languageUsage: number;
  languageUsageStdDev: number;
  reading: number;
  readingStdDev: number;
}

export interface GrowthNormData {
  languageUsage: number;
  languageUsageStdDev: number;
  reading: number;
  readingStdDev: number;
}

type GrowthPeriod = "fall-to-winter" | "winter-to-spring" | "fall-to-spring" | "fall-to-fall";
```

### Key Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `getNorm(year, grade, term, course)` | `number \| null` | Get RIT norm mean |
| `getNormStdDev(year, grade, term, course)` | `number \| null` | Get RIT norm standard deviation |
| `getNormDataWithStdDev(year, grade, term)` | `NormDataWithStdDev \| null` | Get complete norm data with SD |
| `getGrowthNorm(year, grade, period)` | `GrowthNormData \| null` | Get growth norm for a period |
| `getGrowthNormByCourse(year, grade, period, course)` | `{ mean, stdDev } \| null` | Get growth norm for specific course |
| `mapTermsToGrowthPeriod(from, to, isCrossYear?)` | `GrowthPeriod \| null` | Convert terms to growth period (use isCrossYear=true for fall-to-fall) |

### Usage Examples

```typescript
import {
  getNorm,
  getNormStdDev,
  getGrowthNormByCourse
} from "@/lib/map/norms";

// Get G4 Fall Reading norm
const norm = getNorm("2025-2026", 4, "fall", "Reading"); // 196

// Get G4 Fall Reading standard deviation
const stdDev = getNormStdDev("2025-2026", 4, "fall", "Reading"); // 18

// Get G4 Fall-to-Spring Reading growth norm (within-year)
const growth = getGrowthNormByCourse("2025-2026", 4, "fall-to-spring", "Reading");
// { mean: 6, stdDev: 9 }

// Get G4 Fall-to-Fall Reading growth norm (cross-year: G4 Fall → G5 Fall)
const crossYearGrowth = getGrowthNormByCourse("2025-2026", 4, "fall-to-fall", "Reading");
// { mean: 7.68, stdDev: 9.11 }

// Convert terms to growth period (with cross-year flag)
const period = mapTermsToGrowthPeriod("fall", "fall", true);
// "fall-to-fall"
```

## Legacy Norms (2024-2025)

For backward compatibility, older norms are still available:

### Grade 3
| Term | Language Usage | Reading |
|------|----------------|---------|
| Fall | 188 | 187 |
| Spring | 198 | 197 |

### Grade 4
| Term | Language Usage | Reading |
|------|----------------|---------|
| Fall | 197 | 197 |
| Spring | 205 | 205 |

### Grade 5
| Term | Language Usage | Reading |
|------|----------------|---------|
| Fall | 204 | 204 |
| Spring | 210 | 211 |

### Grade 6
| Term | Language Usage | Reading |
|------|----------------|---------|
| Fall | 208 | 210 |
| Spring | 212 | 214 |

## Notes

- **2025 Norms**: Based on Fall 2022 - Spring 2024 data, updated August 2025
- **SD (Standard Deviation)**: Measures score variability within a grade level
- **Growth Norms**: Expected growth between testing periods
- **Academic Year Format**: "2024-2025", "2025-2026"
- **MapTerm vs ELA Term**: MapTerm (fall/winter/spring) is distinct from ELA Term (1/2/3/4)
