/*
  # Set demo user password

  1. Purpose
    - Set password for demo user takuan_1000@yahoo.co.jp
    - This user has 1,630 demo trades from 2025-03-31 to 2025-11-04

  2. Changes
    - Update encrypted_password for takuan_1000@yahoo.co.jp
    - Password: demo2025
*/

DO $$
BEGIN
  UPDATE auth.users 
  SET 
    encrypted_password = crypt('demo2025', gen_salt('bf')),
    updated_at = NOW()
  WHERE email = 'takuan_1000@yahoo.co.jp';

  IF FOUND THEN
    RAISE NOTICE 'Demo user password updated. Email: takuan_1000@yahoo.co.jp, Password: demo2025';
  ELSE
    RAISE NOTICE 'User takuan_1000@yahoo.co.jp not found';
  END IF;
END $$;
