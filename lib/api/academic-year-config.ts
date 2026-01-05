/**
 * Academic Year Configuration API
 *
 * Provides functions for:
 * 1. Getting current academic year from database configuration
 * 2. Getting semester dates
 * 3. Caching configuration to reduce database queries
 *
 * This module replaces the hardcoded date logic with database-driven configuration.
 * Falls back to calculated values when no database configuration exists.
 */

import { supabase } from '@/lib/supabase/client'
import { getCurrentAcademicYear as getCurrentAcademicYearFallback } from '@/types/academic-year'

// ============================================================
// Types
// ============================================================

export interface AcademicYearConfig {
  academicYear: string
  startDate: string
  endDate: string
  fallStartDate: string | null
  fallEndDate: string | null
  springStartDate: string | null
  springEndDate: string | null
}

// ============================================================
// Cache Implementation
// ============================================================

/**
 * In-memory cache for academic year configurations
 * TTL: 30 minutes to balance freshness with performance
 */
class AcademicYearConfigCache {
  private cache: Map<string, { config: AcademicYearConfig; expires: number }> = new Map()
  private currentYearCache: { year: string; expires: number } | null = null
  private cacheTTL = 30 * 60 * 1000 // 30 minutes

  /**
   * Get cached config for a specific academic year
   */
  get(academicYear: string): AcademicYearConfig | null {
    const entry = this.cache.get(academicYear)
    if (!entry || entry.expires < Date.now()) {
      this.cache.delete(academicYear)
      return null
    }
    return entry.config
  }

  /**
   * Cache a config
   */
  set(config: AcademicYearConfig): void {
    this.cache.set(config.academicYear, {
      config,
      expires: Date.now() + this.cacheTTL,
    })
  }

  /**
   * Get cached current academic year
   */
  getCurrentYear(): string | null {
    if (!this.currentYearCache || this.currentYearCache.expires < Date.now()) {
      this.currentYearCache = null
      return null
    }
    return this.currentYearCache.year
  }

  /**
   * Cache current academic year
   */
  setCurrentYear(year: string): void {
    this.currentYearCache = {
      year,
      expires: Date.now() + this.cacheTTL,
    }
  }

  /**
   * Clear all cached data
   * Call this when admin updates configuration
   */
  clear(): void {
    this.cache.clear()
    this.currentYearCache = null
  }
}

export const academicYearConfigCache = new AcademicYearConfigCache()

// ============================================================
// API Functions
// ============================================================

/**
 * Get current academic year from database configuration
 *
 * Queries the academic_periods table for a year-type period that
 * contains the current date within its start_date and end_date range.
 *
 * Falls back to calculated value if no configuration exists.
 */
export async function getCurrentAcademicYearFromConfig(): Promise<string> {
  // Check cache first
  const cached = academicYearConfigCache.getCurrentYear()
  if (cached) return cached

  try {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('academic_periods')
      .select('academic_year')
      .eq('period_type', 'year')
      .lte('start_date', today)
      .gte('end_date', today)
      .order('start_date', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      // Fallback to calculated value
      const fallback = getCurrentAcademicYearFallback()
      academicYearConfigCache.setCurrentYear(fallback)
      return fallback
    }

    academicYearConfigCache.setCurrentYear(data.academic_year)
    return data.academic_year
  } catch {
    // Fallback on any error
    return getCurrentAcademicYearFallback()
  }
}

/**
 * Get academic year configuration with all dates
 *
 * Returns complete date configuration for a specific academic year.
 * Returns null if no configuration exists for the specified year.
 */
export async function getAcademicYearConfig(
  academicYear: string
): Promise<AcademicYearConfig | null> {
  // Check cache first
  const cached = academicYearConfigCache.get(academicYear)
  if (cached) return cached

  try {
    const { data, error } = await supabase
      .from('academic_periods')
      .select(
        'academic_year, start_date, end_date, fall_start_date, fall_end_date, spring_start_date, spring_end_date'
      )
      .eq('academic_year', academicYear)
      .eq('period_type', 'year')
      .single()

    if (error || !data || !data.start_date || !data.end_date) {
      return null
    }

    const config: AcademicYearConfig = {
      academicYear: data.academic_year,
      startDate: data.start_date,
      endDate: data.end_date,
      fallStartDate: data.fall_start_date,
      fallEndDate: data.fall_end_date,
      springStartDate: data.spring_start_date,
      springEndDate: data.spring_end_date,
    }

    // Cache the result
    academicYearConfigCache.set(config)

    return config
  } catch {
    return null
  }
}

/**
 * Get current semester based on database configuration
 *
 * Returns 1 (Fall) or 2 (Spring) based on the configured semester dates.
 * Returns null if the current date is outside any semester period
 * (e.g., summer break) or if no configuration exists.
 */
export async function getCurrentSemesterFromConfig(
  academicYear?: string
): Promise<1 | 2 | null> {
  try {
    const year = academicYear || (await getCurrentAcademicYearFromConfig())
    const config = await getAcademicYearConfig(year)

    if (!config) return null

    const todayParts = new Date().toISOString().split('T')
    const today = todayParts[0] ?? ''

    // Check Fall semester
    if (
      config.fallStartDate &&
      config.fallEndDate &&
      today >= config.fallStartDate &&
      today <= config.fallEndDate
    ) {
      return 1
    }

    // Check Spring semester
    if (
      config.springStartDate &&
      config.springEndDate &&
      today >= config.springStartDate &&
      today <= config.springEndDate
    ) {
      return 2
    }

    return null
  } catch {
    return null
  }
}

/**
 * Get all academic years with date configuration
 *
 * Returns all year-type periods that have date configuration.
 * Useful for Admin UI to show all configured academic years.
 */
export async function getAllAcademicYearConfigs(): Promise<AcademicYearConfig[]> {
  try {
    const { data, error } = await supabase
      .from('academic_periods')
      .select(
        'academic_year, start_date, end_date, fall_start_date, fall_end_date, spring_start_date, spring_end_date'
      )
      .eq('period_type', 'year')
      .not('start_date', 'is', null)
      .not('end_date', 'is', null)
      .order('academic_year', { ascending: false })

    if (error || !data) return []

    return data.map((row) => ({
      academicYear: row.academic_year,
      startDate: row.start_date!,
      endDate: row.end_date!,
      fallStartDate: row.fall_start_date,
      fallEndDate: row.fall_end_date,
      springStartDate: row.spring_start_date,
      springEndDate: row.spring_end_date,
    }))
  } catch {
    return []
  }
}

/**
 * Check if a date falls within a specific academic year
 */
export async function isDateInAcademicYear(
  date: Date,
  academicYear: string
): Promise<boolean> {
  const config = await getAcademicYearConfig(academicYear)
  if (!config) return false

  const dateStrParts = date.toISOString().split('T')
  const dateStr = dateStrParts[0] ?? ''
  return dateStr >= config.startDate && dateStr <= config.endDate
}

/**
 * Get academic year for a specific date
 *
 * Queries the database to find which academic year contains the given date.
 * Falls back to calculated value if no configuration exists.
 */
export async function getAcademicYearForDate(date: Date): Promise<string> {
  try {
    const dateStrParts = date.toISOString().split('T')
    const dateStr = dateStrParts[0] ?? ''

    const { data, error } = await supabase
      .from('academic_periods')
      .select('academic_year')
      .eq('period_type', 'year')
      .lte('start_date', dateStr)
      .gte('end_date', dateStr)
      .order('start_date', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      // Fallback to calculated value
      return getCurrentAcademicYearFallback(date)
    }

    return data.academic_year
  } catch {
    return getCurrentAcademicYearFallback(date)
  }
}
