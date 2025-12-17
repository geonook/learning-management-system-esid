import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId') || '3ceeed06-0ca5-47e2-9a88-5c1a551b78f7';
  const courseType = searchParams.get('courseType') || 'IT';

  const supabase = await createClient();

  // Query scores with nested join - same structure as gradeband-statistics.ts
  const { data: scores, error, count } = await supabase
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
    .eq('student_id', studentId)
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get student's class
  const { data: student } = await supabase
    .from('students')
    .select('class_id, classes(name, grade)')
    .eq('id', studentId)
    .single();

  // Analyze the data - group by course_type
  const courseTypeBreakdown: Record<string, { count: number; assessmentCodes: string[] }> = {};
  const classIdSet = new Set([student?.class_id]);

  let debugStats = { total: 0, noExamData: 0, wrongClass: 0, wrongCourseType: 0, passed: 0 };

  for (const s of scores || []) {
    const examData = (s as any).exam as { course_id: string; term: number | null; course: { id: string; class_id: string; course_type: string } } | null;

    debugStats.total++;

    if (!examData?.course_id || !examData?.course) {
      debugStats.noExamData++;
      continue;
    }

    if (!classIdSet.has(examData.course.class_id)) {
      debugStats.wrongClass++;
      continue;
    }

    const ct = examData.course.course_type;
    if (!courseTypeBreakdown[ct]) {
      courseTypeBreakdown[ct] = { count: 0, assessmentCodes: [] };
    }
    courseTypeBreakdown[ct].count++;
    if (!courseTypeBreakdown[ct].assessmentCodes.includes(s.assessment_code)) {
      courseTypeBreakdown[ct].assessmentCodes.push(s.assessment_code);
    }

    if (courseType && ct !== courseType) {
      debugStats.wrongCourseType++;
      continue;
    }

    debugStats.passed++;
  }

  // Get courses for this student's class
  const { data: courses } = await supabase
    .from('courses')
    .select('id, course_type')
    .eq('class_id', student?.class_id || '')
    .eq('is_active', true);

  const classData = student?.classes as { name: string; grade: number } | { name: string; grade: number }[] | null;
  const classInfo = Array.isArray(classData) ? classData[0] : classData;

  // Get total score count for diagnosis
  const { count: totalScoreCount } = await supabase
    .from('scores')
    .select('*', { count: 'exact', head: true });

  // Get total student count
  const { count: totalStudentCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });

  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    databaseStats: {
      totalScores: totalScoreCount,
      totalStudents: totalStudentCount,
    },
    studentId,
    studentClassId: student?.class_id,
    studentClassName: classInfo?.name,
    studentGrade: classInfo?.grade,
    requestedCourseType: courseType,
    totalScoresFromQuery: count,
    debugStats,
    courseTypeBreakdown,
    coursesInClass: courses?.map(c => ({ id: c.id, course_type: c.course_type })),
    message: debugStats.passed === 0
      ? `No ${courseType} scores found for this student. Check courseTypeBreakdown for available course types.`
      : `Found ${debugStats.passed} ${courseType} scores.`,
  });
}
