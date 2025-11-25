
-- Insert transactions for Dataset A
INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount) VALUES
('cbcc1f55-2f10-41a5-96c4-c2d316ab1fd2', 'A', NULL, '2024-05-27T08:00:00Z', 'deposit', 'balance', '初回入金', 1000000),
('cbcc1f55-2f10-41a5-96c4-c2d316ab1fd2', 'A', NULL, '2024-11-15T10:00:00Z', 'deposit', 'balance', '追加入金', 500000);

-- Insert transactions for Dataset B
INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount) VALUES
('cbcc1f55-2f10-41a5-96c4-c2d316ab1fd2', 'B', NULL, '2024-06-25T08:00:00Z', 'deposit', 'balance', '初回入金', 3000000),
('cbcc1f55-2f10-41a5-96c4-c2d316ab1fd2', 'B', NULL, '2025-02-10T10:00:00Z', 'deposit', 'balance', '追加入金', 2000000);

-- Insert transactions for Dataset C
INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount) VALUES
('cbcc1f55-2f10-41a5-96c4-c2d316ab1fd2', 'C', NULL, '2024-11-25T08:00:00Z', 'deposit', 'balance', '初回入金', 800000),
('cbcc1f55-2f10-41a5-96c4-c2d316ab1fd2', 'C', NULL, '2025-07-15T10:00:00Z', 'deposit', 'credit', 'XMポイント利用（970ポイント）', 48015);

-- Insert account summary for Dataset A
INSERT INTO account_summary (user_id, dataset, total_deposits, total_withdrawals, xm_points_earned, xm_points_used, total_swap, swap_positive, swap_negative, total_commission, total_profit, closed_pl)
VALUES ('cbcc1f55-2f10-41a5-96c4-c2d316ab1fd2', 'A', 1500000, 0, 0, 0, -57575, 7280, 64855, -2664, 65805, 5566);

-- Insert account summary for Dataset B
INSERT INTO account_summary (user_id, dataset, total_deposits, total_withdrawals, xm_points_earned, xm_points_used, total_swap, swap_positive, swap_negative, total_commission, total_profit, closed_pl)
VALUES ('cbcc1f55-2f10-41a5-96c4-c2d316ab1fd2', 'B', 5000000, 0, 0, 0, -69050, 7420, 76470, -2916, 149363, 77397);

-- Insert account summary for Dataset C
INSERT INTO account_summary (user_id, dataset, total_deposits, total_withdrawals, xm_points_earned, xm_points_used, total_swap, swap_positive, swap_negative, total_commission, total_profit, closed_pl)
VALUES ('cbcc1f55-2f10-41a5-96c4-c2d316ab1fd2', 'C', 848015, 0, 2427, 970, -7195, 900, 8095, -1452, -2954, -11601);
