-- Script to re-enable RLS after testing
-- Run this after testing to restore security policies

-- Re-enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;  
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_titles ENABLE ROW LEVEL SECURITY;

-- Display current RLS status for verification
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;