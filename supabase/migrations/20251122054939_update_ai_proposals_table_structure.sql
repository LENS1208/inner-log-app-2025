/*
  # Update AI Proposals Table Structure

  1. Changes
    - Add missing columns for proposal data
    - pair (text) - currency pair
    - timeframe (text) - analysis timeframe
    - bias (text) - trading bias (BUY/SELL/NEUTRAL)
    - confidence (integer) - confidence level
    - hero_data (jsonb) - hero section data
    - daily_actions (jsonb) - daily actions data
    - scenario (jsonb) - scenario data
    - ideas (jsonb) - trade ideas
    - factors (jsonb) - market factors
    - notes (jsonb) - additional notes
    - is_fixed (boolean) - whether proposal is fixed
    - prompt (text) - user prompt
    - version (integer) - version number
    
  2. Migration Strategy
    - Add new columns with defaults
    - Keep existing columns for backward compatibility
*/

-- Add new columns to ai_proposals table
ALTER TABLE ai_proposals 
  ADD COLUMN IF NOT EXISTS pair text,
  ADD COLUMN IF NOT EXISTS timeframe text,
  ADD COLUMN IF NOT EXISTS bias text,
  ADD COLUMN IF NOT EXISTS confidence integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hero_data jsonb,
  ADD COLUMN IF NOT EXISTS daily_actions jsonb,
  ADD COLUMN IF NOT EXISTS scenario jsonb,
  ADD COLUMN IF NOT EXISTS ideas jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS factors jsonb,
  ADD COLUMN IF NOT EXISTS notes jsonb,
  ADD COLUMN IF NOT EXISTS is_fixed boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS prompt text,
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;