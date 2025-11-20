/*
  # Confirm Test User Email
  
  1. Changes
    - Mark test user email as confirmed
    - Update email_confirmed_at timestamp
    
  2. Security
    - Only affects test user
*/

-- Confirm email for test@innerlog.app
UPDATE auth.users
SET 
  email_confirmed_at = now(),
  updated_at = now(),
  confirmation_token = ''
WHERE email = 'test@innerlog.app'
  AND email_confirmed_at IS NULL;

-- Also confirm for any other test users
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at = now()
WHERE email IN ('testuser@innerlog.app', 'newtestuser@innerlog.app');
