/*
  # account_summaryのUNIQUE制約を修正

  ## 変更内容
  
  1. 既存のUNIQUE(user_id)制約を削除
  2. 新しいUNIQUE(user_id, dataset)制約を追加
  
  ## 理由
  - 1ユーザーが複数のデータセット（A, B, C）を持つため
  - user_idだけでは一意性が保証できない
  - upsert時のonConflictが'user_id,dataset'を期待している
*/

-- 既存のUNIQUE(user_id)制約を削除
ALTER TABLE account_summary DROP CONSTRAINT IF EXISTS account_summary_user_id_key;

-- 新しいUNIQUE(user_id, dataset)制約を追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'account_summary_user_id_dataset_key' 
    AND conrelid = 'public.account_summary'::regclass
  ) THEN
    ALTER TABLE account_summary ADD CONSTRAINT account_summary_user_id_dataset_key UNIQUE (user_id, dataset);
    RAISE NOTICE 'Added UNIQUE constraint (user_id, dataset) to account_summary';
  END IF;
END $$;
