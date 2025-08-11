export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'head' | 'teacher' | 'student'
          teacher_type: 'LT' | 'IT' | 'KCFS' | null
          grade: number | null
          track: 'local' | 'international' | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'admin' | 'head' | 'teacher' | 'student'
          teacher_type?: 'LT' | 'IT' | 'KCFS' | null
          grade?: number | null
          track?: 'local' | 'international' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'head' | 'teacher' | 'student'
          teacher_type?: 'LT' | 'IT' | 'KCFS' | null
          grade?: number | null
          track?: 'local' | 'international' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      classes: {
        Row: {
          id: string
          name: string
          grade: number
          track: 'local' | 'international'
          teacher_id: string | null
          academic_year: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          grade: number
          track: 'local' | 'international'
          teacher_id?: string | null
          academic_year?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          grade?: number
          track?: 'local' | 'international'
          teacher_id?: string | null
          academic_year?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      students: {
        Row: {
          id: string
          student_id: string
          full_name: string
          grade: number
          track: 'local' | 'international'
          class_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          full_name: string
          grade: number
          track: 'local' | 'international'
          class_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          full_name?: string
          grade?: number
          track?: 'local' | 'international'
          class_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          }
        ]
      }
      exams: {
        Row: {
          id: string
          name: string
          description: string | null
          class_id: string
          exam_date: string
          is_published: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          class_id: string
          exam_date?: string
          is_published?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          class_id?: string
          exam_date?: string
          is_published?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      assessment_codes: {
        Row: {
          code: string
          category: 'formative' | 'summative' | 'final'
          sequence_order: number
          is_active: boolean
        }
        Insert: {
          code: string
          category: 'formative' | 'summative' | 'final'
          sequence_order: number
          is_active?: boolean
        }
        Update: {
          code?: string
          category?: 'formative' | 'summative' | 'final'
          sequence_order?: number
          is_active?: boolean
        }
        Relationships: []
      }
      scores: {
        Row: {
          id: string
          student_id: string
          exam_id: string
          assessment_code: string
          score: number | null
          entered_by: string
          entered_at: string
          updated_by: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          student_id: string
          exam_id: string
          assessment_code: string
          score?: number | null
          entered_by: string
          entered_at?: string
          updated_by?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          exam_id?: string
          assessment_code?: string
          score?: number | null
          entered_by?: string
          entered_at?: string
          updated_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_assessment_code_fkey"
            columns: ["assessment_code"]
            isOneToOne: false
            referencedRelation: "assessment_codes"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "scores_entered_by_fkey"
            columns: ["entered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      assessment_titles: {
        Row: {
          id: string
          assessment_code: string
          display_name: string
          context: 'class' | 'grade_track' | 'default'
          class_id: string | null
          grade: number | null
          track: 'local' | 'international' | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assessment_code: string
          display_name: string
          context: 'class' | 'grade_track' | 'default'
          class_id?: string | null
          grade?: number | null
          track?: 'local' | 'international' | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assessment_code?: string
          display_name?: string
          context?: 'class' | 'grade_track' | 'default'
          class_id?: string | null
          grade?: number | null
          track?: 'local' | 'international' | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_titles_assessment_code_fkey"
            columns: ["assessment_code"]
            isOneToOne: false
            referencedRelation: "assessment_codes"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "assessment_titles_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_titles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'head' | 'teacher' | 'student'
      teacher_type: 'LT' | 'IT' | 'KCFS'
      track_type: 'local' | 'international'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}