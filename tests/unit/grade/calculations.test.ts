import { describe, it, expect, test } from 'vitest'
import {
  calcFormativeAvg,
  calcSummativeAvg,
  getFinalScore,
  calcSemesterGrade,
  calculateGrades,
  isValidScore,
  getValidScores
} from '@/lib/grade/calculations'
import { ScoresMap } from '@/lib/grade/types'

describe('Grade Calculations', () => {
  describe('calcFormativeAvg', () => {
    test('calculates average of valid FA scores > 0', () => {
      const scores: ScoresMap = {
        FA1: 80, FA2: 90, FA3: 70, FA4: null, FA5: 0, FA6: null, FA7: null, FA8: null,
        SA1: null, SA2: null, SA3: null, SA4: null,
        FINAL: null
      }
      expect(calcFormativeAvg(scores)).toBe(80.0) // (80+90+70)/3 = 80
    })

    test('returns null when all FA scores are null or 0', () => {
      const scores: ScoresMap = {
        FA1: null, FA2: 0, FA3: null, FA4: null, FA5: null, FA6: null, FA7: null, FA8: null,
        SA1: null, SA2: null, SA3: null, SA4: null,
        FINAL: null
      }
      expect(calcFormativeAvg(scores)).toBeNull()
    })

    test('excludes 0 scores from calculation', () => {
      const scores: ScoresMap = {
        FA1: 90, FA2: 0, FA3: 80, FA4: null, FA5: null, FA6: null, FA7: null, FA8: null,
        SA1: null, SA2: null, SA3: null, SA4: null,
        FINAL: null
      }
      expect(calcFormativeAvg(scores)).toBe(85.0) // (90+80)/2 = 85
    })
  })

  describe('calcSummativeAvg', () => {
    test('calculates average of valid SA scores > 0', () => {
      const scores: ScoresMap = {
        FA1: null, FA2: null, FA3: null, FA4: null, FA5: null, FA6: null, FA7: null, FA8: null,
        SA1: 85, SA2: 95, SA3: null, SA4: 0,
        FINAL: null
      }
      expect(calcSummativeAvg(scores)).toBe(90.0) // (85+95)/2 = 90
    })

    test('returns null when all SA scores are null or 0', () => {
      const scores: ScoresMap = {
        FA1: null, FA2: null, FA3: null, FA4: null, FA5: null, FA6: null, FA7: null, FA8: null,
        SA1: null, SA2: 0, SA3: null, SA4: null,
        FINAL: null
      }
      expect(calcSummativeAvg(scores)).toBeNull()
    })
  })

  describe('getFinalScore', () => {
    test('returns final score when > 0', () => {
      const scores: ScoresMap = {
        FA1: null, FA2: null, FA3: null, FA4: null, FA5: null, FA6: null, FA7: null, FA8: null,
        SA1: null, SA2: null, SA3: null, SA4: null,
        FINAL: 88.5
      }
      expect(getFinalScore(scores)).toBe(88.5)
    })

    test('returns null when final score is 0', () => {
      const scores: ScoresMap = {
        FA1: null, FA2: null, FA3: null, FA4: null, FA5: null, FA6: null, FA7: null, FA8: null,
        SA1: null, SA2: null, SA3: null, SA4: null,
        FINAL: 0
      }
      expect(getFinalScore(scores)).toBeNull()
    })

    test('returns null when final score is null', () => {
      const scores: ScoresMap = {
        FA1: null, FA2: null, FA3: null, FA4: null, FA5: null, FA6: null, FA7: null, FA8: null,
        SA1: null, SA2: null, SA3: null, SA4: null,
        FINAL: null
      }
      expect(getFinalScore(scores)).toBeNull()
    })
  })

  describe('calcSemesterGrade', () => {
    test('calculates weighted semester grade with all components', () => {
      const scores: ScoresMap = {
        FA1: 80, FA2: 90, FA3: null, FA4: null, FA5: null, FA6: null, FA7: null, FA8: null, // avg = 85
        SA1: 88, SA2: 92, SA3: null, SA4: null, // avg = 90
        FINAL: 94
      }
      // Weighted: (85*0.15 + 90*0.2 + 94*0.1) / 0.45 = (12.75 + 18 + 9.4) / 0.45 = 89.22
      expect(calcSemesterGrade(scores)).toBe(89.22)
    })

    test('calculates with partial components', () => {
      const scores: ScoresMap = {
        FA1: 80, FA2: 90, FA3: null, FA4: null, FA5: null, FA6: null, FA7: null, FA8: null, // avg = 85
        SA1: null, SA2: null, SA3: null, SA4: null, // no SA scores
        FINAL: 94
      }
      // Only FA and Final: (85*0.15 + 94*0.1) / 0.25 = (12.75 + 9.4) / 0.25 = 88.6
      expect(calcSemesterGrade(scores)).toBe(88.6)
    })

    test('returns null when no valid scores', () => {
      const scores: ScoresMap = {
        FA1: null, FA2: 0, FA3: null, FA4: null, FA5: null, FA6: null, FA7: null, FA8: null,
        SA1: null, SA2: null, SA3: null, SA4: null,
        FINAL: null
      }
      expect(calcSemesterGrade(scores)).toBeNull()
    })
  })

  describe('calculateGrades - complete integration', () => {
    test('returns complete calculation result with metadata', () => {
      const input = {
        scores: {
          FA1: 80, FA2: 90, FA3: 0, FA4: null, FA5: null, FA6: null, FA7: null, FA8: null,
          SA1: 88, SA2: 92, SA3: null, SA4: null,
          FINAL: 94
        } as ScoresMap,
        studentId: 'student-1',
        classId: 'class-1'
      }

      const result = calculateGrades(input)

      expect(result).toEqual({
        formativeAvg: 85.0, // (80+90)/2
        summativeAvg: 90.0, // (88+92)/2
        semesterGrade: 89.22, // weighted calculation
        totalScoresUsed: 5, // FA1, FA2, SA1, SA2, FINAL
        formativeScoresUsed: 2, // FA1, FA2
        summativeScoresUsed: 2, // SA1, SA2
        finalScoreUsed: true
      })
    })

    test('handles mixed score scenarios correctly', () => {
      const input = {
        scores: {
          FA1: 0, FA2: null, FA3: 95, FA4: null, FA5: null, FA6: null, FA7: null, FA8: null,
          SA1: null, SA2: 0, SA3: null, SA4: null,
          FINAL: 85
        } as ScoresMap,
        studentId: 'student-2',
        classId: 'class-2'
      }

      const result = calculateGrades(input)

      expect(result).toEqual({
        formativeAvg: 95.0, // Only FA3 counts
        summativeAvg: null, // No valid SA scores
        semesterGrade: 87.6, // (95*0.15 + 85*0.1) / 0.25
        totalScoresUsed: 2, // FA3, FINAL
        formativeScoresUsed: 1,
        summativeScoresUsed: 0,
        finalScoreUsed: true
      })
    })
  })

  describe('utility functions', () => {
    test('isValidScore correctly identifies valid scores', () => {
      expect(isValidScore(85.5)).toBe(true)
      expect(isValidScore(0)).toBe(false)
      expect(isValidScore(null)).toBe(false)
      expect(isValidScore(100)).toBe(true)
      expect(isValidScore(0.1)).toBe(true)
    })

    test('getValidScores returns only valid score entries', () => {
      const scores: ScoresMap = {
        FA1: 85, FA2: 0, FA3: null, FA4: 90, FA5: null, FA6: null, FA7: null, FA8: null,
        SA1: null, SA2: null, SA3: null, SA4: null,
        FINAL: 88.5
      }

      const validScores = getValidScores(scores)
      expect(validScores).toEqual([
        { code: 'FA1', score: 85 },
        { code: 'FA4', score: 90 },
        { code: 'FINAL', score: 88.5 }
      ])
    })
  })

  // Snapshot tests for regression prevention
  describe('snapshot tests', () => {
    test('complete score calculation snapshot', () => {
      const input = {
        scores: {
          FA1: 85.5, FA2: 78.0, FA3: 92.5, FA4: null, FA5: null, FA6: null, FA7: null, FA8: null,
          SA1: 88.0, SA2: 91.5, SA3: null, SA4: null,
          FINAL: 89.0
        } as ScoresMap,
        studentId: 'snapshot-test-student',
        classId: 'snapshot-test-class'
      }

      const result = calculateGrades(input)
      expect(result).toMatchSnapshot()
    })

    test('partial score calculation snapshot', () => {
      const input = {
        scores: {
          FA1: null, FA2: 95.0, FA3: null, FA4: 87.5, FA5: null, FA6: null, FA7: null, FA8: null,
          SA1: 90.0, SA2: null, SA3: null, SA4: null,
          FINAL: null
        } as ScoresMap,
        studentId: 'partial-scores-student',
        classId: 'partial-scores-class'
      }

      const result = calculateGrades(input)
      expect(result).toMatchSnapshot()
    })

    test('zero and null scores handling snapshot', () => {
      const input = {
        scores: {
          FA1: 0, FA2: 95.0, FA3: null, FA4: 87.5, FA5: null, FA6: null, FA7: null, FA8: null,
          SA1: 90.0, SA2: 0, SA3: null, SA4: null,
          FINAL: 85.5
        } as ScoresMap,
        studentId: 'mixed-scores-student',
        classId: 'mixed-scores-class'
      }

      const result = calculateGrades(input)
      expect(result).toMatchSnapshot()
    })
  })
})