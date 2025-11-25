# ログインエラー徹底調査レポート

**調査日時**: 2025-11-25
**エラー**: 「データベース接続エラーが発生しました。しばらく待ってから再度お試しください。」

---

## 🚨 問題の特定

### エラーメッセージ

```
Database error querying schema
```

このエラーは**Supabaseサーバー側**から返される500エラーです。

---

## 🔍 調査結果

### 1. ユーザーデータの確認

✅ ユーザーは正常に存在します：

```sql
email: kan.yamaji@gmail.com
email_confirmed_at: 2025-11-25 04:21:08
has_password: true
banned_until: null
deleted_at: null
```

**問題なし**: ユーザーは正しく作成され、パスワードも設定されています。

---

### 2. RLSポリシーの確認

✅ publicスキーマのRLSポリシーは正常です：
- 全テーブルでRLS有効
- 適切なポリシーが設定済み
- `auth.uid() = user_id` の条件で保護

**問題なし**: アプリケーションテーブルのセキュリティは正常です。

---

### 3. auth スキーマの確認

❌ **重大な問題を発見**:

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'auth';
```

**結果**:
```
auth.users           -> rowsecurity: true  ❌
auth.sessions        -> rowsecurity: true  ❌
auth.refresh_tokens  -> rowsecurity: true  ❌
auth.identities      -> rowsecurity: true  ❌
... (他のauthテーブルもRLS有効)
```

**RLSポリシーの確認**:
```sql
SELECT * FROM pg_policies WHERE schemaname = 'auth';
```

**結果**: ポリシーが0件！

---

## 🎯 根本原因

### auth.users テーブルでRLSが有効だがポリシーが存在しない

**影響**:
- RLSが有効でポリシーがない = すべてのアクセスがブロックされる
- Supabaseの認証システムがauth.usersにアクセスできない
- ログインクエリが失敗する（500エラー）

**なぜこれが問題か**:
- auth スキーマはSupabaseの内部スキーマ
- Supabaseの認証システムが管理
- **RLSを有効にしてはいけない**
- 誤ってRLSが有効化された

---

## 📊 影響範囲

### 現在の状態

```
✅ ユーザー作成: 正常（SignupPage経由で作成可能）
❌ ログイン: 失敗（auth.usersにアクセスできない）
❌ セッション管理: 失敗（auth.sessionsにアクセスできない）
❌ トークン更新: 失敗（auth.refresh_tokensにアクセスできない）
```

### エラーフロー

```
1. ユーザーがログインフォームを送信
   ↓
2. supabase.auth.signInWithPassword() を呼び出し
   ↓
3. Supabaseサーバーがauth.usersテーブルをクエリ
   ↓
4. RLSが有効でポリシーなし → アクセス拒否
   ↓
5. 500エラー: "Database error querying schema"
   ↓
6. ログイン失敗
```

---

## 🛠️ 解決方法

### オプション1: Supabaseダッシュボードで修正（推奨）

1. [Supabase Dashboard](https://app.supabase.com/project/eltljgtymayhilowlyml) にアクセス
2. SQL Editorを開く
3. 以下のSQLを実行：

```sql
-- auth スキーマのRLSを無効化
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.refresh_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.identities DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.mfa_factors DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.mfa_challenges DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.mfa_amr_claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.flow_state DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.audit_log_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.instances DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.one_time_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.saml_providers DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.saml_relay_states DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.schema_migrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sso_domains DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sso_providers DISABLE ROW LEVEL SECURITY;
```

4. 実行後、ログインを再テスト

### オプション2: Supabase CLIを使用

```bash
# Supabase CLIでログイン
supabase login

# プロジェクトにリンク
supabase link --project-ref eltljgtymayhilowlyml

# SQL実行
supabase db execute --file fix_auth_rls.sql
```

### オプション3: サポートに連絡

Supabaseサポートに連絡して、auth スキーマのRLS設定をリセットしてもらう。

---

## ⚠️ なぜマイグレーションで修正できないか

```
ERROR: 42501: must be owner of table users
```

**理由**:
- auth スキーマは`supabase_auth_admin`ロールが所有
- 通常のユーザー（postgres）には権限がない
- マイグレーションでは変更不可

**解決には**:
- Supabaseダッシュボード（admin権限）
- Supabase CLI（admin権限）
- サポート経由でのリセット

---

## 🔐 セキュリティへの影響

### Q: auth スキーマのRLSを無効化しても安全か？

**A: 安全です。むしろこれが正しい状態です。**

**理由**:
1. auth スキーマはSupabase内部スキーマ
2. Supabaseの認証システムが管理
3. APIレベルで保護されている
4. RLSは不要（むしろ有害）

### Q: 誰がauth.usersにアクセスできるか？

**A: Supabaseの認証システムのみ**

- 一般ユーザー: アクセス不可（APIを通してのみ）
- 認証システム: フルアクセス（内部実装）
- RLSは関係なし（システムレベルで制御）

---

## 📝 今後の予防策

### 1. authスキーマを触らない

```sql
-- ❌ 絶対にやってはいけない
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
INSERT INTO auth.users ...;
UPDATE auth.users SET ...;
```

### 2. マイグレーションチェックリスト

```markdown
- [ ] publicスキーマのみ変更
- [ ] authスキーマには触れない
- [ ] pgスキーマには触れない
- [ ] 内部スキーマには触れない
```

### 3. ドキュメント更新

`docs/DATABASE_RULES.md` に以下を追記：

```markdown
## 🚫 絶対に触ってはいけないスキーマ

### auth スキーマ
- Supabaseの認証システムが使用
- **RLSを有効化してはいけない**
- **データを直接変更してはいけない**
- APIを通してのみ操作

### その他の内部スキーマ
- pg_*: PostgreSQL内部
- storage: Supabaseストレージ
- extensions: 拡張機能
```

---

## ✅ 検証手順

修正後、以下を確認：

### 1. RLS状態の確認

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'auth';
```

**期待値**: すべて`rowsecurity: false`

### 2. ログインテスト

```
Email: kan.yamaji@gmail.com
Password: test2025
```

**期待結果**: ログイン成功、ダッシュボードにリダイレクト

### 3. セッション確認

```sql
SELECT * FROM auth.sessions
WHERE user_id = 'aa0a0a6d-00db-458c-b432-a7b117a6707b';
```

**期待結果**: セッションレコードが作成される

### 4. ログ確認

ブラウザコンソールで：

```
✅ Login successful, redirecting...
```

---

## 📊 まとめ

### 問題
- auth.usersテーブルでRLS有効、ポリシーなし
- Supabaseの認証システムがアクセスできない
- ログインが500エラーで失敗

### 原因
- 誤ってauth スキーマでRLSが有効化された
- おそらく手動操作またはツールのバグ

### 解決
- Supabaseダッシュボードでauth スキーマのRLSを無効化
- マイグレーションでは権限不足で修正不可

### 影響
- セキュリティへの影響なし（auth スキーマは別レベルで保護）
- 正常な認証機能が復旧

---

## 🔗 関連情報

- [Supabase Auth Schema Documentation](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- Project URL: https://eltljgtymayhilowlyml.supabase.co
- Dashboard: https://app.supabase.com/project/eltljgtymayhilowlyml
