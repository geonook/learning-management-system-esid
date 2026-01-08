/**
 * Configuration Module Index
 * 集中匯出所有配置常數
 *
 * @version 1.0.0
 * @date 2026-01-07
 */

// Pagination & Query Limits
export {
  PAGINATION,
  QUERY_LIMITS,
  getDefaultPageSize,
} from './pagination'

// Import Processing
export {
  BATCH_PROCESSING,
  MAP_IMPORT_LIMITS,
  GRADEBOOK_IMPORT_LIMITS,
  estimateProcessingTime,
} from './import'

// Authentication & Security
export {
  COOKIE_TIMEOUTS,
  TOKEN_CONFIG,
  SESSION_CONFIG,
  SECURITY_CONFIG,
  getCookieOptions,
} from './auth'

// SSO Configuration (existing)
export { getSSOConfig, isSSOEnabled, isEmailPasswordEnabled } from './sso'

// Academic Year Configuration
export {
  CURRENT_ACADEMIC_YEAR,
  getCurrentAcademicYear,
  getCurrentTerm,
  getSemesterFromTerm,
  getCurrentSemester,
  TERM_LABELS,
  getTermLabel,
} from './academic-year'
