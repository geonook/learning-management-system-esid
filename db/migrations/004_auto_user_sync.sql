-- =====================================================
-- Database Migration: 004 - Automatic User Synchronization
-- =====================================================
-- Purpose: Automatically sync auth.users to public.users
-- Created: 2025-10-16
-- Phase: User Registration & Management System (Phase 2)
-- =====================================================

-- Description:
-- This migration creates a PostgreSQL trigger that automatically
-- creates a record in public.users when a new user is created
-- in auth.users (via Google OAuth or email signup).
--
-- New users are created with is_active = false by default,
-- requiring admin approval before they can access the system.

-- =====================================================
-- Function: handle_new_auth_user
-- =====================================================
-- Automatically creates a corresponding record in public.users
-- when a new user is inserted into auth.users
--
-- Behavior:
-- - Extracts email from auth.users
-- - Extracts full_name from user metadata (if available)
-- - Sets default role to 'teacher'
-- - Sets is_active to false (requires admin approval)
-- - Uses ON CONFLICT DO NOTHING to prevent duplicate inserts

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert new user into public.users
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    teacher_type,
    grade,
    campus,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    -- Try to get full_name from user metadata, fallback to email
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    'teacher',  -- Default role
    NULL,       -- teacher_type will be set during role-select
    NULL,       -- grade will be set during role-select
    NULL,       -- campus will be set during role-select
    false,      -- Requires admin approval
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;  -- Prevent duplicate inserts

  RETURN NEW;
END;
$$;

-- =====================================================
-- Trigger: on_auth_user_created
-- =====================================================
-- Fires AFTER a new record is inserted into auth.users
-- Calls handle_new_auth_user() to create public.users record

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

-- =====================================================
-- Grant Permissions
-- =====================================================
-- Ensure the trigger function can access both auth and public schemas

GRANT USAGE ON SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres, service_role;

-- =====================================================
-- Verification Queries
-- =====================================================
-- Run these queries after migration to verify setup:

-- 1. Check if function exists:
-- SELECT routine_name
-- FROM information_schema.routines
-- WHERE routine_name = 'handle_new_auth_user';

-- 2. Check if trigger exists:
-- SELECT trigger_name
-- FROM information_schema.triggers
-- WHERE trigger_name = 'on_auth_user_created';

-- 3. Test the trigger (optional - only if needed):
-- INSERT INTO auth.users (instance_id, id, email, encrypted_password)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   gen_random_uuid(),
--   'test@example.com',
--   crypt('testpassword', gen_salt('bf'))
-- );

-- 4. Verify user was created in public.users:
-- SELECT id, email, full_name, role, is_active
-- FROM public.users
-- WHERE email = 'test@example.com';

-- =====================================================
-- Rollback Instructions
-- =====================================================
-- If you need to rollback this migration:
--
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS handle_new_auth_user();
--
-- Note: This will not delete existing records in public.users
-- =====================================================

-- =====================================================
-- Notes
-- =====================================================
-- 1. This trigger only handles NEW user creation
-- 2. It does NOT update existing users
-- 3. Users created via this trigger will have is_active = false
-- 4. Admin must manually approve users via the Admin Panel
-- 5. The role-select flow will UPDATE the user record with
--    proper role, teacher_type, grade, and campus information
-- =====================================================

-- End of Migration 004
