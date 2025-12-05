/*
  # Fix Admin Auth Users RPC Function Type

  1. Changes
    - Update `get_admin_auth_users()` function to match auth.users column types
    - Change email type from text to varchar to match auth.users schema

  2. Notes
    - auth.users.email is varchar(255), not text
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_admin_auth_users();

-- Recreate with correct types
CREATE OR REPLACE FUNCTION public.get_admin_auth_users()
RETURNS TABLE (
  id uuid,
  email varchar,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Return auth.users data
  RETURN QUERY
  SELECT 
    au.id,
    au.email::varchar,
    au.created_at,
    au.last_sign_in_at
  FROM auth.users au;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_admin_auth_users() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_admin_auth_users() IS 
'Returns auth.users data for admin users only. Requires is_admin flag in user_settings.';
