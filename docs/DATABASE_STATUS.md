# データベース実装状況レポート

最終更新: 2025-11-11

## 📊 概要

このドキュメントは、FXトレーディングジャーナルアプリケーションのデータベース実装状況をまとめたものです。

---

## ✅ 完了事項

### 1. テーブル設計とスキーマ

以下のテーブルが実装済み：

| テーブル名 | 説明 | レコード数（概算） |
|-----------|------|-------------------|
| `trades` | トレード履歴 | 463 |
| `trade_notes` | トレードメモ/分析 | 0 |
| `daily_notes` | 日次振り返りノート | 1 |
| `free_memos` | 自由メモ | 4 |
| `note_links` | ノート間のリンク | 0 |
| `account_summary` | 口座サマリー | 2 |
| `account_transactions` | 入出金履歴 | 66 |
| `user_settings` | ユーザー設定 | 2 |
| `ai_proposals` | AI提案データ | 8 |

### 2. セキュリティ (Row Level Security)

**全テーブルでRLS有効化済み** ✅

#### 実装済みポリシー:
- **SELECT**: ユーザーは自分のデータとデモデータ（`user_id IS NULL`）のみ閲覧可能
- **INSERT**: 自分の`user_id`でのみ挿入可能
- **UPDATE**: 自分のデータのみ更新可能
- **DELETE**: 自分のデータのみ削除可能

#### セキュリティ監査履歴:
- 2025-11-11: **重大な脆弱性を修正** - 全テーブルに`USING (true)`の危険なポリシーが存在し、全ユーザーが他ユーザーのデータにアクセス可能だった問題を解消
- マイグレーション: `fix_rls_security_vulnerability.sql`

### 3. データ整合性制約

#### 外部キー制約 (25個)
- 全テーブルの`user_id` → `auth.users(id)` (ON DELETE CASCADE)
- `ai_proposals.parent_id` → `ai_proposals(id)` (ON DELETE SET NULL)

#### CHECK制約
**trades テーブル:**
- `size > 0` (取引サイズは正の数)
- `open_price > 0 AND close_price > 0` (価格は正の数)
- `close_time >= open_time` (決済時刻は約定時刻以降)

**account_summary テーブル:**
- `total_deposits IS NOT NULL AND total_withdrawals IS NOT NULL AND total_profit IS NOT NULL`

**user_settings テーブル:**
- 各Enum型フィールドに対する値検証（言語、タイムゾーン、テーマなど）

#### UNIQUE制約
- `trades(user_id, ticket)` - 同一ユーザー内でticketは一意
- `trade_notes(user_id, ticket)` - 同一ユーザー内でticketは一意
- `daily_notes(user_id, date_key)` - 同一ユーザー内で日付は一意
- `account_summary(user_id, dataset)` - 同一ユーザー内でデータセットは一意

### 4. トリガー

#### 実装済みトリガー (4個):

1. **`on_auth_user_created`**
   - テーブル: `auth.users`
   - タイミング: INSERT後
   - 機能: 新規ユーザー登録時に`user_settings`を自動作成
   - 関数: `handle_new_user()`

2. **`validate_trade_note_ticket_trigger`**
   - テーブル: `trade_notes`
   - タイミング: INSERT/UPDATE前
   - 機能: `trade_notes.ticket`が同一ユーザーの`trades.ticket`に存在するか検証
   - 関数: `validate_trade_note_ticket()`

3. **`user_settings_updated_at`**
   - テーブル: `user_settings`
   - タイミング: UPDATE時
   - 機能: `updated_at`フィールドを自動更新
   - 関数: `update_user_settings_updated_at()`

### 5. インデックス

#### パフォーマンス最適化のため以下を実装済み (36個):

**主要なインデックス:**
- `idx_trades_user_id` - ユーザー別トレード検索
- `idx_trades_close_time` - 時系列検索
- `idx_trades_ticket` - チケット番号検索
- `idx_trades_user_ticket` - 複合インデックス (user_id, ticket)
- `idx_trades_dataset` - データセット別検索
- `idx_daily_notes_date_key` - 日付別ノート検索
- `idx_account_transactions_user_dataset` - 口座取引履歴検索
- `idx_ai_proposals_created_at` - AI提案の時系列検索
- その他、各テーブルに適切なインデックスを配置

### 6. デフォルト値

全フィールドに適切なデフォルト値を設定:
- Boolean: `false` or `true` (適切な値)
- Numeric: `0` or 妥当なデフォルト
- Text: `''` (空文字) or 適切な初期値
- Timestamps: `now()`
- JSONB: `'{}'::jsonb` or `'[]'::jsonb`

### 7. マイグレーション管理

**マイグレーションファイル数: 37個**

主要なマイグレーション:
- `20251028013408_create_trading_journal_tables.sql` - 初期テーブル作成
- `20251106021717_add_user_id_and_secure_rls_policies.sql` - RLSポリシー追加
- `20251111113600_fix_rls_security_vulnerability.sql` - セキュリティ脆弱性修正
- `20251111114430_add_auto_create_user_settings_trigger.sql` - 自動設定作成
- `20251111114452_add_data_integrity_constraints.sql` - データ整合性制約追加

---

## ⚠️ 未着手事項

### 1. バックアップ・リストア機能
- [ ] 定期的な自動バックアップの設定
- [ ] ポイントインタイムリカバリの検証
- [ ] データエクスポート機能（ユーザー向け）

### 2. データベース関数・ストアドプロシージャ
- [ ] 複雑な集計処理の関数化（パフォーマンス向上のため）
- [ ] バッチ処理用の関数
- [ ] レポート生成用の最適化されたクエリ

### 3. パーティショニング
- [ ] `trades`テーブルの日付によるパーティショニング（将来的なデータ増加に備えて）
- [ ] `account_transactions`のパーティショニング

### 4. 監査ログ・変更履歴
- [ ] 重要なテーブルの変更履歴を記録するトリガー
- [ ] 監査ログテーブルの作成
- [ ] 削除されたデータのアーカイブ機能

### 5. 全文検索
- [ ] メモやノートの全文検索インデックス (PostgreSQL FTS)
- [ ] タグ検索の最適化

### 6. データクリーンアップ
- [ ] 古いデモデータの自動削除ジョブ
- [ ] 孤児レコードのクリーンアップスクリプト
- [ ] 未使用データの定期削除

### 7. マテリアライズドビュー
- [ ] 集計データのマテリアライズドビュー作成
  - 月次パフォーマンスサマリー
  - 通貨ペア別統計
  - 時間帯別統計
- [ ] 自動リフレッシュの設定

### 8. データベース監視
- [ ] スロークエリログの有効化と監視
- [ ] インデックス使用状況の定期チェック
- [ ] テーブルサイズの監視とアラート

### 9. 管理者機能
- [ ] 管理者ロールの定義
- [ ] 管理者用のRLSポリシー
- [ ] 全ユーザーデータへのアクセス権限（サポート用）

### 10. データ検証・品質管理
- [ ] データ品質チェック用の定期ジョブ
- [ ] 不整合データの検出と報告
- [ ] データ修復スクリプト

---

## 🔍 データベース構成詳細

### 接続情報
- **ホスティング**: Supabase
- **PostgreSQL バージョン**: 15.x (Supabase管理)
- **接続**: 環境変数 `.env` で管理

### 主要な設計思想

1. **マルチテナント**: `user_id`によるユーザー分離
2. **デモモード**: `user_id IS NULL`でデモデータを識別
3. **データセット**: A/B/C の3つのデモデータセットをサポート
4. **柔軟性**: JSONB型を活用した拡張可能な設計
5. **パフォーマンス**: 適切なインデックス配置

---

## 📝 開発者向けメモ

### RLSポリシーの命名規則
```
"Users can [action] own [resource]"
"Users can [action] own [resource] and demo data"
```

例:
- `"Users can view own trades and demo data"`
- `"Users can insert own trades"`

### マイグレーションの注意点
1. 常に`IF NOT EXISTS`/`IF EXISTS`を使用
2. `USING (true)`は絶対に使用しない（セキュリティリスク）
3. 各マイグレーションに詳細なコメントを記載
4. トランザクション制御文(`BEGIN`, `COMMIT`)は使用不可

### データアクセスパターン
- **読み取り**: RLSが自動的にフィルタリング
- **書き込み**: アプリケーション側で`user_id`を設定
- **デモデータ**: `user_id IS NULL`で識別

---

## 🔐 セキュリティチェックリスト

- [x] 全テーブルでRLS有効化
- [x] `USING (true)`ポリシーの削除
- [x] 外部キー制約の設定
- [x] デフォルト値の適切な設定
- [x] ユーザー認証チェック（アプリケーション層）
- [ ] 定期的なセキュリティ監査
- [ ] SQL インジェクション対策の検証
- [ ] 機密データの暗号化（必要に応じて）

---

## 📊 パフォーマンス状況

現時点での推定パフォーマンス:
- **トレード取得**: ~10ms (インデックス使用)
- **日次ノート取得**: ~5ms
- **集計クエリ**: ~50-100ms (複雑さによる)

**ボトルネック予想箇所**:
- トレードデータが10万件を超えた場合の集計処理
- 複雑なJOINを含むレポート生成

---

## 🚀 次のステップ推奨

### 優先度: 高
1. データベース監視の設定
2. バックアップ戦略の確立
3. スロークエリの特定と最適化

### 優先度: 中
4. マテリアライズドビューの検討
5. 全文検索の実装
6. データクリーンアップジョブの作成

### 優先度: 低
7. パーティショニングの検討（データ量次第）
8. 監査ログの実装（コンプライアンス要件次第）

---

## 📞 サポート・質問

データベース関連の質問や問題があれば、以下を確認してください:

1. このドキュメント
2. マイグレーションファイルのコメント（`supabase/migrations/`）
3. Supabaseダッシュボード

---

**ドキュメント作成者**: Claude Code
**レビュー**: 未実施
**次回更新予定**: OpenAI API統合完了後
