import { z } from 'zod'

// Assessment codes - these are the canonical identifiers for calculations
export const ASSESSMENT_CODES = [
  'FA1', 'FA2', 'FA3', 'FA4', 'FA5', 'FA6', 'FA7', 'FA8',
  'SA1', 'SA2', 'SA3', 'SA4',
  'FINAL'
] as const

export type AssessmentCode = typeof ASSESSMENT_CODES[number]

export const FORMATIVE_CODES: AssessmentCode[] = ['FA1', 'FA2', 'FA3', 'FA4', 'FA5', 'FA6', 'FA7', 'FA8']
export const SUMMATIVE_CODES: AssessmentCode[] = ['SA1', 'SA2', 'SA3', 'SA4']
export const FINAL_CODES: AssessmentCode[] = ['FINAL']

// Zod schemas for validation
export const AssessmentCodeSchema = z.enum(ASSESSMENT_CODES)

export const ScoreSchema = z.number().min(0).max(100).nullable()

export const ScoresMapSchema = z.record(
  AssessmentCodeSchema,
  ScoreSchema
)

export const GradeCalculationInputSchema = z.object({
  scores: ScoresMapSchema,
  studentId: z.string(),
  classId: z.string(),
  examId: z.string().optional()
})

// TypeScript types
export type ScoreValue = number | null
export type ScoresMap = Record<AssessmentCode, ScoreValue>

export interface GradeCalculationInput {
  scores: ScoresMap
  studentId: string
  classId: string
  examId?: string
}

export interface GradeCalculationResult {
  formativeAvg: number | null
  summativeAvg: number | null
  semesterGrade: number | null
  totalScoresUsed: number
  formativeScoresUsed: number
  summativeScoresUsed: number
  finalScoreUsed: boolean
}

// Assessment display name override types
export interface AssessmentDisplayOverride {
  code: AssessmentCode
  displayName: string
  context: 'class' | 'grade_track' | 'default'
  classId?: string
  grade?: number
  track?: string
}