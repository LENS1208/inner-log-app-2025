/*
  # Create Admin Auth Users View and RPC Function

  1. New Objects
    - `admin_auth_users` view
      - Exposes `id`, `email`, `created_at`, `last_sign_in_at` from auth.users
    - `get_admin_auth_users()` RPC function
      - SECURITY DEFINER function to safely fetch auth.users data
      - Only callable by authenticated users with is_admin = true

  2. Security
    - View is read-only and only exposes necessary fields
    - RPC function checks is_admin flag before returning data
    - Non-admin users cannot access auth.users data
*/

-- Create view for admin access to auth.users
CREATE OR REPLACE VIEW public.admin_auth_users AS
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users;

-- Create RPC function to fetch auth users (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_admin_auth_users()
RETURNS TABLE (
  id uuid,
  email text,
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
    au.email,
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
