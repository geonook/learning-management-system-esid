/**
 * Assessment Titles API for Primary School LMS
 * Handles display name overrides for assessment codes with hierarchy:
 * Class > Grade×Campus > Default
 */

import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'

export type AssessmentTitle = Database['public']['Tables']['assessment_titles']['Row']
export type AssessmentTitleInsert = Database['public']['Tables']['assessment_titles']['Insert']
export type AssessmentTitleUpdate = Database['public']['Tables']['assessment_titles']['Update']

// Extended type with class information
export type AssessmentTitleWithClass = AssessmentTitle & {
  classes?: {
    id: string
    name: string
    grade: number
    track: 'local' | 'international'
  }
}

/**
 * Get assessment titles with hierarchy resolution
 * Most specific first: Class > Grade×Track > Global Default
 */
export async function getAssessmentTitles(
  classId?: string,
  grade?: number,
  track?: 'local' | 'international'
): Promise<AssessmentTitleWithClass[]> {
  const supabase = createClient()

  try {
    let query = supabase
      .from('assessment_titles')
      .select(`
        *,
        classes(
          id,
          name,
          grade,
          track
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    // Apply hierarchy filtering
    if (classId) {
      // Include class-specific and fallback to grade×track and global
      query = query.or(`class_id.eq.${classId},and(class_id.is.null,grade.eq.${grade || 0},track.eq.${track || 'local'}),and(class_id.is.null,grade.is.null,track.is.null)`)
    } else if (grade && track) {
      // Include grade×track and global defaults
      query = query.or(`and(class_id.is.null,grade.eq.${grade},track.eq.${track}),and(class_id.is.null,grade.is.null,track.is.null)`)
    } else {
      // Global defaults only
      query = query
        .is('class_id', null)
        .is('grade', null)
        .is('track', null)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching assessment titles:', error)
      throw new Error(`Failed to fetch assessment titles: ${error.message}`)
    }

    return data as AssessmentTitleWithClass[]
  } catch (error) {
    console.error('Exception in getAssessmentTitles:', error)
    throw new Error('Failed to fetch assessment titles')
  }
}

/**
 * Get specific assessment title for a code with hierarchy resolution
 */
export async function getAssessmentTitle(
  assessmentCode: string,
  classId?: string,
  grade?: number,
  track?: 'local' | 'international'
): Promise<AssessmentTitleWithClass | null> {
  const supabase = createClient()

  try {
    // Build hierarchy query - most specific first
    const conditions = []
    
    if (classId) {
      conditions.push(`and(assessment_code.eq.${assessmentCode},class_id.eq.${classId})`)
    }
    
    if (grade && track) {
      conditions.push(`and(assessment_code.eq.${assessmentCode},class_id.is.null,grade.eq.${grade},track.eq.${track})`)
    }
    
    // Global default
    conditions.push(`and(assessment_code.eq.${assessmentCode},class_id.is.null,grade.is.null,track.is.null)`)

    const { data, error } = await supabase
      .from('assessment_titles')
      .select(`
        *,
        classes(
          id,
          name,
          grade,
          track
        )
      `)
      .or(conditions.join(','))
      .eq('is_active', true)
      .order('class_id', { ascending: false }) // Prioritize class-specific
      .order('grade', { ascending: false }) // Then grade-specific
      .limit(1)

    if (error) {
      console.error('Error fetching assessment title:', error)
      throw new Error(`Failed to fetch assessment title: ${error.message}`)
    }

    return data?.[0] as AssessmentTitleWithClass || null
  } catch (error) {
    console.error('Exception in getAssessmentTitle:', error)
    return null
  }
}

/**
 * Get all assessment titles for Head Teacher management (specific grade×track)
 */
export async function getHeadTeacherAssessmentTitles(
  grade: number,
  track: 'local' | 'international'
): Promise<AssessmentTitleWithClass[]> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('assessment_titles')
      .select(`
        *,
        classes(
          id,
          name,
          grade,
          track
        )
      `)
      .or(`and(class_id.is.null,grade.eq.${grade},track.eq.${track}),and(classes.grade.eq.${grade},classes.track.eq.${track})`)
      .eq('is_active', true)
      .order('assessment_code')
      .order('class_id', { ascending: true }) // Nulls first (grade-level), then class-specific

    if (error) {
      console.error('Error fetching head teacher assessment titles:', error)
      throw new Error(`Failed to fetch head teacher assessment titles: ${error.message}`)
    }

    return data as AssessmentTitleWithClass[]
  } catch (error) {
    console.error('Exception in getHeadTeacherAssessmentTitles:', error)
    throw new Error('Failed to fetch head teacher assessment titles')
  }
}

/**
 * Create assessment title override
 */
export async function createAssessmentTitle(
  titleData: AssessmentTitleInsert
): Promise<AssessmentTitle> {
  const supabase = createClient()

  try {
    // Ensure required fields are present
    const completeData = {
      ...titleData,
      context: titleData.context || 'default',
      created_by: titleData.created_by || 'system'
    }

    const { data, error } = await supabase
      .from('assessment_titles')
      .insert(completeData)
      .select('*')
      .single()

    if (error) {
      console.error('Error creating assessment title:', error)
      throw new Error(`Failed to create assessment title: ${error.message}`)
    }

    return data as AssessmentTitle
  } catch (error) {
    console.error('Exception in createAssessmentTitle:', error)
    throw new Error('Failed to create assessment title')
  }
}

/**
 * Update assessment title
 */
export async function updateAssessmentTitle(
  id: string,
  updates: AssessmentTitleUpdate
): Promise<AssessmentTitle> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('assessment_titles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating assessment title:', error)
      throw new Error(`Failed to update assessment title: ${error.message}`)
    }

    return data as AssessmentTitle
  } catch (error) {
    console.error('Exception in updateAssessmentTitle:', error)
    throw new Error('Failed to update assessment title')
  }
}

/**
 * Soft delete assessment title (mark as inactive)
 */
export async function deleteAssessmentTitle(id: string): Promise<boolean> {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('assessment_titles')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error deleting assessment title:', error)
      throw new Error(`Failed to delete assessment title: ${error.message}`)
    }

    return true
  } catch (error) {
    console.error('Exception in deleteAssessmentTitle:', error)
    throw new Error('Failed to delete assessment title')
  }
}

/**
 * Create or update assessment title override (upsert based on uniqueness)
 */
export async function upsertAssessmentTitle(
  assessmentCode: string,
  displayTitle: string,
  classId?: string,
  grade?: number,
  track?: 'local' | 'international',
  userId?: string
): Promise<AssessmentTitle> {
  const supabase = createClient()

  try {
    // Check if override already exists
    let existingQuery = supabase
      .from('assessment_titles')
      .select('*')
      .eq('assessment_code', assessmentCode)

    if (classId) {
      existingQuery = existingQuery.eq('class_id', classId)
    } else {
      existingQuery = existingQuery.is('class_id', null)
    }

    if (grade) {
      existingQuery = existingQuery.eq('grade', grade)
    } else {
      existingQuery = existingQuery.is('grade', null)
    }

    if (track) {
      existingQuery = existingQuery.eq('track', track)
    } else {
      existingQuery = existingQuery.is('track', null)
    }

    const { data: existing, error: fetchError } = await existingQuery.single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows
      throw fetchError
    }

    if (existing) {
      // Update existing
      return await updateAssessmentTitle(existing.id, { display_name: displayTitle })
    } else {
      // Determine context based on parameters
      let context: 'class' | 'grade_track' | 'default'
      if (classId) {
        context = 'class'
      } else if (grade && track) {
        context = 'grade_track'
      } else {
        context = 'default'
      }

      // Create new
      return await createAssessmentTitle({
        assessment_code: assessmentCode as any,
        display_name: displayTitle,
        context,
        class_id: classId || null,
        grade: grade || null,
        track: track || null,
        created_by: userId || 'system' // Default to system user if not provided
      })
    }
  } catch (error) {
    console.error('Exception in upsertAssessmentTitle:', error)
    throw new Error('Failed to upsert assessment title')
  }
}

/**
 * Get available assessment codes for title management
 */
export async function getAvailableAssessmentCodes(): Promise<string[]> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('assessment_codes')
      .select('code')
      .eq('is_active', true)
      .order('code')

    if (error) {
      console.error('Error fetching assessment codes:', error)
      throw new Error(`Failed to fetch assessment codes: ${error.message}`)
    }

    return data.map(item => item.code)
  } catch (error) {
    console.error('Exception in getAvailableAssessmentCodes:', error)
    throw new Error('Failed to fetch assessment codes')
  }
}