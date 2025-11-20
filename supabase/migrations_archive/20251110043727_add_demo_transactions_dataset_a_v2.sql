/*
  # Add Demo Account Transactions for Dataset A
  
  1. Summary
    This migration populates the account_transactions table with realistic demo data for dataset A,
    including deposits, withdrawals, and XM points transactions.
  
  2. Transaction Types Added
    - **Deposits**: Initial deposit of ¥1,000,000 and additional deposits (Total: ¥1,550,000)
    - **Withdrawals**: Three withdrawal transactions (Total: ¥530,000)
    - **XM Points Earned**: 10 credit-in transactions (Total: ¥290,500)
    - **XM Points Used**: 5 credit-out transactions (Total: ¥122,000)
  
  3. Data Integrity
    - All transactions are linked to existing user accounts
    - Transactions are ordered chronologically from Oct 2022 to Feb 2025
    - Each transaction has a unique ticket ID for traceability
  
  4. Important Notes
    - This is demo data for testing and development purposes
    - Data will be added for all existing users in the system
    - All amounts are in Japanese Yen (JPY)
*/

DO $$ 
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM auth.users LOOP
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount) VALUES
      (user_record.id, 'A', 'DEP-A-001', '2022-10-01 00:00:00+00', 'deposit', 'balance', 'Initial Deposit', 1000000),
      (user_record.id, 'A', 'XMP-A-001', '2022-11-15 00:00:00+00', 'credit_in', 'credit', 'Credit In-XMP, XM Points Earned', 15000),
      (user_record.id, 'A', 'XMP-A-002', '2023-01-20 00:00:00+00', 'credit_in', 'credit', 'Credit In-XMP, XM Points Earned', 22000),
      (user_record.id, 'A', 'XMPU-A-001', '2023-03-01 00:00:00+00', 'credit_out', 'credit', 'Credit Out, XM Points Used for Trading', -12000),
      (user_record.id, 'A', 'XMP-A-003', '2023-04-10 00:00:00+00', 'credit_in', 'credit', 'Credit In-XMP, XM Points Earned', 18500),
      (user_record.id, 'A', 'WD-A-001', '2023-06-01 00:00:00+00', 'withdrawal', 'balance', 'Withdrawal to Bank', -150000),
      (user_record.id, 'A', 'XMP-A-004', '2023-07-05 00:00:00+00', 'credit_in', 'credit', 'Credit In-XMP, XM Points Earned', 25000),
      (user_record.id, 'A', 'XMPU-A-002', '2023-08-15 00:00:00+00', 'credit_out', 'credit', 'Credit Out, XM Points Used for Trading', -20000),
      (user_record.id, 'A', 'DEP-A-002', '2023-09-01 00:00:00+00', 'deposit', 'balance', 'Additional Deposit', 300000),
      (user_record.id, 'A', 'XMP-A-005', '2023-10-12 00:00:00+00', 'credit_in', 'credit', 'Credit In-XMP, XM Points Earned', 30000),
      (user_record.id, 'A', 'XMP-A-006', '2024-01-15 00:00:00+00', 'credit_in', 'credit', 'Credit In-XMP, XM Points Earned', 28000),
      (user_record.id, 'A', 'XMPU-A-003', '2024-02-20 00:00:00+00', 'credit_out', 'credit', 'Credit Out, XM Points Used for Trading', -25000),
      (user_record.id, 'A', 'WD-A-002', '2024-03-15 00:00:00+00', 'withdrawal', 'balance', 'Withdrawal to Bank', -200000),
      (user_record.id, 'A', 'XMP-A-007', '2024-04-20 00:00:00+00', 'credit_in', 'credit', 'Credit In-XMP, XM Points Earned', 32000),
      (user_record.id, 'A', 'DEP-A-003', '2024-06-15 00:00:00+00', 'deposit', 'balance', 'Additional Deposit', 250000),
      (user_record.id, 'A', 'XMP-A-008', '2024-07-10 00:00:00+00', 'credit_in', 'credit', 'Credit In-XMP, XM Points Earned', 35000),
      (user_record.id, 'A', 'XMPU-A-004', '2024-08-10 00:00:00+00', 'credit_out', 'credit', 'Credit Out, XM Points Used for Trading', -30000),
      (user_record.id, 'A', 'XMP-A-009', '2024-10-05 00:00:00+00', 'credit_in', 'credit', 'Credit In-XMP, XM Points Earned', 40000),
      (user_record.id, 'A', 'WD-A-003', '2024-12-10 00:00:00+00', 'withdrawal', 'balance', 'Withdrawal to Bank', -180000),
      (user_record.id, 'A', 'XMP-A-010', '2025-01-10 00:00:00+00', 'credit_in', 'credit', 'Credit In-XMP, XM Points Earned', 45000),
      (user_record.id, 'A', 'XMPU-A-005', '2025-02-01 00:00:00+00', 'credit_out', 'credit', 'Credit Out, XM Points Used for Trading', -35000)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
