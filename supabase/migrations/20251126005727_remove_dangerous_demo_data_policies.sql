/*
  # 危険なデモデータ用ポリシーを削除

  ## 問題
  以下のテーブルに `OR (user_id IS NULL)` を含むポリシーが存在
  - trades
  - trade_notes
  - daily_notes
  - free_memos
  - note_links

  これらは過去のデモデータ実装の残骸で、将来的にデータが混在する危険性がある。

  ## 方針
  - デモデータはpublic/demo/からJSONで読み込む（データベースには入れない）
  - 全テーブルのポリシーを「認証済みユーザーが自分のデータのみアクセス可能」に統一

  ## 変更内容
  1. 危険な `OR (user_id IS NULL)` ポリシーを削除
  2. 安全なポリシーに置き換え（auth.uid() = user_idのみ）

  ## セキュリティ
  - RLSは有効なまま
  - 認証済みユーザーのみがアクセス可能
  - ユーザー間のデータ分離を完全に保証
*/

-- ===== trades テーブル =====
DROP POLICY IF EXISTS "Users can view own trades and demo data" ON trades;

CREATE POLICY "Users can view own trades"
  ON trades FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ===== trade_notes テーブル =====
DROP POLICY IF EXISTS "Users can view own trade notes and demo data" ON trade_notes;

CREATE POLICY "Users can view own trade notes"
  ON trade_notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ===== daily_notes テーブル =====
DROP POLICY IF EXISTS "Users can view own daily notes and demo data" ON daily_notes;

CREATE POLICY "Users can view own daily notes"
  ON daily_notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ===== free_memos テーブル =====
DROP POLICY IF EXISTS "Users can view own free memos and demo data" ON free_memos;

CREATE POLICY "Users can view own free memos"
  ON free_memos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ===== note_links テーブル =====
DROP POLICY IF EXISTS "Users can view own note links and demo data" ON note_links;

CREATE POLICY "Users can view own note links"
  ON note_links FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
