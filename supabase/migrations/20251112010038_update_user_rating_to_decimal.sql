/*
  # Update user rating to support half-star ratings

  1. Changes
    - Modify `user_rating` column in `ai_proposals` table to support decimal values
    - Change type from integer to numeric(2,1) to allow values like 4.5
    - Update constraint to accept values between 1.0 and 5.0 in 0.5 increments

  2. Notes
    - Users can now rate AI proposals from 1.0 to 5.0 in 0.5 increments (10 levels)
    - Examples: 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0
    - Validation ensures only valid half-star ratings can be stored
*/

DO $$
BEGIN
  ALTER TABLE ai_proposals DROP CONSTRAINT IF EXISTS user_rating_check;
  
  ALTER TABLE ai_proposals ALTER COLUMN user_rating TYPE numeric(2,1);
  
  ALTER TABLE ai_proposals ADD CONSTRAINT user_rating_check 
    CHECK (user_rating >= 1.0 AND user_rating <= 5.0 AND (user_rating * 2) = floor(user_rating * 2));
END $$;