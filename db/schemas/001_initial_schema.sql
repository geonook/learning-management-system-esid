-- LMS-ESID Initial Database Schema
-- Multi-role support: admin, head (grade+track), teacher (LT/IT/KCFS)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'head', 'teacher');
CREATE TYPE teacher_type AS ENUM ('LT', 'IT', 'KCFS');
CREATE TYPE track_type AS ENUM ('local', 'international');

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'teacher',
  teacher_type teacher_type,
  grade INTEGER CHECK (grade BETWEEN 7 AND 12),
  track track_type,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classes table
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 7 AND 12),
  track track_type NOT NULL,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  academic_year TEXT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, academic_year)
);

-- Students table
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT UNIQUE NOT NULL, -- External student ID
  full_name TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 7 AND 12),
  track track_type NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exams table
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_published BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assessment codes mapping (FA1-FA8, SA1-SA4, FINAL)
CREATE TABLE assessment_codes (
  code TEXT PRIMARY KEY CHECK (code IN (
    'FA1', 'FA2', 'FA3', 'FA4', 'FA5', 'FA6', 'FA7', 'FA8',
    'SA1', 'SA2', 'SA3', 'SA4', 'FINAL'
  )),
  category TEXT NOT NULL CHECK (category IN ('formative', 'summative', 'final')),
  sequence_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- Scores table (stores individual assessment scores)
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  assessment_code TEXT NOT NULL REFERENCES assessment_codes(code),
  score DECIMAL(5,2) CHECK (score >= 0 AND score <= 100),
  entered_by UUID NOT NULL REFERENCES users(id),
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  UNIQUE(student_id, exam_id, assessment_code)
);

-- Assessment display name overrides (HT feature)
CREATE TABLE assessment_titles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_code TEXT NOT NULL REFERENCES assessment_codes(code),
  display_name TEXT NOT NULL,
  context TEXT NOT NULL CHECK (context IN ('class', 'grade_track', 'default')),
  class_id UUID REFERENCES classes(id),
  grade INTEGER CHECK (grade BETWEEN 7 AND 12),
  track track_type,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure proper context constraints
  CHECK (
    (context = 'class' AND class_id IS NOT NULL AND grade IS NULL AND track IS NULL) OR
    (context = 'grade_track' AND class_id IS NULL AND grade IS NOT NULL AND track IS NOT NULL) OR
    (context = 'default' AND class_id IS NULL AND grade IS NULL AND track IS NULL)
  ),
  
  -- Prevent duplicate overrides for same context
  UNIQUE(assessment_code, context, class_id, grade, track)
);

-- Insert default assessment codes
INSERT INTO assessment_codes (code, category, sequence_order) VALUES
  ('FA1', 'formative', 1), ('FA2', 'formative', 2), ('FA3', 'formative', 3), ('FA4', 'formative', 4),
  ('FA5', 'formative', 5), ('FA6', 'formative', 6), ('FA7', 'formative', 7), ('FA8', 'formative', 8),
  ('SA1', 'summative', 1), ('SA2', 'summative', 2), ('SA3', 'summative', 3), ('SA4', 'summative', 4),
  ('FINAL', 'final', 1);

-- Create indexes for performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_grade_track ON users(grade, track);
CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_classes_grade_track ON classes(grade, track);
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_students_grade_track ON students(grade, track);
CREATE INDEX idx_exams_class ON exams(class_id);
CREATE INDEX idx_scores_student_exam ON scores(student_id, exam_id);
CREATE INDEX idx_scores_assessment ON scores(assessment_code);
CREATE INDEX idx_assessment_titles_context ON assessment_titles(assessment_code, context);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assessment_titles_updated_at BEFORE UPDATE ON assessment_titles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();