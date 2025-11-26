/*
  # ai_coaching_jobsテーブルにUNIQUE制約を追加

  ## 変更内容
  
  1. ai_coaching_jobsテーブルに欠落していたUNIQUE制約を追加
    - UNIQUE(user_id, dataset)
    - この制約により、同じユーザー＋データセットの組み合わせは1つのジョブのみ
    - upsert操作（ON CONFLICT）が正常に動作するようになる
  
  2. インデックスも追加
    - user_idとdatasetでの検索を高速化
    - statusでの検索を高速化
*/

-- 既存の制約とインデックスを削除（存在する場合）
ALTER TABLE ai_coaching_jobs DROP CONSTRAINT IF EXISTS ai_coaching_jobs_user_id_dataset_key;
DROP INDEX IF EXISTS idx_ai_coaching_jobs_user_dataset;
DROP INDEX IF EXISTS idx_ai_coaching_jobs_status;

-- UNIQUE制約を追加
ALTER TABLE ai_coaching_jobs 
  ADD CONSTRAINT ai_coaching_jobs_user_id_dataset_key UNIQUE (user_id, dataset);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_ai_coaching_jobs_user_dataset ON ai_coaching_jobs(user_id, dataset);
CREATE INDEX IF NOT EXISTS idx_ai_coaching_jobs_status ON ai_coaching_jobs(status);
