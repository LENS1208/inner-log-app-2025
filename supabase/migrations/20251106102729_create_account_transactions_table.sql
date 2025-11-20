/*
  # Create account transactions and summary tables

  1. New Tables
    - `account_transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `dataset` (text) - dataset identifier
      - `ticket` (text) - transaction ticket/ID
      - `transaction_date` (timestamptz) - transaction timestamp
      - `transaction_type` (text) - 'deposit', 'withdrawal', 'credit_in', 'credit_out', 'transfer', 'fee', etc
      - `category` (text) - 'balance', 'credit', 'transfer', 'fee'
      - `description` (text) - transaction description
      - `amount` (numeric) - transaction amount
      - `created_at` (timestamptz)

    - `account_summary`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `dataset` (text) - dataset identifier (unique per user)
      - `total_deposits` (numeric) - total deposits
      - `total_withdrawals` (numeric) - total withdrawals (absolute value)
      - `xm_points_earned` (numeric) - total XM points earned
      - `xm_points_used` (numeric) - total XM points used
      - `total_swap` (numeric) - total swap from trades
      - `total_commission` (numeric) - total commission from trades
      - `total_profit` (numeric) - total profit/loss from trades
      - `closed_pl` (numeric) - closed P/L (commission + swap + profit + taxes)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own data
*/

-- Create account_transactions table
CREATE TABLE IF NOT EXISTS account_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dataset text NOT NULL,
  ticket text,
  transaction_date timestamptz NOT NULL,
  transaction_type text NOT NULL,
  category text NOT NULL,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_account_transactions_user_dataset 
  ON account_transactions(user_id, dataset);
CREATE INDEX IF NOT EXISTS idx_account_transactions_date 
  ON account_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_account_transactions_type 
  ON account_transactions(transaction_type);

-- Create account_summary table
CREATE TABLE IF NOT EXISTS account_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dataset text NOT NULL,
  total_deposits numeric DEFAULT 0,
  total_withdrawals numeric DEFAULT 0,
  xm_points_earned numeric DEFAULT 0,
  xm_points_used numeric DEFAULT 0,
  total_swap numeric DEFAULT 0,
  total_commission numeric DEFAULT 0,
  total_profit numeric DEFAULT 0,
  closed_pl numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, dataset)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_account_summary_user_dataset 
  ON account_summary(user_id, dataset);

-- Enable RLS
ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_summary ENABLE ROW LEVEL SECURITY;

-- Policies for account_transactions
CREATE POLICY "Users can view own transactions"
  ON account_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON account_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON account_transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON account_transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for account_summary
CREATE POLICY "Users can view own summary"
  ON account_summary FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own summary"
  ON account_summary FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own summary"
  ON account_summary FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own summary"
  ON account_summary FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
