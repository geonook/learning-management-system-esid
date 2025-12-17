import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gradeBand = searchParams.get('gradeBand') || '3-4';
  const courseType = searchParams.get('courseType') || 'IT';
  const academicYear = searchParams.get('academicYear') || '2025-2026';
  const term = searchParams.get('term'); // Can be null for "all"
  const useServiceRole = searchParams.get('serviceRole') === 'true';

  // Use service role to bypass RLS for debugging
  const supabase = useServiceRole ? createServiceRoleClient() : await createClient();

  // Check auth (only for regular client)
  let user = null;
  if (!useServiceRole) {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  // Parse grade band
  const grades = gradeBand.includes('-')
    ? Array.from({ length: parseInt(gradeBand.split('-')[1]) - parseInt(gradeBand.split('-')[0]) + 1 }, (_, i) => parseInt(gradeBand.split('-')[0]) + i)
    : [parseInt(gradeBand)];

  // 1. Get students
  const { data: students, count: studentCount, error: studentError } = await supabase
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
    .eq('classes.academic_year', academicYear)
    .eq('is_active', true)
    .limit(10);

  if (studentError) {
    return NextResponse.json({ error: 'Students query failed', details: studentError.message });
  }

  const studentIds = students?.map(s => s.id) || [];
  const classIds = [...new Set(students?.map(s => s.class_id) || [])];

  // 2. Get courses
  if (classIds.length === 0) {
    return NextResponse.json({
      error: 'No students found',
      params: { gradeBand, courseType, academicYear, term },
      auth: { isAuthenticated: !!user, userId: user?.id },
    });
  }

  const { data: courses, error: courseError } = await supabase
    .from('courses')
    .select('id, class_id, course_type')
    .in('class_id', classIds)
    .eq('is_active', true)
    .eq('academic_year', academicYear)
    .eq('course_type', courseType);

  if (courseError) {
    return NextResponse.json({ error: 'Courses query failed', details: courseError.message });
  }

  // 3. Get scores with nested join
  if (studentIds.length === 0) {
    return NextResponse.json({
      error: 'No student IDs',
      params: { gradeBand, courseType, academicYear, term },
    });
  }

  const { data: scores, count: scoresCount, error: scoresError } = await supabase
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
    .in('student_id', studentIds)
    .limit(100);

  if (scoresError) {
    return NextResponse.json({ error: 'Scores query failed', details: scoresError.message });
  }

  // Process scores like gradeband-statistics.ts does
  const classIdSet = new Set(classIds);
  const debugStats = { total: 0, noExamData: 0, wrongClass: 0, wrongCourseType: 0, wrongTerm: 0, passed: 0 };
  const processedScores: Array<{ student_id: string; course_id: string; assessment_code: string; score: number | null; term: number | null }> = [];

  for (const s of scores || []) {
    debugStats.total++;
    const examData = s.exam as unknown as { course_id: string; term: number | null; course: { id: string; class_id: string; course_type: string } } | null;

    if (!examData?.course_id || !examData?.course) {
      debugStats.noExamData++;
      continue;
    }

    if (!classIdSet.has(examData.course.class_id)) {
      debugStats.wrongClass++;
      continue;
    }

    if (courseType && examData.course.course_type !== courseType) {
      debugStats.wrongCourseType++;
      continue;
    }

    // Term filter (term param can be null for "all")
    if (term && examData.term !== Number(term)) {
      debugStats.wrongTerm++;
      continue;
    }

    debugStats.passed++;
    processedScores.push({
      student_id: s.student_id,
      course_id: examData.course.id,
      assessment_code: s.assessment_code,
      score: s.score,
      term: examData.term,
    });
  }

  // Group scores by student
  const scoresByStudent = new Map<string, typeof processedScores>();
  for (const score of processedScores) {
    if (!scoresByStudent.has(score.student_id)) {
      scoresByStudent.set(score.student_id, []);
    }
    scoresByStudent.get(score.student_id)!.push(score);
  }

  return NextResponse.json({
    params: { gradeBand, courseType, academicYear, term, termType: typeof term },
    auth: { isAuthenticated: !!user || useServiceRole, userId: user?.id, email: user?.email, usingServiceRole: useServiceRole },
    students: {
      count: studentCount,
      sample: students?.slice(0, 3).map(s => ({
        id: s.id,
        student_id: s.student_id,
        class_id: s.class_id,
        class: (s.classes as unknown as { name: string; grade: number }),
      })),
      classIds,
    },
    courses: {
      count: courses?.length,
      sample: courses?.slice(0, 3),
    },
    scores: {
      rawCount: scoresCount,
      debugStats,
      processedCount: processedScores.length,
      sampleRaw: scores?.slice(0, 2),
      sampleProcessed: processedScores.slice(0, 5),
      studentsWithScores: scoresByStudent.size,
    },
  });
}
