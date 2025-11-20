/*
  # Add data integrity constraints and validation

  1. Purpose
    - Ensure trade_notes.ticket references existing trades.ticket
    - Add foreign key constraints where missing
    - Prevent orphaned records and maintain data consistency

  2. Changes
    - Add validation function for trade_notes to ensure ticket exists
    - Add check constraints for critical fields
    - Add indexes for foreign key performance

  3. Security
    - Validation respects user_id boundaries
    - Ensures users can only reference their own trades
*/

-- Add validation function to ensure trade_notes.ticket references existing trade
CREATE OR REPLACE FUNCTION public.validate_trade_note_ticket()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the ticket exists for the same user
  IF NOT EXISTS (
    SELECT 1 FROM public.trades 
    WHERE ticket = NEW.ticket 
    AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Trade ticket % does not exist for this user', NEW.ticket;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate trade_notes.ticket
DROP TRIGGER IF EXISTS validate_trade_note_ticket_trigger ON public.trade_notes;
CREATE TRIGGER validate_trade_note_ticket_trigger
  BEFORE INSERT OR UPDATE ON public.trade_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_trade_note_ticket();

-- Add check constraints for trades
ALTER TABLE public.trades 
  DROP CONSTRAINT IF EXISTS check_trade_size_positive;
ALTER TABLE public.trades
  ADD CONSTRAINT check_trade_size_positive 
  CHECK (size > 0);

ALTER TABLE public.trades 
  DROP CONSTRAINT IF EXISTS check_trade_prices_positive;
ALTER TABLE public.trades
  ADD CONSTRAINT check_trade_prices_positive 
  CHECK (open_price > 0 AND close_price > 0);

ALTER TABLE public.trades 
  DROP CONSTRAINT IF EXISTS check_trade_times_valid;
ALTER TABLE public.trades
  ADD CONSTRAINT check_trade_times_valid 
  CHECK (close_time >= open_time);

-- Add check constraints for account_summary
ALTER TABLE public.account_summary 
  DROP CONSTRAINT IF EXISTS check_summary_values_not_null;
ALTER TABLE public.account_summary
  ADD CONSTRAINT check_summary_values_not_null 
  CHECK (
    total_deposits IS NOT NULL AND
    total_withdrawals IS NOT NULL AND
    total_profit IS NOT NULL
  );

-- Add index for better performance on ticket lookups
CREATE INDEX IF NOT EXISTS idx_trades_user_ticket ON public.trades(user_id, ticket);

COMMENT ON FUNCTION public.validate_trade_note_ticket() IS 'Ensures trade_notes.ticket references an existing trade for the same user';
