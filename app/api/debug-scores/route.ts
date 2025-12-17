import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId') || '3ceeed06-0ca5-47e2-9a88-5c1a551b78f7';

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
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get student's class
  const { data: student } = await supabase
    .from('students')
    .select('class_id, classes(name)')
    .eq('id', studentId)
    .single();

  // Analyze the data
  const classData = student?.classes as { name: string } | { name: string }[] | null;
  const className = Array.isArray(classData) ? classData[0]?.name : classData?.name;
  const result = {
    studentId,
    studentClassId: student?.class_id,
    studentClassName: className,
    totalScores: count,
    returnedScores: scores?.length,
    sampleScore: scores?.[0] || null,
    examDataAnalysis: scores?.[0] ? {
      hasExam: !!(scores[0] as any).exam,
      examCourseId: (scores[0] as any).exam?.course_id,
      examTerm: (scores[0] as any).exam?.term,
      examTermType: typeof (scores[0] as any).exam?.term,
      hasCourse: !!(scores[0] as any).exam?.course,
      courseClassId: (scores[0] as any).exam?.course?.class_id,
      courseType: (scores[0] as any).exam?.course?.course_type,
      classIdMatch: (scores[0] as any).exam?.course?.class_id === student?.class_id,
    } : null,
  };

  return NextResponse.json(result);
}
