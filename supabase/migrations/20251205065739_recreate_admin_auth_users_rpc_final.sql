/*
  # Recreate Admin Auth Users RPC Function (Final)

  1. Purpose
    - Drop and recreate get_admin_auth_users() to ensure PostgREST recognizes it
    - Fix 404 errors when calling the RPC from frontend

  2. Changes
    - Drop existing function completely
    - Recreate with exact same signature
    - Grant proper permissions
    - Send schema reload notification

  3. Security
    - Function checks is_admin flag before returning data
    - Only authenticated users with admin privileges can access
*/

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_admin_auth_users() CASCADE;

-- Recreate the function
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
  FROM auth.users au
  ORDER BY au.created_at DESC;
END;
$$;

-- Revoke all default permissions
REVOKE ALL ON FUNCTION public.get_admin_auth_users() FROM PUBLIC;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION public.get_admin_auth_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_auth_users() TO service_role;

-- Add documentation
COMMENT ON FUNCTION public.get_admin_auth_users() IS 
'Returns auth.users data (id, email, created_at, last_sign_in_at) for admin users only. Requires is_admin = true in user_settings.';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
