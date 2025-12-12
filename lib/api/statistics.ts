"use server";

/**
 * Statistics API (Server Action)
 *
 * Data fetching functions for the Statistics & Analytics module.
 * Uses server-side Supabase client to bypass RLS restrictions for admin/office users.
 */

import { createClient } from '@/lib/supabase/server';

// ============================================================
// Helper Functions
// ============================================================

/**
 * Fetch with retry mechanism for handling network errors in serverless environment
 * - Retries up to 5 times with longer exponential backoff
 * - Handles Zeabur/serverless cold start issues
 * - Adds delay between requests to prevent connection exhaustion
 */
async function fetchWithRetry<T>(
  fn: () => PromiseLike<{ data: T | null; error: { message: string } | null }>,
  retries = 5
): Promise<{ data: T | null; error: { message: string } | null }> {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await fn();
      if (!result.error) {
        // Add small delay between successful requests to prevent connection exhaustion
        await new Promise(r => setTimeout(r, 100));
        return result;
      }
      if (result.error.message?.includes('fetch failed') ||
          result.error.message?.includes('ECONNRESET') ||
          result.error.message?.includes('ETIMEDOUT')) {
        const delay = Math.min(2000 * Math.pow(2, i), 10000); // 2s, 4s, 8s, 10s, 10s
        console.log(`[fetchWithRetry] Retry ${i + 1}/${retries} after ${result.error.message}, waiting ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return result; // Non-retryable error
    } catch (err) {
      // Handle thrown errors (not just returned errors)
      const delay = Math.min(2000 * Math.pow(2, i), 10000);
      console.log(`[fetchWithRetry] Caught error on attempt ${i + 1}/${retries}, waiting ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
      if (i === retries - 1) throw err;
    }
  }
  return await fn(); // Final attempt
}

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
  const supabase = createClient();

  // 1. Fetch all classes
  let classQuery = supabase
    .from('classes')
    .select('id, name, grade, level, academic_year')
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

  // Filter by academic year
  if (filters?.academic_year) {
    classQuery = classQuery.eq('academic_year', filters.academic_year);
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

  // 4. Fetch scores using nested join pattern (same as gradebook)
  // IMPORTANT: Supabase's courses!inner joins via course_id FK, NOT class_id
  // We get class_id from course.class_id instead
  const classIdSet = new Set(classIds);
  const studentIdList = students?.map(s => s.id) || [];

  // Skip query if no students (empty array causes Bad Request with !inner joins)
  let rawScores: Array<{
    student_id: string;
    assessment_code: string;
    score: number | null;
    exam: unknown;
  }> | null = null;
  let scoreError: { message: string } | null = null;

  if (studentIdList.length > 0) {
    // Paginate scores query to bypass Supabase 1000 row limit
    const SCORE_PAGE_SIZE = 1000;
    let scoreOffset = 0;
    let hasMoreScores = true;
    const allRawScores: Array<{
      student_id: string;
      assessment_code: string;
      score: number | null;
      exam: unknown;
    }> = [];

    while (hasMoreScores) {
      // Build the query with optional term filter
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

      // Filter by term if specified
      if (filters?.term) {
        scoresQuery = scoresQuery.eq('exam.term', filters.term);
      }

      const result = await fetchWithRetry(() =>
        scoresQuery.range(scoreOffset, scoreOffset + SCORE_PAGE_SIZE - 1)
      );

      if (result.error) {
        console.error('Error fetching scores:', result.error);
        scoreError = result.error;
        break;
      }

      if (result.data && result.data.length > 0) {
        allRawScores.push(...result.data);
      }

      scoreOffset += SCORE_PAGE_SIZE;
      hasMoreScores = (result.data?.length || 0) === SCORE_PAGE_SIZE;
    }

    rawScores = allRawScores;
  }

  if (scoreError) {
    console.error('Error fetching scores:', scoreError);
  }

  // Transform nested structure and filter by class IDs and course type
  // Handle case where exam might be an array (Supabase nested join behavior)
  const scores = (rawScores || [])
    .filter(s => {
      const examRaw = s.exam;
      const examData = (Array.isArray(examRaw) ? examRaw[0] : examRaw) as
        { course_id: string; course: { id: string; class_id: string; course_type: string } } | null;
      if (!examData?.course_id || !examData?.course) return false;
      // Filter by class (using course.class_id) and optionally by course type
      if (!classIdSet.has(examData.course.class_id)) return false;
      if (filters?.course_type && examData.course.course_type !== filters.course_type) return false;
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

  // 5. Build lookup Maps for O(1) access instead of O(n) filter
  // This reduces complexity from O(n²) to O(n) - ~250x faster for 84 classes
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

  // 6. Build statistics for each class-course combination
  const results: ClassStatistics[] = [];

  for (const cls of classes) {
    const classCourses = coursesByClassId.get(cls.id) || [];
    const classStudents = studentsByClassId.get(cls.id) || [];
    const studentCount = classStudents.length;

    for (const course of classCourses) {
      const courseScores = scoresByCourseId.get(course.id) || [];

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
 * Fetches data grade-by-grade to avoid querying too many students at once
 */
export async function getGradeLevelStatistics(
  courseType: CourseType,
  filters?: { academic_year?: string; term?: 1 | 2 | 3 | 4 }
): Promise<GradeLevelStatistics[]> {
  // Fetch all grades in PARALLEL using Promise.all for 3-5x speedup
  // Instead of sequential 6 queries, we run them concurrently
  const grades = [1, 2, 3, 4, 5, 6];

  const gradeResults = await Promise.all(
    grades.map(grade =>
      getClassStatistics({
        grade,
        course_type: courseType,
        academic_year: filters?.academic_year,
        term: filters?.term,
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
  courseType: CourseType,
  filters?: { academic_year?: string; term?: 1 | 2 | 3 | 4 }
): Promise<GradeLevelSummary[]> {
  const stats = await getGradeLevelStatistics(courseType, filters);

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
  const { grade_level, course_type, metric = 'term_avg', academic_year, term } = filters;

  // Get class statistics for this grade level and course type
  const classStats = await getClassStatistics({
    grade_level,
    course_type,
    academic_year,
    term,
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
  const supabase = createClient();

  // 1. Fetch students with their classes (with pagination to bypass 1000 limit)
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
      .order('student_id')
      .range(offset, offset + PAGE_SIZE - 1);

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

    // Filter by academic year via class
    if (filters?.academic_year) {
      studentQuery = studentQuery.eq('classes.academic_year', filters.academic_year);
    }

    const { data: pageStudents, error: studentError } = await studentQuery;

    if (studentError) {
      console.error('Error fetching students:', studentError);
      throw new Error(`Failed to fetch students: ${studentError.message}`);
    }

    if (pageStudents && pageStudents.length > 0) {
      // Map the nested array to single object (Supabase returns array for !inner join)
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

  const students = allStudents;

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

  // 3. Fetch all scores using single pagination loop (optimized)
  // Removed double-loop (batch × page) for better performance
  const classIdSet = new Set(classIds);

  type ScoreRow = { student_id: string; course_id: string; course_type: string; assessment_code: string; score: number | null };
  const allScores: ScoreRow[] = [];

  if (studentIds.length > 0) {
    const SCORE_PAGE_SIZE = 1000;
    let scoreOffset = 0;
    let hasMoreScores = true;

    // Single pagination loop - query all studentIds at once
    while (hasMoreScores) {
      // Build query with optional term filter
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

      // Filter by term if specified
      if (filters?.term) {
        scoresQuery = scoresQuery.eq('exam.term', filters.term);
      }

      const result = await fetchWithRetry(() =>
        scoresQuery.range(scoreOffset, scoreOffset + SCORE_PAGE_SIZE - 1)
      );

      if (result.error) {
        console.error('Error fetching scores:', result.error);
        break;
      }

      const pageScores = result.data || [];

      // Transform nested structure and filter by class IDs
      for (const s of pageScores) {
        const examData = s.exam as unknown as { course_id: string; course: { id: string; class_id: string; course_type: string } } | null;
        if (!examData?.course_id || !examData?.course) continue;
        // Filter by class (using course.class_id)
        if (!classIdSet.has(examData.course.class_id)) continue;
        // Filter by course type if specified
        if (filters?.course_type && examData.course.course_type !== filters.course_type) continue;

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

  // Build score lookup map for O(1) access (instead of O(n) filter)
  const scoreLookup = new Map<string, ScoreRow[]>();
  for (const score of allScores) {
    const key = `${score.student_id}:${score.course_id}`;
    if (!scoreLookup.has(key)) {
      scoreLookup.set(key, []);
    }
    scoreLookup.get(key)!.push(score);
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
      // Use O(1) Map lookup instead of O(n) filter
      const lookupKey = `${student.id}:${course.id}`;
      const studentScores = scoreLookup.get(lookupKey) || [];

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
  totalCourses: number;
  assignedCourses: number;
}

/**
 * Get quick overview statistics for the stats home page
 * Returns counts that are always available (no grades dependency)
 */
export async function getQuickStats(): Promise<QuickStats> {
  const supabase = createClient();

  // Fetch all counts in parallel for better performance
  const [
    { count: totalStudents },
    { count: totalClasses },
    { count: totalCourses },
    { count: assignedCourses }
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('classes').select('*', { count: 'exact', head: true }),
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('courses').select('*', { count: 'exact', head: true })
      .not('teacher_id', 'is', null)
  ]);

  return {
    totalStudents: totalStudents ?? 0,
    totalClasses: totalClasses ?? 0,
    totalCourses: totalCourses ?? 0,
    assignedCourses: assignedCourses ?? 0,
  };
}

// ============================================================
// Available Grade Levels
// ============================================================

/**
 * Get all available grade levels in the system
 */
export async function getAvailableGradeLevels(): Promise<string[]> {
  const supabase = createClient();

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
