/*
  # モック開発のためRLSを一時的に無効化

  ## 理由
  - このツールはモックなので、セキュリティは後から強化する
  - まずはデータベースが正常に動作することを優先
  - クエリ側で user_id フィルタリングを行う

  ## 変更内容
  - すべてのテーブルのRLSを無効化
  - 既存のポリシーは削除しない（再有効化時に使用）

  ## 注意
  - 本番環境では絶対に使用しないこと
  - 開発環境専用
*/

-- すべてのテーブルのRLSを無効化
ALTER TABLE trades DISABLE ROW LEVEL SECURITY;
ALTER TABLE trade_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE free_memos DISABLE ROW LEVEL SECURITY;
ALTER TABLE note_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE account_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE account_summary DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_proposals DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_coaching_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE import_history DISABLE ROW LEVEL SECURITY;
