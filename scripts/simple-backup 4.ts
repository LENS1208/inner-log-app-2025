import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env file
const envPath = path.join(process.cwd(), '.env');
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

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Environment variables not set');
  process.exit(1);
}

// Create a fresh client instance
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
const backupDir = path.join(process.cwd(), 'backups', timestamp);

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

console.log('📦 Starting backup...');
console.log(`📂 Destination: ${backupDir}\n`);

const tables = [
  'user_settings',
  'account_summary',
  'ai_coaching_jobs',
  'daily_notes',
  'ai_proposals',
  'account_transactions',
  'trades',
  'trade_notes',
  'import_history'
];

async function backupTable(tableName: string) {
  process.stdout.write(`  - ${tableName}...`);

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');

    if (error) throw error;

    const filePath = path.join(backupDir, `${tableName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    const size = fs.statSync(filePath).size;
    console.log(` ✅ ${data?.length || 0} records (${(size / 1024).toFixed(1)} KB)`);
  } catch (err: any) {
    console.log(` ⚠️  Error: ${err.message}`);
    const filePath = path.join(backupDir, `${tableName}.json`);
    fs.writeFileSync(filePath, '[]');
  }
}

async function main() {
  for (const table of tables) {
    await backupTable(table);
  }

  console.log('\n✅ Backup completed!');
  console.log(`\nRestore with: node scripts/restore-database.js ${backupDir}`);
}

main().catch(console.error);
