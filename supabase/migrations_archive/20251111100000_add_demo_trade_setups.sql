/*
  # デモデータにセットアップ情報を追加

  1. 変更内容
    - デモデータの取引に対してtrade_notesレコードを作成
    - 各取引にランダムなセットアップ（Breakout, Pullback, Reversal, Trend, Range, Scalp）を割り当て
    - entry_basisフィールドにセットアップ情報を保存

  2. セットアップの種類
    - Breakout: ブレイクアウト戦略
    - Pullback: プルバック戦略
    - Reversal: 反転戦略
    - Trend: トレンドフォロー戦略
    - Range: レンジ戦略
    - Scalp: スキャルピング戦略

  3. 重要な注意事項
    - 既存のtrade_notesレコードがある場合はスキップ
    - デモユーザー（user_id IS NULL）のデータのみに適用
*/

-- データセットAの取引にセットアップを追加
DO $$
DECLARE
  demo_trade RECORD;
  setup_types TEXT[] := ARRAY['Breakout', 'Pullback', 'Reversal', 'Trend', 'Range', 'Scalp'];
  random_setup TEXT;
  row_counter INT := 0;
BEGIN
  FOR demo_trade IN
    SELECT ticket
    FROM trades
    WHERE dataset = 'A'
    AND user_id IS NULL
    ORDER BY ticket
  LOOP
    -- 既存のレコードがないか確認
    IF NOT EXISTS (
      SELECT 1 FROM trade_notes
      WHERE ticket = demo_trade.ticket
      AND user_id IS NULL
    ) THEN
      -- ランダムにセットアップを選択（分布を調整）
      row_counter := row_counter + 1;
      CASE (row_counter % 6)
        WHEN 0 THEN random_setup := 'Breakout';
        WHEN 1 THEN random_setup := 'Pullback';
        WHEN 2 THEN random_setup := 'Reversal';
        WHEN 3 THEN random_setup := 'Trend';
        WHEN 4 THEN random_setup := 'Range';
        WHEN 5 THEN random_setup := 'Scalp';
      END CASE;

      -- trade_notesレコードを作成
      INSERT INTO trade_notes (
        id,
        ticket,
        user_id,
        entry_basis,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        demo_trade.ticket,
        NULL,
        jsonb_build_object('setup', random_setup),
        NOW(),
        NOW()
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'Added setup information to % trades in dataset A', row_counter;
END $$;

-- データセットBの取引にセットアップを追加
DO $$
DECLARE
  demo_trade RECORD;
  setup_types TEXT[] := ARRAY['Breakout', 'Pullback', 'Reversal', 'Trend', 'Range', 'Scalp'];
  random_setup TEXT;
  row_counter INT := 0;
BEGIN
  FOR demo_trade IN
    SELECT ticket
    FROM trades
    WHERE dataset = 'B'
    AND user_id IS NULL
    ORDER BY ticket
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM trade_notes
      WHERE ticket = demo_trade.ticket
      AND user_id IS NULL
    ) THEN
      row_counter := row_counter + 1;
      CASE (row_counter % 6)
        WHEN 0 THEN random_setup := 'Breakout';
        WHEN 1 THEN random_setup := 'Pullback';
        WHEN 2 THEN random_setup := 'Reversal';
        WHEN 3 THEN random_setup := 'Trend';
        WHEN 4 THEN random_setup := 'Range';
        WHEN 5 THEN random_setup := 'Scalp';
      END CASE;

      INSERT INTO trade_notes (
        id,
        ticket,
        user_id,
        entry_basis,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        demo_trade.ticket,
        NULL,
        jsonb_build_object('setup', random_setup),
        NOW(),
        NOW()
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'Added setup information to % trades in dataset B', row_counter;
END $$;

-- データセットCの取引にセットアップを追加
DO $$
DECLARE
  demo_trade RECORD;
  setup_types TEXT[] := ARRAY['Breakout', 'Pullback', 'Reversal', 'Trend', 'Range', 'Scalp'];
  random_setup TEXT;
  row_counter INT := 0;
BEGIN
  FOR demo_trade IN
    SELECT ticket
    FROM trades
    WHERE dataset = 'C'
    AND user_id IS NULL
    ORDER BY ticket
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM trade_notes
      WHERE ticket = demo_trade.ticket
      AND user_id IS NULL
    ) THEN
      row_counter := row_counter + 1;
      CASE (row_counter % 6)
        WHEN 0 THEN random_setup := 'Breakout';
        WHEN 1 THEN random_setup := 'Pullback';
        WHEN 2 THEN random_setup := 'Reversal';
        WHEN 3 THEN random_setup := 'Trend';
        WHEN 4 THEN random_setup := 'Range';
        WHEN 5 THEN random_setup := 'Scalp';
      END CASE;

      INSERT INTO trade_notes (
        id,
        ticket,
        user_id,
        entry_basis,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        demo_trade.ticket,
        NULL,
        jsonb_build_object('setup', random_setup),
        NOW(),
        NOW()
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'Added setup information to % trades in dataset C', row_counter;
END $$;
