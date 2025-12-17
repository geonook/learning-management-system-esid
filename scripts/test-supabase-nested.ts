import { createClient } from '@supabase/supabase-js';

// Use staging database
const supabase = createClient(
  'https://kqvpcoolgyhjqleekmee.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function test() {
  console.log('Testing staging database...');

  // Get specific student we know has scores
  const studentId = '3ceeed06-0ca5-47e2-9a88-5c1a551b78f7';  // From our SQL query

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
    console.log('Error:', error);
    return;
  }

  console.log('Scores found:', scores?.length, 'total:', count);

  if (scores && scores.length > 0) {
    console.log('\nFirst score structure:');
    console.log(JSON.stringify(scores[0], null, 2));

    // Check exam data structure
    const examData = (scores[0] as any).exam;
    console.log('\nexamData:', examData);
    console.log('examData.course_id:', examData?.course_id);
    console.log('examData.term:', examData?.term, '(type:', typeof examData?.term, ')');
    console.log('examData.course:', examData?.course);
    console.log('examData.course.class_id:', examData?.course?.class_id);

    // Check class_id for filtering
    const classId = examData?.course?.class_id;
    console.log('\nFiltering check:');
    console.log('class_id from score:', classId);

    // Get student's actual class
    const { data: student } = await supabase
      .from('students')
      .select('class_id')
      .eq('id', studentId)
      .single();
    console.log('student.class_id:', student?.class_id);
    console.log('Match:', classId === student?.class_id);
  }
}

test();
