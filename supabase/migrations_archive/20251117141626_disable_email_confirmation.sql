/*
  # Disable Email Confirmation Requirement

  1. Purpose
    - Disable the email confirmation requirement for authentication
    - This allows users to log in immediately after signup without email verification
  
  2. Changes
    - Update Supabase auth configuration to disable email confirmation
    - Confirm all existing unconfirmed users
  
  3. Security Notes
    - This is appropriate for development/testing environments
    - For production, consider re-enabling email confirmation for better security
*/

-- Confirm all existing unconfirmed users
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmation_token = '',
  updated_at = now()
WHERE email_confirmed_at IS NULL;

-- Note: Email confirmation requirement must be disabled in Supabase Dashboard
-- Go to: Authentication → Providers → Email → Disable "Confirm email"
