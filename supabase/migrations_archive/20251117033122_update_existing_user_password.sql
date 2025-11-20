/*
  # Update Existing User Password

  This migration updates the password for the user who owns the trade data.
  
  1. Changes
    - Updates password for user ID: 4e4b6842-84ea-45a4-a8d0-e31a133bf054
    - Email: takuan_1000@yahoo.co.jp
    - New password: test2025
    - Confirms email if not already confirmed
  
  2. Data Integrity
    - Preserves all existing trade data relationships
    - This user has 48 trades in the system
*/

-- Update the password for the user who owns the trades
UPDATE auth.users
SET 
  encrypted_password = crypt('test2025', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  updated_at = NOW()
WHERE id = '4e4b6842-84ea-45a4-a8d0-e31a133bf054';

-- Also update the new user's password for consistency
UPDATE auth.users
SET 
  encrypted_password = crypt('test2025', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'kan.yamaji@gmail.com';
