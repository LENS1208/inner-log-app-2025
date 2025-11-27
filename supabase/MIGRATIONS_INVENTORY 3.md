# Database Migrations Inventory

最終更新: 2025-11-17

## 概要

- **アクティブなマイグレーション**: 21個
- **アーカイブ済みマイグレーション**: 49個
- **総数**: 70個

## アクティブマイグレーション（新規DB作成時に使用）

これらのマイグレーションは、新しいデータベースを作成する際に必要なコアスキーマとロジックを含んでいます。

### 1. 基本テーブル作成 (2025-10-28)

**20251028013408_create_trading_journal_tables.sql**
- `trades` テーブル（取引データ）
- `daily_notes` テーブル（日次ノート）
- `trade_notes` テーブル（取引ノート）
- 基本インデックス作成
- 初期RLSポリシー（後で更新）

**20251028063214_add_free_memos_and_links.sql**
- `free_memos` テーブル（自由メモ）
- `note_links` テーブル（ノートリンク）

### 2. データセット対応 (2025-11-04)

**20251104012638_add_dataset_column_to_trades.sql**
- `trades` テーブルに `dataset` カラム追加
- デモデータとユーザーデータの分離

### 3. ユーザー設定 (2025-11-05)

**20251105134008_create_user_settings_table.sql**
- `user_settings` テーブル作成
- 言語、通貨、タイムゾーンなどの設定

**20251105223300_add_settings_page_columns.sql**
- 設定ページ用の追加カラム
- AI機能の設定フラグ

### 4. セキュリティ強化 (2025-11-06)

**20251106021717_add_user_id_and_secure_rls_policies.sql**
- 全テーブルに `user_id` カラム追加
- 安全なRLSポリシーの実装
- ユーザーごとのデータ分離

**20251111113600_fix_rls_security_vulnerability.sql**
- RLSセキュリティ脆弱性の修正

### 5. アカウント取引履歴 (2025-11-06, 2025-11-10)

**20251106102729_create_account_transactions_table.sql**
- `account_transactions` テーブル作成
- `account_summary` テーブル作成

**20251110124940_add_swap_breakdown_to_account_transactions.sql**
- スワップ詳細の追加

### 6. データ整合性 (2025-11-11)

**20251111004643_fix_trades_unique_constraint_for_user_id_v2.sql**
- `trades` テーブルのユニーク制約修正
- `(ticket, user_id)` の複合ユニーク制約

**20251111114430_add_auto_create_user_settings_trigger.sql**
- 新規ユーザー作成時の自動設定作成トリガー

**20251111114452_add_data_integrity_constraints.sql**
- データ整合性制約の追加

### 7. AI機能 (2025-11-11, 2025-11-12)

**20251111064202_create_ai_proposals_table.sql**
- `ai_proposals` テーブル作成
- AIによる提案・アドバイス機能

**20251111065954_add_parent_id_to_ai_proposals.sql**
- 提案のスレッド機能（親子関係）

**20251112005541_add_user_rating_to_ai_proposals.sql**
- ユーザーによる評価機能

**20251112010038_update_user_rating_to_decimal.sql**
- 評価の精度向上（decimal型）

### 8. データ正規化 (2025-11-12)

**20251112021301_normalize_item_to_uppercase.sql**
- 通貨ペア名の大文字統一

### 9. コーチング機能 (2025-11-16)

**20251116065904_create_coaching_jobs_table.sql**
- `ai_coaching_jobs` テーブル作成
- コーチングジョブの管理

**20251116121329_add_coach_avatar_preset_to_user_settings.sql**
- コーチアバター設定

**20251116123113_create_import_history_table.sql**
- `import_history` テーブル作成
- CSVインポート履歴の追跡

### 10. Pips計算修正 (2025-11-16)

**20251116130000_recalculate_pips_for_all_instruments.sql**
- すべての通貨ペアのPips計算を修正
- GOLD、通貨ペアごとの正確な計算

## アーカイブ済みマイグレーション

`supabase/migrations_archive/` ディレクトリに移動済み。

### カテゴリ

1. **テストユーザー関連** (18個)
   - 開発中のテストユーザー作成/削除試行

2. **パスワードリセット関連** (9個)
   - 認証問題の修正試行

3. **重複ファイル** (3個)
   - 既存マイグレーションのコピー

4. **デモデータ** (14個)
   - デモデータの投入・更新スクリプト

5. **修正試行** (5個)
   - 同じ問題に対する複数の修正試行

## 新規データベース作成手順

1. 上記21個のアクティブマイグレーションを順番に適用
2. デモデータが必要な場合は、別途データインポート
3. 初期ユーザーは通常のサインアップフローで作成

## 現在のデータベースへの影響

**なし**。これらのファイル移動は、既に適用済みのマイグレーションには影響しません。
現在のデータベースは引き続き正常に動作します。

## メンテナンス推奨事項

- 新しいマイグレーションは明確な命名規則に従う
- 一時的な修正やテストは別ブランチで行う
- 本番適用前にマイグレーションをレビュー
- 重複や試行錯誤のマイグレーションは定期的にアーカイブ
