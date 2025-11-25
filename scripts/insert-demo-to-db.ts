
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const USER_ID = 'cbcc1f55-2f10-41a5-96c4-c2d316ab1fd2';

async function insertDemoData() {
  const data = JSON.parse(fs.readFileSync('generated-demo-data.json', 'utf8'));
  
  console.log('Deleting existing demo data...');
  await supabase.from('trades').delete().eq('user_id', USER_ID).in('dataset', ['A', 'B', 'C']);
  await supabase.from('account_transactions').delete().eq('user_id', USER_ID).in('dataset', ['A', 'B', 'C']);
  await supabase.from('account_summary').delete().eq('user_id', USER_ID).in('dataset', ['A', 'B', 'C']);
  
  // Insert Dataset A trades
  console.log('Inserting Dataset A trades...');
  const tradesA = data.dataset_a.trades.map(t => ({ ...t, user_id: USER_ID, dataset: 'A' }));
  const { error: errA } = await supabase.from('trades').insert(tradesA);
  if (errA) console.error('Dataset A error:', errA);
  else console.log(`Inserted ${tradesA.length} Dataset A trades`);
  
  // Insert Dataset B trades
  console.log('Inserting Dataset B trades...');
  const tradesB = data.dataset_b.trades.map(t => ({ ...t, user_id: USER_ID, dataset: 'B' }));
  const { error: errB } = await supabase.from('trades').insert(tradesB);
  if (errB) console.error('Dataset B error:', errB);
  else console.log(`Inserted ${tradesB.length} Dataset B trades`);
  
  // Insert Dataset C trades
  console.log('Inserting Dataset C trades...');
  const tradesC = data.dataset_c.trades.map(t => ({ ...t, user_id: USER_ID, dataset: 'C' }));
  const { error: errC } = await supabase.from('trades').insert(tradesC);
  if (errC) console.error('Dataset C error:', errC);
  else console.log(`Inserted ${tradesC.length} Dataset C trades`);
  
  console.log('Done!');
}

insertDemoData();
