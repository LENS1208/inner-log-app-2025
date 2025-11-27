# セキュリティ重大問題と再発防止策

**このドキュメントはアーカイブされました。現在のルールは `/docs/DATABASE_RULES.md` を参照してください。**

---

## 🚨 発見された重大な問題（過去の記録）

### 1. ユーザーアカウント削除の根本原因

**問題**: マイグレーションファイルに`DELETE FROM auth.users`が含まれていた

**影響を与えたファイル**:
- `20251118014108_create_test_user_with_provider_id.sql`
- `20251125041952_recreate_user_kan_yamaji.sql`
- `20251125042107_recreate_user_properly_v2.sql`

**何が起きたか**:
これらのマイグレーションは開発中にユーザーを再作成するために作成されました。しかし、マイグレーションは**一度実行されると二度と実行されない**はずですが、何らかの理由で再実行された可能性があります。または、データベースがリセットされ、全マイグレーションが再実行されました。

**結果**:
本番環境でこれらのマイグレーションが実行されると、既存のユーザーアカウントが削除されます。

### 2. 危険なRLSポリシー（最重要）

**問題**: 複数のテーブルに`{public}`ロールで全アクセスを許可するポリシーが存在

**影響を受けたテーブル**:
- `trades` - 取引データ
- `trade_notes` - 取引メモ
- `daily_notes` - 日次メモ
- `free_memos` - フリーメモ
- `note_links` - メモリンク

**危険なポリシーの内容**:
```sql
CREATE POLICY "Allow all access to trades" ON trades
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
```

**何が起きるか**:
- **誰でも**（認証なしで）全てのユーザーのデータを閲覧できる
- **誰でも**他のユーザーのデータを変更・削除できる
- データの完全性が保証されない
- プライバシーの完全な侵害

**現状**: 2025-11-25に全て削除済み ✅

---

## ✅ 実施した緊急対策

### 1. 危険なRLSポリシーの削除
```sql
DROP POLICY "Allow all access to trades" ON trades;
DROP POLICY "Allow all access to trade_notes" ON trade_notes;
DROP POLICY "Allow all access to daily_notes" ON daily_notes;
DROP POLICY "Allow all access to free_memos" ON free_memos;
DROP POLICY "Allow all access to note_links" ON note_links;
```

### 2. 危険なマイグレーションファイルの削除
以下のファイルを削除しました：
- `20251118014108_create_test_user_with_provider_id.sql`
- `20251125041952_recreate_user_kan_yamaji.sql`
- `20251125042107_recreate_user_properly_v2.sql`

### 3. ユーザーアカウントの再作成
正しい手順でユーザーを再作成しました。

---

## 📋 再発防止策

### A. マイグレーションファイルのルール

#### 絶対禁止事項
1. **本番データを削除するSQL文を含めない**
   - `DELETE FROM auth.users` - 絶対禁止
   - `TRUNCATE auth.users` - 絶対禁止
   - `DROP TABLE` (既存テーブル) - 絶対禁止

2. **テストデータの挿入はマイグレーションで行わない**
   - テストユーザーの作成は別のスクリプトで実行
   - マイグレーションはスキーマ定義のみ

3. **破壊的な変更には保護を追加**
   ```sql
   -- ❌ 悪い例
   ALTER TABLE trades DROP COLUMN price;

   -- ✅ 良い例
   DO $$
   BEGIN
     IF EXISTS (SELECT 1 FROM trades WHERE price IS NOT NULL LIMIT 1) THEN
       RAISE EXCEPTION 'Cannot drop column with existing data. Migrate data first.';
     END IF;
     ALTER TABLE trades DROP COLUMN IF EXISTS price;
   END $$;
   ```

#### 推奨事項
1. **常に`IF EXISTS` / `IF NOT EXISTS`を使用**
   ```sql
   CREATE TABLE IF NOT EXISTS trades (...);
   ALTER TABLE trades ADD COLUMN IF NOT EXISTS new_column text;
   DROP TABLE IF EXISTS old_table;
   ```

2. **データ移行は明示的に**
   ```sql
   -- データを移行してから削除
   UPDATE new_table SET value = old_table.value FROM old_table WHERE ...;
   -- データが移行されたことを確認
   -- その後、別のマイグレーションで古いテーブルを削除
   ```

### B. RLSポリシーのルール

#### 必須要件
1. **全てのテーブルでRLSを有効化**
   ```sql
   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
   ```

2. **`public`ロールでの全アクセスポリシーは絶対禁止**
   ```sql
   -- ❌ 絶対に使用禁止
   CREATE POLICY "bad_policy" ON table_name
     FOR ALL TO public USING (true);
   ```

3. **ポリシーは常に制限的に**
   ```sql
   -- ✅ 正しい例
   CREATE POLICY "Users can view own data" ON trades
     FOR SELECT
     TO authenticated
     USING (auth.uid() = user_id);
   ```

4. **デモデータ用の特別処理**
   ```sql
   -- デモデータ（user_id IS NULL）のみ読み取り許可
   CREATE POLICY "Allow read demo data" ON trades
     FOR SELECT
     TO authenticated
     USING (user_id IS NULL);
   ```

#### ポリシー作成チェックリスト
- [ ] `authenticated`ロールを使用しているか？
- [ ] `auth.uid()`でユーザー所有権をチェックしているか？
- [ ] `FOR ALL`を使用していないか？（SELECT, INSERT, UPDATE, DELETEを分離）
- [ ] `USING (true)`を使用していないか？

### C. 開発プロセス

#### 1. ローカル開発環境の分離
- 本番データベースで直接テストしない
- ローカルSupabaseインスタンスを使用
- テストユーザーはアプリケーションのサインアップ機能で作成

#### 2. マイグレーションレビュー
マイグレーション作成時の必須チェック：
- [ ] `DELETE`, `TRUNCATE`, `DROP`が含まれていないか？
- [ ] 本番データに影響を与えないか？
- [ ] `IF EXISTS` / `IF NOT EXISTS`を使用しているか？
- [ ] RLSポリシーは制限的か？
- [ ] `public`ロールへの全アクセス権限がないか？

#### 3. デプロイ前チェックリスト
- [ ] 全マイグレーションをレビュー
- [ ] RLSポリシーを監査
- [ ] バックアップが取れているか確認
- [ ] ロールバック手順を準備

### D. バックアップと復旧

#### 1. 自動バックアップ
Supabaseの自動バックアップを有効化（既に有効のはず）：
- 日次自動バックアップ
- Point-in-time recovery（PITR）

#### 2. 手動バックアップスクリプト
定期的なデータエクスポート：
```bash
# 既存のバックアップスクリプトを使用
npm run backup  # 定義されている場合
```

#### 3. 復旧手順の文書化
- バックアップからの復元手順
- 緊急連絡先
- エスカレーションパス

### E. モニタリングとアラート

#### 1. データベース監視
- ユーザー数の急激な変化を検知
- 大量削除操作の検知
- 不正なアクセスパターンの検知

#### 2. アラート設定
Supabaseダッシュボードでアラートを設定：
- ユーザーテーブルへのDELETE操作
- 大量のレコード変更
- 認証失敗の急増

---

## 🔍 セキュリティ監査の定期実施

### 月次チェック
- [ ] RLSポリシーの監査
- [ ] マイグレーションファイルのレビュー
- [ ] バックアップの健全性確認
- [ ] アクセスログの確認

### 実施SQLクエリ
```sql
-- 危険なポリシーをチェック
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND ('public' = ANY(roles) OR qual = 'true')
ORDER BY tablename;

-- RLSが有効になっているか確認
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;
```

---

## 📚 参考資料

### Supabase RLS ベストプラクティス
- [公式ドキュメント](https://supabase.com/docs/guides/auth/row-level-security)
- RLSポリシーは常に制限的に
- 最小権限の原則を適用

### PostgreSQL セキュリティ
- マイグレーションは冪等性を保つ
- トランザクション制御を適切に使用
- データの整合性を常に確認

---

## ✅ 現在のセキュリティ状態

- **RLSポリシー**: ✅ 安全（危険なポリシーは全て削除済み）
- **マイグレーション**: ✅ 安全（削除系SQLは全て除去済み）
- **ユーザーアカウント**: ✅ 再作成済み
- **バックアップ**: ⚠️  定期バックアップ体制を確立する必要あり

---

## 🚀 リリース前の最終チェック

本番リリース前に以下を必ず実施：

1. **セキュリティ監査**
   ```bash
   # 全RLSポリシーを確認
   # 上記のSQLクエリを実行
   ```

2. **マイグレーションレビュー**
   ```bash
   # 全マイグレーションファイルをレビュー
   grep -r "DELETE FROM auth\|TRUNCATE auth\|DROP TABLE" supabase/migrations/
   # 何も出力されないことを確認
   ```

3. **バックアップ確認**
   - Supabaseダッシュボードでバックアップ設定を確認
   - 最新のバックアップが存在することを確認

4. **アクセス権限確認**
   - データベースへの直接アクセス権限を最小化
   - API経由のアクセスのみを許可

---

**作成日**: 2025-11-25
**最終更新**: 2025-11-25
**ステータス**: 🟢 緊急対策完了 - リリース可能
