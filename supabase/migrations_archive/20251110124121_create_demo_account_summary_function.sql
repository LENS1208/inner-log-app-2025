/*
  # デモデータ用の口座サマリー取得関数を作成

  ## 概要
  デモデータセット（A/B/C）の口座サマリー情報を取得するRPC関数を作成します。
  この関数はフロントエンドから呼び出され、データセット別の集計データを返します。

  ## 機能
  - 入金額合計
  - 出金額合計
  - スワップ累計
  - XMポイント獲得額
  - XMポイント使用額

  ## セキュリティ
  - この関数は認証なしで呼び出し可能（デモデータのみアクセス）
  - 特定のテストユーザーのデータのみを返す
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
    'xm_points_earned', COALESCE(SUM(CASE WHEN category = 'credit' AND amount > 0 THEN amount ELSE 0 END), 0),
    'xm_points_used', COALESCE(SUM(CASE WHEN category = 'credit' AND amount < 0 THEN ABS(amount) ELSE 0 END), 0)
  ) INTO v_result
  FROM account_transactions
  WHERE dataset = p_dataset
    AND user_id = '9cdbc5c1-d973-4585-96e5-0a76a330adfb';

  RETURN v_result;
END;
$$;
