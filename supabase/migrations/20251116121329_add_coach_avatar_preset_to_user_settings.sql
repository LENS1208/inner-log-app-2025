/*
  # Add coach avatar preset setting

  1. Changes
    - Add `coach_avatar_preset` column to `user_settings` table
      - Stores the selected coach avatar preset identifier
      - Default value is 'teacher' (the current image)
      - Type: text
  
  2. Notes
    - This allows users to select from predefined coach avatar images
    - Future-proof for adding more avatar/video presets
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'coach_avatar_preset'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN coach_avatar_preset text DEFAULT 'teacher';
  END IF;
END $$;