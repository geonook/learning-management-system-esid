import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function test() {
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 50) + '...');

  // Get a G3 student
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, student_id, class_id, classes!inner(name, grade, academic_year)')
    .eq('classes.academic_year', '2025-2026')
    .eq('is_active', true)
    .limit(5);

  console.log('Students found:', students?.length);
  if (studentsError) console.log('Students error:', studentsError);
  if (students && students.length > 0) {
    console.log('Sample student:', JSON.stringify(students[0], null, 2));

    const studentIds = students.map(s => s.id);

    // Now query scores with nested join
    const { data: scores, error } = await supabase
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
      .in('student_id', studentIds)
      .limit(5);

    if (error) {
      console.log('Error:', error);
    } else {
      console.log('Scores found:', scores?.length);
      if (scores && scores.length > 0) {
        console.log('Sample score structure:', JSON.stringify(scores[0], null, 2));
        const examData = (scores[0] as any).exam;
        console.log('exam.term type:', typeof examData?.term, 'value:', examData?.term);
      }
    }
  }
}

test();
