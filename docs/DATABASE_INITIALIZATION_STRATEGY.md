# データベース初期化戦略とデータ管理方針

## 📊 現状分析

### 現在のデータベース状態

**本番データベース（現在）**:
```
auth.users:              1件  (kan.yamaji@gmail.com)
trades:                  0件
trade_notes:             0件
daily_notes:             0件
account_summary:         0件
account_transactions:    0件
user_settings:           2件  (デモ用1件 + ユーザー1件)
ai_proposals:            0件
ai_coaching_jobs:        0件
import_history:          0件
```

**過去にアーカイブされたテストデータマイグレーション**:
- デモトレード50件以上（Dataset A, B, C）
- アカウントトランザクション
- アカウントサマリー
- デモユーザー作成

これらは全て`migrations_archive/`に移動済みで、現在のマイグレーションには**含まれていません**。

---

## 🔄 「テストデータをマイグレーションに含めない」の意味

### マイグレーションに含めた場合（過去の方式）

```sql
-- マイグレーション: 20251110045022_seed_demo_trades_dataset_a.sql
INSERT INTO trades (user_id, dataset, ticket, item, ...)
VALUES
  (user_id, 'A', '101000000', 'GBPUSD', ...),
  (user_id, 'A', '101000001', 'AUDUSD', ...),
  -- 50件のデモトレード
```

#### 問題点
1. **本番環境にテストデータが入る**
   - 新規ユーザーもデモトレード50件を持つことになる
   - 実際のトレードとの区別が困難

2. **データの削除が困難**
   - マイグレーションで入れたデータは「スキーマの一部」として扱われる
   - 後で削除するには別のマイグレーションが必要

3. **ユーザー体験の混乱**
   - 自分が登録していないデータが最初から存在
   - データベースのサイズが不必要に大きくなる

4. **データの更新が困難**
   - デモデータを更新したい場合、新しいマイグレーションが必要
   - 過去のマイグレーションは変更できない

### マイグレーションに含めない場合（推奨方式）

#### アプローチ1: アプリケーション起動時に動的生成
```typescript
// フロントエンドで初回アクセス時にデモデータを生成
if (isFirstVisit && !isAuthenticated) {
  await loadDemoDataFromJSON();
}
```

#### アプローチ2: デモモード用の静的ファイル
```typescript
// public/demo/trades.json
// アプリが必要に応じて読み込む
```

#### アプローチ3: サーバーサイドスクリプト
```bash
# 開発環境のみで実行
npm run seed:demo-data
```

---

## 📈 本番環境と開発環境の違い

### 本番環境（Production）

**初期状態**:
```
✅ スキーマ: 全テーブル作成済み（マイグレーションによる）
✅ RLS: 全ポリシー設定済み
✅ トリガー: 自動作成機能有効
❌ ユーザー: 0件（ユーザーは自分で登録）
❌ トレード: 0件
❌ デモデータ: 0件
```

**ユーザー登録後**:
```
✅ ユーザー: 1件（新規登録したユーザー）
✅ user_settings: 1件（トリガーで自動作成）
❌ トレード: 0件（ユーザーがCSVインポートするまで空）
```

**データの成長**:
- ユーザーが自分でCSVをインポート
- ユーザーが手動でトレードを追加
- AIコーチング機能で自動的にai_proposalsが作成される
- 完全にユーザーの実データのみ

### 開発環境（Development）

**初期状態**:
```
✅ スキーマ: 全テーブル作成済み（同じマイグレーション）
✅ RLS: 全ポリシー設定済み
✅ テストユーザー: 手動またはスクリプトで作成
✅ デモデータ: スクリプトで投入可能
```

**開発用データ投入**:
```bash
# 開発環境でのみ実行
npm run seed:test-user      # テストユーザー作成
npm run seed:demo-trades    # デモトレード投入
npm run seed:full-dataset   # 完全なテストデータセット
```

---

## 🎯 推奨されるデータ管理戦略

### 1. マイグレーションの役割

**含めるべきもの（スキーマ定義）**:
- ✅ テーブル作成 (`CREATE TABLE`)
- ✅ カラム追加 (`ALTER TABLE ADD COLUMN`)
- ✅ インデックス作成 (`CREATE INDEX`)
- ✅ RLSポリシー (`CREATE POLICY`)
- ✅ トリガー (`CREATE TRIGGER`)
- ✅ 関数 (`CREATE FUNCTION`)
- ✅ 制約 (`ADD CONSTRAINT`)

**含めないべきもの（データ）**:
- ❌ テストユーザー (`INSERT INTO auth.users`)
- ❌ デモトレード (`INSERT INTO trades`)
- ❌ サンプルデータ (`INSERT INTO ...`)
- ❌ マスターデータ以外のデータ

**例外: マスターデータ**:
```sql
-- これはOK: アプリケーションが動作するために必要
INSERT INTO currency_pairs (code, name, pip_value)
VALUES
  ('USDJPY', 'USD/JPY', 0.01),
  ('EURUSD', 'EUR/USD', 0.0001),
  ('GBPUSD', 'GBP/USD', 0.0001);
```

### 2. デモデータの管理方法

#### 推奨: フロントエンドでの動的生成

**現在の実装を活用**:
```typescript
// src/services/demoData.ts
export async function loadDemoData() {
  // 既存のpublic/demo/*.jsonから読み込み
  const trades = await fetch('/demo/trades.json');
  return trades.json();
}
```

**メリット**:
- データベースは常にクリーン
- デモデータの更新が簡単（JSONファイルを編集するだけ）
- 本番環境に影響なし
- ユーザーはログイン前にデモを体験できる

**実装例**:
```typescript
// アプリ起動時
if (!user) {
  // 未ログイン: デモデータをメモリで表示
  const demoTrades = await loadDemoData();
  setTrades(demoTrades);
} else {
  // ログイン済み: データベースから取得
  const userTrades = await fetchUserTrades(user.id);
  setTrades(userTrades);
}
```

### 3. 開発環境用データ投入スクリプト

**新規作成推奨**:

```typescript
// scripts/seed-dev-data.ts
import { createClient } from '@supabase/supabase-js';

async function seedDevData() {
  const supabase = createClient(url, serviceRoleKey);

  // 1. テストユーザー作成
  const { data: user } = await supabase.auth.admin.createUser({
    email: 'test@example.com',
    password: 'test123',
    email_confirm: true
  });

  // 2. デモトレード投入
  const trades = JSON.parse(
    await fs.readFile('public/demo/trades.json', 'utf-8')
  );

  await supabase.from('trades').insert(
    trades.map(t => ({ ...t, user_id: user.id }))
  );

  console.log('✅ Dev data seeded successfully');
}

// 開発環境でのみ実行
if (process.env.NODE_ENV === 'development') {
  seedDevData();
}
```

**package.jsonに追加**:
```json
{
  "scripts": {
    "seed:dev": "tsx scripts/seed-dev-data.ts"
  }
}
```

---

## 🔄 既存のデモデータをどう扱うか

### 現在の状況
- `public/demo/trades.json` - フロントエンドで使用中 ✅
- `public/demo/A.csv`, `B.csv`, `C.csv` - CSVファイル ✅
- `migrations_archive/` - 過去のデータ投入マイグレーション（削除済み） ✅

### 推奨アクション

#### 1. フロントエンドのデモモード（現状維持）
```typescript
// すでに実装済み
// 未ログインユーザーにデモデータを表示
if (!user) {
  const demo = await fetch('/demo/trades.json');
  // メモリ内で表示、DBには保存しない
}
```

#### 2. サインアップ後の初期体験（オプション）

**ユーザーがサインアップした直後**:
```typescript
async function onSignup(userId: string) {
  // オプション: 初回ログイン時にサンプルデータを提供
  const wantDemo = await showDialog(
    'チュートリアル用のサンプルデータを作成しますか？'
  );

  if (wantDemo) {
    await copySampleTradesToUser(userId);
  }
}
```

**メリット**:
- ユーザーの選択を尊重
- 不要な人は空のアカウントで開始
- チュートリアル用のデータが欲しい人には提供

#### 3. CSV手動インポート（推奨）

**最もシンプル**:
```
1. ユーザーがサインアップ
2. 空のダッシュボードを表示
3. 「CSVをインポート」ボタンを表示
4. ユーザーがpublic/demo/A.csvをダウンロード＆インポート
```

**メリット**:
- データベースは常に本物のユーザーデータのみ
- デモデータの有無はユーザー次第
- 既存のインポート機能を活用

---

## 📋 本番環境と開発環境の差異まとめ

| 項目 | 本番環境 | 開発環境 |
|------|---------|---------|
| **スキーマ** | マイグレーションで自動作成 | 同じ |
| **RLSポリシー** | マイグレーションで設定 | 同じ |
| **初期ユーザー** | 0件（ユーザーが登録） | スクリプトで作成可能 |
| **初期トレード** | 0件 | スクリプトで投入可能 |
| **デモデータ** | JSONから動的読み込み | 同じ |
| **テストデータ** | なし | スクリプトで自由に投入 |
| **データ削除** | ユーザーのみ可能 | 開発者が自由に削除可能 |

### 本番環境での新規ユーザー体験

```
1. ユーザー登録
   ↓
2. 空のダッシュボード表示
   ↓
3. オプションA: CSVインポート機能を使う
   オプションB: 手動でトレードを入力
   オプションC: デモデータをコピー（ボタン1つで）
```

### 開発環境での作業フロー

```
1. マイグレーション適用（スキーマのみ）
   ↓
2. npm run seed:dev（テストデータ投入）
   ↓
3. 開発・テスト
   ↓
4. 必要に応じてデータをリセット
   ↓
5. 再度seed:dev実行
```

---

## 🎯 今後の推奨実装

### 短期（リリース前）

1. **デモモードの確認**
   - [ ] 未ログイン時にデモデータが正しく表示されるか確認
   - [ ] `public/demo/trades.json`の内容を更新・充実

2. **初回ユーザー体験の設計**
   - [ ] サインアップ後のウェルカム画面
   - [ ] 「サンプルデータで試す」ボタンの追加（オプション）
   - [ ] CSVインポートへの導線を明確に

3. **開発用スクリプトの作成**
   - [ ] `scripts/seed-dev-data.ts`作成
   - [ ] `npm run seed:dev`で簡単にテストデータ投入

### 中期（リリース後）

1. **オンボーディング改善**
   - インタラクティブなチュートリアル
   - 初回トレード入力のガイド
   - CSV形式の説明とサンプルダウンロード

2. **データ管理機能**
   - ユーザーによるデータエクスポート
   - データバックアップ機能
   - データ削除・リセット機能

---

## ✅ チェックリスト

### 本番リリース前
- [x] マイグレーションにテストデータが含まれていないか確認
- [x] RLSポリシーが適切に設定されているか確認
- [ ] デモモードが正常に動作するか確認
- [ ] 新規ユーザーのサインアップフローをテスト
- [ ] 空のダッシュボードが適切に表示されるか確認
- [ ] CSVインポート機能が正常に動作するか確認

### 開発環境
- [ ] `scripts/seed-dev-data.ts`を作成
- [ ] テストユーザーの簡単な作成方法を文書化
- [ ] データリセット手順を文書化

---

## 📚 結論

**テストデータをマイグレーションに含めない**ことで：

1. ✅ **本番データベースはクリーン** - ユーザーの実データのみ
2. ✅ **柔軟なデモ体験** - JSONファイルで簡単に更新可能
3. ✅ **開発効率向上** - スクリプトで自由にテストデータ投入
4. ✅ **データ整合性** - テストデータと本番データが混在しない
5. ✅ **スケーラビリティ** - データベースサイズが不必要に大きくならない

この方針により、開発環境と本番環境の違いは**データの有無のみ**となり、スキーマやセキュリティ設定は完全に同一に保たれます。

---

**作成日**: 2025-11-25
**最終更新**: 2025-11-25
