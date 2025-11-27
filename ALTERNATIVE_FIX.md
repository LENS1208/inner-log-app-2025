# 代替修復方法

プロジェクトの一時停止ができない場合の対応方法をご案内します。

## 方法1: Supabase Authの設定を更新する

1. **https://supabase.com/dashboard/project/eltljgtymayhilowlyml/auth/users** にアクセス

2. 上部のタブで **「Configuration」** をクリック

3. **何も変更せずに**、ページ下部の **「Save」** ボタンをクリック

   → これにより、Supabase Authサービスが設定を再読み込みし、`auth.instances`が再構築されます

---

## 方法2: 新しいテストユーザーをSupabaseダッシュボードから作成

1. **https://supabase.com/dashboard/project/eltljgtymayhilowlyml/auth/users** にアクセス

2. 右上の **「Add user」** ボタンをクリック

3. 以下を入力：
   - **Email**: `newtest@example.com`
   - **Password**: `Test123456!`
   - **Auto Confirm User**: ✅ チェックを入れる

4. **「Create user」** をクリック

5. ブラウザで `newtest@example.com` / `Test123456!` でログインテスト

---

## 方法3: Supabaseサポートに連絡

もし上記で解決しない場合：

1. **https://supabase.com/dashboard/project/eltljgtymayhilowlyml** の右下にあるチャットアイコンをクリック

2. 以下を伝えてください：
   ```
   My auth.instances table is empty and all login attempts are failing.
   I cannot pause/resume my project. Can you help restart the Auth service?
   ```

---

## 方法4: データベースから直接auth.instancesを再作成（高度）

**注意**: これは実験的な方法です。まず方法1-3を試してください。

Supabase SQL Editorで以下を実行：

```sql
-- auth.instancesレコードを作成
INSERT INTO auth.instances (
  id,
  uuid,
  raw_base_config
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'SITE_URL=https://eltljgtymayhilowlyml.supabase.co'
)
ON CONFLICT (id) DO NOTHING;
```

ただし、この方法は`auth.instances`の構造が変わっている可能性があるため、推奨しません。

---

## 推奨順序

1. ✅ **方法2**（ダッシュボードから新規ユーザー作成）← **最も簡単**
2. 方法1（Auth設定を保存）
3. 方法3（サポートに連絡）
4. 方法4（手動でinstances作成）

**まずは方法2を試してみてください！**
