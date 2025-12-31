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
    grade: number;         // fromGrade: 起始年級（用於 NWEA norm 查詢）
    toGrade: number;       // 結束年級（用於 X 軸標籤顯示）
    isGraduated: boolean;  // 該年級學生是否已畢業（toTerm 是過去且 toGrade >= 6）
    reading: {
      avgGrowth: number;
      growthIndex: number | null;  // null when no NWEA norm available
      avgCGP: number | null;  // Average Conditional Growth Percentile (1-99)
      studentCount: number;
    };
    languageUsage: {
      avgGrowth: number;
      growthIndex: number | null;  // null when no NWEA norm available
      avgCGP: number | null;  // Average Conditional Growth Percentile (1-99)
      studentCount: number;
    };
  }>;
  fromTerm: string;
  toTerm: string;
  growthPeriod: string;
  nweaExpected: Record<number, { reading: number | null; languageUsage: number | null }>;
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
  cgp: number | null;  // Conditional Growth Percentile (1-99)
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
    growthIndex: number | null;  // null when no NWEA norm available
    avgCGP: number | null;  // Average Conditional Growth Percentile (1-99)
    studentCount: number;
    vsNorm: number | null;  // null when no NWEA norm available
    distribution: {
      negative: number;
      low: number;
      average: number;
      high: number;
    };
  }>;
  gradeAverage: {
    avgGrowth: number;
    growthIndex: number | null;  // null when no NWEA norm available
    avgCGP: number | null;  // Average Conditional Growth Percentile (1-99)
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
  // 包含 conditional_growth_percentile 欄位（CDF 官方值）
  const { data, error } = await supabase
    .from("map_assessments")
    .select(`
      student_number,
      course,
      term_tested,
      rit_score,
      grade,
      conditional_growth_percentile,
      fall_to_fall_conditional_growth_percentile,
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
  // 重要：使用 fromGrade 追蹤起始年級，用於 NWEA Growth Norms 查找
  type StudentData = { grade: number; level: string | null; is_active: boolean };
  const studentMap = new Map<string, {
    fromGrade: number | null;  // 起始年級（用於常模查找）
    toGrade: number | null;    // 結束年級
    from: { reading: number | null; languageUsage: number | null };
    to: { reading: number | null; languageUsage: number | null };
    cgp: { reading: number | null; languageUsage: number | null };  // CDF 官方 cGP
  }>();

  for (const row of data ?? []) {
    const studentRaw = row.students;
    const student = (Array.isArray(studentRaw) ? studentRaw[0] : studentRaw) as StudentData | null;

    if (!student || !student.is_active) continue;

    const key = row.student_number;
    if (!studentMap.has(key)) {
      studentMap.set(key, {
        fromGrade: null,
        toGrade: null,
        from: { reading: null, languageUsage: null },
        to: { reading: null, languageUsage: null },
        cgp: { reading: null, languageUsage: null },
      });
    }

    const record = studentMap.get(key)!;
    const courseKey = row.course === "Reading" ? "reading" : "languageUsage";

    if (row.term_tested === fromTerm) {
      record.fromGrade = row.grade;  // 記錄起始年級
      record.from[courseKey] = row.rit_score;
    } else if (row.term_tested === toTerm) {
      record.toGrade = row.grade;  // 記錄結束年級
      record.to[courseKey] = row.rit_score;
      // CDF 官方 cGP
      const rowAny = row as Record<string, unknown>;
      record.cgp[courseKey] = (rowAny.conditional_growth_percentile as number | null)
        ?? (rowAny.fall_to_fall_conditional_growth_percentile as number | null)
        ?? null;
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
    // 使用 fromGrade 過濾學生（確保使用起始年級進行常模查找）
    const gradeStudents = Array.from(studentMap.values()).filter(s => s.fromGrade === grade);

    // Reading
    const rdStudents = gradeStudents.filter(s => s.from.reading !== null && s.to.reading !== null);
    const rdGrowths = rdStudents.map(s => (s.to.reading ?? 0) - (s.from.reading ?? 0));
    const rdAvgGrowth = rdGrowths.length > 0 ? rdGrowths.reduce((a, b) => a + b, 0) / rdGrowths.length : 0;
    // 移除 ?? 1 fallback：當沒有 NWEA norm 時，Growth Index 應為 null
    const rdExpected = getExpectedGrowth(fromTerm, toTerm, grade, "Reading");
    const rdGrowthIndex = rdExpected !== null && rdExpected !== 0
      ? Math.round((rdAvgGrowth / rdExpected) * 100) / 100
      : null;
    // 計算 Reading 平均 cGP
    const rdCGPs = rdStudents.map(s => s.cgp.reading).filter((c): c is number => c !== null);
    const rdAvgCGP = rdCGPs.length > 0 ? Math.round(rdCGPs.reduce((a, b) => a + b, 0) / rdCGPs.length) : null;

    // Language Usage
    const luStudents = gradeStudents.filter(s => s.from.languageUsage !== null && s.to.languageUsage !== null);
    const luGrowths = luStudents.map(s => (s.to.languageUsage ?? 0) - (s.from.languageUsage ?? 0));
    const luAvgGrowth = luGrowths.length > 0 ? luGrowths.reduce((a, b) => a + b, 0) / luGrowths.length : 0;
    // 移除 ?? 1 fallback
    const luExpected = getExpectedGrowth(fromTerm, toTerm, grade, "Language Usage");
    const luGrowthIndex = luExpected !== null && luExpected !== 0
      ? Math.round((luAvgGrowth / luExpected) * 100) / 100
      : null;
    // 計算 Language Usage 平均 cGP
    const luCGPs = luStudents.map(s => s.cgp.languageUsage).filter((c): c is number => c !== null);
    const luAvgCGP = luCGPs.length > 0 ? Math.round(luCGPs.reduce((a, b) => a + b, 0) / luCGPs.length) : null;

    // 計算 toGrade（結束年級）
    // Within-Year (Fall → Spring): toGrade = fromGrade（同學年）
    // Year-over-Year (Fall → Fall): toGrade = fromGrade + 1（升一年級）
    const isYearOverYear = fromTerm.toLowerCase().includes("fall") && toTerm.toLowerCase().includes("fall");
    const toGrade = isYearOverYear ? grade + 1 : grade;

    // 判斷是否為畢業生（歷史資料中的 G6 學生）
    // 當前學年：2025-2026
    // 如果 toTerm 是過去學年（例如 2024-2025）且 toGrade >= 6，則為畢業生
    const currentAcademicYear = "2025-2026";
    const toTermYear = extractAcademicYear(toTerm);
    const isGraduated = toTermYear !== null && toTermYear !== currentAcademicYear && toGrade >= 6;

    result.grades.push({
      grade,       // fromGrade：起始年級
      toGrade,     // 結束年級（用於 X 軸顯示）
      isGraduated, // 該年級學生是否已畢業
      reading: {
        avgGrowth: Math.round(rdAvgGrowth * 10) / 10,
        growthIndex: rdGrowthIndex,
        avgCGP: rdAvgCGP,
        studentCount: rdStudents.length,
      },
      languageUsage: {
        avgGrowth: Math.round(luAvgGrowth * 10) / 10,
        growthIndex: luGrowthIndex,
        avgCGP: luAvgCGP,
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
 * 使用 student_class_history 表獲取歷史班級資料，確保班級名稱與 MAP 測驗時一致
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

  // 從 fromTerm 提取 academic year，用於查詢歷史班級
  const academicYear = extractAcademicYear(fromTerm);

  // 查詢該學年的學生班級歷史（如果有）
  let classHistoryMap = new Map<string, string>();
  if (academicYear && grade) {
    const { data: historyData } = await supabase
      .from("student_class_history")
      .select("student_number, english_class")
      .eq("academic_year", academicYear)
      .eq("grade", grade);

    if (historyData) {
      for (const h of historyData) {
        classHistoryMap.set(h.student_number, h.english_class);
      }
    }
  }

  // 建立查詢
  // 包含 conditional_growth_percentile 欄位（CDF 官方值）
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
      conditional_growth_percentile,
      fall_to_fall_conditional_growth_percentile,
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
  // 重要：使用 fromGrade 追蹤起始年級，用於 NWEA Growth Norms 查找
  interface StudentGrowth {
    studentId: string;
    studentNumber: string;
    firstName: string | null;
    lastName: string | null;
    fromGrade: number | null;  // 起始年級（用於常模查找）
    grade: number;  // 當前年級（用於顯示）
    level: string;
    className: string | null;
    fromScore: number | null;
    toScore: number | null;
    rapidGuessing: number | null;
    // CDF 官方 cGP（優先使用）
    officialCGP: number | null;
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
      // 優先使用歷史班級資料，fallback 到當前班級
      const historicalClass = classHistoryMap.get(key);
      const classData = student.classes;
      const classInfo = (Array.isArray(classData) ? classData[0] : classData) as { id: string; name: string } | null;
      const currentClassName = classInfo?.name ?? null;

      studentMap.set(key, {
        studentId: student.id,
        studentNumber: row.student_number,
        firstName: row.student_first_name,
        lastName: row.student_last_name,
        fromGrade: null,  // 稍後在 fromTerm 時記錄
        grade: row.grade,
        level: student.level ?? 'E2',
        className: historicalClass ?? currentClassName,  // 使用歷史班級或當前班級
        fromScore: null,
        toScore: null,
        rapidGuessing: null,
        officialCGP: null,  // 稍後從 toTerm 記錄
      });
    }

    const record = studentMap.get(key)!;

    if (row.term_tested === fromTerm) {
      record.fromScore = row.rit_score;
      record.fromGrade = row.grade;  // 記錄起始年級，用於 NWEA 常模查找
    } else if (row.term_tested === toTerm) {
      record.toScore = row.rit_score;
      record.rapidGuessing = row.rapid_guessing_percent;
      // CDF 官方 cGP：Fall-to-Spring 使用 conditional_growth_percentile，
      // Fall-to-Fall 使用 fall_to_fall_conditional_growth_percentile
      const rowAny = row as Record<string, unknown>;
      record.officialCGP = (rowAny.conditional_growth_percentile as number | null)
        ?? (rowAny.fall_to_fall_conditional_growth_percentile as number | null)
        ?? null;
    }
  }

  // 計算成長並排序
  const canViewNames = canViewStudentNames(currentUser.role);

  const studentsWithGrowth: GrowthSpotlightStudent[] = [];

  let index = 0;
  for (const [, student] of studentMap) {
    if (student.fromScore === null || student.toScore === null) continue;

    const growth = student.toScore - student.fromScore;

    // 使用學生自己的 fromGrade 查找 NWEA 常模
    // 移除 ?? 1 fallback：當沒有 NWEA norm 時，Growth Index 應為 null
    const studentGrade = student.fromGrade ?? grade ?? 4;
    const expectedGrowth = getExpectedGrowth(fromTerm, toTerm, studentGrade, course);
    const growthIndex = expectedGrowth !== null && expectedGrowth !== 0
      ? growth / expectedGrowth
      : null;

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
      cgp: student.officialCGP,  // CDF 官方 Growth Percentile
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
 * 從 term_tested 提取 academic year
 * @example "Fall 2024-2025" -> "2024-2025"
 */
function extractAcademicYear(termTested: string): string | null {
  const match = termTested.match(/(\d{4}-\d{4})/);
  return match?.[1] ?? null;
}

/**
 * 取得班級成長比較資料
 *
 * 比較同年級不同班級的成長表現
 * 使用 student_class_history 表獲取歷史班級資料，確保班級名稱與 MAP 測驗時一致
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

  // 從 fromTerm 提取 academic year，用於查詢歷史班級
  const academicYear = extractAcademicYear(fromTerm);

  // 查詢該學年的學生班級歷史（如果有）
  let classHistoryMap = new Map<string, string>();
  if (academicYear) {
    const { data: historyData } = await supabase
      .from("student_class_history")
      .select("student_number, english_class")
      .eq("academic_year", academicYear)
      .eq("grade", grade);

    if (historyData) {
      for (const h of historyData) {
        classHistoryMap.set(h.student_number, h.english_class);
      }
    }
  }

  // 查詢該年級所有學生的 MAP 資料
  // 包含 conditional_growth_percentile 欄位（CDF 官方值）
  const { data, error } = await supabase
    .from("map_assessments")
    .select(`
      student_number,
      course,
      term_tested,
      rit_score,
      grade,
      conditional_growth_percentile,
      fall_to_fall_conditional_growth_percentile,
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
    className: string | null;
    fromScore: number | null;
    toScore: number | null;
    officialCGP: number | null;  // CDF 官方 cGP
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
      // 優先使用歷史班級資料，fallback 到當前班級
      const historicalClass = classHistoryMap.get(key);
      const classData = student.classes;
      const classInfo = Array.isArray(classData) ? classData[0] : classData;
      const currentClassName = classInfo?.name ?? null;

      studentMap.set(key, {
        className: historicalClass ?? currentClassName,
        fromScore: null,
        toScore: null,
        officialCGP: null,
      });
    }

    const record = studentMap.get(key)!;

    if (row.term_tested === fromTerm) {
      record.fromScore = row.rit_score;
    } else if (row.term_tested === toTerm) {
      record.toScore = row.rit_score;
      // CDF 官方 cGP
      const rowAny = row as Record<string, unknown>;
      record.officialCGP = (rowAny.conditional_growth_percentile as number | null)
        ?? (rowAny.fall_to_fall_conditional_growth_percentile as number | null)
        ?? null;
    }
  }

  // 按班級分組計算（使用 className 作為 key，因為歷史班級沒有 classId）
  const classBuckets = new Map<string, {
    className: string;
    growths: number[];
    cgps: number[];  // 收集班級內所有學生的 cGP
  }>();

  const allGrowths: number[] = [];
  const allCGPs: number[] = [];  // 收集年級內所有學生的 cGP
  // 移除 ?? 1 fallback：當沒有 NWEA norm 時，Growth Index 應為 null
  const expectedGrowth = getExpectedGrowth(fromTerm, toTerm, grade, course);

  for (const [, student] of studentMap) {
    if (student.fromScore === null || student.toScore === null) continue;
    if (!student.className) continue;

    const growth = student.toScore - student.fromScore;
    allGrowths.push(growth);
    if (student.officialCGP !== null) {
      allCGPs.push(student.officialCGP);
    }

    if (!classBuckets.has(student.className)) {
      classBuckets.set(student.className, {
        className: student.className,
        growths: [],
        cgps: [],
      });
    }

    const bucket = classBuckets.get(student.className)!;
    bucket.growths.push(growth);
    if (student.officialCGP !== null) {
      bucket.cgps.push(student.officialCGP);
    }
  }

  // 計算班級統計
  const classes: ClassComparisonData['classes'] = [];

  for (const [, bucket] of classBuckets) {
    if (bucket.growths.length === 0) continue;

    const avgGrowth = bucket.growths.reduce((a, b) => a + b, 0) / bucket.growths.length;
    const growthIndex = expectedGrowth !== null && expectedGrowth !== 0
      ? avgGrowth / expectedGrowth
      : null;

    // 計算班級平均 cGP
    const avgCGP = bucket.cgps.length > 0
      ? Math.round(bucket.cgps.reduce((a, b) => a + b, 0) / bucket.cgps.length)
      : null;

    // 成長分佈
    const distribution = {
      negative: bucket.growths.filter(g => g < 0).length,
      low: bucket.growths.filter(g => g >= 0 && g < 5).length,
      average: bucket.growths.filter(g => g >= 5 && g < 10).length,
      high: bucket.growths.filter(g => g >= 10).length,
    };

    classes.push({
      classId: bucket.className,  // Use className as ID since historical classes don't have classId
      className: bucket.className,
      avgGrowth: Math.round(avgGrowth * 10) / 10,
      growthIndex: growthIndex !== null ? Math.round(growthIndex * 100) / 100 : null,
      avgCGP,
      studentCount: bucket.growths.length,
      vsNorm: expectedGrowth !== null ? Math.round((avgGrowth - expectedGrowth) * 10) / 10 : null,
      distribution,
    });
  }

  // 排序（按成長指數降序，null 值排在最後）
  classes.sort((a, b) => {
    if (a.growthIndex === null && b.growthIndex === null) return 0;
    if (a.growthIndex === null) return 1;
    if (b.growthIndex === null) return -1;
    return b.growthIndex - a.growthIndex;
  });

  // 計算年級平均
  const gradeAvgGrowth = allGrowths.length > 0
    ? allGrowths.reduce((a, b) => a + b, 0) / allGrowths.length
    : 0;
  const gradeGrowthIndex = expectedGrowth !== null && expectedGrowth !== 0
    ? gradeAvgGrowth / expectedGrowth
    : null;
  const gradeAvgCGP = allCGPs.length > 0
    ? Math.round(allCGPs.reduce((a, b) => a + b, 0) / allCGPs.length)
    : null;

  return {
    grade,
    course,
    fromTerm,
    toTerm,
    classes,
    gradeAverage: {
      avgGrowth: Math.round(gradeAvgGrowth * 10) / 10,
      growthIndex: gradeGrowthIndex !== null ? Math.round(gradeGrowthIndex * 100) / 100 : null,
      avgCGP: gradeAvgCGP,
      studentCount: allGrowths.length,
    },
  };
}
