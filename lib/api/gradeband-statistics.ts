"use server";

/**
 * GradeBand Statistics API (Server Action)
 *
 * Statistics functions for Head Teacher's GradeBand Statistics module.
 * Filters all data by the Head Teacher's grade_band (e.g., "3-4" = G3 + G4).
 *
 * @see lib/api/statistics.ts for the full-school version
 */

import { createClient } from '@/lib/supabase/server';
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
  CourseType,
} from '@/types/statistics';

// ============================================================
// Types
// ============================================================

export interface GradeBandFilters {
  academic_year: string;
  term?: 1 | 2 | 3 | 4;
  grade_band: string;        // "1", "3-4", "5-6", etc.
  course_type?: CourseType;
  search?: string;
  class_id?: string;
}

export interface GradeBandQuickStats {
  totalStudents: number;
  totalClasses: number;
  totalCourses: number;
  avgScore: number | null;
  passRate: number | null;
  overallAverage: number | null;
  completionRate: number | null;
}

// ============================================================
// Helper Functions
// ============================================================

// Note: parseGradeBand and getGradeBandDisplay are imported from
// @/lib/utils/gradeband for use in server actions.
// Client components should import directly from '@/lib/utils/gradeband'.
import { parseGradeBand } from '@/lib/utils/gradeband';

/**
 * Fetch with retry mechanism for handling network errors
 */
async function fetchWithRetry<T>(
  fn: () => PromiseLike<{ data: T | null; error: { message: string } | null }>,
  retries = 5
): Promise<{ data: T | null; error: { message: string } | null }> {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await fn();
      if (!result.error) {
        return result;  // 成功時直接返回，不需要延遲
      }
      // 可重試的錯誤類型
      const isRetryableError =
        result.error.message?.includes('fetch failed') ||
        result.error.message?.includes('ECONNRESET') ||
        result.error.message?.includes('ETIMEDOUT') ||
        result.error.message?.includes('AbortError') ||
        result.error.message?.includes('timeout');

      if (isRetryableError) {
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        console.log(`[fetchWithRetry] Retry ${i + 1}/${retries} after ${result.error.message}, waiting ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return result;  // 不可重試的錯誤直接返回
    } catch (err) {
      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      console.log(`[fetchWithRetry] Caught error on attempt ${i + 1}/${retries}, waiting ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
      if (i === retries - 1) throw err;
    }
  }
  return await fn();
}

// ============================================================
// GradeBand Quick Stats
// ============================================================

/**
 * Get quick statistics for the grade band
 */
export async function getGradeBandQuickStats(
  filters: GradeBandFilters
): Promise<GradeBandQuickStats> {
  const supabase = createClient();
  const grades = parseGradeBand(filters.grade_band);

  // 1. Get classes in grade band
  const { data: classes, error: classError } = await supabase
    .from('classes')
    .select('id')
    .in('grade', grades)
    .eq('is_active', true)
    .eq('academic_year', filters.academic_year);

  if (classError) {
    console.error('[getGradeBandQuickStats] Classes error:', classError);
    return { totalStudents: 0, totalClasses: 0, totalCourses: 0, avgScore: null, passRate: null, overallAverage: null, completionRate: null };
  }

  const classIds = classes?.map(c => c.id) || [];

  if (classIds.length === 0) {
    return { totalStudents: 0, totalClasses: 0, totalCourses: 0, avgScore: null, passRate: null, overallAverage: null, completionRate: null };
  }

  // 2. Parallel queries for counts
  const [studentsResult, coursesResult] = await Promise.all([
    supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .in('class_id', classIds)
      .eq('is_active', true),
    supabase
      .from('courses')
      .select('id', { count: 'exact', head: true })
      .in('class_id', classIds)
      .eq('is_active', true)
      .eq('academic_year', filters.academic_year),
  ]);

  // 3. Get class statistics to calculate average score and pass rate
  const classStats = await getGradeBandClassStatistics(filters);

  const termGrades = filterValidScores(classStats.map(s => s.term_grade_avg));
  const avgScore = calculateAverage(termGrades);

  // Calculate weighted pass rate
  let totalPassed = 0;
  let totalWithGrades = 0;
  for (const stat of classStats) {
    if (stat.pass_rate !== null && stat.student_count > 0) {
      const studentsWithGrades = stat.term_grade_avg !== null ? stat.student_count : 0;
      totalPassed += (stat.pass_rate / 100) * studentsWithGrades;
      totalWithGrades += studentsWithGrades;
    }
  }
  const passRate = totalWithGrades > 0 ? (totalPassed / totalWithGrades) * 100 : null;

  // Calculate completion rate (rough estimate based on having term grades)
  const classesWithGrades = classStats.filter(s => s.term_grade_avg !== null).length;
  const completionRate = classStats.length > 0 ? (classesWithGrades / classStats.length) * 100 : null;

  return {
    totalStudents: studentsResult.count ?? 0,
    totalClasses: classIds.length,
    totalCourses: coursesResult.count ?? 0,
    avgScore,
    passRate,
    overallAverage: avgScore,
    completionRate,
  };
}

// ============================================================
// GradeBand Class Statistics
// ============================================================

/**
 * Get class statistics for the grade band
 * Same logic as getClassStatistics but filtered by grade_band
 */
export async function getGradeBandClassStatistics(
  filters: GradeBandFilters
): Promise<ClassStatistics[]> {
  const supabase = createClient();
  const grades = parseGradeBand(filters.grade_band);

  // 1. Fetch classes in grade band
  let classQuery = supabase
    .from('classes')
    .select('id, name, grade, level, academic_year')
    .in('grade', grades)
    .eq('is_active', true)
    .eq('academic_year', filters.academic_year)
    .order('grade')
    .order('level')
    .order('name');

  if (filters.search) {
    classQuery = classQuery.ilike('name', `%${filters.search}%`);
  }

  const { data: classes, error: classError } = await classQuery;

  if (classError) {
    console.error('[getGradeBandClassStatistics] Classes error:', classError);
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
    .in('class_id', classIds)
    .eq('is_active', true)
    .eq('academic_year', filters.academic_year);

  if (filters.course_type) {
    courseQuery = courseQuery.eq('course_type', filters.course_type);
  }

  const { data: courses, error: courseError } = await courseQuery;

  if (courseError) {
    console.error('[getGradeBandClassStatistics] Courses error:', courseError);
    throw new Error(`Failed to fetch courses: ${courseError.message}`);
  }

  // 3. Fetch students per class
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('id, class_id')
    .in('class_id', classIds)
    .eq('is_active', true);

  if (studentError) {
    console.error('[getGradeBandClassStatistics] Students error:', studentError);
    throw new Error(`Failed to fetch students: ${studentError.message}`);
  }

  // 4. Fetch scores
  const classIdSet = new Set(classIds);
  const studentIdList = students?.map(s => s.id) || [];

  type RawScore = {
    student_id: string;
    assessment_code: string;
    score: number | null;
    exam: unknown;
  };

  let rawScores: RawScore[] | null = null;

  if (studentIdList.length > 0) {
    const SCORE_PAGE_SIZE = 1000;
    let scoreOffset = 0;
    let hasMoreScores = true;
    const allRawScores: RawScore[] = [];

    while (hasMoreScores) {
      let scoresQuery = supabase
        .from('scores')
        .select(`
          student_id,
          assessment_code,
          score,
          exam:exams!inner(
            course_id,
            term,
            course:courses!inner(
              id,
              class_id,
              course_type
            )
          )
        `)
        .in('student_id', studentIdList)
        .not('score', 'is', null);

      if (filters.term) {
        scoresQuery = scoresQuery.eq('exam.term', filters.term);
      }

      const result = await fetchWithRetry(() =>
        scoresQuery.range(scoreOffset, scoreOffset + SCORE_PAGE_SIZE - 1)
      );

      if (result.error) {
        console.error('[getGradeBandClassStatistics] Scores error:', result.error);
        break;
      }

      if (result.data && result.data.length > 0) {
        allRawScores!.push(...result.data);
      }

      scoreOffset += SCORE_PAGE_SIZE;
      hasMoreScores = (result.data?.length || 0) === SCORE_PAGE_SIZE;
    }

    rawScores = allRawScores;
  }

  // Transform and filter scores
  const scores = (rawScores || [])
    .filter(s => {
      const examRaw = s.exam;
      const examData = (Array.isArray(examRaw) ? examRaw[0] : examRaw) as
        { course_id: string; course: { id: string; class_id: string; course_type: string } } | null;
      if (!examData?.course_id || !examData?.course) return false;
      if (!classIdSet.has(examData.course.class_id)) return false;
      if (filters.course_type && examData.course.course_type !== filters.course_type) return false;
      return true;
    })
    .map(s => {
      const examRaw = s.exam;
      const examData = (Array.isArray(examRaw) ? examRaw[0] : examRaw) as
        { course_id: string; course: { id: string; class_id: string; course_type: string } };
      return {
        student_id: s.student_id,
        course_id: examData.course.id,
        course_type: examData.course.course_type,
        assessment_code: s.assessment_code,
        score: s.score,
      };
    });

  // 5. Build lookup Maps
  const coursesByClassId = new Map<string, typeof courses>();
  for (const course of courses || []) {
    const arr = coursesByClassId.get(course.class_id) || [];
    arr.push(course);
    coursesByClassId.set(course.class_id, arr);
  }

  const studentsByClassId = new Map<string, typeof students>();
  for (const student of students || []) {
    const arr = studentsByClassId.get(student.class_id) || [];
    arr.push(student);
    studentsByClassId.set(student.class_id, arr);
  }

  const scoresByCourseId = new Map<string, typeof scores>();
  for (const score of scores) {
    const arr = scoresByCourseId.get(score.course_id) || [];
    arr.push(score);
    scoresByCourseId.set(score.course_id, arr);
  }

  // 6. Build statistics
  const results: ClassStatistics[] = [];

  for (const cls of classes) {
    const classCourses = coursesByClassId.get(cls.id) || [];
    const classStudents = studentsByClassId.get(cls.id) || [];
    const studentCount = classStudents.length;

    for (const course of classCourses) {
      const courseScores = scoresByCourseId.get(course.id) || [];

      const studentScoreMap = new Map<string, Record<string, number | null>>();

      for (const score of courseScores) {
        if (!studentScoreMap.has(score.student_id)) {
          studentScoreMap.set(score.student_id, {});
        }
        studentScoreMap.get(score.student_id)![score.assessment_code] = score.score;
      }

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
// GradeBand Grade Level Statistics
// ============================================================

/**
 * Get statistics aggregated by grade level within the grade band
 */
export async function getGradeBandGradeLevelStatistics(
  filters: GradeBandFilters,
  courseType: CourseType
): Promise<GradeLevelStatistics[]> {
  const grades = parseGradeBand(filters.grade_band);

  // Fetch all grades in parallel
  const gradeResults = await Promise.all(
    grades.map(grade =>
      getGradeBandClassStatistics({
        ...filters,
        grade_band: String(grade), // Single grade
        course_type: courseType,
      })
    )
  );
  const allClassStats = gradeResults.flat();

  // Group by grade level
  const byGradeLevel = groupBy(allClassStats, 'grade_level');

  const results: GradeLevelStatistics[] = [];

  for (const [gradeLevel, stats] of Object.entries(byGradeLevel)) {
    const termGrades = filterValidScores(stats.map(s => s.term_grade_avg));
    const faAvgs = filterValidScores(stats.map(s => s.fa_avg));
    const saAvgs = filterValidScores(stats.map(s => s.sa_avg));
    const allMaxes = filterValidScores(stats.map(s => s.max));
    const allMins = filterValidScores(stats.map(s => s.min));

    const totalStudents = stats.reduce((sum, s) => sum + s.student_count, 0);

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

  return results.sort((a, b) => a.grade_level.localeCompare(b.grade_level));
}

/**
 * Get grade level summary (simplified view)
 */
export async function getGradeBandGradeLevelSummary(
  filters: GradeBandFilters,
  courseType: CourseType
): Promise<GradeLevelSummary[]> {
  const stats = await getGradeBandGradeLevelStatistics(filters, courseType);

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
// GradeBand Class Ranking
// ============================================================

/**
 * Get class rankings within the grade band
 */
export async function getGradeBandClassRanking(
  filters: GradeBandFilters,
  metric: 'term_avg' | 'pass_rate' | 'excellent_rate' = 'term_avg'
): Promise<{ rankings: ClassRanking[]; gradeAverage: GradeLevelAverage }> {
  const classStats = await getGradeBandClassStatistics(filters);

  if (classStats.length === 0) {
    return {
      rankings: [],
      gradeAverage: {
        grade_level: `G${filters.grade_band}`,
        term_avg: 0,
        student_count: 0,
      },
    };
  }

  // Calculate grade band average
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

  // Sort and rank
  const sortField = metric === 'term_avg' ? 'term_avg' : metric === 'pass_rate' ? 'pass_rate' : 'excellent_rate';
  const ranked = rankByField(rankItems, sortField);

  const rankings: ClassRanking[] = ranked.map(item => ({
    rank: item.rank,
    rank_label: generateRankLabel(item.rank, `G${filters.grade_band}`),
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
      grade_level: `G${filters.grade_band}`,
      term_avg: gradeAvg ?? 0,
      student_count: totalStudents,
    },
  };
}

// ============================================================
// GradeBand Student Grades
// ============================================================

/**
 * Get all student grades within the grade band
 */
export async function getGradeBandStudentGrades(
  filters: GradeBandFilters
): Promise<StudentGradeRow[]> {
  const supabase = createClient();
  const grades = parseGradeBand(filters.grade_band);

  // 1. Fetch students with their classes
  const allStudents: {
    id: string;
    student_id: string;
    full_name: string;
    class_id: string;
    classes: { id: string; name: string; level: string; grade: number };
  }[] = [];

  const PAGE_SIZE = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
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
          grade,
          academic_year
        )
      `)
      .in('classes.grade', grades)
      .eq('classes.academic_year', filters.academic_year)
      .eq('is_active', true)
      .order('student_id')
      .range(offset, offset + PAGE_SIZE - 1);

    if (filters.search) {
      studentQuery = studentQuery.or(
        `full_name.ilike.%${filters.search}%,student_id.ilike.%${filters.search}%`
      );
    }

    if (filters.class_id) {
      studentQuery = studentQuery.eq('class_id', filters.class_id);
    }

    const { data: pageStudents, error: studentError } = await studentQuery;

    if (studentError) {
      console.error('[getGradeBandStudentGrades] Students error:', studentError);
      throw new Error(`Failed to fetch students: ${studentError.message}`);
    }

    if (pageStudents && pageStudents.length > 0) {
      const mapped = pageStudents.map(s => ({
        ...s,
        classes: Array.isArray(s.classes) ? s.classes[0] : s.classes
      })) as typeof allStudents;
      allStudents.push(...mapped);
      offset += PAGE_SIZE;
      hasMore = pageStudents.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  if (allStudents.length === 0) {
    return [];
  }

  const studentIds = allStudents.map(s => s.id);
  const classIds = [...new Set(allStudents.map(s => s.class_id))];

  // 2. Fetch courses
  let courseQuery = supabase
    .from('courses')
    .select('id, class_id, course_type')
    .in('class_id', classIds)
    .eq('is_active', true)
    .eq('academic_year', filters.academic_year);

  if (filters.course_type) {
    courseQuery = courseQuery.eq('course_type', filters.course_type);
  }

  const { data: courses, error: courseError } = await courseQuery;

  if (courseError) {
    console.error('[getGradeBandStudentGrades] Courses error:', courseError);
    throw new Error(`Failed to fetch courses: ${courseError.message}`);
  }

  // 3. Fetch scores
  const classIdSet = new Set(classIds);
  type ScoreRow = { student_id: string; course_id: string; course_type: string; assessment_code: string; score: number | null };
  const allScores: ScoreRow[] = [];

  if (studentIds.length > 0) {
    const SCORE_PAGE_SIZE = 1000;
    let scoreOffset = 0;
    let hasMoreScores = true;

    while (hasMoreScores) {
      let scoresQuery = supabase
        .from('scores')
        .select(`
          student_id,
          assessment_code,
          score,
          exam:exams!inner(
            course_id,
            term,
            course:courses!inner(
              id,
              class_id,
              course_type
            )
          )
        `)
        .in('student_id', studentIds);

      if (filters.term) {
        scoresQuery = scoresQuery.eq('exam.term', filters.term);
      }

      const result = await fetchWithRetry(() =>
        scoresQuery.range(scoreOffset, scoreOffset + SCORE_PAGE_SIZE - 1)
      );

      if (result.error) {
        console.error('[getGradeBandStudentGrades] Scores error:', result.error);
        break;
      }

      const pageScores = result.data || [];

      for (const s of pageScores) {
        const examData = s.exam as unknown as { course_id: string; course: { id: string; class_id: string; course_type: string } } | null;
        if (!examData?.course_id || !examData?.course) continue;
        if (!classIdSet.has(examData.course.class_id)) continue;
        if (filters.course_type && examData.course.course_type !== filters.course_type) continue;

        allScores.push({
          student_id: s.student_id,
          course_id: examData.course.id,
          course_type: examData.course.course_type,
          assessment_code: s.assessment_code,
          score: s.score,
        });
      }

      scoreOffset += SCORE_PAGE_SIZE;
      hasMoreScores = pageScores.length === SCORE_PAGE_SIZE;
    }
  }

  // Build lookup maps
  const scoreLookup = new Map<string, ScoreRow[]>();
  for (const score of allScores) {
    const key = `${score.student_id}:${score.course_id}`;
    if (!scoreLookup.has(key)) {
      scoreLookup.set(key, []);
    }
    scoreLookup.get(key)!.push(score);
  }

  const courseByClassId = new Map<string, typeof courses>();
  for (const course of courses || []) {
    if (!courseByClassId.has(course.class_id)) {
      courseByClassId.set(course.class_id, []);
    }
    courseByClassId.get(course.class_id)!.push(course);
  }

  // Build results
  const results: StudentGradeRow[] = [];

  for (const student of allStudents) {
    const cls = student.classes;
    const classCourses = courseByClassId.get(student.class_id) || [];

    for (const course of classCourses) {
      const lookupKey = `${student.id}:${course.id}`;
      const studentScores = scoreLookup.get(lookupKey) || [];

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
