/*
  # Add profile fields to user_settings table

  1. Changes
    - Add `trader_name` column to store user's trading name
    - Add `avatar_url` column to store user's avatar image URL
  
  2. Notes
    - These fields replace the need to use auth.users.user_metadata
    - Provides more reliable storage for profile information
    - No data migration needed as these are new fields with nullable values
*/

-- Add profile fields to user_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'trader_name'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN trader_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN avatar_url text;
  END IF;
END $$;