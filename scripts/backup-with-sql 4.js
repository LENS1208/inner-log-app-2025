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
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ エラー: VITE_SUPABASE_URL または VITE_SUPABASE_SERVICE_ROLE_KEY が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// バックアップディレクトリを作成
const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
const backupDir = path.join(__dirname, '..', 'backups', timestamp);
fs.mkdirSync(backupDir, { recursive: true });

console.log('📦 Supabaseデータベースをバックアップ中...');
console.log(`📂 保存先: ${backupDir}`);
console.log('');

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
  process.stdout.write(`  - ${tableName} をエクスポート中...`);

  try {
    // サービスロールキーを使って直接select
    const { data, error } = await supabase.from(tableName).select('*');

    if (error) {
      console.log(` ⚠️  エラー - ${error.message}`);
      // 空のファイルを作成
      const filePath = path.join(backupDir, `${tableName}.json`);
      fs.writeFileSync(filePath, '[]', 'utf-8');
      return;
    }

    const filePath = path.join(backupDir, `${tableName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    const count = data ? data.length : 0;
    const size = fs.statSync(filePath).size;
    console.log(` ✅ ${count}件 (${(size / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.log(` ⚠️  例外 - ${err.message}`);
    // 空のファイルを作成
    const filePath = path.join(backupDir, `${tableName}.json`);
    fs.writeFileSync(filePath, '[]', 'utf-8');
  }
}

async function backup() {
  for (const table of tables) {
    await backupTable(table);
  }

  console.log('');
  console.log(`✅ バックアップ完了: ${backupDir}`);
  console.log('');
  console.log('📊 バックアップ統計:');

  // ファイルサイズの合計を計算
  let totalSize = 0;
  let totalRecords = 0;

  for (const table of tables) {
    const filePath = path.join(backupDir, `${table}.json`);
    if (fs.existsSync(filePath)) {
      const size = fs.statSync(filePath).size;
      const content = fs.readFileSync(filePath, 'utf-8');
      const records = JSON.parse(content).length;
      totalSize += size;
      totalRecords += records;
    }
  }

  console.log(`  - 総レコード数: ${totalRecords}`);
  console.log(`  - 総サイズ: ${(totalSize / 1024).toFixed(1)} KB`);
  console.log('');
  console.log('復元方法:');
  console.log(`  node scripts/restore-database.js ${backupDir}`);
}

backup().catch(err => {
  console.error('❌ バックアップエラー:', err);
  process.exit(1);
});
