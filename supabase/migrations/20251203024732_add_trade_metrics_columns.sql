/*
  # トレードメトリクスカラムの追加

  1. 変更内容
    - `trades`テーブルに以下のカラムを追加：
      - `mfe_pips` (decimal): Maximum Favorable Excursion - 建玉中の最大含み益（pips）
      - `mae_pips` (decimal): Maximum Adverse Excursion - 建玉中の最大含み損（pips）
      - `max_possible_gain_pips` (decimal): 理論上取り得た最大利益（決済後も含む）
      - `planned_tp_pips` (decimal): 初期計画のテイクプロフィットまでのpips

  2. デフォルト値
    - すべて NULL 許容（既存データがあるため）
    - 新規トレードでは計算して挿入する想定

  3. 注意
    - これらの値はCSVインポート時や手動入力時に計算して保存
    - 既存データには後から計算してUPDATEする必要がある
*/

-- MFE (Maximum Favorable Excursion) カラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'mfe_pips'
  ) THEN
    ALTER TABLE trades ADD COLUMN mfe_pips decimal(10,2);
  END IF;
END $$;

-- MAE (Maximum Adverse Excursion) カラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'mae_pips'
  ) THEN
    ALTER TABLE trades ADD COLUMN mae_pips decimal(10,2);
  END IF;
END $$;

-- 理論上の最大利益カラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'max_possible_gain_pips'
  ) THEN
    ALTER TABLE trades ADD COLUMN max_possible_gain_pips decimal(10,2);
  END IF;
END $$;

-- 計画TPカラムを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'planned_tp_pips'
  ) THEN
    ALTER TABLE trades ADD COLUMN planned_tp_pips decimal(10,2);
  END IF;
END $$;

-- コメント追加
COMMENT ON COLUMN trades.mfe_pips IS '建玉中の最大含み益（pips）';
COMMENT ON COLUMN trades.mae_pips IS '建玉中の最大含み損（pips）';
COMMENT ON COLUMN trades.max_possible_gain_pips IS '理論上取り得た最大利益（pips）';
COMMENT ON COLUMN trades.planned_tp_pips IS '初期計画のTP（pips）';
