/*
  # Add dataset column to account_summary and account_transactions

  1. Purpose
    - Add `dataset` column to account_summary table for multi-dataset support
    - Add `dataset` column to account_transactions table for multi-dataset support
    - Modify unique constraints to include dataset
    - Add swap_positive and swap_negative columns if they don't exist

  2. Changes
    - Drop existing unique constraint on account_summary(user_id)
    - Add dataset column with default value 'default'
    - Add new unique constraint on account_summary(user_id, dataset)
    - Add dataset column to account_transactions
    - Add swap_positive and swap_negative columns to account_summary
    - Update existing data to use 'default' dataset
    - Create indexes for faster queries

  3. Security
    - All changes respect existing RLS policies
*/

-- Add dataset column to account_summary
DO $$
BEGIN
  -- Drop existing unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'account_summary_user_id_key'
  ) THEN
    ALTER TABLE account_summary DROP CONSTRAINT account_summary_user_id_key;
  END IF;

  -- Add dataset column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_summary' AND column_name = 'dataset'
  ) THEN
    ALTER TABLE account_summary ADD COLUMN dataset text DEFAULT 'default';
  END IF;

  -- Add swap_positive column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_summary' AND column_name = 'swap_positive'
  ) THEN
    ALTER TABLE account_summary ADD COLUMN swap_positive numeric DEFAULT 0;
  END IF;

  -- Add swap_negative column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_summary' AND column_name = 'swap_negative'
  ) THEN
    ALTER TABLE account_summary ADD COLUMN swap_negative numeric DEFAULT 0;
  END IF;

  -- Add additional columns from the original schema if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_summary' AND column_name = 'total_deposits'
  ) THEN
    ALTER TABLE account_summary ADD COLUMN total_deposits numeric DEFAULT 0;
    -- Copy data from deposit column
    UPDATE account_summary SET total_deposits = deposit;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_summary' AND column_name = 'total_withdrawals'
  ) THEN
    ALTER TABLE account_summary ADD COLUMN total_withdrawals numeric DEFAULT 0;
    -- Copy data from withdraw column
    UPDATE account_summary SET total_withdrawals = withdraw;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_summary' AND column_name = 'xm_points_earned'
  ) THEN
    ALTER TABLE account_summary ADD COLUMN xm_points_earned numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_summary' AND column_name = 'xm_points_used'
  ) THEN
    ALTER TABLE account_summary ADD COLUMN xm_points_used numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_summary' AND column_name = 'total_swap'
  ) THEN
    ALTER TABLE account_summary ADD COLUMN total_swap numeric DEFAULT 0;
    -- Copy data from swap column
    UPDATE account_summary SET total_swap = swap;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_summary' AND column_name = 'total_commission'
  ) THEN
    ALTER TABLE account_summary ADD COLUMN total_commission numeric DEFAULT 0;
    -- Copy data from commission column
    UPDATE account_summary SET total_commission = commission;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_summary' AND column_name = 'total_profit'
  ) THEN
    ALTER TABLE account_summary ADD COLUMN total_profit numeric DEFAULT 0;
    -- Copy data from profit column
    UPDATE account_summary SET total_profit = profit;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_summary' AND column_name = 'closed_pl'
  ) THEN
    ALTER TABLE account_summary ADD COLUMN closed_pl numeric DEFAULT 0;
    -- Calculate closed_pl as profit + swap + commission
    UPDATE account_summary SET closed_pl = profit + swap + commission;
  END IF;

  -- Update existing data to use 'default' dataset if NULL
  UPDATE account_summary SET dataset = 'default' WHERE dataset IS NULL;

  -- Make dataset NOT NULL
  ALTER TABLE account_summary ALTER COLUMN dataset SET NOT NULL;

  -- Create new unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'account_summary_user_dataset_key'
  ) THEN
    ALTER TABLE account_summary ADD CONSTRAINT account_summary_user_dataset_key UNIQUE(user_id, dataset);
  END IF;

  -- Create index for faster queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_account_summary_user_dataset'
  ) THEN
    CREATE INDEX idx_account_summary_user_dataset ON account_summary(user_id, dataset);
  END IF;
END $$;

-- Add dataset column to account_transactions
DO $$
BEGIN
  -- Add dataset column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_transactions' AND column_name = 'dataset'
  ) THEN
    ALTER TABLE account_transactions ADD COLUMN dataset text DEFAULT 'default';
  END IF;

  -- Add ticket column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_transactions' AND column_name = 'ticket'
  ) THEN
    ALTER TABLE account_transactions ADD COLUMN ticket text;
  END IF;

  -- Add transaction_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_transactions' AND column_name = 'transaction_date'
  ) THEN
    ALTER TABLE account_transactions ADD COLUMN transaction_date timestamptz;
    -- Copy data from time column
    UPDATE account_transactions SET transaction_date = time WHERE time IS NOT NULL;
    -- Make it NOT NULL after copying
    ALTER TABLE account_transactions ALTER COLUMN transaction_date SET NOT NULL;
  END IF;

  -- Add transaction_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_transactions' AND column_name = 'transaction_type'
  ) THEN
    ALTER TABLE account_transactions ADD COLUMN transaction_type text;
    -- Copy data from type column
    UPDATE account_transactions SET transaction_type = type WHERE type IS NOT NULL;
    -- Make it NOT NULL after copying
    ALTER TABLE account_transactions ALTER COLUMN transaction_type SET NOT NULL;
  END IF;

  -- Add category column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_transactions' AND column_name = 'category'
  ) THEN
    ALTER TABLE account_transactions ADD COLUMN category text DEFAULT 'balance';
  END IF;

  -- Add description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'account_transactions' AND column_name = 'description'
  ) THEN
    ALTER TABLE account_transactions ADD COLUMN description text;
    -- Copy data from comment column
    UPDATE account_transactions SET description = comment WHERE comment IS NOT NULL;
  END IF;

  -- Update existing data to use 'default' dataset if NULL
  UPDATE account_transactions SET dataset = 'default' WHERE dataset IS NULL;

  -- Make dataset NOT NULL
  ALTER TABLE account_transactions ALTER COLUMN dataset SET NOT NULL;

  -- Create indexes for faster queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_account_transactions_user_dataset'
  ) THEN
    CREATE INDEX idx_account_transactions_user_dataset ON account_transactions(user_id, dataset);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_account_transactions_date'
  ) THEN
    CREATE INDEX idx_account_transactions_date ON account_transactions(transaction_date);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_account_transactions_type'
  ) THEN
    CREATE INDEX idx_account_transactions_type ON account_transactions(transaction_type);
  END IF;
END $$;