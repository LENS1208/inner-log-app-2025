/*
  # tradesテーブルのRLSポリシーを修正（セキュリティ強化）

  ## 問題
  - 現在、危険な "USING (true)" ポリシーが存在
  - 全ユーザーが全ての取引データにアクセスできる状態
  
  ## 対応
  - 危険なポリシーを削除
  - 適切なRLSポリシーを追加
    - ユーザーは自分の取引のみアクセス可能
    - デモデータ（dataset='A','B','C'）は全員が閲覧可能
*/

-- 既存の危険なポリシーを削除
DROP POLICY IF EXISTS "Public access to trades" ON trades;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON trades;

-- デモデータの閲覧を許可（dataset='A','B','C'のみ）
CREATE POLICY "Anyone can view demo trades"
  ON trades FOR SELECT
  TO public
  USING (dataset IN ('A', 'B', 'C'));

-- 認証済みユーザーは自分の取引を閲覧可能
CREATE POLICY "Users can view own trades"
  ON trades FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 認証済みユーザーは自分の取引を挿入可能
CREATE POLICY "Users can insert own trades"
  ON trades FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 認証済みユーザーは自分の取引を更新可能
CREATE POLICY "Users can update own trades"
  ON trades FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 認証済みユーザーは自分の取引を削除可能
CREATE POLICY "Users can delete own trades"
  ON trades FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 未認証ユーザーは一時的に取引を挿入・削除可能（user_id=null）
CREATE POLICY "Unauthenticated users can insert temporary trades"
  ON trades FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL AND dataset IS NULL);

CREATE POLICY "Unauthenticated users can delete temporary trades"
  ON trades FOR DELETE
  TO anon
  USING (user_id IS NULL AND dataset IS NULL);
