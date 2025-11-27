const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const data = JSON.parse(fs.readFileSync('generated-demo-data.json', 'utf8'));
const USER_ID = 'cbcc1f55-2f10-41a5-96c4-c2d316ab1fd2';

async function insertData() {
  console.log('Inserting trades...');

  // Insert Dataset A
  const tradesA = data.dataset_a.trades.map(t => ({ ...t, user_id: USER_ID, dataset: 'A' }));
  for (let i = 0; i < tradesA.length; i += 50) {
    const batch = tradesA.slice(i, i + 50);
    const { error } = await supabase.from('trades').insert(batch);
    if (error) {
      console.error(`Dataset A batch ${Math.floor(i/50)} error:`, error.message);
    } else {
      console.log(`Dataset A: inserted ${i + batch.length}/${tradesA.length}`);
    }
  }

  // Insert Dataset B
  const tradesB = data.dataset_b.trades.map(t => ({ ...t, user_id: USER_ID, dataset: 'B' }));
  for (let i = 0; i < tradesB.length; i += 50) {
    const batch = tradesB.slice(i, i + 50);
    const { error } = await supabase.from('trades').insert(batch);
    if (error) {
      console.error(`Dataset B batch ${Math.floor(i/50)} error:`, error.message);
    } else {
      console.log(`Dataset B: inserted ${i + batch.length}/${tradesB.length}`);
    }
  }

  // Insert Dataset C
  const tradesC = data.dataset_c.trades.map(t => ({ ...t, user_id: USER_ID, dataset: 'C' }));
  for (let i = 0; i < tradesC.length; i += 50) {
    const batch = tradesC.slice(i, i + 50);
    const { error } = await supabase.from('trades').insert(batch);
    if (error) {
      console.error(`Dataset C batch ${Math.floor(i/50)} error:`, error.message);
    } else {
      console.log(`Dataset C: inserted ${i + batch.length}/${tradesC.length}`);
    }
  }

  // Insert transactions
  console.log('Inserting transactions...');
  const txA = data.dataset_a.transactions.map(t => ({ ...t, user_id: USER_ID, dataset: 'A', transaction_date: t.date, ticket: null }));
  const txB = data.dataset_b.transactions.map(t => ({ ...t, user_id: USER_ID, dataset: 'B', transaction_date: t.date, ticket: null }));
  const txC = data.dataset_c.transactions.map(t => ({ ...t, user_id: USER_ID, dataset: 'C', transaction_date: t.date, ticket: null }));

  const { error: txError } = await supabase.from('account_transactions').insert([...txA, ...txB, ...txC]);
  if (txError) console.error('Transactions error:', txError.message);
  else console.log('Transactions inserted');

  // Calculate and insert account summary
  console.log('Calculating account summary...');

  function calculateSummary(trades, transactions, dataset) {
    const totalSwap = trades.reduce((sum, t) => sum + t.swap, 0);
    const swapPositive = trades.filter(t => t.swap > 0).reduce((sum, t) => sum + t.swap, 0);
    const swapNegative = Math.abs(trades.filter(t => t.swap < 0).reduce((sum, t) => sum + t.swap, 0));
    const totalCommission = trades.reduce((sum, t) => sum + t.commission, 0);
    const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
    const totalDeposits = transactions.filter(t => t.transaction_type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
    const xmPointsEarned = dataset === 'C' ? 2427 : 0;
    const xmPointsUsed = dataset === 'C' ? 970 : 0;

    return {
      user_id: USER_ID,
      dataset,
      total_deposits: totalDeposits,
      total_withdrawals: 0,
      xm_points_earned: xmPointsEarned,
      xm_points_used: xmPointsUsed,
      total_swap: totalSwap,
      swap_positive: swapPositive,
      swap_negative: swapNegative,
      total_commission: totalCommission,
      total_profit: totalProfit,
      closed_pl: totalProfit + totalSwap + totalCommission
    };
  }

  const summaries = [
    calculateSummary(data.dataset_a.trades, data.dataset_a.transactions, 'A'),
    calculateSummary(data.dataset_b.trades, data.dataset_b.transactions, 'B'),
    calculateSummary(data.dataset_c.trades, data.dataset_c.transactions, 'C')
  ];

  const { error: sumError } = await supabase.from('account_summary').insert(summaries);
  if (sumError) console.error('Summary error:', sumError.message);
  else console.log('Account summary inserted');

  console.log('\nSummaries:');
  summaries.forEach(s => {
    console.log(`Dataset ${s.dataset}: total_swap=${s.total_swap}, swap_positive=${s.swap_positive}, swap_negative=${s.swap_negative}`);
  });

  console.log('\nDone!');
}

insertData();
