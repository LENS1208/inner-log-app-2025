/*
  # デモ口座サマリー関数にスワップ内訳を追加

  ## 概要
  get_demo_account_summary関数を更新して、スワップのプラス/マイナス内訳を追加します。

  ## 追加項目
  - swap_positive: プラスのスワップ合計
  - swap_negative: マイナスのスワップ合計（絶対値）
  - total_swap: スワップ合計（既存）

  ## 注意事項
  - 既存のフィールドは変更なし
  - 後方互換性を保持
*/

CREATE OR REPLACE FUNCTION get_demo_account_summary(p_dataset text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'total_deposits', COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END), 0),
    'total_withdrawals', COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount ELSE 0 END), 0),
    'total_swap', COALESCE(SUM(CASE WHEN transaction_type = 'swap' THEN amount ELSE 0 END), 0),
    'swap_positive', COALESCE(SUM(CASE WHEN transaction_type = 'swap' AND amount > 0 THEN amount ELSE 0 END), 0),
    'swap_negative', COALESCE(ABS(SUM(CASE WHEN transaction_type = 'swap' AND amount < 0 THEN amount ELSE 0 END)), 0),
    'xm_points_earned', COALESCE(SUM(CASE WHEN category = 'credit' AND amount > 0 THEN amount ELSE 0 END), 0),
    'xm_points_used', COALESCE(SUM(CASE WHEN category = 'credit' AND amount < 0 THEN ABS(amount) ELSE 0 END), 0)
  ) INTO v_result
  FROM account_transactions
  WHERE dataset = p_dataset
    AND user_id = '9cdbc5c1-d973-4585-96e5-0a76a330adfb';

  RETURN v_result;
END;
$$;
