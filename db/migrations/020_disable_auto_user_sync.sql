-- Migration 020: Disable Auto User Sync Trigger
-- This trigger conflicts with the manual user creation logic in the OAuth callback
-- and causes "Database error creating new user" when it fails.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_auth_user();
