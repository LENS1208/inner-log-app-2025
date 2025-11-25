/*
  # Make proposal_data nullable and add default

  1. Changes
    - Make proposal_data column nullable in ai_proposals table
    - This allows saving proposals using individual columns (hero_data, daily_actions, etc.)
    - The proposal_data column can be used for backward compatibility or as a complete data store
*/

ALTER TABLE ai_proposals 
  ALTER COLUMN proposal_data DROP NOT NULL,
  ALTER COLUMN proposal_data SET DEFAULT '{}'::jsonb;