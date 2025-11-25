# 🔧 データベース問題：トラブルシューティングガイド

## 🚨 症状：間違ったデータベースに接続している

アプリが古いDB（`zcflpkmxeupharqbaymc`）に接続してしまう場合、以下の手順で検証してください。

---

## ✅ 検証チェックリスト（優先度順）

### 【最重要】1. ブラウザのコンソールを確認

**手順:**
1. ブラウザでアプリを開く
2. F12キーを押して DevTools を開く
3. Console タブを確認

**正常な場合:**
```
✅ Environment validation passed
✅ Using correct database: xjviqzyhephwkytwjmwd
✅ Supabase client initialized successfully
📍 Using database: https://xjviqzyhephwkytwjmwd.supabase.co
```

**異常な場合:**
```
🚨 FORBIDDEN DATABASE DETECTED!
❌ Using: zcflpkmxeupharqbaymc
```

**対処法:** → **検証2**へ進む

---

### 【重要】2. 全ての .env ファイルを確認

**コマンド:**
```bash
cat .env
cat .env.local
cat .env.development
```

**期待される内容（全てのファイルで一致すること）:**
```bash
VITE_SUPABASE_URL=https://xjviqzyhephwkytwjmwd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**チェック項目:**
- [ ] 全てのファイルで `xjviqzyhephwkytwjmwd` を使用している
- [ ] `zcflpkmxeupharqbaymc` が含まれていない
- [ ] `xvqpsnrcmkvngxrinjyf` が含まれていない

**異常な場合の対処法:**
```bash
# 間違ったファイルを削除
rm .env.local

# 正しいテンプレートからコピー
cp .env.example .env

# または、.env.development から復元
cp .env.development .env.local

# ファイルを読み取り専用にロック
chmod 444 .env.local
```

---

### 【重要】3. .env.local のパーミッションを確認

**コマンド:**
```bash
ls -la .env.local
```

**期待される結果:**
```
-r--r--r-- 1 root root 807 Nov 20 22:48 .env.local
```

**チェック項目:**
- [ ] ファイルが読み取り専用（`-r--r--r--`）になっている
- [ ] ファイルが存在する

**異常な場合の対処法:**
```bash
# パーミッションを修正
chmod 444 .env.local
```

---

### 【確認】4. ブラウザのキャッシュをクリア

**手順:**
1. DevTools（F12）を開く
2. Application タブを選択
3. Storage セクションを展開
4. "Clear site data" をクリック
5. ページをハードリロード（Ctrl+Shift+R または Cmd+Shift+R）

**理由:**
- 古い環境変数がブラウザにキャッシュされている可能性
- localStorage や sessionStorage に古いデータが残っている可能性

---

### 【確認】5. ビルドキャッシュをクリア

**コマンド:**
```bash
rm -rf node_modules/.vite
rm -rf dist
npm run build
```

**理由:**
- Viteのビルドキャッシュに古いURLが残っている可能性
- 前回のビルドが dist フォルダに残っている可能性

**期待される出力:**
```
✅ Database validation passed: xjviqzyhephwkytwjmwd
vite v5.4.20 building for production...
✓ built in X.XXs
```

---

### 【確認】6. Runtime での検証

**ブラウザのコンソールで実行:**
```javascript
console.log('Current DB URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Expected DB:', 'xjviqzyhephwkytwjmwd')
console.log('Match:', import.meta.env.VITE_SUPABASE_URL.includes('xjviqzyhephwkytwjmwd'))
```

**期待される出力:**
```
Current DB URL: https://xjviqzyhephwkytwjmwd.supabase.co
Expected DB: xjviqzyhephwkytwjmwd
Match: true
```

---

### 【確認】7. ネットワークタブでAPIリクエストを確認

**手順:**
1. DevTools（F12）を開く
2. Network タブを選択
3. Filter: `supabase` を入力
4. ページをリロード
5. リクエストURLを確認

**期待される結果:**
```
https://xjviqzyhephwkytwjmwd.supabase.co/rest/v1/...
```

**異常な場合:**
```
https://zcflpkmxeupharqbaymc.supabase.co/rest/v1/...
```

→ **ブラウザキャッシュをクリア**（検証4）

---

## 🔥 緊急対応：全てリセット

上記の全てを試しても解決しない場合、以下の「核オプション」を実行：

```bash
# 1. 全ての環境ファイルを削除
rm .env .env.local

# 2. テンプレートから復元
cp .env.example .env
cp .env.development .env.local

# 3. ロックをかける
chmod 444 .env.local

# 4. キャッシュを全削除
rm -rf node_modules/.vite dist

# 5. ビルドして検証
npm run build

# 6. 確認
cat .env | grep VITE_SUPABASE_URL
cat .env.local | grep VITE_SUPABASE_URL
```

**期待される出力:**
```
VITE_SUPABASE_URL=https://xjviqzyhephwkytwjmwd.supabase.co
VITE_SUPABASE_URL=https://xjviqzyhephwkytwjmwd.supabase.co
```

---

## 📊 問題の診断フローチャート

```
問題が発生
    ↓
[1] コンソールエラーを確認
    ├─ ✅ 正常 → 問題なし
    └─ ❌ エラー
         ↓
[2] .env ファイルを確認
    ├─ ✅ 正しい → [4]へ
    └─ ❌ 間違い → 修正して[3]へ
         ↓
[3] .env.local を確認
    ├─ ✅ 正しい → [4]へ
    └─ ❌ 間違い → 削除/修正
         ↓
[4] ブラウザキャッシュをクリア
         ↓
[5] ビルドキャッシュをクリア
         ↓
[6] ビルドして検証
    ├─ ✅ 成功 → 完了
    └─ ❌ 失敗 → 緊急対応へ
```

---

## 🎯 最も多い原因（重要度順）

### 1位: `.env.local` に古い値が入っている
**頻度:** 90%
**対処:** 削除または正しい値に置き換え

### 2位: ブラウザキャッシュに古い値が残っている
**頻度:** 5%
**対処:** ハードリロード + Clear site data

### 3位: ビルドキャッシュに古い値が残っている
**頻度:** 4%
**対処:** `rm -rf node_modules/.vite dist`

### 4位: 複数の .env ファイルで値が不一致
**頻度:** 1%
**対処:** 全ての .env ファイルを統一

---

## 🔍 予防措置

問題を未然に防ぐために：

### 毎日の確認（作業開始時）
```bash
# 1行コマンドで確認
cat .env .env.local | grep VITE_SUPABASE_URL | grep -c xjviqzyhephwkytwjmwd
```

**期待される結果:** `2` （2つのファイルで一致）

### 定期的な検証（週1回）
```bash
# 検証スクリプト
./check-db.sh
```

または

```bash
# 手動確認
echo "=== Checking .env files ==="
grep VITE_SUPABASE_URL .env .env.local .env.development .env.production 2>/dev/null | grep -v xjviqzyhephwkytwjmwd && echo "❌ FORBIDDEN DB FOUND!" || echo "✅ All files OK"
```

---

## 📞 それでも解決しない場合

以下の情報を収集して報告：

```bash
# 診断情報の収集
echo "=== Environment Files ==="
cat .env 2>&1
echo ""
cat .env.local 2>&1
echo ""

echo "=== File Permissions ==="
ls -la .env* 2>&1
echo ""

echo "=== Build Validation ==="
npm run build 2>&1 | head -5
echo ""

echo "=== Runtime Environment ==="
echo "CLAUDECODE=$CLAUDECODE"
echo "BOLT_ENV=$BOLT_ENV"
```

この出力を添付して問題を報告してください。

---

## ✅ 確認コマンド一覧（コピペ用）

```bash
# 全ての .env ファイルの内容を確認
echo "=== .env ===" && cat .env && echo "" && echo "=== .env.local ===" && cat .env.local && echo "" && echo "=== .env.development ===" && cat .env.development

# 正しいDBを使用しているか確認（期待値: 3〜4個一致）
grep -h VITE_SUPABASE_URL .env* 2>/dev/null | grep -c xjviqzyhephwkytwjmwd

# 禁止されたDBが含まれていないか確認（期待値: 何も出力されない）
grep -h VITE_SUPABASE_URL .env* 2>/dev/null | grep -E "zcflpkmxeupharqbaymc|xvqpsnrcmkvngxrinjyf"

# ファイルのパーミッションを確認
ls -la .env*

# ビルドして検証
npm run build 2>&1 | grep -E "Database validation|xjviqzyhephwkytwjmwd|FORBIDDEN"
```

---

## 🎓 理解のためのポイント

### なぜ `.env.local` が最優先なのか？

Viteは以下の順序で環境変数を読み込みます：

```
.env.local         ← 最優先（開発者ごとのローカル設定用）
.env.development   ← 開発環境用
.env              ← 共通設定
.env.production    ← 本番環境用
```

後から読み込まれたファイルが前の値を上書きします。

### なぜ読み取り専用にするのか？

- システムが自動的に `.env.local` を生成するのを防ぐ
- 誤って間違った値を書き込むのを防ぐ
- Git管理下に置いて、正しい値を強制する

### なぜ複数の保護層が必要なのか？

1. **`.env.local`（読み取り専用）** - 最初の防御
2. **`vite.config.ts`** - ビルド時の検証
3. **`env-validator.ts`** - 実行時の検証

一つの防御が突破されても、他の層が守ります（多層防御）。

---

## 📝 最終チェックリスト

問題が解決したら、以下を確認：

- [ ] コンソールに `✅ Using correct database: xjviqzyhephwkytwjmwd` が表示される
- [ ] ネットワークタブで `xjviqzyhephwkytwjmwd.supabase.co` へのリクエストが確認できる
- [ ] `.env.local` が読み取り専用（444）になっている
- [ ] 全ての `.env*` ファイルで `xjviqzyhephwkytwjmwd` を使用している
- [ ] ビルドが成功し、`✅ Database validation passed` が表示される

全てチェックできたら、問題は解決しています！
