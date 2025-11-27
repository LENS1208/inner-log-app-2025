const fs = require('fs');

const sql = fs.readFileSync('supabase/migrations/20251125122100_insert_final_demo_with_corrected_swap.sql', 'utf8');

const lines = sql.split('\n');
let insertStarted = false;
let currentInsert = [];
const inserts = [];

for (const line of lines) {
  if (line.includes('INSERT INTO')) {
    insertStarted = true;
    currentInsert = [line];
  } else if (insertStarted) {
    currentInsert.push(line);
    if (line.trim().endsWith(';')) {
      inserts.push(currentInsert.join('\n'));
      currentInsert = [];
      insertStarted = false;
    }
  }
}

console.log(`Found ${inserts.length} INSERT statements`);
inserts.forEach((ins, i) => {
  const lineCount = ins.split('\n').length;
  const table = ins.match(/INSERT INTO (\w+)/)?.[1] || 'unknown';
  const rowCount = (ins.match(/VALUES/g) || []).length;
  console.log(`${i + 1}. ${table}: ${lineCount} lines, ~${rowCount} rows`);
});

// Write each insert to separate file
inserts.forEach((ins, i) => {
  const table = ins.match(/INSERT INTO (\w+)/)?.[1] || 'unknown';
  fs.writeFileSync(`insert_${i}_${table}.sql`, ins, 'utf8');
});

console.log('\nCreated individual SQL files');
