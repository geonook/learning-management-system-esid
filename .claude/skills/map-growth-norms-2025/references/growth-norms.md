# Growth Norms Reference

## Overview

Growth norms describe typical RIT score changes between assessment periods. They are **conditional** on starting RIT score—students starting at different levels have different expected growth patterns.

## Key Concepts

### Why Conditional Growth?

Students with higher starting scores typically show less growth than those with lower starting scores (regression to the mean effect). Using unconditional (marginal) growth norms would:
- Unfairly penalize high performers
- Overestimate growth for low performers
- Produce misleading percentiles

### Growth Periods

1. **Within-Year Growth** (3 periods):
   - Fall → Winter
   - Winter → Spring
   - Fall → Spring

2. **Between-Year Growth** (4 periods):
   - Spring → Fall (next year)
   - Fall → Fall (year-over-year)
   - Winter → Winter
   - Spring → Spring

## Expected Growth (Typical Values)

### Within-Year Growth - Mathematics (Student)

Expected Fall → Spring growth at 50th percentile:

| Grade | Expected Growth | Fall Mean → Spring Mean |
|-------|-----------------|-------------------------|
| K | +16.6 | 141 → 158 |
| 1 | +15.7 | 159 → 175 |
| 2 | +14.6 | 173 → 187 |
| 3 | +15.1 | 184 → 199 |
| 4 | +13.0 | 197 → 210 |
| 5 | +9.8 | 206 → 216 |
| 6 | +10.1 | 210 → 220 |
| 7 | +6.6 | 217 → 224 |
| 8 | +6.8 | 222 → 229 |
| 9 | +3.9 | 225 → 229 |
| 10 | +4.6 | 227 → 231 |
| 11 | +3.8 | 229 → 233 |
| 12 | +3.0 | 228 → 231 |

### Within-Year Growth - Reading (Student)

Expected Fall → Spring growth at 50th percentile:

| Grade | Expected Growth | Fall Mean → Spring Mean |
|-------|-----------------|-------------------------|
| K | +13.9 | 138 → 152 |
| 1 | +12.5 | 155 → 168 |
| 2 | +11.6 | 170 → 182 |
| 3 | +9.1 | 185 → 194 |
| 4 | +6.2 | 196 → 202 |
| 5 | +4.7 | 204 → 208 |
| 6 | +3.1 | 209 → 212 |
| 7 | +2.5 | 212 → 215 |
| 8 | +2.1 | 216 → 218 |
| 9 | +1.0 | 216 → 217 |
| 10 | +0.7 | 218 → 218 |
| 11 | -0.4 | 218 → 218 |
| 12 | -1.4 | 218 → 216 |

### Within-Year Growth - Language Usage (Student)

Expected Fall → Spring growth at 50th percentile:

| Grade | Expected Growth | Fall Mean → Spring Mean |
|-------|-----------------|-------------------------|
| 2 | +12.4 | 170 → 183 |
| 3 | +9.0 | 184 → 193 |
| 4 | +6.6 | 195 → 201 |
| 5 | +5.1 | 202 → 207 |
| 6 | +3.6 | 206 → 210 |
| 7 | +3.0 | 210 → 213 |
| 8 | +2.8 | 214 → 217 |
| 9 | +1.6 | 214 → 216 |
| 10 | +1.5 | 216 → 217 |
| 11 | +0.8 | 218 → 218 |

### Within-Year Growth - Science (Student)

Expected Fall → Spring growth at 50th percentile:

| Grade | Expected Growth | Fall Mean → Spring Mean |
|-------|-----------------|-------------------------|
| 2 | +9.1 | 176 → 185 |
| 3 | +6.9 | 187 → 194 |
| 4 | +5.3 | 195 → 200 |
| 5 | +5.7 | 201 → 207 |
| 6 | +3.2 | 204 → 207 |
| 7 | +2.9 | 207 → 210 |
| 8 | +3.2 | 210 → 213 |
| 9 | +1.7 | 212 → 213 |
| 10 | +1.4 | 213 → 215 |

## Conditional Growth Calculation

### Mathematical Model

For a student with starting RIT `y₁` at time `t₁` and ending RIT `y₂` at time `t₂`:

```
Observed Growth = y₂ - y₁

Expected Growth (conditional) = μ_Δ + β × (y₁ - μ₁)

Where:
- μ_Δ = mean growth for population
- β = regression coefficient (negative, typically -0.2 to -0.5)
- μ₁ = mean starting RIT for population

Growth Percentile = Φ((Observed - Expected) / σ_conditional) × 100
```

### TypeScript Implementation

```typescript
interface GrowthNormParams {
  // Population parameters
  startMean: number;      // μ₁
  endMean: number;        // μ₂
  startSD: number;        // σ₁
  endSD: number;          // σ₂
  correlation: number;    // ρ (correlation between start and end)
}

function calculateConditionalGrowthPercentile(
  startRit: number,
  endRit: number,
  params: GrowthNormParams
): number {
  const { startMean, endMean, startSD, endSD, correlation } = params;
  
  // Marginal growth statistics
  const marginalGrowthMean = endMean - startMean;
  const marginalGrowthSD = Math.sqrt(
    startSD ** 2 + endSD ** 2 - 2 * correlation * startSD * endSD
  );
  
  // Covariance between start score and growth
  const covStartGrowth = correlation * startSD * endSD - startSD ** 2;
  
  // Regression coefficient
  const beta = covStartGrowth / (startSD ** 2);
  
  // Conditional expectation
  const conditionalMean = marginalGrowthMean + beta * (startRit - startMean);
  
  // Conditional variance
  const r2 = (covStartGrowth ** 2) / (startSD ** 2 * marginalGrowthSD ** 2);
  const conditionalSD = marginalGrowthSD * Math.sqrt(1 - r2);
  
  // Observed growth
  const observedGrowth = endRit - startRit;
  
  // Z-score
  const z = (observedGrowth - conditionalMean) / conditionalSD;
  
  // Convert to percentile using standard normal CDF
  const percentile = normalCDF(z) * 100;
  
  return Math.max(1, Math.min(99, Math.round(percentile)));
}

function normalCDF(z: number): number {
  // Approximation of standard normal CDF
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);
  
  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  
  return 0.5 * (1.0 + sign * y);
}
```

### Practical Example

**Student Profile:**
- Grade 4 Reading
- Fall RIT: 210 (above average)
- Spring RIT: 215

**Calculation:**
```typescript
const params: GrowthNormParams = {
  startMean: 195.92,  // G4 Reading Fall mean
  endMean: 202.09,    // G4 Reading Spring mean
  startSD: 17.99,
  endSD: 17.74,
  correlation: 0.85   // Typical test-retest correlation
};

// Student started 14 points above mean
// Marginal expected growth: 6.2 points
// Conditional expected growth: ~4.5 points (reduced because high starter)
// Observed growth: 5 points

// This student's 5-point growth is ~55th percentile
// (slightly above average for students who started at similar level)
```

## Typical Correlation Values

Test-retest correlations for calculating conditional growth:

| Period | Typical ρ |
|--------|-----------|
| Fall → Winter | 0.88-0.92 |
| Winter → Spring | 0.90-0.94 |
| Fall → Spring | 0.85-0.90 |
| Spring → Fall (next year) | 0.82-0.88 |

## SQL Implementation

```sql
-- Growth norms parameters table
CREATE TABLE map_growth_norm_params_2025 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  grade INTEGER NOT NULL,
  start_season TEXT NOT NULL,
  end_season TEXT NOT NULL,
  
  -- Marginal parameters
  start_mean DECIMAL(6,2) NOT NULL,
  end_mean DECIMAL(6,2) NOT NULL,
  start_sd DECIMAL(5,2) NOT NULL,
  end_sd DECIMAL(5,2) NOT NULL,
  correlation DECIMAL(4,3) NOT NULL,
  
  -- Pre-calculated conditional parameters
  marginal_growth_mean DECIMAL(5,2) NOT NULL,
  regression_coefficient DECIMAL(5,3) NOT NULL,
  conditional_sd DECIMAL(5,2) NOT NULL,
  
  UNIQUE(subject, grade, start_season, end_season)
);

-- Function to calculate growth percentile
CREATE OR REPLACE FUNCTION calculate_growth_percentile(
  p_start_rit INTEGER,
  p_end_rit INTEGER,
  p_subject TEXT,
  p_grade INTEGER,
  p_start_season TEXT,
  p_end_season TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_params RECORD;
  v_observed_growth DECIMAL;
  v_expected_growth DECIMAL;
  v_z DECIMAL;
  v_percentile INTEGER;
BEGIN
  SELECT * INTO v_params
  FROM map_growth_norm_params_2025
  WHERE subject = p_subject
    AND grade = p_grade
    AND start_season = p_start_season
    AND end_season = p_end_season;
    
  IF v_params IS NULL THEN
    RETURN NULL;
  END IF;
  
  v_observed_growth := p_end_rit - p_start_rit;
  
  -- Conditional expected growth
  v_expected_growth := v_params.marginal_growth_mean + 
    v_params.regression_coefficient * (p_start_rit - v_params.start_mean);
  
  v_z := (v_observed_growth - v_expected_growth) / v_params.conditional_sd;
  
  -- Approximate normal CDF
  v_percentile := ROUND(100 * (
    0.5 * (1 + SIGN(v_z) * SQRT(1 - EXP(-2 * v_z * v_z / 3.14159)))
  ));
  
  RETURN GREATEST(1, LEAST(99, v_percentile));
END;
$$ LANGUAGE plpgsql;
```

## Important Notes

1. **Always use conditional growth** - Marginal growth percentiles are misleading for individual students

2. **Summer loss is normal** - Between-year (Spring → Fall) growth is often negative; this is expected

3. **Growth slows with grade** - Upper grade students show less absolute growth; this is developmentally normal

4. **SD increases with grade** - Variance in growth increases as students diverge in learning trajectories

5. **High starters grow less** - A student at 95th percentile showing 5 points growth may still be at 60th percentile for growth (conditional expectation is lower)

6. **Correlations matter** - Higher test-retest correlation → narrower conditional distribution → more extreme percentiles
