/*
  # tradesテーブルのticketカラムにUNIQUE制約を追加

  ## 変更内容
  1. ticketカラムにUNIQUE制約を追加
     - 同じticket番号の取引を複数回インポートすることを防ぐ
     - ignoreDuplicatesオプションが正しく動作するようになる

  ## 注意
  - 既存のデータに重複がある場合、このマイグレーションは失敗する
  - その場合は、重複データを削除してから再実行する
*/

-- 既存の重複データを削除（最新のものを残す）
DO $$
BEGIN
  -- 重複があるかチェック
  IF EXISTS (
    SELECT ticket 
    FROM trades 
    GROUP BY ticket 
    HAVING COUNT(*) > 1
  ) THEN
    -- 重複を削除（created_atが古い方を削除）
    DELETE FROM trades
    WHERE id IN (
      SELECT id
      FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY ticket ORDER BY created_at DESC) AS rn
        FROM trades
      ) t
      WHERE t.rn > 1
    );
    RAISE NOTICE 'Deleted duplicate trades';
  END IF;
END $$;

-- ticketカラムにUNIQUE制約を追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'trades_ticket_key' 
    AND conrelid = 'public.trades'::regclass
  ) THEN
    ALTER TABLE trades ADD CONSTRAINT trades_ticket_key UNIQUE (ticket);
    RAISE NOTICE 'Added UNIQUE constraint to trades.ticket';
  END IF;
END $$;
