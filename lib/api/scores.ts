import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { calculateGrades } from '@/lib/grade/calculations'

export type Score = Database['public']['Tables']['scores']['Row']
export type ScoreInsert = Database['public']['Tables']['scores']['Insert']
export type ScoreUpdate = Database['public']['Tables']['scores']['Update']

export type Exam = Database['public']['Tables']['exams']['Row']
export type ExamInsert = Database['public']['Tables']['exams']['Insert']
export type ExamUpdate = Database['public']['Tables']['exams']['Update']

// Extended types with relationships
export type ScoreWithDetails = Score & {
  student: {
    id: string
    student_id: string
    full_name: string
  }
  exam: {
    id: string
    name: string
    class_id: string
  }
  assessment_code_info: {
    code: string
    category: 'formative' | 'summative' | 'final'
    sequence_order: number
  }
}

export type ExamWithClass = Exam & {
  class: {
    id: string
    name: string
    grade: number
    track: 'local' | 'international'
  }
}

// Score-related functions

// Get scores for a specific exam (simplified)
export async function getScoresByExam(examId: string) {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('exam_id', examId)
    .order('assessment_code')

  if (error) {
    console.error('Error fetching scores by exam:', error)
    throw new Error(`Failed to fetch scores: ${error.message}`)
  }

  return data as Score[]
}

// Get scores for a specific student (simplified)
export async function getScoresByStudent(studentId: string) {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('student_id', studentId)
    .order('entered_at', { ascending: false })

  if (error) {
    console.error('Error fetching scores by student:', error)
    throw new Error(`Failed to fetch scores: ${error.message}`)
  }

  return data as Score[]
}

// Get all scores for a class (simplified - via exam_id lookup needed)
export async function getScoresByClass(classId: string) {
  // First get exam IDs for this class
  const { data: exams } = await supabase
    .from('exams')
    .select('id')
    .eq('class_id', classId)
  
  if (!exams || exams.length === 0) {
    return []
  }

  const examIds = exams.map(exam => exam.id)
  
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .in('exam_id', examIds)
    .order('entered_at', { ascending: false })

  if (error) {
    console.error('Error fetching scores by class:', error)
    throw new Error(`Failed to fetch scores: ${error.message}`)
  }

  return data as Score[]
}

// Create or update a single score (simplified)
export async function upsertScore(scoreData: ScoreInsert) {
  const { data, error } = await supabase
    .from('scores')
    .upsert(
      {
        ...scoreData,
        updated_at: new Date().toISOString(),
        updated_by: scoreData.entered_by // Use entered_by as updated_by for upserts
      },
      {
        onConflict: 'student_id,exam_id,assessment_code'
      }
    )
    .select('*')
    .single()

  if (error) {
    console.error('Error upserting score:', error)
    throw new Error(`Failed to save score: ${error.message}`)
  }

  return data as Score
}

// Bulk upsert scores (simplified)
export async function upsertScoresBulk(scoresData: ScoreInsert[]) {
  const scoresWithTimestamp = scoresData.map(score => ({
    ...score,
    updated_at: new Date().toISOString(),
    updated_by: score.entered_by
  }))

  const { data, error } = await supabase
    .from('scores')
    .upsert(
      scoresWithTimestamp,
      {
        onConflict: 'student_id,exam_id,assessment_code'
      }
    )
    .select('*')

  if (error) {
    console.error('Error bulk upserting scores:', error)
    throw new Error(`Failed to save scores: ${error.message}`)
  }

  return data as Score[]
}

// Delete a score
export async function deleteScore(id: string) {
  const { error } = await supabase
    .from('scores')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting score:', error)
    throw new Error(`Failed to delete score: ${error.message}`)
  }

  return true
}

// Get calculated grades for a student
export async function getStudentGrades(studentId: string, examId?: string) {
  let query = supabase
    .from('scores')
    .select('assessment_code, score')
    .eq('student_id', studentId)
    .not('score', 'is', null)

  if (examId) {
    query = query.eq('exam_id', examId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching student grades:', error)
    throw new Error(`Failed to fetch student grades: ${error.message}`)
  }

  // Convert to grade calculation format
  const gradeData: Record<string, number> = {}
  data.forEach(score => {
    gradeData[score.assessment_code] = score.score!
  })

  return calculateGrades(gradeData)
}

// Exam-related functions

// Get all exams (simplified version)
export async function getExams() {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .order('exam_date', { ascending: false })

  if (error) {
    console.error('Error fetching exams:', error)
    throw new Error(`Failed to fetch exams: ${error.message}`)
  }

  return data as Exam[]
}

// Get exams by class (simplified)
export async function getExamsByClass(classId: string) {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('class_id', classId)
    .order('exam_date', { ascending: false })

  if (error) {
    console.error('Error fetching exams by class:', error)
    throw new Error(`Failed to fetch exams: ${error.message}`)
  }

  return data as Exam[]
}

// Get single exam (simplified)
export async function getExam(id: string) {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching exam:', error)
    throw new Error(`Failed to fetch exam: ${error.message}`)
  }

  return data as Exam
}

// Create exam (simplified)
export async function createExam(examData: ExamInsert) {
  const { data, error } = await supabase
    .from('exams')
    .insert(examData)
    .select('*')
    .single()

  if (error) {
    console.error('Error creating exam:', error)
    throw new Error(`Failed to create exam: ${error.message}`)
  }

  return data as Exam
}

// Update exam (simplified)
export async function updateExam(id: string, updates: ExamUpdate) {
  const { data, error } = await supabase
    .from('exams')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('Error updating exam:', error)
    throw new Error(`Failed to update exam: ${error.message}`)
  }

  return data as Exam
}

// Delete exam (and all associated scores)
export async function deleteExam(id: string) {
  const { error } = await supabase
    .from('exams')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting exam:', error)
    throw new Error(`Failed to delete exam: ${error.message}`)
  }

  return true
}

// Publish/unpublish exam
export async function toggleExamPublished(id: string, isPublished: boolean) {
  return updateExam(id, { is_published: isPublished })
}

// Get assessment codes
export async function getAssessmentCodes() {
  const { data, error } = await supabase
    .from('assessment_codes')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('sequence_order')

  if (error) {
    console.error('Error fetching assessment codes:', error)
    throw new Error(`Failed to fetch assessment codes: ${error.message}`)
  }

  return data
}