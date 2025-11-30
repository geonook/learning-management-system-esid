/**
 * Assessment Display Name Resolution
 * 
 * Handles mapping assessment codes (FA1, SA2, etc.) to display names
 * Priority order: Class-specific > Grade×Track-specific > Default
 * 
 * Note: Display names only affect UI and reports, never calculations
 */

import { AssessmentCode, AssessmentDisplayOverride } from './types'

// Default display names for assessment codes
const DEFAULT_DISPLAY_NAMES: Record<AssessmentCode, string> = {
  FA1: 'Formative Assessment 1',
  FA2: 'Formative Assessment 2', 
  FA3: 'Formative Assessment 3',
  FA4: 'Formative Assessment 4',
  FA5: 'Formative Assessment 5',
  FA6: 'Formative Assessment 6',
  FA7: 'Formative Assessment 7',
  FA8: 'Formative Assessment 8',
  SA1: 'Summative Assessment 1',
  SA2: 'Summative Assessment 2',
  SA3: 'Summative Assessment 3', 
  SA4: 'Summative Assessment 4',
  FINAL: 'Final Examination'
}

export interface DisplayNameContext {
  classId?: string
  grade?: number
  track?: string
  overrides?: AssessmentDisplayOverride[]
}

/**
 * Resolve display name for an assessment code
 * Uses priority system: Class > Grade×Track > Default
 */
export function resolveDisplayName(
  code: AssessmentCode, 
  context: DisplayNameContext = {}
): string {
  const { classId, grade, track, overrides = [] } = context
  
  // 1. Check for class-specific override
  if (classId) {
    const classOverride = overrides.find(
      override => override.code === code && 
                 override.context === 'class' && 
                 override.classId === classId
    )
    if (classOverride) {
      return classOverride.displayName
    }
  }
  
  // 2. Check for grade×track override
  if (grade && track) {
    const gradeTrackOverride = overrides.find(
      override => override.code === code && 
                 override.context === 'grade_track' && 
                 override.grade === grade && 
                 override.track === track
    )
    if (gradeTrackOverride) {
      return gradeTrackOverride.displayName
    }
  }
  
  // 3. Check for default override
  const defaultOverride = overrides.find(
    override => override.code === code && override.context === 'default'
  )
  if (defaultOverride) {
    return defaultOverride.displayName
  }
  
  // 4. Fallback to built-in default
  return DEFAULT_DISPLAY_NAMES[code]
}

/**
 * Get all display names for assessment codes in given context
 */
export function resolveAllDisplayNames(
  codes: AssessmentCode[], 
  context: DisplayNameContext = {}
): Record<AssessmentCode, string> {
  return codes.reduce((acc, code) => {
    acc[code] = resolveDisplayName(code, context)
    return acc
  }, {} as Record<AssessmentCode, string>)
}

/**
 * Validate display name override
 */
export function validateDisplayNameOverride(
  override: Partial<AssessmentDisplayOverride>
): AssessmentDisplayOverride | null {
  if (!override.code || !override.displayName || !override.context) {
    return null
  }
  
  // Validate context-specific requirements
  if (override.context === 'class' && !override.classId) {
    return null
  }
  
  if (override.context === 'grade_track' && (!override.grade || !override.track)) {
    return null
  }
  
  return override as AssessmentDisplayOverride
}