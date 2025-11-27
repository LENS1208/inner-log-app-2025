/*
  # すべてのtradesテーブルのポリシーを完全に削除

  RLSが無効化されているにもかかわらず、anonロールでポリシーが評価されているため、
  すべてのポリシーを完全に削除します。
*/

-- tradesテーブルのすべてのポリシーを削除
DROP POLICY IF EXISTS "Anyone can view demo trades" ON trades;
DROP POLICY IF EXISTS "Unauthenticated users can delete temporary trades" ON trades;
DROP POLICY IF EXISTS "Unauthenticated users can insert temporary trades" ON trades;
DROP POLICY IF EXISTS "Users can delete own trades" ON trades;
DROP POLICY IF EXISTS "Users can insert own trades" ON trades;
DROP POLICY IF EXISTS "Users can update own trades" ON trades;
DROP POLICY IF EXISTS "Users can view own trades" ON trades;

-- RLSが無効化されていることを再確認
ALTER TABLE trades DISABLE ROW LEVEL SECURITY;
