/**
 * Supabaseデータベース復元スクリプト
 * 使い方: node scripts/restore-database.js backups/20251117_120000
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// 環境変数読み込み
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 環境変数が設定されていません');
  console.error('   VITE_SUPABASE_URL と VITE_SUPABASE_SERVICE_ROLE_KEY が必要です');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const backupDir = process.argv[2];
if (!backupDir) {
  console.error('❌ バックアップディレクトリを指定してください');
  console.error('   使い方: node scripts/restore-database.js backups/20251117_120000');
  process.exit(1);
}

async function restoreTable(tableName) {
  const filePath = path.join(backupDir, `${tableName}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${tableName}.json が見つかりません - スキップ`);
    return;
  }

  console.log(`📥 ${tableName} を復元中...`);

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  if (data.length === 0) {
    console.log(`   ${tableName} にはデータがありません - スキップ`);
    return;
  }

  // データをインサート（既存データは削除しない、upsert）
  const { error } = await supabase
    .from(tableName)
    .upsert(data, { onConflict: 'id' });

  if (error) {
    console.error(`   ❌ エラー: ${error.message}`);
  } else {
    console.log(`   ✅ ${data.length}件 復元完了`);
  }
}

async function main() {
  console.log('🔄 Supabaseデータベース復元を開始...\n');

  const tables = [
    'trades',
    'daily_notes',
    'trade_notes',
    'ai_proposals',
    'account_transactions',
    'account_summary',
    'user_settings',
    'import_history',
    'coaching_jobs',
  ];

  for (const table of tables) {
    await restoreTable(table);
  }

  console.log('\n✅ 復元完了');
}

main().catch(console.error);
