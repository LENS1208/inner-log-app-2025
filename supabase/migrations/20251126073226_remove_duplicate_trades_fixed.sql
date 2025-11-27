/*
  # tradesテーブルの重複データを削除（修正版）

  ## 問題
  - 前回のマイグレーションではuser_id単位でパーティショニングしていたため、
    異なるuser_idを持つ同じticketの重複が残っていた
  
  ## 対応
  - ticket単位でパーティショニングし、created_atが最新のレコードのみを残す
*/

-- 重複レコードを削除（ticket単位で最新のもののみ残す）
DELETE FROM trades
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY ticket 
        ORDER BY created_at DESC, id DESC
      ) AS rn
    FROM trades
  ) t
  WHERE t.rn > 1
);
