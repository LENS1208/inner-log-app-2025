/*
  # ai_proposalsテーブルのuser_idをNULL許可に変更

  ## 変更内容
  
  1. ai_proposals.user_idをNULL許可に変更
    - 認証なしのデモモードでもAI提案を保存できるようにする
    - 既存の制約を削除
  
  2. セキュリティ
    - RLSポリシーはすでにpublicアクセスに設定済み
    - 認証を必須としない設計に戻す
*/

-- ai_proposals.user_idをNULL許可に変更
ALTER TABLE ai_proposals 
  ALTER COLUMN user_id DROP NOT NULL;
