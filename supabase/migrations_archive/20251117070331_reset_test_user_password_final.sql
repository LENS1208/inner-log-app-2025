/*
  # Reset Test User Password - Final Fix
  
  1. Changes
    - Reset password for test@innerlog.app to 'test2025'
    - Use proper password hashing with crypt function
    
  2. Security
    - This is for test user only
*/

-- Reset password for test user
UPDATE auth.users
SET 
  encrypted_password = crypt('test2025', gen_salt('bf')),
  updated_at = now()
WHERE email = 'test@innerlog.app';
