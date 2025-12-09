/**
 * Communications Types
 * For parent communication tracking (LT phone calls & IT/KCFS memos)
 */

// Communication types
export type CommunicationType = 'phone_call' | 'email' | 'in_person' | 'message' | 'other';

// Contact periods for LT required phone calls
export type ContactPeriod = 'semester_start' | 'midterm' | 'final' | 'ad_hoc';

// Semester type
export type Semester = 'fall' | 'spring';

// Base communication record
export interface Communication {
  id: string;
  student_id: string;
  course_id: string;
  teacher_id: string;
  academic_year: string;      // e.g., '2025-2026'
  semester: Semester;
  communication_type: CommunicationType;
  contact_period: ContactPeriod | null;
  subject: string | null;
  content: string;
  communication_date: string;
  is_lt_required: boolean;
  created_at: string;
  updated_at: string;
}

// Communication with related data (for display)
export interface CommunicationWithDetails extends Communication {
  student: {
    id: string;
    full_name: string;
    student_id: string;
  };
  teacher: {
    id: string;
    full_name: string;
  };
  course: {
    id: string;
    course_type: 'LT' | 'IT' | 'KCFS';
    class_id: string;
    class_name: string;
  };
}

// LT Contact Status tracking (per student per semester)
export interface LTContactStatus {
  student_id: string;
  student_name: string;
  student_number: string;
  class_name: string;
  academic_year: string;
  semester: Semester;
  semester_start: boolean;    // Has completed semester start call
  midterm: boolean;           // Has completed midterm call
  final: boolean;             // Has completed final call
  completed_count: number;    // 0-3
  latest_contact_date: string | null;
}

// Semester option for selectors
export interface SemesterOption {
  academic_year: string;
  semester: Semester;
  label: string;              // e.g., "2025 Fall Semester"
  value: string;              // e.g., "2025-2026_fall"
}

// Create/Update communication input
export interface CreateCommunicationInput {
  student_id: string;
  course_id: string;
  academic_year: string;
  semester: Semester;
  communication_type: CommunicationType;
  contact_period?: ContactPeriod | null;
  subject?: string | null;
  content: string;
  communication_date?: string;
  is_lt_required?: boolean;
}

export interface UpdateCommunicationInput {
  communication_type?: CommunicationType;
  contact_period?: ContactPeriod | null;
  subject?: string | null;
  content?: string;
  communication_date?: string;
}

// Filter options for fetching communications
export interface CommunicationFilters {
  academic_year?: string;
  semester?: Semester;
  grade?: number;
  course_type?: 'LT' | 'IT' | 'KCFS';
  teacher_id?: string;
  student_id?: string;
  course_id?: string;
  contact_period?: ContactPeriod;
  start_date?: string;
  end_date?: string;
  page?: number;
  pageSize?: number;
}

// Paginated result
export interface PaginatedCommunications {
  communications: CommunicationWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Summary stats for communications
export interface CommunicationStats {
  total: number;
  this_week: number;
  by_type: Record<CommunicationType, number>;
  lt_completion_rate: number | null;  // Percentage of LT calls completed
  pending_lt_calls: number;
}

// Helper function to get current academic year
export function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 0-indexed

  // If we're in fall semester (Aug-Jan), academic year starts with current year
  // If we're in spring semester (Feb-Jul), academic year started last year
  if (month >= 8 || month === 1) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

// Helper function to get current semester
export function getCurrentSemester(): Semester {
  const now = new Date();
  const month = now.getMonth() + 1; // 0-indexed

  // Fall: August to January
  // Spring: February to July
  if (month >= 8 || month === 1) {
    return 'fall';
  } else {
    return 'spring';
  }
}

// Helper to generate semester options
export function getSemesterOptions(startYear: number = 2025, endYear: number = 2027): SemesterOption[] {
  const options: SemesterOption[] = [];

  for (let year = startYear; year < endYear; year++) {
    const academicYear = `${year}-${year + 1}`;

    options.push({
      academic_year: academicYear,
      semester: 'fall',
      label: `${year} Fall Semester`,
      value: `${academicYear}_fall`,
    });

    options.push({
      academic_year: academicYear,
      semester: 'spring',
      label: `${year + 1} Spring Semester`,
      value: `${academicYear}_spring`,
    });
  }

  return options;
}

// Helper to format contact period for display
export function formatContactPeriod(period: ContactPeriod | null): string {
  switch (period) {
    case 'semester_start':
      return 'Semester Start';
    case 'midterm':
      return 'Midterm';
    case 'final':
      return 'Final';
    case 'ad_hoc':
      return 'Ad-hoc';
    default:
      return 'Other';
  }
}

// Helper to format communication type for display
export function formatCommunicationType(type: CommunicationType): string {
  switch (type) {
    case 'phone_call':
      return 'Phone Call';
    case 'email':
      return 'Email';
    case 'in_person':
      return 'In Person';
    case 'message':
      return 'Message';
    case 'other':
      return 'Other';
  }
}

// Helper to get icon name for communication type
export function getCommunicationTypeIcon(type: CommunicationType): string {
  switch (type) {
    case 'phone_call':
      return 'Phone';
    case 'email':
      return 'Mail';
    case 'in_person':
      return 'Users';
    case 'message':
      return 'MessageSquare';
    case 'other':
      return 'FileText';
  }
}
