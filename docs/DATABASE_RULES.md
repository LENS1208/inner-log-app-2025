# データベース管理ルール

**最終更新**: 2025-11-25

---

## 🎯 基本方針

### マイグレーションの役割

マイグレーションは**データ構造のみ**を定義します。

#### ✅ マイグレーションに含めるもの

- テーブル作成 (`CREATE TABLE`)
- カラムの追加・変更 (`ALTER TABLE`)
- インデックス作成 (`CREATE INDEX`)
- RLSポリシー設定 (`CREATE POLICY`)
- トリガー設定 (`CREATE TRIGGER`)
- 関数定義 (`CREATE FUNCTION`)
- 制約の追加 (`ADD CONSTRAINT`)

#### ❌ マイグレーションに含めないもの

- テストユーザーの作成
- デモデータの挿入
- サンプルトレードの挿入
- 開発用データ
- 特定ユーザー向けのデータ

---

## 📊 デモデータの管理

### ルール

**デモデータは必ずCSVファイルで管理します。データベースには保存しません。**

### 保管場所

```
/public/demo/
  ├── A.csv    (デモデータセットA)
  ├── B.csv    (デモデータセットB)
  └── C.csv    (デモデータセットC)
```

### 使用方法

フロントエンドで動的に読み込み、メモリ内で表示します。

```typescript
const res = await fetch(`/demo/${datasetName}.csv`);
const text = await res.text();
const trades = parseCsvText(text);
```

### 禁止事項

- ❌ マイグレーションでデモデータを挿入
- ❌ データベースにデモデータを保存
- ❌ RLSポリシーを緩めて匿名アクセスを許可

---

## 👤 テストユーザーの定義

### テストユーザーとは

通常のサインアップ機能で作成された、一般ユーザーの1人です。

### 特徴

- 特別な初期データは不要
- 他のユーザーと完全に同じ状態で開始
- 誰もがログインできる共有アカウント
- テスト目的でのみ使用

### 作成方法

通常のサインアップフォームから作成します。マイグレーションでは作成しません。

---

## 🔐 セキュリティルール

### RLSポリシー（publicスキーマのみ）

全てのpublicスキーマのテーブルで以下を厳守：

```sql
-- ✅ 正しい例
CREATE POLICY "Users can view own data"
  ON public.table_name FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ❌ 絶対に禁止
CREATE POLICY "Allow all access"
  ON public.table_name FOR ALL
  USING (true);
```

### 禁止事項

- ❌ `USING (true)` の使用
- ❌ 匿名アクセスの許可（デモデータ以外）
- ❌ publicスキーマでのRLS無効化
- ❌ **authスキーマの変更（後述）**

---

## 🚫 絶対禁止: authスキーマの変更

### ⚠️ 重要: これは最も重大なルールです

authスキーマはSupabaseの認証システムの心臓部です。
誤った変更はアプリケーション全体を停止させます。

### authスキーマとは

- `auth.users` - ユーザー情報
- `auth.sessions` - セッション情報
- `auth.identities` - 認証プロバイダー情報
- `auth.refresh_tokens` - リフレッシュトークン
- その他の認証関連テーブル

### 禁止事項

#### 1. RLSの有効化（最も重大）

```sql
-- ❌ 絶対に実行しないでください
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;
```

**理由**: RLSが有効になると、Supabaseの認証システムが自身のテーブルに
アクセスできなくなり、すべてのログインが失敗します。

**影響**: アプリケーション全体が使用不能になります。

#### 2. 直接的なデータ変更

```sql
-- ❌ 絶対に実行しないでください
INSERT INTO auth.users (...) VALUES (...);
UPDATE auth.users SET ...;
DELETE FROM auth.users WHERE ...;
```

**理由**: データ整合性が破壊され、認証システムが動作しなくなります。

#### 3. スキーマ変更

```sql
-- ❌ 絶対に実行しないでください
ALTER TABLE auth.users ADD COLUMN ...;
CREATE TABLE auth.my_table (...);
DROP TABLE auth.users;
```

**理由**: Supabaseの内部構造を破壊します。

### 正しい方法

```typescript
// ✅ Supabase APIを使用
import { supabase } from './lib/supabase';

// ユーザー作成
await supabase.auth.signUp({ email, password });

// ログイン
await supabase.auth.signInWithPassword({ email, password });

// ユーザー情報更新
await supabase.auth.updateUser({
  data: { display_name: 'New Name' }
});
```

### 緊急時の対応

authスキーマを誤って変更してしまった場合：

1. **即座に停止** - さらなる変更を行わない
2. **このファイルを参照** - `CRITICAL_FIX_AUTH_RLS.md`
3. **修正SQL実行** - `fix_auth_rls.sql`
4. **ログインテスト** - 修正を確認
5. **チームに報告** - 再発防止のため

### なぜこのルールが存在するか

2025-11-25に、authスキーマのRLSが誤って有効化され、すべてのログインが
失敗する重大な障害が発生しました。

**症状**:
```
Error: Database error querying schema
Status: 500 Internal Server Error
影響: すべてのログイン試行が失敗
```

**原因**:
- auth.usersテーブルでRLS有効
- ポリシーが0件
- すべてのクエリがブロック

**修正**:
- Supabase Dashboardから手動でRLS無効化
- `fix_auth_rls.sql` を実行

この教訓から、authスキーマへの変更を絶対禁止としました。

### 監視スクリプト

定期的にauth schemaの状態をチェック：

```bash
npm run check:auth
```

このコマンドは `scripts/check-auth-rls.js` を実行し、
authスキーマでRLSが誤って有効になっていないか確認します。

---

## 🚀 本番環境とテスト環境

### 同一性の維持

テストユーザーと本番の新規ユーザーは**完全に同一**である必要があります。

```
本番の新規ユーザー:
  ↓ サインアップ
  データベース: 空
  デモデータ: CSV（A/B/C）から読み込んで表示

テストユーザー:
  ↓ サインアップ
  データベース: 空
  デモデータ: CSV（A/B/C）から読み込んで表示
```

### 理由

テスト環境と本番環境に差異があると、正しいテストができません。

---

## 📝 マイグレーション作成時の注意点

### 必須事項

1. 詳細なコメントを記載
2. `IF NOT EXISTS` / `IF EXISTS` を使用
3. データ削除を含めない
4. RLSポリシーを必ず設定

### 禁止事項

1. `BEGIN`, `COMMIT`, `ROLLBACK` の使用
2. `DELETE FROM auth.users` の使用
3. `USING (true)` の使用
4. テストデータの挿入

---

## ✅ チェックリスト

新しいマイグレーションを作成したら、必ず確認：

- [ ] データ削除SQLが含まれていないか
- [ ] テストデータ挿入が含まれていないか
- [ ] RLSポリシーは適切か
- [ ] `USING (true)` を使用していないか
- [ ] 詳細なコメントを記載したか

---

## 🔄 既存の問題の修正履歴

### 2025-11-25: ドキュメント統一

**問題**:
- 複数の矛盾するドキュメントが存在
- AIアシスタントが混乱し、デモデータをマイグレーションに含めてしまう

**解決**:
- 矛盾するドキュメントを削除
- このルールファイル1つに統一

**削除したファイル**:
- `docs/DATABASE_INITIALIZATION_STRATEGY.md`
- `docs/DATABASE_STATUS.md`
- `docs/MIGRATION_AUDIT_REPORT.md`
- `DATABASE_VERIFICATION_REPORT.md`
- `MIGRATION_ANALYSIS.md`
- `DATABASE_CLEANUP_SUMMARY.md`

---

このドキュメントが**唯一の**データベース管理ルールです。
