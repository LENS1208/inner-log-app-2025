/*
  # Insert Account Transactions and Summary Data for Demo Datasets

  1. Purpose
    - Insert deposit and withdrawal transactions for all demo datasets (A, B, C)
    - Insert account summary data including:
      - Total deposits and withdrawals
      - XM Points earned (Dataset C only)
      - Total swap, commission, and profit
      - Swap breakdown (positive/negative)

  2. Data Details
    - Dataset A: Initial deposit ¥1,000,000, additional deposits, profit withdrawal
    - Dataset B: Initial deposit ¥3,000,000, additional deposits to cover losses
    - Dataset C: Initial deposit ¥800,000, profit withdrawal, additional deposit, includes XM Points

  3. Security
    - Only inserts data for the test user (ff7d176e-83fd-4d27-9383-906b701c22d1)
    - Respects RLS policies
*/

-- Delete existing transaction and summary data for this user
DELETE FROM account_transactions WHERE user_id = 'ff7d176e-83fd-4d27-9383-906b701c22d1' AND dataset IN ('A', 'B', 'C');
DELETE FROM account_summary WHERE user_id = 'ff7d176e-83fd-4d27-9383-906b701c22d1' AND dataset IN ('A', 'B', 'C');

-- Insert transactions for Dataset A
INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount) VALUES
('ff7d176e-83fd-4d27-9383-906b701c22d1', 'A', NULL, '2024-05-27 08:00:00+00', 'deposit', 'balance', '初回入金', 1000000),
('ff7d176e-83fd-4d27-9383-906b701c22d1', 'A', NULL, '2024-11-29 20:47:23+00', 'deposit', 'balance', '追加入金', 500000),
('ff7d176e-83fd-4d27-9383-906b701c22d1', 'A', NULL, '2025-05-21 06:21:37+00', 'deposit', 'balance', '追加入金', 300000),
('ff7d176e-83fd-4d27-9383-906b701c22d1', 'A', NULL, '2025-11-11 02:53:53+00', 'withdrawal', 'balance', '利益出金', -1000000);

-- Insert transactions for Dataset B
INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount) VALUES
('ff7d176e-83fd-4d27-9383-906b701c22d1', 'B', NULL, '2024-07-25 08:00:00+00', 'deposit', 'balance', '初回入金', 3000000),
('ff7d176e-83fd-4d27-9383-906b701c22d1', 'B', NULL, '2024-12-02 11:38:19+00', 'deposit', 'balance', '追加入金（損失補填）', 2000000),
('ff7d176e-83fd-4d27-9383-906b701c22d1', 'B', NULL, '2025-07-30 23:09:52+00', 'deposit', 'balance', '追加入金（損失補填）', 1500000);

-- Insert transactions for Dataset C
INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount) VALUES
('ff7d176e-83fd-4d27-9383-906b701c22d1', 'C', NULL, '2024-12-25 08:00:00+00', 'deposit', 'balance', '初回入金', 800000),
('ff7d176e-83fd-4d27-9383-906b701c22d1', 'C', NULL, '2025-06-10 00:24:54+00', 'withdrawal', 'balance', '利益出金', -400000),
('ff7d176e-83fd-4d27-9383-906b701c22d1', 'C', NULL, '2025-09-19 22:58:50+00', 'deposit', 'balance', '追加入金', 600000);

-- Insert account summary for Dataset A
INSERT INTO account_summary (user_id, dataset, total_deposits, total_withdrawals, xm_points_earned, xm_points_used, total_swap, swap_positive, swap_negative, total_commission, total_profit, closed_pl)
VALUES ('ff7d176e-83fd-4d27-9383-906b701c22d1', 'A', 1800000, 1000000, 0, 0, -1.6, 74.6, -76.2, -2892, 3275989, 3273095.4);

-- Insert account summary for Dataset B
INSERT INTO account_summary (user_id, dataset, total_deposits, total_withdrawals, xm_points_earned, xm_points_used, total_swap, swap_positive, swap_negative, total_commission, total_profit, closed_pl)
VALUES ('ff7d176e-83fd-4d27-9383-906b701c22d1', 'B', 6500000, 0, 0, 0, -7.6, 60.6, -68.2, -2376, -1727351, -1729734.6);

-- Insert account summary for Dataset C
INSERT INTO account_summary (user_id, dataset, total_deposits, total_withdrawals, xm_points_earned, xm_points_used, total_swap, swap_positive, swap_negative, total_commission, total_profit, closed_pl)
VALUES ('ff7d176e-83fd-4d27-9383-906b701c22d1', 'C', 1400000, 400000, 3852, 0, 1.3, 43.8, -42.5, -1620, -128296, -129914.7);