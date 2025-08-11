-- View-based RLS Policies for LMS-ESID
-- Simplified RLS policies that work with views to avoid recursion

-- Note: Views automatically inherit RLS from base tables, but we can add 
-- additional view-specific policies for extra security

-- Enable RLS on views (optional, as they inherit from base tables)
-- Views inherit RLS from their underlying tables automatically
-- But we can add view-specific policies if needed

-- Simple helper functions that DON'T cause recursion
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_current_user_role_simple()
RETURNS user_role
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT role FROM users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_current_user_grade_track_simple()
RETURNS TABLE(user_grade INTEGER, user_track track_type)
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT grade, track FROM users WHERE id = auth.uid() LIMIT 1;
$$;

-- Alternative: Use application-level filtering instead of RLS for views
-- This avoids the recursion issue entirely

-- View access control will be handled at the application level:
-- 1. Query the user's role/permissions first
-- 2. Then filter the view results based on those permissions
-- 3. This avoids recursive RLS policy evaluation

-- For now, let's create simple policies that check user ID directly without complex joins

-- Teacher Classes View Policy (if we enable RLS on views)
-- CREATE POLICY "Users can see their own classes" ON teacher_classes_view
--   FOR SELECT USING (teacher_id = auth.uid());

-- CREATE POLICY "Admins can see all classes" ON teacher_classes_view
--   FOR SELECT USING (get_current_user_role_simple() = 'admin');

-- CREATE POLICY "Head teachers can see classes in their grade/track" ON teacher_classes_view
--   FOR SELECT USING (
--     get_current_user_role_simple() = 'head' 
--     AND EXISTS(
--       SELECT 1 FROM get_current_user_grade_track_simple() gt
--       WHERE gt.user_grade = teacher_classes_view.grade 
--         AND gt.user_track = teacher_classes_view.track
--     )
--   );

-- For now, we'll rely on application-level filtering to avoid RLS complexity
-- Views will be queried with appropriate WHERE clauses in the API layer

-- Example API-level filtering:
-- - Teacher: WHERE teacher_id = current_user_id
-- - Head: WHERE grade = current_user_grade AND track = current_user_track
-- - Admin: no filter (see all)

-- This approach is:
-- 1. More predictable
-- 2. Easier to debug
-- 3. Avoids RLS recursion issues
-- 4. Still secure when implemented correctly in the API layer