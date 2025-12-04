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
          role: 'admin' | 'head' | 'teacher' | 'student' | 'office_member'
          teacher_type: 'LT' | 'IT' | 'KCFS' | null
          grade: number | null
          grade_band: string | null // For head teachers: "1", "2", "3-4", "5-6", "1-2", "1-6"
          track: 'LT' | 'IT' | 'KCFS' | null // Course type for head teachers
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'admin' | 'head' | 'teacher' | 'student' | 'office_member'
          teacher_type?: 'LT' | 'IT' | 'KCFS' | null
          grade?: number | null
          grade_band?: string | null
          track?: 'LT' | 'IT' | 'KCFS' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'head' | 'teacher' | 'student' | 'office_member'
          teacher_type?: 'LT' | 'IT' | 'KCFS' | null
          grade?: number | null
          grade_band?: string | null
          track?: 'LT' | 'IT' | 'KCFS' | null
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
      courses: {
        Row: {
          id: string
          class_id: string
          course_type: 'LT' | 'IT' | 'KCFS'
          teacher_id: string | null
          academic_year: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          class_id: string
          course_type: 'LT' | 'IT' | 'KCFS'
          teacher_id?: string | null
          academic_year: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          course_type?: 'LT' | 'IT' | 'KCFS'
          teacher_id?: string | null
          academic_year?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      student_courses: {
        Row: {
          id: string
          student_id: string
          course_id: string
          enrolled_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          student_id: string
          course_id: string
          enrolled_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          student_id?: string
          course_id?: string
          enrolled_at?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "student_courses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      student_grade_aggregates: {
        Row: {
          student_id: string
          student_number: string
          student_name: string
          grade: number
          track: 'local' | 'international' | null
          level: string | null
          class_id: string | null
          class_name: string | null
          course_id: string | null
          course_type: 'LT' | 'IT' | 'KCFS' | null
          course_name: string | null
          teacher_id: string | null
          teacher_name: string | null
          academic_year: string | null
          fa_count: number | null
          sa_count: number | null
          final_count: number | null
          fa1_score: number | null
          fa2_score: number | null
          fa3_score: number | null
          fa4_score: number | null
          fa5_score: number | null
          fa6_score: number | null
          fa7_score: number | null
          fa8_score: number | null
          sa1_score: number | null
          sa2_score: number | null
          sa3_score: number | null
          sa4_score: number | null
          final_score: number | null
          formative_average: number | null
          summative_average: number | null
          semester_grade: number | null
          min_score: number | null
          max_score: number | null
          at_risk: boolean | null
          last_assessment_date: string | null
          total_assessments_completed: number | null
        }
      }
      class_statistics: {
        Row: {
          class_id: string
          class_name: string
          grade: number
          track: 'local' | 'international' | null
          class_level: string | null
          academic_year: string
          course_id: string | null
          course_type: 'LT' | 'IT' | 'KCFS' | null
          course_name: string | null
          teacher_id: string | null
          teacher_name: string | null
          teacher_type: 'LT' | 'IT' | 'KCFS' | null
          total_students: number | null
          active_students: number | null
          students_with_scores: number | null
          completion_rate_percent: number | null
          class_average: number | null
          class_median: number | null
          class_min: number | null
          class_max: number | null
          class_stddev: number | null
          grades_90_plus: number | null
          grades_80_89: number | null
          grades_70_79: number | null
          grades_60_69: number | null
          grades_below_60: number | null
          formative_class_avg: number | null
          summative_class_avg: number | null
          final_class_avg: number | null
          failing_assessments: number | null
          last_update: string | null
          total_exams: number | null
        }
      }
      teacher_performance: {
        Row: {
          teacher_id: string
          teacher_name: string
          teacher_email: string
          teacher_type: 'LT' | 'IT' | 'KCFS' | null
          assigned_grade: number | null
          assigned_track: 'local' | 'international' | null
          courses_taught: number | null
          classes_taught: number | null
          total_students_taught: number | null
          overall_class_average: number | null
          overall_median: number | null
          exams_conducted: number | null
          assessments_completed: number | null
          students_above_80_percent: number | null
          students_below_60_percent: number | null
          class_consistency: number | null
          assessments_per_student: number | null
          last_grade_entry: string | null
          at_risk_students: number | null
          subject_specialization: string | null
        }
      }
    }
    Functions: {
      get_table_names: {
        Args: {}
        Returns: string[]
      }
      get_constraints_info: {
        Args: {}
        Returns: Record<string, any>[]
      }
      exec_sql: {
        Args: {
          sql_query: string
        }
        Returns: Record<string, any>[]
      }
    }
    Enums: {
      user_role: 'admin' | 'head' | 'teacher' | 'student' | 'office_member'
      teacher_type: 'LT' | 'IT' | 'KCFS'
      course_type: 'LT' | 'IT' | 'KCFS'
      track_type: 'local' | 'international'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}