-- # Add parent_id to AI Proposals Table
--
-- 1. Changes
--    - Add `parent_id` column to track regeneration history
--    - Add `version` column to track version number
--    - Add foreign key constraint for parent_id
--
-- 2. Purpose
--    - Track which proposal was regenerated from another
--    - Allow viewing history of regenerations
--    - Maintain genealogy of proposals

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_proposals' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE ai_proposals ADD COLUMN parent_id uuid REFERENCES ai_proposals(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_proposals' AND column_name = 'version'
  ) THEN
    ALTER TABLE ai_proposals ADD COLUMN version integer NOT NULL DEFAULT 1;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_proposals_parent_id ON ai_proposals(parent_id);
