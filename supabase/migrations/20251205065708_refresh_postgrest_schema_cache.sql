/*
  # Refresh PostgREST Schema Cache

  1. Purpose
    - Notify PostgREST to reload its schema cache
    - Ensures get_admin_auth_users() function is available via REST API

  2. Changes
    - Send NOTIFY signal to PostgREST
    - This resolves 404 errors when calling RPC functions
*/

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
