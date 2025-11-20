/*
  # Add user rating to AI proposals

  1. Changes
    - Add `user_rating` column to `ai_proposals` table
      - Type: integer (1-5 stars)
      - Nullable: true (no rating by default)
      - Constraint: value must be between 1 and 5

  2. Notes
    - Users can rate AI proposals from 1 to 5 stars
    - Rating is optional and can be null
    - Validation ensures only valid star ratings (1-5) can be stored
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_proposals' AND column_name = 'user_rating'
  ) THEN
    ALTER TABLE ai_proposals ADD COLUMN user_rating integer;
    ALTER TABLE ai_proposals ADD CONSTRAINT user_rating_check CHECK (user_rating >= 1 AND user_rating <= 5);
  END IF;
END $$;