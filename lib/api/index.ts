// Re-export all API functions for easy importing

export * from './classes'
export * from './students' 
export * from './users'
export * from './scores'

// Export types for convenience
export type {
  Class,
  ClassInsert,
  ClassUpdate,
  ClassWithTeacher,
} from './classes'

export type {
  Student,
  StudentInsert,
  StudentUpdate,
  StudentWithClass,
} from './students'

export type {
  User,
  UserInsert,
  UserUpdate,
  UserRole,
  TeacherType,
  TrackType,
} from './users'

export type {
  Score,
  ScoreInsert,
  ScoreUpdate,
  ScoreWithDetails,
  Exam,
  ExamInsert,
  ExamUpdate,
  ExamWithClass,
} from './scores'