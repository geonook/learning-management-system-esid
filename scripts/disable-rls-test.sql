-- Temporary script to disable RLS for testing
-- This will help identify if RLS policies are causing stack depth errors

-- Disable RLS on all tables temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;  
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_titles DISABLE ROW LEVEL SECURITY;

-- Display current RLS status for verification
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;