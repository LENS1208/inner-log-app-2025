# データベース変更クイックリファレンス

すぐに使えるリクエストテンプレート集

---

## 🆕 新しいテーブルを作成

```
【テーブル作成】

目的: [説明]

テーブル名: `table_name`

カラム:
- id (uuid, PK, default: gen_random_uuid())
- user_id (uuid, FK to auth.users, NOT NULL)
- name (text, NOT NULL)
- description (text, NULL)
- created_at (timestamptz, default: now())
- updated_at (timestamptz, default: now())

インデックス:
- user_id

RLS:
- SELECT: 自分のデータのみ (auth.uid() = user_id)
- INSERT: 自分のデータのみ (auth.uid() = user_id)
- UPDATE: 自分のデータのみ (auth.uid() = user_id)
- DELETE: 自分のデータのみ (auth.uid() = user_id)

既存データへの影響: なし

docs/DATABASE_RULES.md に従って作成してください。
```

---

## ➕ カラムを追加

```
【カラム追加】

テーブル: `table_name`
カラム: `column_name`
型: [type]
NULL: [許可/不許可]
デフォルト値: [値 or NULL]

説明: [カラムの目的]

既存データ: 約[N]件、[NULLのまま/デフォルト値設定]

IF NOT EXISTS を使用してください。
```

---

## 🔄 カラムの型を変更

```
【型変更】

テーブル: `table_name`
カラム: `column_name`
現在の型: [old_type]
新しい型: [new_type]

理由: [説明]

既存データ:
- 件数: 約[N]件
- 変換方法: [自動変換可能/手動変換必要]
- データロス: [なし/あり - 詳細]

変更前に既存データを確認してください。
```

---

## 🏷️ カラム名を変更

```
【カラム名変更】

テーブル: `table_name`
旧名: `old_column_name`
新名: `new_column_name`

理由: [説明]

影響範囲:
1. [Component1] (src/path/to/component.tsx)
2. [Component2] (src/path/to/component2.tsx)
3. デモCSV (public/demo/*.csv)

すべてのコードとCSVも更新してください。
```

---

## 🔒 RLSポリシーを追加/変更

```
【RLSポリシー変更】

テーブル: `table_name`
操作: [SELECT/INSERT/UPDATE/DELETE]

現在: [現在のポリシー or なし]

変更後:
- 条件: [auth.uid() = user_id 等]
- 理由: [説明]

セキュリティチェック:
- [ ] 他人のデータにアクセスできないか
- [ ] USING (true) を使用していないか
- [ ] authenticated ロールに限定されているか
```

---

## 🔗 外部キー制約を追加

```
【外部キー追加】

テーブル: `table_name`
カラム: `column_name`
参照先: `target_table(target_column)`
削除時: [CASCADE/SET NULL/RESTRICT]

既存データの確認:
- 参照先に存在しないIDがないか確認
- あれば、先にデータをクリーンアップ

確認クエリ:
SELECT DISTINCT column_name
FROM table_name
WHERE column_name NOT IN (SELECT target_column FROM target_table);
```

---

## 📇 インデックスを追加

```
【インデックス追加】

テーブル: `table_name`
カラム: [column1, column2, ...]
型: [btree/hash/gin/gist]

理由: [頻繁に検索される/ソートに使用される 等]

パフォーマンステスト後に効果を確認してください。
```

---

## 🗑️ カラム/テーブルを削除

```
【削除】

対象: [table_name.column_name / table_name]

確認事項:
- 現在のデータ件数: [N]件
- 使用箇所: [コンポーネント名 or なし]
- 外部キー依存: [あり - 詳細 / なし]
- バックアップ: [必要/不要]

削除前に以下を確認してください:
1. データのバックアップ
2. 使用箇所がないこと
3. 依存関係がないこと

問題なければ DROP 文を実行してください。
```

---

## 🎨 デモデータを更新

```
【デモデータ更新】

ファイル: public/demo/[A/B/C].csv

変更内容: [説明]

手順:
1. CSVファイルを編集
2. npm run validate:demo で検証
3. ブラウザで表示確認

マイグレーションは変更しないでください。
docs/DEMO_DATA_MANAGEMENT.md を参照してください。
```

---

## 🔧 関数を作成

```
【関数作成】

関数名: `function_name`
引数: ([arg1 type, arg2 type, ...])
戻り値: [return_type]

目的: [説明]

関数本体:
```sql
[SQLコード]
```

セキュリティ: [SECURITY DEFINER/INVOKER]
```

---

## 🔄 トリガーを作成

```
【トリガー作成】

テーブル: `table_name`
タイミング: [BEFORE/AFTER] [INSERT/UPDATE/DELETE]
関数: `trigger_function_name`

目的: [説明]

関数の実装:
```sql
[SQLコード]
```
```

---

## 📊 データ移行

```
【データ移行】

目的: [説明]

移行元: `source_table.column`
移行先: `target_table.column`

移行ロジック:
[どのように変換するか]

確認:
- 移行前のデータ件数: [N]件
- 移行後の検証方法: [SQLクエリ]
- ロールバック方法: [説明]

段階的に実行し、各ステップで確認してください。
```

---

## 🚨 緊急時のロールバック

```
【ロールバック依頼】

問題のマイグレーション: [ファイル名]

発生した問題: [詳細]

データの状態:
- 影響を受けたレコード数: [N]件
- データロスの有無: [あり/なし]

次のアクション:
1. マイグレーションをロールバック
2. データを復元（必要なら）
3. 問題を修正して再適用

バックアップがあれば: [場所を指定]
```

---

## 📋 変更前チェックリスト

コピーして使用：

```
## 変更前確認

- [ ] 変更の目的を明確にした
- [ ] 影響範囲を特定した
- [ ] 既存データの件数を確認した
- [ ] RLS要件を指定した
- [ ] バックアップの要否を判断した
- [ ] ロールバック方法を確認した
- [ ] docs/DATABASE_RULES.md を確認した
```

---

## 📋 変更後チェックリスト

コピーして使用：

```
## 変更後確認

- [ ] マイグレーションが正常に完了した
- [ ] テーブル構造が正しい
- [ ] RLSが有効になっている
- [ ] インデックスが作成されている
- [ ] データ件数が正しい
- [ ] アプリケーションが正常動作する
- [ ] npm run build が成功する
```

---

## 💡 よく使うSQLスニペット

### テーブル情報を確認

```sql
-- テーブル一覧
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- カラム一覧
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'table_name';

-- インデックス一覧
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'table_name';
```

### RLSポリシーを確認

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### データ件数を確認

```sql
-- 各テーブルの件数
SELECT
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

---

## 🔗 関連ドキュメント

詳細は以下を参照：

- [DATABASE_RULES.md](./DATABASE_RULES.md) - 基本ルール
- [HOW_TO_REQUEST_DATABASE_CHANGES.md](./HOW_TO_REQUEST_DATABASE_CHANGES.md) - 詳細ガイド
- [DEMO_DATA_MANAGEMENT.md](./DEMO_DATA_MANAGEMENT.md) - デモデータ管理
