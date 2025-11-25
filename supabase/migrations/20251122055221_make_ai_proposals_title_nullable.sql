/*
  # Make AI Proposals Title Nullable

  1. Changes
    - Make title column nullable in ai_proposals table
    - This allows saving proposals without requiring a title upfront
*/

ALTER TABLE ai_proposals 
  ALTER COLUMN title DROP NOT NULL;