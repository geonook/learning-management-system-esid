/**
 * Statistics API
 *
 * Data fetching functions for the Statistics & Analytics module.
 * All queries respect RLS policies through the Supabase client.
 */

import { supabase } from '@/lib/supabase/client';
import {
  calculateAverage,
  calculateMax,
  calculateMin,
  calculateStdDev,
  calculatePassRate,
  calculateExcellentRate,
  calculateFormativeAverage,
  calculateSummativeAverage,
  calculateTermGrade,
  calculateVsAverage,
  getPerformanceLevel,
  rankByField,
  generateRankLabel,
  filterValidScores,
  groupBy,
} from '@/lib/statistics/calculations';
import type {
  ClassStatistics,
  GradeLevelStatistics,
  GradeLevelSummary,
  ClassRanking,
  GradeLevelAverage,
  StudentGradeRow,
  StatisticsFilters,
  RankingFilters,
  CourseType,
} from '@/types/statistics';

// ============================================================
// Raw Data Types (from Supabase)
// ============================================================

interface RawClassData {
  id: string;
  name: string;
  grade: number;
  level: string;
}

// ============================================================
// Class Statistics
// ============================================================

/**
 * Get statistics for all classes, optionally filtered
 */
export async function getClassStatistics(
  filters?: StatisticsFilters
): Promise<ClassStatistics[]> {
  // 1. Fetch all classes
  let classQuery = supabase
    .from('classes')
    .select('id, name, grade, level')
    .order('grade')
    .order('level')
    .order('name');

  if (filters?.grade) {
    classQuery = classQuery.eq('grade', filters.grade);
  }

  if (filters?.grade_level) {
    classQuery = classQuery.eq('level', filters.grade_level);
  }

  if (filters?.search) {
    classQuery = classQuery.ilike('name', `%${filters.search}%`);
  }

  const { data: classes, error: classError } = await classQuery;

  if (classError) {
    console.error('Error fetching classes:', classError);
    throw new Error(`Failed to fetch classes: ${classError.message}`);
  }

  if (!classes || classes.length === 0) {
    return [];
  }

  const classIds = classes.map(c => c.id);

  // 2. Fetch courses for these classes
  let courseQuery = supabase
    .from('courses')
    .select('id, class_id, course_type')
    .in('class_id', classIds);

  if (filters?.course_type) {
    courseQuery = courseQuery.eq('course_type', filters.course_type);
  }

  const { data: courses, error: courseError } = await courseQuery;

  if (courseError) {
    console.error('Error fetching courses:', courseError);
    throw new Error(`Failed to fetch courses: ${courseError.message}`);
  }

  // 3. Fetch students per class
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('id, class_id')
    .in('class_id', classIds);

  if (studentError) {
    console.error('Error fetching students:', studentError);
    throw new Error(`Failed to fetch students: ${studentError.message}`);
  }

  // 4. Fetch scores for relevant courses
  const courseIds = courses?.map(c => c.id) || [];

  const { data: scores, error: scoreError } = await supabase
    .from('scores')
    .select('student_id, course_id, assessment_code, score')
    .in('course_id', courseIds)
    .not('score', 'is', null);

  if (scoreError) {
    console.error('Error fetching scores:', scoreError);
  }

  // 5. Build statistics for each class-course combination
  const results: ClassStatistics[] = [];

  for (const cls of classes) {
    const classCourses = courses?.filter(c => c.class_id === cls.id) || [];
    const classStudents = students?.filter(s => s.class_id === cls.id) || [];
    const studentCount = classStudents.length;

    for (const course of classCourses) {
      const courseScores = scores?.filter(s => s.course_id === course.id) || [];

      // Group scores by student, then calculate term grades
      const studentScoreMap = new Map<string, Record<string, number | null>>();

      for (const score of courseScores) {
        if (!studentScoreMap.has(score.student_id)) {
          studentScoreMap.set(score.student_id, {});
        }
        studentScoreMap.get(score.student_id)![score.assessment_code] = score.score;
      }

      // Calculate term grades for each student
      const termGrades: number[] = [];
      const faAvgs: number[] = [];
      const saAvgs: number[] = [];

      for (const [, scoreMap] of studentScoreMap) {
        const faAvg = calculateFormativeAverage(
          scoreMap['FA1'], scoreMap['FA2'], scoreMap['FA3'], scoreMap['FA4'],
          scoreMap['FA5'], scoreMap['FA6'], scoreMap['FA7'], scoreMap['FA8']
        );
        const saAvg = calculateSummativeAverage(
          scoreMap['SA1'], scoreMap['SA2'], scoreMap['SA3'], scoreMap['SA4']
        );
        const midterm = scoreMap['MID'] ?? null;
        const termGrade = calculateTermGrade(faAvg, saAvg, midterm);

        if (faAvg !== null) faAvgs.push(faAvg);
        if (saAvg !== null) saAvgs.push(saAvg);
        if (termGrade !== null) termGrades.push(termGrade);
      }

      results.push({
        class_id: cls.id,
        class_name: cls.name,
        subject_type: course.course_type,
        grade_level: cls.level || `G${cls.grade}`,
        student_count: studentCount,
        term_grade_avg: calculateAverage(termGrades),
        max: calculateMax(termGrades),
        min: calculateMin(termGrades),
        std_dev: calculateStdDev(termGrades),
        fa_avg: calculateAverage(faAvgs),
        sa_avg: calculateAverage(saAvgs),
        pass_rate: calculatePassRate(termGrades),
        excellent_rate: calculateExcellentRate(termGrades),
      });
    }
  }

  return results;
}

// ============================================================
// Grade Level Statistics
// ============================================================

/**
 * Get statistics aggregated by grade level
 */
export async function getGradeLevelStatistics(
  courseType: CourseType
): Promise<GradeLevelStatistics[]> {
  // Get class statistics first
  const classStats = await getClassStatistics({ course_type: courseType });

  // Group by grade level
  const byGradeLevel = groupBy(classStats, 'grade_level');

  const results: GradeLevelStatistics[] = [];

  for (const [gradeLevel, stats] of Object.entries(byGradeLevel)) {
    const termGrades = filterValidScores(stats.map(s => s.term_grade_avg));
    const faAvgs = filterValidScores(stats.map(s => s.fa_avg));
    const saAvgs = filterValidScores(stats.map(s => s.sa_avg));
    const allMaxes = filterValidScores(stats.map(s => s.max));
    const allMins = filterValidScores(stats.map(s => s.min));

    // Aggregate student counts
    const totalStudents = stats.reduce((sum, s) => sum + s.student_count, 0);

    // Calculate weighted average for pass and excellent rates
    let totalPassed = 0;
    let totalExcellent = 0;
    let totalWithGrades = 0;

    for (const stat of stats) {
      if (stat.pass_rate !== null && stat.student_count > 0) {
        const studentsWithGrades = Math.round(stat.student_count * (stat.term_grade_avg !== null ? 1 : 0));
        totalPassed += (stat.pass_rate / 100) * studentsWithGrades;
        totalExcellent += ((stat.excellent_rate ?? 0) / 100) * studentsWithGrades;
        totalWithGrades += studentsWithGrades;
      }
    }

    results.push({
      grade_level: gradeLevel,
      subject_type: courseType,
      class_count: stats.length,
      student_count: totalStudents,
      term_grade_avg: calculateAverage(termGrades),
      max: calculateMax(allMaxes),
      min: calculateMin(allMins),
      fa_avg: calculateAverage(faAvgs),
      sa_avg: calculateAverage(saAvgs),
      pass_rate: totalWithGrades > 0 ? (totalPassed / totalWithGrades) * 100 : null,
      excellent_rate: totalWithGrades > 0 ? (totalExcellent / totalWithGrades) * 100 : null,
      std_dev: calculateStdDev(termGrades),
    });
  }

  // Sort by grade level
  return results.sort((a, b) => a.grade_level.localeCompare(b.grade_level));
}

/**
 * Get grade level summary (simplified view)
 */
export async function getGradeLevelSummary(
  courseType: CourseType
): Promise<GradeLevelSummary[]> {
  const stats = await getGradeLevelStatistics(courseType);

  return stats.map(s => ({
    grade_level: s.grade_level,
    total_students: s.student_count,
    grade_avg: s.term_grade_avg,
    pass_rate: s.pass_rate,
    excellent_rate: s.excellent_rate,
    std_dev: s.std_dev,
  }));
}

// ============================================================
// Class Ranking
// ============================================================

/**
 * Get class rankings within a grade level and course type
 */
export async function getClassRanking(
  filters: RankingFilters
): Promise<{ rankings: ClassRanking[]; gradeAverage: GradeLevelAverage }> {
  const { grade_level, course_type, metric = 'term_avg' } = filters;

  // Get class statistics for this grade level and course type
  const classStats = await getClassStatistics({
    grade_level,
    course_type,
  });

  if (classStats.length === 0) {
    return {
      rankings: [],
      gradeAverage: {
        grade_level,
        term_avg: 0,
        student_count: 0,
      },
    };
  }

  // Calculate grade level average
  const allTermGrades = filterValidScores(classStats.map(s => s.term_grade_avg));
  const totalStudents = classStats.reduce((sum, s) => sum + s.student_count, 0);
  const gradeAvg = calculateAverage(allTermGrades);

  // Prepare items for ranking
  const rankItems = classStats.map(s => ({
    class_id: s.class_id,
    class_name: s.class_name,
    grade_level: s.grade_level,
    term_avg: s.term_grade_avg,
    student_count: s.student_count,
    pass_rate: s.pass_rate,
    excellent_rate: s.excellent_rate,
  }));

  // Sort and rank by the chosen metric
  const sortField = metric === 'term_avg' ? 'term_avg' : metric === 'pass_rate' ? 'pass_rate' : 'excellent_rate';
  const ranked = rankByField(rankItems, sortField);

  // Build final rankings
  const rankings: ClassRanking[] = ranked.map(item => ({
    rank: item.rank,
    rank_label: generateRankLabel(item.rank, item.grade_level),
    class_id: item.class_id,
    class_name: item.class_name,
    grade_level: item.grade_level,
    term_avg: item.term_avg,
    student_count: item.student_count,
    pass_rate: item.pass_rate,
    excellent_rate: item.excellent_rate,
    performance: getPerformanceLevel(item.term_avg),
    vs_grade_avg: calculateVsAverage(item.term_avg, gradeAvg),
  }));

  return {
    rankings,
    gradeAverage: {
      grade_level,
      term_avg: gradeAvg ?? 0,
      student_count: totalStudents,
    },
  };
}

// ============================================================
// Student Grades
// ============================================================

/**
 * Get all student grades (raw data)
 */
export async function getStudentGrades(
  filters?: StatisticsFilters
): Promise<StudentGradeRow[]> {
  // 1. Fetch students with their classes
  let studentQuery = supabase
    .from('students')
    .select(`
      id,
      student_id,
      full_name,
      class_id,
      classes!inner (
        id,
        name,
        level,
        grade
      )
    `)
    .order('student_id');

  if (filters?.grade) {
    studentQuery = studentQuery.eq('classes.grade', filters.grade);
  }

  if (filters?.class_id) {
    studentQuery = studentQuery.eq('class_id', filters.class_id);
  }

  if (filters?.search) {
    studentQuery = studentQuery.or(
      `full_name.ilike.%${filters.search}%,student_id.ilike.%${filters.search}%`
    );
  }

  const { data: students, error: studentError } = await studentQuery;

  if (studentError) {
    console.error('Error fetching students:', studentError);
    throw new Error(`Failed to fetch students: ${studentError.message}`);
  }

  if (!students || students.length === 0) {
    return [];
  }

  const studentIds = students.map(s => s.id);
  const classIds = [...new Set(students.map(s => s.class_id))];

  // 2. Fetch courses for these classes
  let courseQuery = supabase
    .from('courses')
    .select('id, class_id, course_type')
    .in('class_id', classIds);

  if (filters?.course_type) {
    courseQuery = courseQuery.eq('course_type', filters.course_type);
  }

  const { data: courses, error: courseError } = await courseQuery;

  if (courseError) {
    console.error('Error fetching courses:', courseError);
    throw new Error(`Failed to fetch courses: ${courseError.message}`);
  }

  // 3. Fetch all scores for these students and courses
  const courseIds = courses?.map(c => c.id) || [];

  const { data: scores, error: scoreError } = await supabase
    .from('scores')
    .select('student_id, course_id, assessment_code, score')
    .in('student_id', studentIds)
    .in('course_id', courseIds);

  if (scoreError) {
    console.error('Error fetching scores:', scoreError);
  }

  // Build lookup maps
  const courseByClassId = new Map<string, typeof courses>();
  for (const course of courses || []) {
    if (!courseByClassId.has(course.class_id)) {
      courseByClassId.set(course.class_id, []);
    }
    courseByClassId.get(course.class_id)!.push(course);
  }

  // Build results
  const results: StudentGradeRow[] = [];

  for (const student of students) {
    const cls = student.classes as unknown as RawClassData;
    const classCourses = courseByClassId.get(student.class_id) || [];

    for (const course of classCourses) {
      const studentScores = scores?.filter(
        s => s.student_id === student.id && s.course_id === course.id
      ) || [];

      // Build score map
      const scoreMap: Record<string, number | null> = {};
      for (const score of studentScores) {
        scoreMap[score.assessment_code] = score.score;
      }

      const fa1 = scoreMap['FA1'] ?? null;
      const fa2 = scoreMap['FA2'] ?? null;
      const fa3 = scoreMap['FA3'] ?? null;
      const fa4 = scoreMap['FA4'] ?? null;
      const fa5 = scoreMap['FA5'] ?? null;
      const fa6 = scoreMap['FA6'] ?? null;
      const fa7 = scoreMap['FA7'] ?? null;
      const fa8 = scoreMap['FA8'] ?? null;
      const sa1 = scoreMap['SA1'] ?? null;
      const sa2 = scoreMap['SA2'] ?? null;
      const sa3 = scoreMap['SA3'] ?? null;
      const sa4 = scoreMap['SA4'] ?? null;
      const midterm = scoreMap['MID'] ?? null;

      const faAvg = calculateFormativeAverage(fa1, fa2, fa3, fa4, fa5, fa6, fa7, fa8);
      const saAvg = calculateSummativeAverage(sa1, sa2, sa3, sa4);
      const termGrade = calculateTermGrade(faAvg, saAvg, midterm);

      results.push({
        student_id: student.id,
        student_number: student.student_id,
        full_name: student.full_name,
        class_id: student.class_id,
        class_name: cls.name,
        grade_level: cls.level || `G${cls.grade}`,
        course_type: course.course_type,
        fa1, fa2, fa3, fa4, fa5, fa6, fa7, fa8,
        sa1, sa2, sa3, sa4,
        midterm,
        fa_avg: faAvg,
        sa_avg: saAvg,
        term_grade: termGrade,
      });
    }
  }

  return results;
}

// ============================================================
// Quick Stats (for Navigation Page)
// ============================================================

export interface QuickStats {
  totalStudents: number;
  totalClasses: number;
  schoolAverage: number | null;
  passRate: number | null;
}

/**
 * Get quick overview statistics for the stats home page
 */
export async function getQuickStats(): Promise<QuickStats> {
  // Get total counts
  const { count: totalStudents } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });

  const { count: totalClasses } = await supabase
    .from('classes')
    .select('*', { count: 'exact', head: true });

  // Get sample of class statistics for school-wide metrics
  const classStats = await getClassStatistics();

  const termGrades = filterValidScores(classStats.map(s => s.term_grade_avg));
  const schoolAverage = calculateAverage(termGrades);

  // Calculate overall pass rate (weighted by student count)
  let totalPassed = 0;
  let totalStudentsWithGrades = 0;

  for (const stat of classStats) {
    if (stat.pass_rate !== null && stat.term_grade_avg !== null) {
      totalPassed += (stat.pass_rate / 100) * stat.student_count;
      totalStudentsWithGrades += stat.student_count;
    }
  }

  const passRate = totalStudentsWithGrades > 0
    ? (totalPassed / totalStudentsWithGrades) * 100
    : null;

  return {
    totalStudents: totalStudents ?? 0,
    totalClasses: totalClasses ?? 0,
    schoolAverage,
    passRate,
  };
}

// ============================================================
// Available Grade Levels
// ============================================================

/**
 * Get all available grade levels in the system
 */
export async function getAvailableGradeLevels(): Promise<string[]> {
  const { data, error } = await supabase
    .from('classes')
    .select('level')
    .not('level', 'is', null)
    .order('level');

  if (error) {
    console.error('Error fetching grade levels:', error);
    return [];
  }

  // Deduplicate
  const levels = [...new Set(data?.map(d => d.level).filter(Boolean) || [])];
  return levels.sort();
}
