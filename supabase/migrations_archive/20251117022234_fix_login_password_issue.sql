/*
  # Fix login password issue
  
  1. Purpose
    - Reset password for kan.yamaji@gmail.com to ensure login works
    - Password: test2025
  
  2. Changes
    - Update encrypted_password using crypt function
    - Ensure email_confirmed_at is set (required for login)
*/

DO $$
DECLARE
  user_id uuid;
BEGIN
  -- Get user ID
  SELECT id INTO user_id 
  FROM auth.users 
  WHERE email = 'kan.yamaji@gmail.com';
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User kan.yamaji@gmail.com not found';
  END IF;
  
  -- Update password and ensure email is confirmed
  UPDATE auth.users 
  SET 
    encrypted_password = crypt('test2025', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW()
  WHERE id = user_id;
  
  RAISE NOTICE 'Password updated for kan.yamaji@gmail.com (Password: test2025)';
END $$;
