/*
  # 重複したRLSポリシーをクリーンアップ

  ## 問題
  一部のテーブルに古いポリシーが残っており、重複している状態。

  ## 変更内容
  古い命名規則のポリシーを削除（"own account", "own ai" など）
*/

-- account_summary の古いポリシーを削除
DROP POLICY IF EXISTS "Users can view own account summary" ON account_summary;
DROP POLICY IF EXISTS "Users can insert own account summary" ON account_summary;
DROP POLICY IF EXISTS "Users can update own account summary" ON account_summary;
DROP POLICY IF EXISTS "Users can delete own account summary" ON account_summary;
DROP POLICY IF EXISTS "Anyone can view demo account summary" ON account_summary;

-- account_transactions の古いポリシーを削除
DROP POLICY IF EXISTS "Users can view own account transactions" ON account_transactions;
DROP POLICY IF EXISTS "Users can insert own account transactions" ON account_transactions;
DROP POLICY IF EXISTS "Users can update own account transactions" ON account_transactions;
DROP POLICY IF EXISTS "Users can delete own account transactions" ON account_transactions;
DROP POLICY IF EXISTS "Anyone can view demo account transactions" ON account_transactions;

-- ai_coaching_jobs の古いポリシーを削除
DROP POLICY IF EXISTS "Users can view own ai coaching jobs" ON ai_coaching_jobs;
DROP POLICY IF EXISTS "Users can insert own ai coaching jobs" ON ai_coaching_jobs;
DROP POLICY IF EXISTS "Users can update own ai coaching jobs" ON ai_coaching_jobs;
DROP POLICY IF EXISTS "Users can delete own ai coaching jobs" ON ai_coaching_jobs;

-- ai_proposals の古いポリシーを削除
DROP POLICY IF EXISTS "Users can view own ai proposals" ON ai_proposals;
DROP POLICY IF EXISTS "Users can insert own ai proposals" ON ai_proposals;
DROP POLICY IF EXISTS "Users can update own ai proposals" ON ai_proposals;
DROP POLICY IF EXISTS "Users can delete own ai proposals" ON ai_proposals;
