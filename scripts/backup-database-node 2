#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// .envファイルから環境変数を読み込む
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ エラー: VITE_SUPABASE_URL または VITE_SUPABASE_SERVICE_ROLE_KEY が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// バックアップディレクトリを作成
const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
const backupDir = path.join(__dirname, '..', 'backups', timestamp);
fs.mkdirSync(backupDir, { recursive: true });

console.log('📦 Supabaseデータベースをバックアップ中...');

// バックアップするテーブル一覧
const tables = [
  'trades',
  'daily_notes',
  'trade_notes',
  'ai_proposals',
  'account_transactions',
  'account_summary',
  'user_settings',
  'import_history',
  'ai_coaching_jobs'
];

async function backupTable(tableName) {
  console.log(`  - ${tableName} をエクスポート中...`);

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');

    if (error) {
      console.error(`    ⚠ ${tableName}: エラー - ${error.message}`);
      return;
    }

    const filePath = path.join(backupDir, `${tableName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    const count = data ? data.length : 0;
    const size = fs.statSync(filePath).size;
    console.log(`    ✓ ${tableName}: ${count}件 (${size} bytes)`);
  } catch (err) {
    console.error(`    ⚠ ${tableName}: 例外 - ${err.message}`);
  }
}

async function backup() {
  for (const table of tables) {
    await backupTable(table);
  }

  console.log('');
  console.log(`✅ バックアップ完了: ${backupDir}`);
  console.log('');
  console.log('復元方法:');
  console.log(`  node scripts/restore-database.js ${backupDir}`);
}

backup().catch(err => {
  console.error('❌ バックアップエラー:', err);
  process.exit(1);
});
