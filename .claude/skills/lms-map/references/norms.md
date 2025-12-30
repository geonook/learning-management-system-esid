# NWEA National Norms

## Overview

NWEA provides national normative data based on millions of US student test records. KCIS uses these norms to compare school performance against national averages.

**Data Source**: NWEA 2025 Technical Manual (Official)
- 116 million scores from 13.8 million students across 29,720 US public schools
- Testing period: Fall 2022 - Spring 2024
- Technical Manual: See `.claude/skills/map-growth-norms-2025/SKILL.md`

## 2025 Student Achievement Norms (G3-G6)

### Reading

| Grade | Fall Mean | Fall SD | Winter Mean | Winter SD | Spring Mean | Spring SD |
|-------|-----------|---------|-------------|-----------|-------------|-----------|
| 3 | 184.69 | 18.30 | 189.89 | 18.13 | 193.79 | 18.15 |
| 4 | 195.92 | 17.99 | 199.45 | 17.76 | 202.09 | 17.74 |
| 5 | 203.67 | 17.45 | 206.36 | 17.21 | 208.37 | 17.15 |
| 6 | 208.95 | 16.84 | 210.72 | 16.70 | 212.04 | 16.67 |

### Language Usage

| Grade | Fall Mean | Fall SD | Winter Mean | Winter SD | Spring Mean | Spring SD |
|-------|-----------|---------|-------------|-----------|-------------|-----------|
| 3 | 184.42 | 17.37 | 189.58 | 17.00 | 193.44 | 16.93 |
| 4 | 194.69 | 16.81 | 198.45 | 16.46 | 201.27 | 16.26 |
| 5 | 201.87 | 16.09 | 204.79 | 15.79 | 206.97 | 15.67 |
| 6 | 206.49 | 15.67 | 208.57 | 15.68 | 210.12 | 15.78 |

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
const norm = getNorm("2025-2026", 4, "fall", "Reading"); // 195.92

// Get G4 Fall Reading standard deviation
const stdDev = getNormStdDev("2025-2026", 4, "fall", "Reading"); // 17.99

// Get G4 Fall-to-Spring Reading growth norm (within-year)
const growth = getGrowthNormByCourse("2025-2026", 4, "fall-to-spring", "Reading");
// { mean: 6.17, stdDev: 8.67 }

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
