/*
  # Fix is_admin Function NULL Handling

  1. Purpose
    - Ensure is_admin() returns false instead of NULL when user has no settings
    - Prevents errors in get_admin_auth_users() function

  2. Changes
    - Add COALESCE to return false when user_settings record doesn't exist
    - Improve stability of admin checks

  3. Security
    - Maintains security by defaulting to false (no access)
*/

-- Recreate is_admin function with proper NULL handling
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT is_admin
      FROM user_settings
      WHERE user_id = auth.uid()
      LIMIT 1
    ),
    false
  );
END;
$$;

-- Add documentation
COMMENT ON FUNCTION public.is_admin() IS 
'Returns true if current user has is_admin flag set in user_settings, false otherwise.';
