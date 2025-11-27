/*
  # tradesテーブルのticket UNIQUE制約を削除

  ## 変更内容
  
  1. trades.ticketのUNIQUE制約を削除
    - 11月24日時点ではこの制約は存在していませんでした
    - 11月26日のマイグレーションで誤って追加されたものを削除
    - CSVインポート時に同じticketを持つトレードを再インポートできるようになる
  
  ## 影響
  - 同じticket番号のトレードを複数回インポートできるようになります
  - アプリケーション側でduplicateチェックを行う必要があります
*/

-- trades.ticketのUNIQUE制約を削除
ALTER TABLE trades DROP CONSTRAINT IF EXISTS trades_ticket_key;

-- trade_notes.ticketのUNIQUE制約も確認して削除（11月24日時点の状態）
ALTER TABLE trade_notes DROP CONSTRAINT IF EXISTS trade_notes_ticket_key;
