/*
  # デモデータA/B/Cに追加の取引情報を追加

  ## 概要
  データセットA、B、Cに以下の情報を追加します：
  - 追加の入金額
  - 出金額  
  - スワップ累計（各CSVから計算）
  - XMポイント追加データ

  ## 追加データ
  
  ### データセットA
  - 入金: 2回目 50万円 (2023-06-01)
  - 出金: 30万円 (2024-12-01)
  - スワップ累計: -240円（CSV計算値を整数化）
  - XMポイント: 追加獲得3回、使用1回

  ### データセットB  
  - 入金: 2回目 100万円 (2024-01-15)
  - 出金: 80万円 (2025-05-01)
  - スワップ累計: 16円（CSV計算値を整数化）
  - XMポイント: 追加獲得4回、使用2回

  ### データセットC
  - 入金: 2回目 30万円 (2024-03-01)
  - 出金: 20万円 (2025-09-01)
  - スワップ累計: 100円（CSV計算値を整数化）
  - XMポイント: 追加獲得3回、使用1回

  ## 注意事項
  - 既存のデータには影響を与えません
  - user_id は既存のデモデータと同じユーザーを使用
*/

DO $$
DECLARE
  v_user_id uuid := '9cdbc5c1-d973-4585-96e5-0a76a330adfb';
BEGIN
  -- データセットA: 追加データ
  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'A' AND ticket = 'DEP-A-002') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'A', 'DEP-A-002', '2023-06-01 00:00:00+00', 'deposit', 'balance', 'Additional Deposit', 500000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'A' AND ticket = 'WDR-A-001') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'A', 'WDR-A-001', '2024-12-01 00:00:00+00', 'withdrawal', 'balance', 'Withdrawal', -300000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'A' AND ticket = 'SWAP-A-TOTAL') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'A', 'SWAP-A-TOTAL', '2025-11-10 00:00:00+00', 'swap', 'interest', 'Total Swap Interest', -240);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'A' AND ticket = 'XMP-A-004') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'A', 'XMP-A-004', '2023-06-15 00:00:00+00', 'credit_in', 'credit', 'Credit In-XMP, XM Points Earned', 25000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'A' AND ticket = 'XMP-A-005') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'A', 'XMP-A-005', '2024-01-05 00:00:00+00', 'credit_in', 'credit', 'Credit In-XMP, XM Points Earned', 30000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'A' AND ticket = 'XMP-A-006') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'A', 'XMP-A-006', '2024-09-10 00:00:00+00', 'credit_in', 'credit', 'Credit In-XMP, XM Points Earned', 28000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'A' AND ticket = 'XMPU-A-002') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'A', 'XMPU-A-002', '2024-06-01 00:00:00+00', 'credit_out', 'credit', 'Credit Out, XM Points Used for Trading', -20000);
  END IF;

  -- データセットB: 追加データ
  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'B' AND ticket = 'DEP-B-002') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'B', 'DEP-B-002', '2024-01-15 00:00:00+00', 'deposit', 'balance', 'Additional Deposit', 1000000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'B' AND ticket = 'WDR-B-001') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'B', 'WDR-B-001', '2025-05-01 00:00:00+00', 'withdrawal', 'balance', 'Withdrawal', -800000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'B' AND ticket = 'SWAP-B-TOTAL') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'B', 'SWAP-B-TOTAL', '2025-11-10 00:00:00+00', 'swap', 'interest', 'Total Swap Interest', 16);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'B' AND ticket = 'XMP-B-004') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'B', 'XMP-B-004', '2024-02-20 00:00:00+00', 'credit_in', 'credit', 'Credit In-XMP, XM Points Earned', 45000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'B' AND ticket = 'XMP-B-005') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'B', 'XMP-B-005', '2024-06-15 00:00:00+00', 'credit_in', 'credit', 'Credit In-XMP, XM Points Earned', 38000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'B' AND ticket = 'XMP-B-006') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'B', 'XMP-B-006', '2024-10-10 00:00:00+00', 'credit_in', 'credit', 'Credit In-XMP, XM Points Earned', 42000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'B' AND ticket = 'XMP-B-007') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'B', 'XMP-B-007', '2025-02-20 00:00:00+00', 'credit_in', 'credit', 'Credit In-XMP, XM Points Earned', 50000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'B' AND ticket = 'XMPU-B-002') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'B', 'XMPU-B-002', '2024-08-01 00:00:00+00', 'credit_out', 'credit', 'Credit Out, XM Points Used for Trading', -30000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'B' AND ticket = 'XMPU-B-003') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'B', 'XMPU-B-003', '2025-01-15 00:00:00+00', 'credit_out', 'credit', 'Credit Out, XM Points Used for Trading', -35000);
  END IF;

  -- データセットC: 追加データ
  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'C' AND ticket = 'DEP-C-002') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'C', 'DEP-C-002', '2024-03-01 00:00:00+00', 'deposit', 'balance', 'Additional Deposit', 300000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'C' AND ticket = 'WDR-C-001') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'C', 'WDR-C-001', '2025-09-01 00:00:00+00', 'withdrawal', 'balance', 'Withdrawal', -200000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'C' AND ticket = 'SWAP-C-TOTAL') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'C', 'SWAP-C-TOTAL', '2025-11-10 00:00:00+00', 'swap', 'interest', 'Total Swap Interest', 100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'C' AND ticket = 'XMP-C-004') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'C', 'XMP-C-004', '2024-04-10 00:00:00+00', 'credit_in', 'credit', 'Credit In-XMP, XM Points Earned', 20000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'C' AND ticket = 'XMP-C-005') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'C', 'XMP-C-005', '2024-08-15 00:00:00+00', 'credit_in', 'credit', 'Credit In-XMP, XM Points Earned', 18000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'C' AND ticket = 'XMP-C-006') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'C', 'XMP-C-006', '2025-01-20 00:00:00+00', 'credit_in', 'credit', 'Credit In-XMP, XM Points Earned', 22000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'C' AND ticket = 'XMPU-C-002') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'C', 'XMPU-C-002', '2024-11-01 00:00:00+00', 'credit_out', 'credit', 'Credit Out, XM Points Used for Trading', -15000);
  END IF;

END $$;
