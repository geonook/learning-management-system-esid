import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const testStudentId = '03a27609-4e3a-4b17-846d-afff580476ae'; // G3 Achievers IT student from production

  // Get database info
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Test 1: Simple scores query (no join)
  const { data: simpleScores, count: simpleCount, error: simpleError } = await supabase
    .from('scores')
    .select('*', { count: 'exact' })
    .eq('student_id', testStudentId)
    .limit(5);

  // Test 2: Single level join (exam only)
  const { data: singleJoin, count: singleCount, error: singleError } = await supabase
    .from('scores')
    .select(`
      student_id,
      assessment_code,
      score,
      exam:exams!inner(
        id,
        course_id,
        term
      )
    `, { count: 'exact' })
    .eq('student_id', testStudentId)
    .limit(5);

  // Test 3: Double nested join (exam → course) - THE PROBLEMATIC ONE
  const { data: doubleJoin, count: doubleCount, error: doubleError } = await supabase
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
    .eq('student_id', testStudentId)
    .limit(5);

  // Test 4: Double join WITHOUT !inner on courses
  const { data: doubleJoinNoInner, count: doubleNoInnerCount, error: doubleNoInnerError } = await supabase
    .from('scores')
    .select(`
      student_id,
      assessment_code,
      score,
      exam:exams!inner(
        course_id,
        term,
        course:courses(
          id,
          class_id,
          course_type
        )
      )
    `, { count: 'exact' })
    .eq('student_id', testStudentId)
    .limit(5);

  // Test 5: Get a student that exists in this database
  const { data: anyStudent } = await supabase
    .from('students')
    .select('id, student_id, full_name')
    .limit(1)
    .single();

  // Test 6: If we found a student, query their scores with double join
  let studentScores = null;
  let studentScoresError = null;
  if (anyStudent) {
    const result = await supabase
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
      .eq('student_id', anyStudent.id)
      .limit(5);
    studentScores = result.data;
    studentScoresError = result.error;
  }

  // Database stats
  const { count: totalScores } = await supabase
    .from('scores')
    .select('*', { count: 'exact', head: true });

  const { count: totalStudents } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });

  return NextResponse.json({
    supabaseUrl,
    databaseStats: {
      totalScores,
      totalStudents,
    },
    testResults: {
      test1_simple: {
        description: 'Simple scores query (no join)',
        count: simpleCount,
        dataLength: simpleScores?.length,
        error: simpleError?.message,
        sample: simpleScores?.[0],
      },
      test2_singleJoin: {
        description: 'Single level join (exam only)',
        count: singleCount,
        dataLength: singleJoin?.length,
        error: singleError?.message,
        sample: singleJoin?.[0],
      },
      test3_doubleJoin: {
        description: 'Double nested join with !inner (exam → course)',
        count: doubleCount,
        dataLength: doubleJoin?.length,
        error: doubleError?.message,
        sample: doubleJoin?.[0],
      },
      test4_doubleJoinNoInner: {
        description: 'Double join WITHOUT !inner on courses',
        count: doubleNoInnerCount,
        dataLength: doubleJoinNoInner?.length,
        error: doubleNoInnerError?.message,
        sample: doubleJoinNoInner?.[0],
      },
      test5_anyStudent: {
        description: 'First student from database',
        student: anyStudent,
      },
      test6_studentScores: {
        description: 'Double join with actual database student',
        dataLength: studentScores?.length,
        error: studentScoresError?.message,
        sample: studentScores?.[0],
      },
    },
  });
}
