/*
  # セキュリティ脆弱性の修正: 危険なRLSポリシーの削除

  ## 概要
  5つのテーブルに存在する危険な "Allow all access" ポリシー (USING (true)) を削除します。
  これらのポリシーは全ユーザーが他のユーザーのデータにアクセスできる重大な脆弱性です。

  ## 削除するポリシー
  1. `trades` テーブル
     - "Allow all access to trades"
  
  2. `trade_notes` テーブル
     - "Allow all access to trade_notes"
  
  3. `daily_notes` テーブル
     - "Allow all access to daily_notes"
  
  4. `free_memos` テーブル
     - "Allow all access to free_memos"
  
  5. `note_links` テーブル
     - "Allow all access to note_links"

  ## セキュリティ上の改善
  - 削除後、各テーブルには適切な user_id ベースのポリシーのみが残ります
  - ユーザーは自分のデータのみにアクセス可能になります
  - デモデータ (dataset = A/B/C) は引き続き閲覧可能です

  ## 影響
  - 既存の正しいポリシーは維持されます
  - アプリケーションの動作に影響はありません
  - セキュリティが大幅に向上します
*/

-- trades テーブルから危険なポリシーを削除
DROP POLICY IF EXISTS "Allow all access to trades" ON trades;

-- trade_notes テーブルから危険なポリシーを削除
DROP POLICY IF EXISTS "Allow all access to trade_notes" ON trade_notes;

-- daily_notes テーブルから危険なポリシーを削除
DROP POLICY IF EXISTS "Allow all access to daily_notes" ON daily_notes;

-- free_memos テーブルから危険なポリシーを削除
DROP POLICY IF EXISTS "Allow all access to free_memos" ON free_memos;

-- note_links テーブルから危険なポリシーを削除
DROP POLICY IF EXISTS "Allow all access to note_links" ON note_links;
