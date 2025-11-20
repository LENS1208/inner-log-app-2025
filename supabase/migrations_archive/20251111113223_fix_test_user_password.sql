/*
  # Fix test user password

  1. Purpose
    - Reset password for test user kan.yamaji@gmail.com to 'test2025'
    - Ensure password is correctly encrypted for the new database

  2. Changes
    - Update encrypted_password for existing user
    - Password: test2025
*/

DO $$
BEGIN
  UPDATE auth.users 
  SET 
    encrypted_password = crypt('test2025', gen_salt('bf')),
    updated_at = NOW()
  WHERE email = 'kan.yamaji@gmail.com';

  RAISE NOTICE 'Test user password updated. Email: kan.yamaji@gmail.com, Password: test2025';
END $$;
