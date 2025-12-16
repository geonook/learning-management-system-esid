---
name: lms-kcfsgradebook
description: KCFS (Kang Chiao Future Skill) gradebook grading logic and calculation rules. Use this skill when implementing LMS gradebook features for KCFS, calculating term grades, setting up assessment categories by grade level, or handling special score inputs (zero, blank, absent). Covers G1-G6 with grade-specific weights and categories.
---

# KCFS Gradebook Logic

## Core Formula

```
Term Grade = 50 + (Σ category_averages × weight)
```

Base score is **50** (fixed across all grades).

## Grade Configuration

| Grade | Categories | Weight | Formula |
|-------|------------|--------|---------|
| G1-2 | 4 | 2.5 | `50 + (4 × avg × 2.5)` |
| G3-4 | 5 | 2.0 | `50 + (5 × avg × 2.0)` |
| G5-6 | 6 | 5/3 | `50 + (6 × avg × 1.667)` |

All grades produce **80-100** range (3.0→80, 4.0→90, 5.0→100).

## Categories by Grade

**G1-2**: Communication, Collaboration, Self-Direction, Critical Thinking

**G3-4**: Communication, Collaboration, Self-Direction, Critical Thinking, **Book Work**

**G5-6**: Communication, Collaboration, Self-Direction, Critical Thinking, **Portfolio**, **Presentation**

## Score Handling

| Input | In Average? |
|-------|-------------|
| Numeric (0-5, including <3.0) | Yes |
| Zero (0) | Yes (lowers grade) |
| Blank/Empty | Excluded |
| "Absent" | Excluded |

**Score Precision**: Allows 0.5 increments (0, 0.5, 1, 1.5, ..., 5)

## Implementation

See `references/config.md` for configuration objects and database schema.
See `references/formulas.md` for calculation pseudocode and examples.
