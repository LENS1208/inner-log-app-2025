/*
  # Add Admin Role to User Settings

  1. Changes
    - Add `is_admin` column to user_settings table (default: false)
    - Add RLS policy to protect is_admin column from unauthorized updates
    - Add RLS policy to allow admins to read all user settings

  2. Security
    - is_admin column cannot be modified by regular users
    - Only admins can read all users' data
    - Regular users can only read their own data
*/

-- Add is_admin column
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false NOT NULL;

-- Drop existing read policy
DROP POLICY IF EXISTS "Users can read own settings" ON user_settings;

-- Create new read policy that allows admins to read all data
CREATE POLICY "Users can read own settings or admins can read all"
  ON user_settings
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    (SELECT is_admin FROM user_settings WHERE user_id = auth.uid()) = true
  );

-- Ensure is_admin cannot be changed by regular users
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;

CREATE POLICY "Users can update own settings except is_admin"
  ON user_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    is_admin = (SELECT is_admin FROM user_settings WHERE user_id = auth.uid())
  );
