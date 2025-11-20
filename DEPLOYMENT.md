# Vercelへのデプロイ手順

このプロジェクトをVercelにデプロイする方法を説明します。

## 前提条件

- Vercelアカウント (https://vercel.com/signup)
- GitHubアカウント（推奨）

## デプロイ方法

### 方法1: GitHub経由でのデプロイ（推奨）

1. **GitHubリポジトリにプッシュ**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Vercelとリポジトリを接続**
   - https://vercel.com にアクセス
   - "Add New Project" をクリック
   - GitHubリポジトリを選択
   - "Import" をクリック

3. **環境変数を設定**

   以下の環境変数をVercelのプロジェクト設定で追加してください：

   ```
   VITE_SUPABASE_URL=https://xjviqzyhephwkytwjmwd.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqdmlxenloZXBod2t5dHdqbXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MTQwMDEsImV4cCI6MjA3ODk5MDAwMX0.dPEren_T08S80QEy4ZiqJvOTxB5w8cP13RHUakFl4yE
   ```

   オプション（AI機能を使用する場合）：
   ```
   VITE_OPENAI_API_KEY=<your-openai-api-key>
   ```

4. **デプロイ**
   - "Deploy" ボタンをクリック
   - 自動的にビルドとデプロイが開始されます

### 方法2: Vercel CLI経由でのデプロイ

1. **Vercel CLIをインストール**
   ```bash
   npm install -g vercel
   ```

2. **ログイン**
   ```bash
   vercel login
   ```

3. **デプロイ**
   ```bash
   vercel --prod
   ```

4. **環境変数を設定**
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```

## ビルド設定

プロジェクトには既に `vercel.json` が含まれています：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## 確認事項

デプロイ後、以下を確認してください：

1. ✅ トップページ（`/`）がダッシュボードとして表示される
2. ✅ `/login` ページでログインできる
3. ✅ `/signup` ページで新規登録できる
4. ✅ 未ログイン時でもダッシュボードが閲覧可能
5. ✅ ログイン後、全機能が利用可能

## トラブルシューティング

### ビルドエラーが発生する場合

1. ローカルでビルドを実行して確認
   ```bash
   npm run build
   ```

2. 依存関係を再インストール
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### 環境変数が反映されない場合

1. Vercelのプロジェクト設定で環境変数を確認
2. 環境変数を追加/更新後、再デプロイ
   ```bash
   vercel --prod --force
   ```

### ルーティングが正しく動作しない場合

- `vercel.json` の `rewrites` 設定を確認
- SPAモードが有効になっているか確認

## サポート

問題が発生した場合：
- Vercelドキュメント: https://vercel.com/docs
- Viteドキュメント: https://vitejs.dev/guide/
