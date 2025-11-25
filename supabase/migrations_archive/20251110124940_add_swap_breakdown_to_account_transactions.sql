/*
  # スワップのプラス/マイナス内訳データを追加

  ## 概要
  各取引CSVファイルから計算したスワップの内訳（プラス分とマイナス分）を
  account_transactionsテーブルに追加します。

  ## 追加データ
  
  ### データセットA
  - スワップ（プラス）: +1,126円
  - スワップ（マイナス）: -1,367円
  - 合計: -240円（既存データ）

  ### データセットB
  - スワップ（プラス）: +940円
  - スワップ（マイナス）: -924円
  - 合計: +16円（既存データ）

  ### データセットC
  - スワップ（プラス）: +1,650円
  - スワップ（マイナス）: -1,550円
  - 合計: +100円（既存データ）

  ## 注意事項
  - 既存のスワップ合計データは削除せず保持
  - プラス/マイナス内訳は新規レコードとして追加
*/

DO $$
DECLARE
  v_user_id uuid := '9cdbc5c1-d973-4585-96e5-0a76a330adfb';
BEGIN
  -- データセットA: スワップ内訳
  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'A' AND ticket = 'SWAP-A-PLUS') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'A', 'SWAP-A-PLUS', '2025-11-10 00:00:00+00', 'swap', 'interest', 'Positive Swap Interest', 1126);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'A' AND ticket = 'SWAP-A-MINUS') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'A', 'SWAP-A-MINUS', '2025-11-10 00:00:00+00', 'swap', 'interest', 'Negative Swap Interest', -1367);
  END IF;

  -- データセットB: スワップ内訳
  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'B' AND ticket = 'SWAP-B-PLUS') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'B', 'SWAP-B-PLUS', '2025-11-10 00:00:00+00', 'swap', 'interest', 'Positive Swap Interest', 940);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'B' AND ticket = 'SWAP-B-MINUS') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'B', 'SWAP-B-MINUS', '2025-11-10 00:00:00+00', 'swap', 'interest', 'Negative Swap Interest', -924);
  END IF;

  -- データセットC: スワップ内訳
  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'C' AND ticket = 'SWAP-C-PLUS') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'C', 'SWAP-C-PLUS', '2025-11-10 00:00:00+00', 'swap', 'interest', 'Positive Swap Interest', 1650);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM account_transactions WHERE user_id = v_user_id AND dataset = 'C' AND ticket = 'SWAP-C-MINUS') THEN
    INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount)
    VALUES (v_user_id, 'C', 'SWAP-C-MINUS', '2025-11-10 00:00:00+00', 'swap', 'interest', 'Negative Swap Interest', -1550);
  END IF;

END $$;
