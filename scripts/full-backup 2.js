#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('Creating Supabase client...');
console.log(`URL: ${supabaseUrl}`);

// Create client using service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: 'public' },
  global: {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    }
  }
});

const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
const backupDir = path.join(__dirname, '..', 'backups', timestamp);

console.log(`\n📦 Starting full database backup...`);
console.log(`📂 Backup directory: ${backupDir}\n`);

// Create backup directory
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const tables = [
  'user_settings',
  'account_summary',
  'ai_coaching_jobs',
  'daily_notes',
  'ai_proposals',
  'account_transactions',
  'import_history',
  'trade_notes',
  'trades'
];

async function backupTable(tableName) {
  process.stdout.write(`  ${tableName}... `);

  try {
    // Use SQL query directly via REST API
    const response = await fetch(
      `${supabaseUrl}/rest/v1/${tableName}?select=*`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    const filePath = path.join(backupDir, `${tableName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    const size = fs.statSync(filePath).size;
    console.log(`✅ ${data.length} records (${(size / 1024).toFixed(1)} KB)`);

    return data.length;
  } catch (err) {
    console.log(`⚠️  Error: ${err.message}`);
    fs.writeFileSync(path.join(backupDir, `${tableName}.json`), '[]');
    return 0;
  }
}

async function main() {
  let totalRecords = 0;
  let totalSize = 0;

  for (const table of tables) {
    const count = await backupTable(table);
    totalRecords += count;
  }

  // Calculate total size
  for (const table of tables) {
    const filePath = path.join(backupDir, `${table}.json`);
    if (fs.existsSync(filePath)) {
      totalSize += fs.statSync(filePath).size;
    }
  }

  console.log(`\n✅ Backup completed!`);
  console.log(`\n📊 Summary:`);
  console.log(`  - Total records: ${totalRecords}`);
  console.log(`  - Total size: ${(totalSize / 1024).toFixed(1)} KB`);
  console.log(`  - Location: ${backupDir}`);
  console.log(`\n📝 Restore command:`);
  console.log(`  node scripts/restore-database.js ${backupDir}`);
}

main().catch(err => {
  console.error('\n❌ Backup failed:', err.message);
  process.exit(1);
});
