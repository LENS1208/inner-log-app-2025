/*
  # Reset Test User Password for New Database (Fixed)

  1. Purpose
    - Ensure test user kan.yamaji@gmail.com has correct password in the new database
    - Password: test2025
  
  2. Changes
    - Update encrypted_password for kan.yamaji@gmail.com
    - Set email_confirmed_at to ensure email is confirmed
    - Do NOT update confirmed_at (it's a generated column)
*/

DO $$
DECLARE
  user_count integer;
BEGIN
  -- Check if user exists
  SELECT COUNT(*) INTO user_count
  FROM auth.users
  WHERE email = 'kan.yamaji@gmail.com';

  IF user_count = 0 THEN
    RAISE EXCEPTION 'User kan.yamaji@gmail.com not found in database';
  END IF;

  -- Reset password (without confirmed_at)
  UPDATE auth.users
  SET 
    encrypted_password = crypt('test2025', gen_salt('bf')),
    email_confirmed_at = now(),
    updated_at = now()
  WHERE email = 'kan.yamaji@gmail.com';

  RAISE NOTICE 'Password reset successful for kan.yamaji@gmail.com';
  RAISE NOTICE 'Email: kan.yamaji@gmail.com';
  RAISE NOTICE 'Password: test2025';
END $$;