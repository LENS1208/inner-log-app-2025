const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertDemoData() {
  const userId = 'ff7d176e-83fd-4d27-9383-906b701c22d1';

  console.log('Reading SQL migration file...');
  const sql = fs.readFileSync('./supabase/migrations/20251120_044318_insert_realistic_demo_datasets.sql', 'utf-8');

  console.log('Deleting existing demo data...');
  const { error: deleteError } = await supabase
    .from('trades')
    .delete()
    .eq('user_id', userId)
    .in('dataset', ['A', 'B', 'C']);

  if (deleteError) {
    console.error('Error deleting data:', deleteError);
    return;
  }

  console.log('Parsing SQL file...');
  const lines = sql.split('\n');
  const datasetStarts = {
    A: lines.findIndex(l => l.includes('-- Dataset A:')),
    B: lines.findIndex(l => l.includes('-- Dataset B:')),
    C: lines.findIndex(l => l.includes('-- Dataset C:'))
  };

  function extractTrades(startIdx, endIdx) {
    const trades = [];
    let currentLine = '';

    for (let i = startIdx + 2; i < endIdx; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('--')) continue;

      currentLine += ' ' + line;

      if (line.endsWith('),') || line.endsWith(');')) {
        const match = currentLine.match(/\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*([^,]+),\s*'([^']+)',\s*([^,]+),\s*'([^']+)',\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*'([^']+)',\s*'([^']+)'\)/);

        if (match) {
          trades.push({
            user_id: match[1],
            ticket: match[2],
            item: match[3],
            side: match[4],
            size: parseFloat(match[5]),
            open_time: match[6],
            open_price: parseFloat(match[7]),
            close_time: match[8],
            close_price: parseFloat(match[9]),
            sl: parseFloat(match[10]),
            tp: parseFloat(match[11]),
            commission: parseFloat(match[12]),
            swap: parseFloat(match[13]),
            profit: parseInt(match[14]),
            pips: parseFloat(match[15]),
            dataset: match[16]
          });
        }
        currentLine = '';
      }
    }

    return trades;
  }

  const tradesA = extractTrades(datasetStarts.A, datasetStarts.B);
  const tradesB = extractTrades(datasetStarts.B, datasetStarts.C);
  const tradesC = extractTrades(datasetStarts.C, lines.length);

  console.log(`\nDataset A: ${tradesA.length} trades`);
  console.log(`Dataset B: ${tradesB.length} trades`);
  console.log(`Dataset C: ${tradesC.length} trades`);

  console.log('\nInserting Dataset A...');
  for (let i = 0; i < tradesA.length; i += 100) {
    const batch = tradesA.slice(i, i + 100);
    const { error } = await supabase.from('trades').insert(batch);
    if (error) {
      console.error(`Error inserting batch ${i}-${i + batch.length}:`, error);
      return;
    }
    console.log(`  Inserted ${i + batch.length}/${tradesA.length} trades`);
  }

  console.log('\nInserting Dataset B...');
  for (let i = 0; i < tradesB.length; i += 100) {
    const batch = tradesB.slice(i, i + 100);
    const { error } = await supabase.from('trades').insert(batch);
    if (error) {
      console.error(`Error inserting batch ${i}-${i + batch.length}:`, error);
      return;
    }
    console.log(`  Inserted ${i + batch.length}/${tradesB.length} trades`);
  }

  console.log('\nInserting Dataset C...');
  for (let i = 0; i < tradesC.length; i += 100) {
    const batch = tradesC.slice(i, i + 100);
    const { error } = await supabase.from('trades').insert(batch);
    if (error) {
      console.error(`Error inserting batch ${i}-${i + batch.length}:`, error);
      return;
    }
    console.log(`  Inserted ${i + batch.length}/${tradesC.length} trades`);
  }

  console.log('\n✅ All demo datasets inserted successfully!');

  const { data: counts } = await supabase
    .from('trades')
    .select('dataset')
    .eq('user_id', userId);

  const summary = counts.reduce((acc, { dataset }) => {
    acc[dataset] = (acc[dataset] || 0) + 1;
    return acc;
  }, {});

  console.log('\nFinal counts:');
  console.log(summary);
}

insertDemoData().catch(console.error);
