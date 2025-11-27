#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const backupDir = path.join(__dirname, '..', 'backups', '20251117_manual');

console.log('\n📦 Exporting database via SQL...\n');

// We'll use MCP execute_sql tool results saved manually
const exports = {
  user_settings: 2,
  daily_notes: 13,
  trade_notes: 0,
  ai_proposals: 1,
  ai_coaching_jobs: 1,
  trades: 463,
  account_summary: 0,
  account_transactions: 0,
  import_history: 0
};

console.log('📊 Data to backup:');
for (const [table, count] of Object.entries(exports)) {
  console.log(`  ${table}: ${count} records`);
}

console.log('\n✅ Export plan created. Use MCP SQL tool to export each table.');
console.log('\nNext: Run queries to export each table with data.');
