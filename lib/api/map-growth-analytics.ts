/**
 * MAP Growth Analytics API - Extended
 *
 * 提供 Growth Tab 進階分析功能：
 * 1. 跨年級成長比較 (CrossGradeGrowth)
 * 2. 成長明星/需關注學生 (GrowthSpotlight)
 * 3. 班級成長比較 (ClassGrowthComparison)
 *
 * Permission Model:
 * - All authenticated users can read growth analytics
 * - Student names only visible to admin/head/teacher (not office_member)
 * - Data filtered by grade if Head role with grade band
 */

import { createClient } from "@/lib/supabase/client";
import { requireAuth, getCurrentUser, type UserRole } from './permissions';
import {
  parseTermTested,
  compareTermTested,
  getNorm,
  getGrowthNormByCourse,
  type MapTerm,
  type Course,
} from "@/lib/map/norms";
import {
  classifyBenchmark,
  getBenchmarkThresholds,
} from "@/lib/map/benchmarks";

// ============================================================
// Types
// ============================================================

export interface CrossGradeGrowthData {
  grades: Array<{
    grade: number;
    reading: {
      avgGrowth: number;
      growthIndex: number;
      studentCount: number;
    };
    languageUsage: {
      avgGrowth: number;
      growthIndex: number;
      studentCount: number;
    };
  }>;
  fromTerm: string;
  toTerm: string;
  growthPeriod: string;
  nweaExpected: Record<number, { reading: number; languageUsage: number }>;
}

export interface GrowthSpotlightStudent {
  studentId: string;
  studentNumber: string;
  studentName: string; // 根據權限可能是匿名
  grade: number;
  englishLevel: string;
  className: string | null;
  fromScore: number;
  toScore: number;
  growth: number;
  growthIndex: number | null;
  course: Course;
  flag?: 'negative' | 'low_growth' | 'rapid_guess';
}

export interface GrowthSpotlightData {
  fromTerm: string;
  toTerm: string;
  course: Course;
  topGrowth: GrowthSpotlightStudent[];
  needsAttention: GrowthSpotlightStudent[];
  totalStudents: number;
}

export interface ClassComparisonData {
  grade: number;
  course: Course;
  fromTerm: string;
  toTerm: string;
  classes: Array<{
    classId: string;
    className: string;
    avgGrowth: number;
    growthIndex: number;
    studentCount: number;
    vsNorm: number;
    distribution: {
      negative: number;
      low: number;
      average: number;
      high: number;
    };
  }>;
  gradeAverage: {
    avgGrowth: number;
    growthIndex: number;
    studentCount: number;
  };
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * 判斷使用者是否可以看到學生姓名
 */
function canViewStudentNames(role: UserRole): boolean {
  return ['admin', 'head', 'teacher'].includes(role);
}

/**
 * 匿名化學生姓名
 */
function anonymizeName(index: number): string {
  return `Student ${String.fromCharCode(65 + (index % 26))}${Math.floor(index / 26) > 0 ? Math.floor(index / 26) : ''}`;
}

/**
 * 計算預期成長值
 */
function getExpectedGrowth(
  fromTerm: string,
  toTerm: string,
  grade: number,
  course: Course
): number | null {
  const fromParsed = parseTermTested(fromTerm);
  const toParsed = parseTermTested(toTerm);

  if (!fromParsed || !toParsed) return null;

  // 判斷成長期間類型（使用 norms.ts 定義的 GrowthPeriod 格式）
  let growthPeriod: 'fall-to-winter' | 'fall-to-spring' | 'winter-to-spring' | 'fall-to-fall';

  if (fromParsed.mapTerm === 'fall' && toParsed.mapTerm === 'spring' &&
      fromParsed.academicYear === toParsed.academicYear) {
    growthPeriod = 'fall-to-spring';
  } else if (fromParsed.mapTerm === 'fall' && toParsed.mapTerm === 'fall') {
    growthPeriod = 'fall-to-fall';
  } else if (fromParsed.mapTerm === 'fall' && toParsed.mapTerm === 'winter') {
    growthPeriod = 'fall-to-winter';
  } else if (fromParsed.mapTerm === 'winter' && toParsed.mapTerm === 'spring') {
    growthPeriod = 'winter-to-spring';
  } else {
    return null;
  }

  // Use fromTerm's academic year for norm lookup
  const normData = getGrowthNormByCourse(fromParsed.academicYear, grade, growthPeriod, course);
  return normData?.mean ?? null;
}

// ============================================================
// API Functions
// ============================================================

/**
 * 取得跨年級成長比較資料
 *
 * 顯示 G3-G6 各年級的成長指數，方便一眼比較
 */
export async function getCrossGradeGrowth(params: {
  fromTerm: string;
  toTerm: string;
}): Promise<CrossGradeGrowthData | null> {
  await requireAuth();
  const supabase = createClient();

  const { fromTerm, toTerm } = params;
  const grades = [3, 4, 5, 6];

  // 查詢所有年級的 MAP 資料
  const { data, error } = await supabase
    .from("map_assessments")
    .select(`
      student_number,
      course,
      term_tested,
      rit_score,
      grade,
      students:student_id (
        grade,
        level,
        is_active
      )
    `)
    .in("term_tested", [fromTerm, toTerm])
    .in("grade", grades)
    .not("student_id", "is", null);

  if (error) {
    console.error("Error fetching cross-grade growth data:", error);
    return null;
  }

  // 過濾 active 學生並建立 student map
  type StudentData = { grade: number; level: string | null; is_active: boolean };
  const studentMap = new Map<string, {
    grade: number;
    from: { reading: number | null; languageUsage: number | null };
    to: { reading: number | null; languageUsage: number | null };
  }>();

  for (const row of data ?? []) {
    const studentRaw = row.students;
    const student = (Array.isArray(studentRaw) ? studentRaw[0] : studentRaw) as StudentData | null;

    if (!student || !student.is_active) continue;

    const key = row.student_number;
    if (!studentMap.has(key)) {
      studentMap.set(key, {
        grade: row.grade,
        from: { reading: null, languageUsage: null },
        to: { reading: null, languageUsage: null },
      });
    }

    const record = studentMap.get(key)!;
    const courseKey = row.course === "Reading" ? "reading" : "languageUsage";

    if (row.term_tested === fromTerm) {
      record.from[courseKey] = row.rit_score;
    } else if (row.term_tested === toTerm) {
      record.to[courseKey] = row.rit_score;
    }
  }

  // 計算各年級成長
  const result: CrossGradeGrowthData = {
    grades: [],
    fromTerm,
    toTerm,
    growthPeriod: `${fromTerm.split(' ')[0]} → ${toTerm.split(' ')[0]}`,
    nweaExpected: {},
  };

  for (const grade of grades) {
    const gradeStudents = Array.from(studentMap.values()).filter(s => s.grade === grade);

    // Reading
    const rdStudents = gradeStudents.filter(s => s.from.reading !== null && s.to.reading !== null);
    const rdGrowths = rdStudents.map(s => (s.to.reading ?? 0) - (s.from.reading ?? 0));
    const rdAvgGrowth = rdGrowths.length > 0 ? rdGrowths.reduce((a, b) => a + b, 0) / rdGrowths.length : 0;
    const rdExpected = getExpectedGrowth(fromTerm, toTerm, grade, "Reading") ?? 1;
    const rdGrowthIndex = rdExpected !== 0 ? rdAvgGrowth / rdExpected : 0;

    // Language Usage
    const luStudents = gradeStudents.filter(s => s.from.languageUsage !== null && s.to.languageUsage !== null);
    const luGrowths = luStudents.map(s => (s.to.languageUsage ?? 0) - (s.from.languageUsage ?? 0));
    const luAvgGrowth = luGrowths.length > 0 ? luGrowths.reduce((a, b) => a + b, 0) / luGrowths.length : 0;
    const luExpected = getExpectedGrowth(fromTerm, toTerm, grade, "Language Usage") ?? 1;
    const luGrowthIndex = luExpected !== 0 ? luAvgGrowth / luExpected : 0;

    result.grades.push({
      grade,
      reading: {
        avgGrowth: Math.round(rdAvgGrowth * 10) / 10,
        growthIndex: Math.round(rdGrowthIndex * 100) / 100,
        studentCount: rdStudents.length,
      },
      languageUsage: {
        avgGrowth: Math.round(luAvgGrowth * 10) / 10,
        growthIndex: Math.round(luGrowthIndex * 100) / 100,
        studentCount: luStudents.length,
      },
    });

    result.nweaExpected[grade] = {
      reading: rdExpected,
      languageUsage: luExpected,
    };
  }

  return result;
}

/**
 * 取得成長明星/需關注學生資料
 *
 * 識別成長最多的學生（Growth Stars）和需要關注的學生（負成長或低成長）
 */
export async function getGrowthSpotlight(params: {
  grade?: number;
  course: Course;
  fromTerm: string;
  toTerm: string;
  limit?: number;
}): Promise<GrowthSpotlightData | null> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const supabase = createClient();
  const { grade, course, fromTerm, toTerm, limit = 5 } = params;

  // 建立查詢
  let query = supabase
    .from("map_assessments")
    .select(`
      student_number,
      student_first_name,
      student_last_name,
      course,
      term_tested,
      rit_score,
      grade,
      rapid_guessing_percent,
      students:student_id (
        id,
        grade,
        level,
        is_active,
        class_id,
        classes:class_id (
          id,
          name
        )
      )
    `)
    .eq("course", course)
    .in("term_tested", [fromTerm, toTerm])
    .not("student_id", "is", null);

  if (grade) {
    query = query.eq("grade", grade);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching growth spotlight data:", error);
    return null;
  }

  // 建立學生成長資料
  interface StudentGrowth {
    studentId: string;
    studentNumber: string;
    firstName: string | null;
    lastName: string | null;
    grade: number;
    level: string;
    className: string | null;
    fromScore: number | null;
    toScore: number | null;
    rapidGuessing: number | null;
  }

  const studentMap = new Map<string, StudentGrowth>();

  for (const row of data ?? []) {
    // Handle Supabase nested join results (can be array or object)
    type StudentRow = {
      id: string;
      grade: number;
      level: string | null;
      is_active: boolean;
      class_id: string | null;
      classes: { id: string; name: string } | { id: string; name: string }[] | null;
    };
    const studentRaw = row.students as StudentRow | StudentRow[] | null;
    const student = Array.isArray(studentRaw) ? studentRaw[0] : studentRaw;

    if (!student || !student.is_active) continue;

    const key = row.student_number;
    if (!studentMap.has(key)) {
      // Handle nested class data
      const classData = student.classes;
      const classInfo = (Array.isArray(classData) ? classData[0] : classData) as { id: string; name: string } | null;

      studentMap.set(key, {
        studentId: student.id,
        studentNumber: row.student_number,
        firstName: row.student_first_name,
        lastName: row.student_last_name,
        grade: row.grade,
        level: student.level ?? 'E2',
        className: classInfo?.name ?? null,
        fromScore: null,
        toScore: null,
        rapidGuessing: null,
      });
    }

    const record = studentMap.get(key)!;

    if (row.term_tested === fromTerm) {
      record.fromScore = row.rit_score;
    } else if (row.term_tested === toTerm) {
      record.toScore = row.rit_score;
      record.rapidGuessing = row.rapid_guessing_percent;
    }
  }

  // 計算成長並排序
  const canViewNames = canViewStudentNames(currentUser.role);
  const expectedGrowth = getExpectedGrowth(fromTerm, toTerm, grade ?? 4, course) ?? 1;

  const studentsWithGrowth: GrowthSpotlightStudent[] = [];

  let index = 0;
  for (const [, student] of studentMap) {
    if (student.fromScore === null || student.toScore === null) continue;

    const growth = student.toScore - student.fromScore;
    const growthIndex = expectedGrowth !== 0 ? growth / expectedGrowth : null;

    // 判斷旗標
    let flag: GrowthSpotlightStudent['flag'];
    if (growth < 0) {
      flag = 'negative';
    } else if (growthIndex !== null && growthIndex < 0.6) {
      flag = 'low_growth';
    } else if (student.rapidGuessing !== null && student.rapidGuessing > 30) {
      flag = 'rapid_guess';
    }

    studentsWithGrowth.push({
      studentId: student.studentId,
      studentNumber: student.studentNumber,
      studentName: canViewNames
        ? `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() || student.studentNumber
        : anonymizeName(index),
      grade: student.grade,
      englishLevel: student.level,
      className: student.className,
      fromScore: student.fromScore,
      toScore: student.toScore,
      growth,
      growthIndex: growthIndex !== null ? Math.round(growthIndex * 100) / 100 : null,
      course,
      flag,
    });

    index++;
  }

  // 排序並取得 Top/Bottom
  const sortedByGrowth = [...studentsWithGrowth].sort((a, b) => b.growth - a.growth);
  const topGrowth = sortedByGrowth.slice(0, limit);

  // 需關注：負成長優先，然後是低成長
  const needsAttentionCandidates = studentsWithGrowth
    .filter(s => s.flag)
    .sort((a, b) => {
      // 負成長優先
      if (a.flag === 'negative' && b.flag !== 'negative') return -1;
      if (b.flag === 'negative' && a.flag !== 'negative') return 1;
      // 然後按成長值排序（低的在前）
      return a.growth - b.growth;
    });

  const needsAttention = needsAttentionCandidates.slice(0, limit);

  return {
    fromTerm,
    toTerm,
    course,
    topGrowth,
    needsAttention,
    totalStudents: studentsWithGrowth.length,
  };
}

/**
 * 取得班級成長比較資料
 *
 * 比較同年級不同班級的成長表現
 */
export async function getClassGrowthComparison(params: {
  grade: number;
  course: Course;
  fromTerm: string;
  toTerm: string;
}): Promise<ClassComparisonData | null> {
  await requireAuth();
  const supabase = createClient();

  const { grade, course, fromTerm, toTerm } = params;

  // 查詢該年級所有學生的 MAP 資料
  const { data, error } = await supabase
    .from("map_assessments")
    .select(`
      student_number,
      course,
      term_tested,
      rit_score,
      grade,
      students:student_id (
        id,
        grade,
        level,
        is_active,
        class_id,
        classes:class_id (
          id,
          name
        )
      )
    `)
    .eq("course", course)
    .eq("grade", grade)
    .in("term_tested", [fromTerm, toTerm])
    .not("student_id", "is", null);

  if (error) {
    console.error("Error fetching class growth comparison data:", error);
    return null;
  }

  // 建立學生資料 Map
  interface StudentRecord {
    classId: string | null;
    className: string | null;
    fromScore: number | null;
    toScore: number | null;
  }

  const studentMap = new Map<string, StudentRecord>();

  for (const row of data ?? []) {
    // Handle Supabase nested join results (can be array or object)
    type StudentRow = {
      id: string;
      grade: number;
      level: string | null;
      is_active: boolean;
      class_id: string | null;
      classes: { id: string; name: string } | { id: string; name: string }[] | null;
    };
    const studentRaw = row.students as StudentRow | StudentRow[] | null;
    const student = Array.isArray(studentRaw) ? studentRaw[0] : studentRaw;

    if (!student || !student.is_active) continue;

    const key = row.student_number;
    if (!studentMap.has(key)) {
      const classData = student.classes;
      const classInfo = Array.isArray(classData) ? classData[0] : classData;

      studentMap.set(key, {
        classId: student.class_id,
        className: classInfo?.name ?? null,
        fromScore: null,
        toScore: null,
      });
    }

    const record = studentMap.get(key)!;

    if (row.term_tested === fromTerm) {
      record.fromScore = row.rit_score;
    } else if (row.term_tested === toTerm) {
      record.toScore = row.rit_score;
    }
  }

  // 按班級分組計算
  const classBuckets = new Map<string, {
    classId: string;
    className: string;
    growths: number[];
  }>();

  const allGrowths: number[] = [];
  const expectedGrowth = getExpectedGrowth(fromTerm, toTerm, grade, course) ?? 1;

  for (const [, student] of studentMap) {
    if (student.fromScore === null || student.toScore === null) continue;
    if (!student.classId || !student.className) continue;

    const growth = student.toScore - student.fromScore;
    allGrowths.push(growth);

    if (!classBuckets.has(student.classId)) {
      classBuckets.set(student.classId, {
        classId: student.classId,
        className: student.className,
        growths: [],
      });
    }

    classBuckets.get(student.classId)!.growths.push(growth);
  }

  // 計算班級統計
  const classes: ClassComparisonData['classes'] = [];

  for (const [, bucket] of classBuckets) {
    if (bucket.growths.length === 0) continue;

    const avgGrowth = bucket.growths.reduce((a, b) => a + b, 0) / bucket.growths.length;
    const growthIndex = expectedGrowth !== 0 ? avgGrowth / expectedGrowth : 0;

    // 成長分佈
    const distribution = {
      negative: bucket.growths.filter(g => g < 0).length,
      low: bucket.growths.filter(g => g >= 0 && g < 5).length,
      average: bucket.growths.filter(g => g >= 5 && g < 10).length,
      high: bucket.growths.filter(g => g >= 10).length,
    };

    classes.push({
      classId: bucket.classId,
      className: bucket.className,
      avgGrowth: Math.round(avgGrowth * 10) / 10,
      growthIndex: Math.round(growthIndex * 100) / 100,
      studentCount: bucket.growths.length,
      vsNorm: Math.round((avgGrowth - expectedGrowth) * 10) / 10,
      distribution,
    });
  }

  // 排序（按成長指數降序）
  classes.sort((a, b) => b.growthIndex - a.growthIndex);

  // 計算年級平均
  const gradeAvgGrowth = allGrowths.length > 0
    ? allGrowths.reduce((a, b) => a + b, 0) / allGrowths.length
    : 0;
  const gradeGrowthIndex = expectedGrowth !== 0 ? gradeAvgGrowth / expectedGrowth : 0;

  return {
    grade,
    course,
    fromTerm,
    toTerm,
    classes,
    gradeAverage: {
      avgGrowth: Math.round(gradeAvgGrowth * 10) / 10,
      growthIndex: Math.round(gradeGrowthIndex * 100) / 100,
      studentCount: allGrowths.length,
    },
  };
}
