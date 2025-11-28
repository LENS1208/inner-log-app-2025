# デモデータに日記・メモを紐付ける際の分析レポート

## 現状の整理

### 1. データベーススキーマ

#### 取引データ（trades）
- **主キー**: `id` (uuid)
- **ビジネスキー**: `ticket` (text) - 取引番号
- **ユーザー識別**: `user_id` (uuid, nullable)
- **データセット識別**: `dataset` (text, nullable) - 'A', 'B', 'C' または NULL

#### 日記・メモ系テーブル
1. **trade_notes（取引ノート）**
   - `ticket` (text, UNIQUE) - tradesテーブルとの紐付けキー
   - `user_id` (uuid, nullable)
   - エントリー根拠、感情、振り返りメモなど

2. **daily_notes（日次ノート）**
   - `date_key` (text, UNIQUE) - YYYY-MM-DD形式
   - `user_id` (uuid, nullable)
   - その日の振り返り、約束、自由メモ

3. **free_memos（自由メモ）**
   - `id` (uuid)
   - `date_key` (text) - 日付関連
   - `user_id` (uuid, nullable)

4. **note_links（ノート間リンク）**
   - `source_type`, `source_id` - リンク元
   - `target_type`, `target_id` - リンク先
   - `user_id` (uuid, nullable)

### 2. デモデータポリシー

**重要**: 現在のポリシーでは**デモデータはCSVファイルのみ**で管理されています
- `/public/demo/A.csv`, `/public/demo/B.csv`, `/public/demo/C.csv`
- データベースには保存しない方針
- 理由: 匿名アクセス対応、シンプルな設計、メンテナンス性

### 3. 既存の制約と設計

#### UNIQUE制約の問題
```sql
-- trades テーブル
CREATE UNIQUE INDEX trades_user_ticket_unique
  ON trades(user_id, ticket) WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX trades_demo_ticket_unique
  ON trades(ticket) WHERE user_id IS NULL;

-- trade_notes テーブル
CREATE UNIQUE INDEX trade_notes_ticket_key ON trade_notes(ticket);

-- daily_notes テーブル
CREATE UNIQUE INDEX daily_notes_date_key_key ON daily_notes(date_key);
```

**問題点**:
- `trade_notes.ticket` は**グローバルにUNIQUE**（全ユーザー・全データセットで一意）
- `daily_notes.date_key` も**グローバルにUNIQUE**
- これでは複数のデモデータセット（A, B, C）に対して同じticketやdate_keyの日記を作成できない

#### 外部キー制約の問題
```sql
-- 現在、trade_notes → trades の外部キー制約は削除されている
-- 理由: ticketがグローバルに一意でなくなったため
```

## リスクと注意点

### 🔴 重大な問題

#### 1. UNIQUE制約の衝突
**問題**: デモデータセットA, B, Cで同じticket番号の取引に異なる日記を紐付けられない

例:
```
Dataset A: ticket='500000001' → trade_note='Aの日記'
Dataset B: ticket='500000001' → trade_note='Bの日記'  ❌ UNIQUE制約違反
```

**影響**:
- デモデータに日記を追加する際、各データセットで異なる内容の日記を設定できない
- 実質的に1つのデータセットにしか日記を追加できない

#### 2. データベース vs CSVファイルの矛盾
**問題**: デモデータの取引はCSVで管理しているが、日記はデータベースに保存する必要がある

**矛盾点**:
- 取引データ: CSVファイル（静的、匿名アクセス可能）
- 日記データ: データベース（動的、RLS保護）

**影響**:
- データ管理の一貫性が失われる
- CSVを更新しても日記との紐付けが壊れる可能性
- バックアップ・リストア時に取引と日記の整合性が保証されない

#### 3. RLSポリシーの問題
**現在の設定**:
```sql
-- 認証ユーザーは自分のデータ + user_id IS NULL のデータを閲覧可能
USING (auth.uid() = user_id OR user_id IS NULL)
```

**問題**:
- デモデータの日記（`user_id IS NULL`）は全ユーザーから参照可能（読み取り専用）
- しかし全ユーザーが同じデモ日記を見ることになる
- データセットA, B, Cで異なる日記を表示できない

### 🟡 中程度の問題

#### 4. データセット識別の欠如
**問題**: `trade_notes`, `daily_notes`に`dataset`カラムがない

**影響**:
- どの日記がどのデータセットに属するか識別できない
- データセット切り替え時に適切な日記を表示できない

#### 5. 参照整合性の欠如
**問題**: `trade_notes.ticket` → `trades.ticket` の外部キー制約がない

**影響**:
- 存在しないticketに対する日記を作成できてしまう
- 取引を削除しても日記が残る（孤立データ）
- アプリケーション側で整合性を保証する必要がある

#### 6. date_keyの一意性
**問題**: `daily_notes.date_key`がグローバルに一意

**影響**:
- 複数のデモデータセットで同じ日付の日記を作成できない
- 例: '2024-11-01'の日記はA, B, Cのうち1つのデータセットにしか作成できない

### 🟢 軽微な問題

#### 7. CSVとの同期
**問題**: CSVファイルを更新した際、日記との紐付けが自動更新されない

**影響**:
- メンテナンス時に手動で整合性を確認する必要がある
- ticket番号が変わると日記との紐付けが壊れる

## 推奨される解決策

### 方針1: デモデータ日記もCSVファイルで管理（推奨）

**概要**: 取引データと同様、日記もCSVファイルで管理

```
/public/demo/
  ├── A.csv           (取引データ)
  ├── A_notes.csv     (取引ノート)
  ├── A_daily.csv     (日次ノート)
  ├── B.csv
  ├── B_notes.csv
  ├── B_daily.csv
  └── ...
```

**メリット**:
- ✅ データの一貫性が保たれる
- ✅ バックアップ・リストアが簡単
- ✅ UNIQUE制約の問題を回避
- ✅ データベーススキーマ変更不要
- ✅ メンテナンスが容易

**デメリット**:
- ❌ ユーザーがデモデータの日記を編集できない（読み取り専用）
- ❌ CSV解析の処理が増える

**実装の影響**:
- `src/services/demoData.ts`に日記読み込み機能を追加
- フロントエンドで日記データを結合する処理を追加
- データベーススキーマ変更なし

### 方針2: データベースに保存し、スキーマを修正

**概要**: 日記テーブルに`dataset`カラムを追加し、複合UNIQUE制約に変更

**必要な変更**:

```sql
-- 1. 日記テーブルにdatasetカラムを追加
ALTER TABLE trade_notes ADD COLUMN dataset text;
ALTER TABLE daily_notes ADD COLUMN dataset text;
ALTER TABLE free_memos ADD COLUMN dataset text;
ALTER TABLE note_links ADD COLUMN dataset text;

-- 2. UNIQUE制約を修正
DROP INDEX trade_notes_ticket_key;
CREATE UNIQUE INDEX trade_notes_user_dataset_ticket_unique
  ON trade_notes(user_id, dataset, ticket)
  WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX trade_notes_demo_dataset_ticket_unique
  ON trade_notes(dataset, ticket)
  WHERE user_id IS NULL;

DROP INDEX daily_notes_date_key_key;
CREATE UNIQUE INDEX daily_notes_user_dataset_date_unique
  ON daily_notes(user_id, dataset, date_key)
  WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX daily_notes_demo_dataset_date_unique
  ON daily_notes(dataset, date_key)
  WHERE user_id IS NULL;

-- 3. RLSポリシーを修正（datasetを考慮）
-- 各テーブルのSELECTポリシーにdatasetフィルタを追加
```

**メリット**:
- ✅ データセットごとに異なる日記を保存可能
- ✅ データベースで一元管理
- ✅ 参照整合性を保証可能

**デメリット**:
- ❌ 大規模なスキーマ変更が必要
- ❌ 既存データのマイグレーションが必要
- ❌ RLSポリシーが複雑になる
- ❌ デモデータポリシーとの矛盾（DBに保存しない原則に反する）

### 方針3: ハイブリッド方式（現実的な妥協案）

**概要**:
- デモデータの取引 → CSV
- デモデータの日記 → データベース（1セットのみ、dataset='default'）
- ユーザーの取引・日記 → データベース

**実装**:
```sql
-- デモデータの日記は dataset='default' のみ
-- 複数データセット対応は諦める
INSERT INTO trade_notes (ticket, user_id, dataset, note_free)
VALUES ('500000001', NULL, 'default', 'デモ日記');
```

**メリット**:
- ✅ 最小限の変更で実装可能
- ✅ ユーザーデータは問題なく動作
- ✅ デモに1種類の日記を表示できる

**デメリット**:
- ❌ データセットA, B, Cで異なる日記を表示できない
- ❌ データ管理の一貫性に欠ける

## 推奨する実装手順

### ✅ 推奨: 方針1（CSV管理）

1. **CSVファイルの作成**
   ```bash
   /public/demo/
     ├── A_trade_notes.csv    # ticket, entry_emotion, note_free, など
     ├── A_daily_notes.csv    # date_key, good, improve, next_promise, など
     ├── B_trade_notes.csv
     ├── B_daily_notes.csv
     └── ...
   ```

2. **CSV読み込み機能の追加**
   ```typescript
   // src/services/demoData.ts
   async function loadDemoTradeNotes(dataset: string): Promise<TradeNote[]> {
     const res = await fetch(`/demo/${dataset}_trade_notes.csv`);
     // CSV解析処理
   }
   ```

3. **フロントエンドで結合**
   ```typescript
   // 取引データと日記データを結合して表示
   const trades = await loadDemoTrades('A');
   const notes = await loadDemoTradeNotes('A');
   // tradesとnotesをticketで結合
   ```

4. **テスト**
   - 各データセット（A, B, C）で異なる日記が表示されることを確認
   - データセット切り替え時に正しい日記が表示されることを確認

## セキュリティ考慮事項

1. **匿名アクセス**
   - デモデータの日記は誰でも閲覧可能（CSVファイル）
   - 機密情報を含めない

2. **ユーザーデータの保護**
   - ユーザーの日記は必ずRLSで保護
   - `user_id`が必須

3. **データ改ざん防止**
   - CSVファイルは静的ファイルとして配信（読み取り専用）

## まとめ

### 現状での不具合・リスク

| 問題 | 深刻度 | 説明 |
|------|--------|------|
| UNIQUE制約衝突 | 🔴 高 | 複数データセットに日記を追加できない |
| CSV vs DB矛盾 | 🔴 高 | データ管理の一貫性が失われる |
| RLSの制限 | 🔴 高 | データセット別の日記表示ができない |
| dataset識別欠如 | 🟡 中 | どの日記がどのデータセットか不明 |
| 参照整合性欠如 | 🟡 中 | 孤立データが発生する可能性 |
| CSVとの同期 | 🟢 低 | メンテナンス時に手動確認が必要 |

### 推奨アクション

**最優先**: 方針1（CSV管理）を採用
- デモデータの一貫性を保つ
- 最小限の変更で実装可能
- 既存のデモデータポリシーに準拠

**次善策**: 方針3（ハイブリッド）
- 迅速な実装が必要な場合
- 1つのデモ日記セットで十分な場合

**避けるべき**: 方針2（大規模DB変更）
- コストが高い
- デモデータポリシーに反する
- メンテナンスが複雑になる
