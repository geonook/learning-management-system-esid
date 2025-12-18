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
  calculateKCFSPassRate,
  calculateKCFSExcellentRate,
  calculateKCFSTermGradeFromMap,
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


// ============================================================
// GradeBand Quick Stats
// ============================================================

/**
 * Get quick statistics for the grade band
 *
 * OPTIMIZED: Uses lightweight parallel queries instead of calling getGradeBandClassStatistics
 * to avoid 29+ second TTFB issues caused by nested API calls and sequential pagination.
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

  // 2. Parallel queries for counts + sample scores for avg calculation
  const [studentsResult, coursesResult, studentsData, coursesData] = await Promise.all([
    // Count queries (fast)
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
    // Get student IDs for score lookup
    supabase
      .from('students')
      .select('id')
      .in('class_id', classIds)
      .eq('is_active', true)
      .limit(2000),  // Limit to reasonable sample
    // Get course IDs filtered by course_type
    supabase
      .from('courses')
      .select('id, class_id')
      .in('class_id', classIds)
      .eq('is_active', true)
      .eq('academic_year', filters.academic_year)
      .eq('course_type', filters.course_type || 'LT'),
  ]);

  const studentIds = studentsData.data?.map(s => s.id) || [];
  const courseIds = coursesData.data?.map(c => c.id) || [];
  const totalStudents = studentsResult.count ?? 0;

  // 3. Get scores sample for average calculation (single query, limited)
  let avgScore: number | null = null;
  let passRate: number | null = null;
  let completionRate: number | null = null;

  if (studentIds.length > 0 && courseIds.length > 0) {
    // Build term filter for exams
    let examQuery = supabase
      .from('exams')
      .select('id')
      .in('course_id', courseIds);

    if (filters.term) {
      examQuery = examQuery.eq('term', filters.term);
    }

    const { data: exams } = await examQuery.limit(500);
    const examIds = exams?.map(e => e.id) || [];

    if (examIds.length > 0) {
      // Get scores using batch query to avoid URL length limits
      // Problem: 504 studentIds + 199 examIds = URL too long
      // Solution: Only use examIds filter (smaller), let scores filter by exam_id only
      const allScoresData: { score: number | null }[] = [];

      // Batch examIds into groups of 100 to avoid URL length limits
      const EXAM_BATCH_SIZE = 100;
      for (let i = 0; i < examIds.length; i += EXAM_BATCH_SIZE) {
        const batchExamIds = examIds.slice(i, i + EXAM_BATCH_SIZE);
        const { data: batchScores } = await supabase
          .from('scores')
          .select('score')
          .in('exam_id', batchExamIds)
          .not('score', 'is', null)
          .limit(2000);

        if (batchScores) {
          allScoresData.push(...batchScores);
        }
      }

      if (allScoresData.length > 0) {
        const validScores = allScoresData.map(s => s.score).filter((s): s is number => s !== null && s > 0);
        avgScore = calculateAverage(validScores);

        // Calculate pass rate from sample - use appropriate threshold based on course type
        // Note: For KCFS, raw scores are 0-5 scale; for LT/IT, scores are 0-100 scale
        const isKCFS = filters.course_type === 'KCFS';
        if (isKCFS) {
          // KCFS raw scores use 0-5 scale, pass >= 3
          passRate = calculateKCFSPassRate(validScores);
        } else {
          // LT/IT scores use 0-100 scale, pass >= 60
          const passedCount = validScores.filter(s => s >= 60).length;
          passRate = validScores.length > 0 ? (passedCount / validScores.length) * 100 : null;
        }

        // Estimate completion rate: unique students with scores / total students
        // This is a rough estimate based on having any scores
        const scoresCount = allScoresData.length;
        // KCFS has 4-6 assessments depending on grade; LT/IT has 13 (FA1-8 + SA1-4 + MID)
        // Use average of 5 for KCFS (midpoint of 4-6) vs 13 for LT/IT
        const expectedItemsPerStudent = isKCFS ? 5 : 13;
        const expectedScores = totalStudents * expectedItemsPerStudent;
        completionRate = expectedScores > 0 ? Math.min((scoresCount / expectedScores) * 100, 100) : null;
      }
    }
  }

  return {
    totalStudents,
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

  // 4. Fetch scores - Split into batches to avoid URL length limits
  const classIdSet = new Set(classIds);
  const studentIdList = students?.map(s => s.id) || [];

  type RawScore = {
    student_id: string;
    assessment_code: string;
    score: number | null;
    exam: unknown;
  };

  const rawScores: RawScore[] = [];

  if (studentIdList.length > 0) {
    // Split studentIds into batches to avoid URL length limits (max ~200 UUIDs per batch)
    const STUDENT_BATCH_SIZE = 200;
    const studentBatches: string[][] = [];
    for (let i = 0; i < studentIdList.length; i += STUDENT_BATCH_SIZE) {
      studentBatches.push(studentIdList.slice(i, i + STUDENT_BATCH_SIZE));
    }

    // NOTE: Removed `.eq('exam.term', filters.term)` due to Supabase/PostgREST nested relation filtering bug
    // Term filtering is done in JavaScript during the filter step below
    for (const batchStudentIds of studentBatches) {
      const { data: scoresData, error: scoresError } = await supabase
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
        .in('student_id', batchStudentIds)
        .not('score', 'is', null)
        .limit(5000);  // Limit per batch

      if (scoresError) {
        console.error('[getGradeBandClassStatistics] Scores error for batch:', scoresError);
        continue; // Try next batch
      }

      if (scoresData) {
        rawScores.push(...scoresData);
      }
    }
  }

  // Transform and filter scores
  // Term filtering done here in JS instead of SQL due to Supabase nested relation bug
  const scores = (rawScores || [])
    .filter(s => {
      const examRaw = s.exam;
      const examData = (Array.isArray(examRaw) ? examRaw[0] : examRaw) as
        { course_id: string; term: number | null; course: { id: string; class_id: string; course_type: string } } | null;
      if (!examData?.course_id || !examData?.course) return false;
      if (!classIdSet.has(examData.course.class_id)) return false;
      if (filters.course_type && examData.course.course_type !== filters.course_type) return false;
      // Term filter in JS (workaround for Supabase nested relation bug)
      // Use Number() to ensure type-safe comparison (filters.term may be string from Zustand persist)
      if (filters.term && examData.term !== Number(filters.term)) return false;
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
      const rawKCFSScores: number[] = []; // For KCFS pass/excellent rate

      // Branch based on course type
      const isKCFS = course.course_type === 'KCFS';

      for (const [, scoreMap] of studentScoreMap) {
        if (isKCFS) {
          // KCFS: Use KCFS-specific calculation
          const termGrade = calculateKCFSTermGradeFromMap(scoreMap, cls.grade);
          if (termGrade !== null) termGrades.push(termGrade);

          // Collect raw KCFS scores (0-5 scale) for pass/excellent rate
          // Only collect scores from KCFS category codes, not legacy FA/SA/MID
          const kcfsCategoryCodes = ['COMM', 'COLLAB', 'SD', 'CT', 'BW', 'PORT', 'PRES'];
          kcfsCategoryCodes.forEach(code => {
            const score = scoreMap[code];
            if (score !== null && score !== undefined) {
              rawKCFSScores.push(score);
            }
          });
        } else {
          // LT/IT: Use traditional FA/SA/MID calculation
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
      }

      // Calculate pass/excellent rates based on course type
      const passRate = isKCFS
        ? calculateKCFSPassRate(rawKCFSScores)
        : calculatePassRate(termGrades);
      const excellentRate = isKCFS
        ? calculateKCFSExcellentRate(rawKCFSScores)
        : calculateExcellentRate(termGrades);

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
        fa_avg: isKCFS ? null : calculateAverage(faAvgs), // KCFS doesn't have FA/SA
        sa_avg: isKCFS ? null : calculateAverage(saAvgs),
        pass_rate: passRate,
        excellent_rate: excellentRate,
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
 * OPTIMIZED: Parallel batch fetch instead of sequential while loops
 */
export async function getGradeBandStudentGrades(
  filters: GradeBandFilters
): Promise<StudentGradeRow[]> {
  const supabase = createClient();
  const grades = parseGradeBand(filters.grade_band);

  // 1. Fetch students with their classes - with count for parallel batch
  let baseStudentQuery = supabase
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
    `, { count: 'exact' })
    .in('classes.grade', grades)
    .eq('classes.academic_year', filters.academic_year)
    .eq('is_active', true)
    .order('student_id');

  if (filters.search) {
    baseStudentQuery = baseStudentQuery.or(
      `full_name.ilike.%${filters.search}%,student_id.ilike.%${filters.search}%`
    );
  }

  if (filters.class_id) {
    baseStudentQuery = baseStudentQuery.eq('class_id', filters.class_id);
  }

  // Get first page and count
  const { data: firstPageStudents, count: studentCount, error: studentError } = await baseStudentQuery.range(0, 999);

  if (studentError) {
    console.error('[getGradeBandStudentGrades] Students error:', studentError);
    throw new Error(`Failed to fetch students: ${studentError.message}`);
  }

  if (!firstPageStudents || firstPageStudents.length === 0) {
    return [];
  }

  // Fetch remaining pages in parallel if needed
  let allStudentData = firstPageStudents;
  if (studentCount && studentCount > 1000) {
    const totalPages = Math.min(Math.ceil(studentCount / 1000), 5);
    const pagePromises = Array.from({ length: totalPages - 1 }, (_, i) => {
      let query = supabase
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
        .range((i + 1) * 1000, (i + 2) * 1000 - 1);

      if (filters.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,student_id.ilike.%${filters.search}%`);
      }
      if (filters.class_id) {
        query = query.eq('class_id', filters.class_id);
      }
      return query.then(r => r.data || []);
    });

    const additionalPages = await Promise.all(pagePromises);
    allStudentData = [...firstPageStudents, ...additionalPages.flat()];
  }

  const allStudents = allStudentData.map(s => ({
    ...s,
    classes: Array.isArray(s.classes) ? s.classes[0] : s.classes
  })) as {
    id: string;
    student_id: string;
    full_name: string;
    class_id: string;
    classes: { id: string; name: string; level: string; grade: number };
  }[];

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

  // 3. Fetch scores - OPTIMIZED: Parallel batch fetch instead of sequential while loop
  const classIdSet = new Set(classIds);
  type ScoreRow = { student_id: string; course_id: string; course_type: string; assessment_code: string; score: number | null };
  const allScores: ScoreRow[] = [];

  if (studentIds.length > 0) {
    // Process scores function (shared across batches)
    // Term filtering done here in JS instead of SQL due to Supabase nested relation bug
    type ScorePageData = {
      student_id: string;
      assessment_code: string;
      score: number | null;
      exam: unknown;
    }[];
    const processScorePage = (pageScores: ScorePageData | null) => {
      for (const s of pageScores || []) {
        const examData = s.exam as { course_id: string; term: number | null; course: { id: string; class_id: string; course_type: string } } | null;
        if (!examData?.course_id || !examData?.course) continue;
        if (!classIdSet.has(examData.course.class_id)) continue;
        if (filters.course_type && examData.course.course_type !== filters.course_type) continue;
        // Term filter in JS (workaround for Supabase nested relation bug)
        // Use Number() to ensure type-safe comparison (filters.term may be string from Zustand persist)
        if (filters.term && examData.term !== Number(filters.term)) continue;

        allScores.push({
          student_id: s.student_id,
          course_id: examData.course.id,
          course_type: examData.course.course_type,
          assessment_code: s.assessment_code,
          score: s.score,
        });
      }
    };

    // Split studentIds into batches to avoid URL length limits (max ~200 UUIDs per batch)
    const STUDENT_BATCH_SIZE = 200;
    const studentBatches: string[][] = [];
    for (let i = 0; i < studentIds.length; i += STUDENT_BATCH_SIZE) {
      studentBatches.push(studentIds.slice(i, i + STUDENT_BATCH_SIZE));
    }

    // Process each batch
    for (const batchStudentIds of studentBatches) {
      // Fetch scores for this batch with pagination
      const { data: firstPageScores, count: scoresCount, error: scoresError } = await supabase
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
        `, { count: 'exact' })
        .in('student_id', batchStudentIds)
        .range(0, 999);

      if (scoresError) {
        console.error('[getGradeBandStudentGrades] Scores error for batch:', scoresError);
        continue; // Try next batch instead of failing completely
      }

      processScorePage(firstPageScores);

      // Fetch remaining pages for this batch if needed
      if (scoresCount && scoresCount > 1000) {
        const totalPages = Math.min(Math.ceil(scoresCount / 1000), 10);
        const pagePromises = Array.from({ length: totalPages - 1 }, (_, i) => {
          return supabase
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
            .in('student_id', batchStudentIds)
            .range((i + 1) * 1000, (i + 2) * 1000 - 1)
            .then(r => r.data || []);
        });

        const additionalPages = await Promise.all(pagePromises);
        for (const pageData of additionalPages) {
          processScorePage(pageData);
        }
      }
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
