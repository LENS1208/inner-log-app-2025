/*
  # tradesテーブルの重複データを削除

  ## 問題
  - 同じticket番号の取引が複数存在している
  - maybeSingle()やsingle()クエリが失敗する原因になっている
  
  ## 対応
  - 各ticketについて、created_atが最新のレコードのみを残す
  - 古いレコードを削除
*/

-- 重複レコードを削除（created_atが古い方を削除）
DELETE FROM trades
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, ticket 
        ORDER BY created_at DESC
      ) AS rn
    FROM trades
  ) t
  WHERE t.rn > 1
);
