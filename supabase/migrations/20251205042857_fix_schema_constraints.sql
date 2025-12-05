/*
  # スキーマ制約の修正

  ## 変更内容
  
  ### 1. daily_notes のユニーク制約修正
  - `date_key` 単体の UNIQUE 制約を削除
  - `UNIQUE (user_id, date_key)` の PARTIAL INDEX を作成（user_id IS NOT NULL の行のみ）
  
  ### 2. trade_notes と trades の関係明確化
  - `trade_notes` に `trade_id uuid` カラムを追加
  - 既存データの `trade_id` を ticket で JOIN して埋める
  - `trades.id` への外部キー制約を追加
  - `ticket` 単体の UNIQUE 制約を削除
  - 検索用の通常インデックス `(user_id, ticket)` を作成
  
  ### 3. created_at/updated_at の NOT NULL 化
  - すべての対象テーブルで NULL を now() で埋める
  - NOT NULL 制約 + DEFAULT now() を付与
  
  ## 対象テーブル
  - daily_notes
  - trade_notes
  - trades (created_at のみ)
  - user_settings
  - free_memos
  - note_links
  - account_summary (updated_at のみ)
  - account_transactions (created_at のみ)
  - ai_proposals
  - reviews_monthly
*/

-- ============================================================
-- ① daily_notes のユニーク制約修正
-- ============================================================

-- 既存の date_key UNIQUE 制約を削除
ALTER TABLE public.daily_notes
  DROP CONSTRAINT IF EXISTS daily_notes_date_key_key;

-- UNIQUE (user_id, date_key) の PARTIAL INDEX を作成（user_id IS NOT NULL の行のみ）
CREATE UNIQUE INDEX IF NOT EXISTS daily_notes_user_date_key_uniq 
  ON public.daily_notes(user_id, date_key) 
  WHERE user_id IS NOT NULL;


-- ============================================================
-- ② trade_notes と trades の関係明確化
-- ============================================================

-- trade_notes に trade_id カラムを追加
ALTER TABLE public.trade_notes
  ADD COLUMN IF NOT EXISTS trade_id uuid;

-- 既存データの trade_id を埋める（user_id + ticket で JOIN）
UPDATE public.trade_notes tn
SET trade_id = t.id
FROM public.trades t
WHERE tn.user_id = t.user_id 
  AND tn.ticket = t.ticket
  AND tn.trade_id IS NULL;

-- trade_id に外部キー制約を追加
ALTER TABLE public.trade_notes
  ADD CONSTRAINT trade_notes_trade_id_fkey
    FOREIGN KEY (trade_id)
    REFERENCES public.trades(id)
    ON DELETE SET NULL;

-- ticket 単体の UNIQUE 制約を削除
ALTER TABLE public.trade_notes
  DROP CONSTRAINT IF EXISTS trade_notes_ticket_key;

-- 検索用の通常インデックスを作成（UNIQUE ではない）
CREATE INDEX IF NOT EXISTS trade_notes_user_ticket_idx 
  ON public.trade_notes(user_id, ticket);

-- trade_id の検索用インデックスも追加
CREATE INDEX IF NOT EXISTS trade_notes_trade_id_idx 
  ON public.trade_notes(trade_id);


-- ============================================================
-- ③ created_at/updated_at の NOT NULL 化
-- ============================================================

-- NULL を now() で埋める

-- user_settings
UPDATE public.user_settings
SET created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now());

-- trades
UPDATE public.trades
SET created_at = COALESCE(created_at, now());

-- trade_notes
UPDATE public.trade_notes
SET created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now());

-- daily_notes
UPDATE public.daily_notes
SET created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now());

-- free_memos
UPDATE public.free_memos
SET created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now());

-- note_links
UPDATE public.note_links
SET created_at = COALESCE(created_at, now());

-- account_summary
UPDATE public.account_summary
SET updated_at = COALESCE(updated_at, now());

-- account_transactions
UPDATE public.account_transactions
SET created_at = COALESCE(created_at, now());

-- ai_proposals
UPDATE public.ai_proposals
SET created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now());

-- reviews_monthly
UPDATE public.reviews_monthly
SET created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now());


-- NOT NULL 制約 + DEFAULT now() を付与

-- user_settings
ALTER TABLE public.user_settings
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

-- trades
ALTER TABLE public.trades
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now();

-- trade_notes
ALTER TABLE public.trade_notes
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

-- daily_notes
ALTER TABLE public.daily_notes
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

-- free_memos
ALTER TABLE public.free_memos
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

-- note_links
ALTER TABLE public.note_links
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now();

-- account_summary
ALTER TABLE public.account_summary
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

-- account_transactions
ALTER TABLE public.account_transactions
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now();

-- ai_proposals
ALTER TABLE public.ai_proposals
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

-- reviews_monthly
ALTER TABLE public.reviews_monthly
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();
