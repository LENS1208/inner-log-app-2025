#!/usr/bin/env node

// このスクリプトは、Supabase MCPツール経由でバックアップを作成する説明用です
// 実際の実行はClaude Code環境でのみ可能です

console.log(`
📦 Supabase MCPツールを使用したバックアップ

MCPツールを使用すると、.envの設定なしでバックアップが可能です。

Claude Codeで以下のように実行：
1. mcp__supabase__execute_sql で各テーブルのデータを取得
2. 結果をJSONファイルとして保存

例：
  mcp__supabase__execute_sql("SELECT * FROM trades")
  → 結果を backups/[timestamp]/trades.json に保存

この方法なら、サービスロールキーの設定が不要です。
`);
