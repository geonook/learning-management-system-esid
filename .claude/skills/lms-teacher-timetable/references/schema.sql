-- KCIS Teacher Timetable Schema Reference

-- Period definitions (seeded with 8 periods)
CREATE TABLE timetable_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_number INTEGER NOT NULL UNIQUE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Teacher schedule entries
CREATE TABLE timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Teacher reference
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  teacher_name TEXT NOT NULL,

  -- Time slot
  day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  period INTEGER NOT NULL CHECK (period BETWEEN 1 AND 8),

  -- Class info
  class_name TEXT NOT NULL,
  course_type TEXT NOT NULL CHECK (course_type IN ('english', 'homeroom', 'ev')),
  course_name TEXT,
  classroom TEXT,

  -- LMS course link
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,

  -- Academic year
  academic_year TEXT NOT NULL DEFAULT '2024-2025',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(teacher_name, day, period, academic_year)
);

-- Indexes
CREATE INDEX idx_timetable_teacher_id ON timetable_entries(teacher_id);
CREATE INDEX idx_timetable_teacher_name ON timetable_entries(teacher_name);
CREATE INDEX idx_timetable_day_period ON timetable_entries(day, period);

-- User extension for timetable join
ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_name TEXT;
CREATE INDEX idx_users_teacher_name ON users(teacher_name);
