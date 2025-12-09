/**
 * Browse Gradebook API
 *
 * Fetches class-based gradebook progress data.
 * Shows LT/IT/KCFS progress per class.
 */

import { supabase } from '@/lib/supabase/client';
import type {
  ClassProgress,
  BrowseGradebookStats,
  BrowseGradebookFilters,
  ProgressStatus,
} from '@/types/browse-gradebook';

const ASSESSMENT_ITEMS = 13; // FA1-FA8 (8) + SA1-SA4 (4) + MID (1)

/**
 * Calculate progress percentage
 */
function calculateProgress(scoresEntered: number, studentCount: number): number {
  const expected = studentCount * ASSESSMENT_ITEMS;
  if (expected === 0) return 0;
  return Math.min(100, Math.round((scoresEntered / expected) * 100));
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
 */
export async function getClassesProgress(
  filters?: BrowseGradebookFilters
): Promise<{ data: ClassProgress[]; stats: BrowseGradebookStats }> {
  // 1. Fetch all classes
  let classesQuery = supabase
    .from('classes')
    .select('id, name, grade')
    .order('grade', { ascending: true })
    .order('name');

  if (filters?.grade) {
    classesQuery = classesQuery.eq('grade', filters.grade);
  }

  if (filters?.search) {
    classesQuery = classesQuery.ilike('name', `%${filters.search}%`);
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
  const courseIds = courses?.map(c => c.id) || [];

  let scoreCounts: { course_id: string }[] = [];
  if (courseIds.length > 0) {
    const { data: scores, error: scoresError } = await supabase
      .from('scores')
      .select('course_id')
      .in('course_id', courseIds)
      .not('score', 'is', null);

    if (scoresError) {
      console.error('Error fetching scores:', scoresError);
      // Don't throw, just use empty scores
    } else {
      scoreCounts = scores || [];
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

  // 6. Build class progress data
  const classProgressList: ClassProgress[] = classes.map(cls => {
    const studentCount = studentCountMap.get(cls.id) || 0;
    const courseData = courseLookup.get(cls.id) || {};

    const ltScores = courseData.lt ? (scoreCountMap.get(courseData.lt.id) || 0) : 0;
    const itScores = courseData.it ? (scoreCountMap.get(courseData.it.id) || 0) : 0;
    const kcfsScores = courseData.kcfs ? (scoreCountMap.get(courseData.kcfs.id) || 0) : 0;

    const ltProgress = calculateProgress(ltScores, studentCount);
    const itProgress = calculateProgress(itScores, studentCount);
    const kcfsProgress = calculateProgress(kcfsScores, studentCount);

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
    };
  });

  // 7. Apply status filter if provided
  let filteredData = classProgressList;
  if (filters?.status) {
    filteredData = classProgressList.filter(c => c.overall_status === filters.status);
  }

  // 8. Calculate stats (from unfiltered data)
  const stats: BrowseGradebookStats = {
    total_classes: classProgressList.length,
    on_track: classProgressList.filter(c => c.overall_status === 'on_track').length,
    behind: classProgressList.filter(c => c.overall_status === 'behind').length,
    not_started: classProgressList.filter(c => c.overall_status === 'not_started').length,
  };

  return { data: filteredData, stats };
}
