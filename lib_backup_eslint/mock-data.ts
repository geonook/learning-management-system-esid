// Mock data for LMS UI components
// This will be replaced with real Supabase queries later

type Student = { 
  id: string
  name: string
  student_id: string
  grade: number
  class: string
  track: "local" | "international" 
}

// ScoreRow type moved to lib/table-hooks.ts as CourseScoreRow

const STUDENT_NAMES = [
  "Alice Chen", "Bob Li", "Carol Wang", "David Zhang", "Emma Johnson",
  "Frank Smith", "Grace Wilson", "Henry Davis", "Ivy Liu", "Jack Wu",
  "Kate Brown", "Liam Miller", "Maya Patel", "Noah Kim", "Olivia Taylor",
  "Paul Rodriguez", "Quinn Lee", "Rachel Green", "Sam Park", "Tina Chang",
  "Uma Singh", "Victor Chen", "Wendy Liu", "Xavier Wong", "Yuki Tanaka", "Zoe Adams"
]

let studentsCache: Student[] | null = null

function makeStudents(): Student[] {
  const students: Student[] = []
  for (let i = 0; i < 48; i++) {
    const name = STUDENT_NAMES[i % STUDENT_NAMES.length]
    const id = `STU-${(7001 + i).toString().padStart(4, '0')}`
    const grade = 7 + Math.floor(i / 8) // Grades 7-12
    const classLetter = ["A", "B", "C", "D"][i % 4] || "A"
    const track = i % 2 === 0 ? "local" : "international" as const
    
    students.push({
      id,
      name: `${name} ${String.fromCharCode(65 + (i % 6))}`,
      student_id: id,
      grade,
      class: classLetter,
      track
    })
  }
  return students
}

export function getStudentsFor(): Student[] {
  if (!studentsCache) studentsCache = makeStudents()
  return studentsCache
}

// Legacy score functions removed - now using course-based API from lib/api/scores.ts
// These functions are deprecated and should not be used for new features

// Teacher Dashboard KPIs
export function getKpisTeacher() {
  return {
    attendanceRate: 92,
    averageScore: 78.4,
    passRate: 81,
    activeAlerts: 5,
  }
}

// Admin Dashboard KPIs  
export function getAdminKpis() {
  return { 
    totalExams: 42, 
    notDue: 18, 
    overdue: 6, 
    coverage: 82, 
    onTime: 76 
  }
}

export function getClassDistribution() {
  const buckets = ["0-10", "10-20", "20-30", "30-40", "40-50", "50-60", "60-70", "70-80", "80-90", "90-100"]
  return buckets.map((bucket, i) => ({
    bucket,
    count: Math.round(2 + Math.max(0, i - 3) * 4 + Math.random() * 8)
  }))
}

export function getScatterData() {
  return Array.from({ length: 16 }).map(() => ({
    x: Math.round(60 + Math.random() * 35),
    y: Math.round(60 + Math.random() * 40),
    z: Math.round(10 + Math.random() * 30),
  }))
}

export function getUpcomingDeadlines() {
  return [
    { id: "E-1201", title: "FA5 Assessment Due", due_at: "Tomorrow 2PM" },
    { id: "E-1202", title: "SA2 Summative Due", due_at: "Friday 10AM" },
    { id: "E-1203", title: "Final Exam Preparation", due_at: "Next Monday" },
    { id: "E-1204", title: "Grade Entry Deadline", due_at: "Next Wednesday" },
  ]
}

export function getRecentAlerts() {
  return [
    { id: "A-1", message: "Low attendance in Grade 7-A (below 85%)", when: "2 hours ago" },
    { id: "A-2", message: "SA1 completion rate below 70% in Grade 8-B", when: "1 day ago" },
    { id: "A-3", message: "Missing FA6 scores for 12 students", when: "2 days ago" },
  ]
}

export function getOverdueTable() {
  return Array.from({ length: 8 }).map((_, i) => ({
    examId: `EX-${1200 + i}`,
    grade: `Grade ${7 + (i % 6)}`,
    class: ["A", "B", "C", "D"][i % 4],
    track: i % 2 === 0 ? "Local" : "International",
    coverage: `${60 + (i % 5) * 8}%`,
    missing: 3 + (i % 4),
    dueIn: `${-2 + (i % 5)} days`,
  }))
}

export function getTeacherHeatmap() {
  // 8 teachers x 12 exams grid
  return Array.from({ length: 8 }).map(() => 
    Array.from({ length: 12 }).map(() => 
      Math.round(40 + Math.random() * 60)
    )
  )
}

export function getClassPerformance() {
  return Array.from({ length: 12 }).map((_, i) => ({
    grade: `Grade ${7 + Math.floor(i / 2)}`,
    class: ["A", "B", "C", "D"][i % 4],
    track: i % 2 === 0 ? "Local" : "International",
    avg: Math.round(60 + Math.random() * 30),
    max: Math.round(80 + Math.random() * 20),
    min: Math.round(35 + Math.random() * 20),
    passRate: Math.round(60 + Math.random() * 35),
    n: 20 + (i % 8),
  }))
}

export function getActivityTrend() {
  return Array.from({ length: 14 }).map((_, i) => ({
    day: `Day ${i + 1}`,
    scores: Math.round(10 + Math.random() * 20),
    attendance: Math.round(15 + Math.random() * 25),
  }))
}