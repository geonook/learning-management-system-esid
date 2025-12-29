/**
 * Browse Gradebook API
 *
 * Fetches class-based gradebook progress data.
 * Shows LT/IT/KCFS progress per class.
 *
 * Progress calculation:
 * - LT/IT: Per Grade × Level expectations from gradebook_expectations table
 * - KCFS: Grade-specific category counts (G1-2: 4, G3-4: 5, G5-6: 6)
 * - Falls back to default 13 for LT/IT if no expectation is set
 *
 * Permission Model (2025-12-29):
 * - Admin: Full access to all classes
 * - Office Member: Read-only access to all classes
 * - Head: Read classes in their grade band only
 * - Teacher: No access (use class-specific APIs)
 */

import { supabase } from '@/lib/supabase/client';
import {
  requireRole,
  gradeInBand,
  type CurrentUser
} from './permissions';
import type {
  ClassProgress,
  BrowseGradebookStats,
  BrowseGradebookFilters,
  ProgressStatus,
} from '@/types/browse-gradebook';
import { extractLevel, DEFAULT_EXPECTATION, type CourseType, type Level } from '@/types/gradebook-expectations';
import { getKCFSExpectedCount } from '@/lib/grade/kcfs-calculations';

const DEFAULT_ASSESSMENT_ITEMS = DEFAULT_EXPECTATION.expected_total; // 13

/**
 * Calculate progress percentage with dynamic expected items
 */
function calculateProgress(scoresEntered: number, studentCount: number, expectedItems: number): number {
  const totalExpected = studentCount * expectedItems;
  if (totalExpected === 0) return 0;
  return Math.min(100, Math.round((scoresEntered / totalExpected) * 100));
}

/**
 * Expectation lookup key generator
 */
function getExpectationKey(
  academicYear: string,
  term: number,
  courseType: CourseType,
  grade: number | null,
  level: Level | null
): string {
  if (courseType === 'KCFS') {
    return `${academicYear}:${term}:KCFS:null:null`;
  }
  return `${academicYear}:${term}:${courseType}:${grade}:${level}`;
}

/**
 * Determine overall status based on course progress
 */
function determineStatus(ltProgress: number, itProgress: number, kcfsProgress: number): ProgressStatus {
  // All courses at 80%+ = on track
  if (ltProgress >= 80 && itProgress >= 80 && kcfsProgress >= 80) {
    return 'on_track';
  }
  // At least one course has started = behind
  if (ltProgress > 0 || itProgress > 0 || kcfsProgress > 0) {
    return 'behind';
  }
  // No progress = not started
  return 'not_started';
}

/**
 * Fetch all class progress data
 *
 * Permission: Admin/Office/Head only
 * - Head: Only sees classes in their grade band
 */
export async function getClassesProgress(
  filters?: BrowseGradebookFilters
): Promise<{ data: ClassProgress[]; stats: BrowseGradebookStats }> {
  // Require admin, office_member, or head role
  const user = await requireRole(['admin', 'office_member', 'head'])

  // 1. Fetch all classes with level info
  let classesQuery = supabase
    .from('classes')
    .select('id, name, grade, level, academic_year')
    .order('grade', { ascending: true })
    .order('name');

  if (filters?.grade) {
    classesQuery = classesQuery.eq('grade', filters.grade);
  }

  if (filters?.search) {
    classesQuery = classesQuery.ilike('name', `%${filters.search}%`);
  }

  // Filter by academic year
  if (filters?.academic_year) {
    classesQuery = classesQuery.eq('academic_year', filters.academic_year);
  }

  const { data: classes, error: classesError } = await classesQuery;

  if (classesError) {
    console.error('Error fetching classes:', classesError);
    throw new Error(`Failed to fetch classes: ${classesError.message}`);
  }

  if (!classes || classes.length === 0) {
    return {
      data: [],
      stats: { total_classes: 0, on_track: 0, behind: 0, not_started: 0 },
    };
  }

  const classIds = classes.map(c => c.id);

  // 2. Fetch courses with teachers for these classes
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select(`
      id,
      class_id,
      course_type,
      teacher_id,
      users:teacher_id (full_name)
    `)
    .in('class_id', classIds);

  if (coursesError) {
    console.error('Error fetching courses:', coursesError);
    throw new Error(`Failed to fetch courses: ${coursesError.message}`);
  }

  // 3. Fetch student counts per class
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, class_id')
    .in('class_id', classIds);

  if (studentsError) {
    console.error('Error fetching students:', studentsError);
    throw new Error(`Failed to fetch students: ${studentsError.message}`);
  }

  // Count students per class
  const studentCountMap = new Map<string, number>();
  students?.forEach(s => {
    const count = studentCountMap.get(s.class_id) || 0;
    studentCountMap.set(s.class_id, count + 1);
  });

  // 4. Fetch score counts per course
  // IMPORTANT: Always use exam → course relationship to get correct course_id
  // Do NOT use scores.course_id directly as it may be NULL or incorrect
  const courseIds = courses?.map(c => c.id) || [];

  let scoreCounts: { course_id: string }[] = [];
  if (courseIds.length > 0) {
    // Always use exam → course join to get accurate course_id
    // This matches the pattern in lib/actions/gradebook.ts
    type ExamData = { course_id: string; term: number };

    let scoresQuery = supabase
      .from('scores')
      .select('exam:exams!inner(course_id, term)')
      .not('score', 'is', null);

    // Apply term filter if provided
    if (filters?.term) {
      scoresQuery = scoresQuery.eq('exam.term', filters.term);
    }

    const { data: scoresWithExams, error: scoresError } = await scoresQuery;

    if (scoresError) {
      console.error('Error fetching scores:', scoresError);
      // Don't throw, just use empty scores
    } else {
      // DEBUG: Log the first few items to verify structure
      console.log('[Browse Gradebook] Total scores fetched:', scoresWithExams?.length);
      if (scoresWithExams && scoresWithExams.length > 0) {
        console.log('[Browse Gradebook] First score structure:', JSON.stringify(scoresWithExams[0]));
      }

      // Extract course_id from nested exam object and filter by courseIds
      scoreCounts = (scoresWithExams || [])
        .filter(s => {
          const examData = s.exam as unknown as ExamData | null;
          return examData && courseIds.includes(examData.course_id);
        })
        .map(s => {
          const examData = s.exam as unknown as ExamData;
          return { course_id: examData.course_id };
        });

      console.log('[Browse Gradebook] Filtered scores count:', scoreCounts.length);
    }
  }

  // Count scores per course
  const scoreCountMap = new Map<string, number>();
  scoreCounts.forEach(s => {
    const count = scoreCountMap.get(s.course_id) || 0;
    scoreCountMap.set(s.course_id, count + 1);
  });

  // 5. Build course lookup map
  const courseLookup = new Map<string, {
    lt?: { id: string; teacher_id: string | null; teacher_name: string | null };
    it?: { id: string; teacher_id: string | null; teacher_name: string | null };
    kcfs?: { id: string; teacher_id: string | null; teacher_name: string | null };
  }>();

  courses?.forEach(course => {
    const classData = courseLookup.get(course.class_id) || {};

    // Handle the users relation
    const usersData = course.users as { full_name: string } | { full_name: string }[] | null;
    let teacherName: string | null = null;
    if (usersData) {
      if (Array.isArray(usersData)) {
        teacherName = usersData[0]?.full_name || null;
      } else {
        teacherName = usersData.full_name || null;
      }
    }

    const courseInfo = {
      id: course.id,
      teacher_id: course.teacher_id,
      teacher_name: teacherName,
    };

    if (course.course_type === 'LT') {
      classData.lt = courseInfo;
    } else if (course.course_type === 'IT') {
      classData.it = courseInfo;
    } else if (course.course_type === 'KCFS') {
      classData.kcfs = courseInfo;
    }

    courseLookup.set(course.class_id, classData);
  });

  // 6. Fetch expectations for progress calculation
  const academicYear = filters?.academic_year || classes[0]?.academic_year || '2025-2026';
  const term = filters?.term || 1;

  const { data: expectations, error: expectationsError } = await supabase
    .from('gradebook_expectations')
    .select('course_type, grade, level, expected_total')
    .eq('academic_year', academicYear)
    .eq('term', term);

  if (expectationsError) {
    console.error('[Browse Gradebook] Error fetching expectations:', expectationsError);
    // Continue with defaults if expectations fail to load
  }

  // Build expectations lookup map
  const expectationsMap = new Map<string, number>();
  expectations?.forEach(exp => {
    const key = getExpectationKey(
      academicYear,
      term,
      exp.course_type as CourseType,
      exp.grade,
      exp.level as Level | null
    );
    expectationsMap.set(key, exp.expected_total);
  });

  // Helper to get expected items for a specific class/course combination
  const getExpectedItems = (
    classGrade: number,
    classLevel: string | null,
    courseType: CourseType
  ): number => {
    // KCFS uses grade-specific category counts (not from expectations table)
    if (courseType === 'KCFS') {
      return getKCFSExpectedCount(classGrade); // 4, 5, or 6 based on grade
    }

    // LT/IT use expectations table
    const level = extractLevel(classLevel);
    const key = getExpectationKey(academicYear, term, courseType, classGrade, level);
    return expectationsMap.get(key) ?? DEFAULT_ASSESSMENT_ITEMS;
  };

  // 7. Build class progress data
  const classProgressList: ClassProgress[] = classes.map(cls => {
    const studentCount = studentCountMap.get(cls.id) || 0;
    const courseData = courseLookup.get(cls.id) || {};
    const classLevel = (cls as { level?: string | null }).level ?? null;

    const ltScores = courseData.lt ? (scoreCountMap.get(courseData.lt.id) || 0) : 0;
    const itScores = courseData.it ? (scoreCountMap.get(courseData.it.id) || 0) : 0;
    const kcfsScores = courseData.kcfs ? (scoreCountMap.get(courseData.kcfs.id) || 0) : 0;

    // Get expected items from expectations table (or default)
    const ltExpected = getExpectedItems(cls.grade, classLevel, 'LT');
    const itExpected = getExpectedItems(cls.grade, classLevel, 'IT');
    const kcfsExpected = getExpectedItems(cls.grade, classLevel, 'KCFS');

    const ltProgress = calculateProgress(ltScores, studentCount, ltExpected);
    const itProgress = calculateProgress(itScores, studentCount, itExpected);
    const kcfsProgress = calculateProgress(kcfsScores, studentCount, kcfsExpected);

    return {
      class_id: cls.id,
      class_name: cls.name,
      grade: cls.grade,
      student_count: studentCount,
      lt_progress: ltProgress,
      it_progress: itProgress,
      kcfs_progress: kcfsProgress,
      lt_teacher: courseData.lt?.teacher_name || null,
      it_teacher: courseData.it?.teacher_name || null,
      kcfs_teacher: courseData.kcfs?.teacher_name || null,
      overall_status: determineStatus(ltProgress, itProgress, kcfsProgress),
      // Include expected items for transparency
      lt_expected: ltExpected,
      it_expected: itExpected,
      kcfs_expected: kcfsExpected,
    };
  });

  // 8. Apply role-based filtering for heads
  let roleFilteredData = classProgressList;
  if (user.role === 'head' && user.gradeBand) {
    roleFilteredData = classProgressList.filter(c => gradeInBand(c.grade, user.gradeBand!));
  }

  // 9. Apply status filter if provided
  let filteredData = roleFilteredData;
  if (filters?.status) {
    filteredData = roleFilteredData.filter(c => c.overall_status === filters.status);
  }

  // 10. Calculate stats (from role-filtered data, not status-filtered)
  const stats: BrowseGradebookStats = {
    total_classes: roleFilteredData.length,
    on_track: roleFilteredData.filter(c => c.overall_status === 'on_track').length,
    behind: roleFilteredData.filter(c => c.overall_status === 'behind').length,
    not_started: roleFilteredData.filter(c => c.overall_status === 'not_started').length,
  };

  return { data: filteredData, stats };
}
