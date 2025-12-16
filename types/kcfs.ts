/**
 * KCFS (Kang Chiao Future Skill) Type Definitions
 *
 * KCFS uses a different scoring system than LT/IT:
 * - Score Range: 0-5 (0.5 increments)
 * - Formula: Term Grade = 50 + (Σ category_score × weight)
 * - Grade-specific categories and weights
 */

// KCFS Category Codes
export const KCFS_CATEGORY_CODES = [
  'COMM',   // Communication
  'COLLAB', // Collaboration
  'SD',     // Self-Direction
  'CT',     // Critical Thinking
  'BW',     // Book Work (G3-4 only)
  'PORT',   // Portfolio (G5-6 only)
  'PRES',   // Presentation (G5-6 only)
] as const

export type KCFSCategoryCode = typeof KCFS_CATEGORY_CODES[number]

// Grade ranges for KCFS configuration
export type KCFSGradeRange = '1-2' | '3-4' | '5-6'

// Category display names
export const KCFS_CATEGORY_NAMES: Record<KCFSCategoryCode, string> = {
  COMM: 'Communication',
  COLLAB: 'Collaboration',
  SD: 'Self-Direction',
  CT: 'Critical Thinking',
  BW: 'Book Work',
  PORT: 'Portfolio',
  PRES: 'Presentation',
}

// Grade-specific configuration
export interface KCFSGradeConfig {
  categories: KCFSCategoryCode[]
  weight: number
}

export const KCFS_GRADE_CONFIG: Record<KCFSGradeRange, KCFSGradeConfig> = {
  '1-2': {
    categories: ['COMM', 'COLLAB', 'SD', 'CT'],
    weight: 2.5,
  },
  '3-4': {
    categories: ['COMM', 'COLLAB', 'SD', 'CT', 'BW'],
    weight: 2.0,
  },
  '5-6': {
    categories: ['COMM', 'COLLAB', 'SD', 'CT', 'PORT', 'PRES'],
    weight: 5 / 3, // 1.6667
  },
}

// Base score for KCFS term grade calculation
export const KCFS_BASE_SCORE = 50

// Score with absent flag
export interface KCFSScoreEntry {
  value: number | null  // 0-5 or null (not entered)
  isAbsent: boolean     // true = student absent, excluded from calculation
}

// KCFS Scores Map (by category code)
export type KCFSScoresMap = Record<KCFSCategoryCode, KCFSScoreEntry | null>

// KCFS Calculation Result
export interface KCFSCalculationResult {
  termGrade: number | null
  categoryScores: {
    code: KCFSCategoryCode
    name: string
    value: number | null
    isAbsent: boolean
    isIncluded: boolean  // true if included in calculation
  }[]
  validCategoriesCount: number
  totalCategoriesCount: number
}

// Database row type (from kcfs_categories table)
export interface KCFSCategoryRow {
  id: string
  grade_range_start: number
  grade_range_end: number
  category_code: string
  category_name: string
  weight: number
  sequence_order: number
  is_active: boolean
  created_at: string
}

// Score with absent support (for all course types)
export interface ScoreWithAbsent {
  score: number | null
  isAbsent: boolean
}

// Extended ScoresMap with absent support
export type ScoresMapWithAbsent = Record<string, ScoreWithAbsent>
