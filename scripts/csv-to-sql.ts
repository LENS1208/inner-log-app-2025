import * as fs from 'fs';

interface Trade {
  ticket: string;
  item: string;
  side: string;
  size: number;
  open_time: string;
  open_price: number;
  close_time: string;
  close_price: number;
  sl: number;
  tp: number;
  commission: number;
  swap: number;
  profit: number;
  setup: string;
}

function parseCSV(content: string): Trade[] {
  const lines = content.trim().split('\n');
  const trades: Trade[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('\t');
    if (parts.length < 14) continue;

    const openTime = parts[4].replace('.', '-').replace('.', '-').replace(' ', ' ');
    const closeTime = parts[6].replace('.', '-').replace('.', '-').replace(' ', ' ');

    trades.push({
      ticket: parts[0],
      item: parts[1],
      side: parts[2],
      size: parseFloat(parts[3]),
      open_time: openTime,
      open_price: parseFloat(parts[5]),
      close_time: closeTime,
      close_price: parseFloat(parts[7]),
      sl: parseFloat(parts[8]),
      tp: parseFloat(parts[9]),
      commission: parseFloat(parts[10]),
      swap: parseFloat(parts[11]),
      profit: parseFloat(parts[12]),
      setup: parts[13] || 'Unknown'
    });
  }

  return trades;
}

function calculatePips(trade: Trade): number {
  const isJPY = trade.item.includes('JPY');
  const pipMultiplier = isJPY ? 100 : 10000;

  if (trade.item === 'XAUUSD') {
    return Math.abs(trade.open_price - trade.close_price) * 10;
  }
  if (trade.item === 'BTCUSD') {
    return Math.abs(trade.open_price - trade.close_price);
  }

  return Math.abs(trade.open_price - trade.close_price) * pipMultiplier;
}

function tradesToSQL(trades: Trade[], dataset: string, userId: string): string {
  const values = trades.map(t => {
    const pips = calculatePips(t);
    const openTime = t.open_time + '+00';
    const closeTime = t.close_time + '+00';

    return `('${userId}', '${t.ticket}', '${t.item}', '${t.side}', ${t.size}, '${openTime}', ${t.open_price}, '${closeTime}', ${t.close_price}, ${t.sl}, ${t.tp}, ${t.commission}, ${t.swap}, ${t.profit}, ${pips.toFixed(1)}, '${dataset}', '${t.setup}')`;
  });

  return values.join(',\n');
}

const userId = 'ff7d176e-83fd-4d27-9383-906b701c22d1';

console.log('Reading CSV files...');
const csvA = fs.readFileSync('./public/demo/A.csv', 'utf-8');
const csvB = fs.readFileSync('./public/demo/B.csv', 'utf-8');
const csvC = fs.readFileSync('./public/demo/C.csv', 'utf-8');

console.log('Parsing CSV files...');
const tradesA = parseCSV(csvA);
const tradesB = parseCSV(csvB);
const tradesC = parseCSV(csvC);

console.log(`Dataset A: ${tradesA.length} trades`);
console.log(`Dataset B: ${tradesB.length} trades`);
console.log(`Dataset C: ${tradesC.length} trades`);

console.log('\nGenerating SQL migration file...');

const sqlHeader = `/*
  # Insert Realistic Demo Datasets A, B, C

  1. Purpose
    - Insert realistic demo trading data for test user
    - Three datasets with different characteristics:
      - Dataset A: ${tradesA.length} trades, consistent profitable trader
      - Dataset B: ${tradesB.length} trades, high performance trader
      - Dataset C: ${tradesC.length} trades, struggling trader with FOMO issues

  2. Data Details
    - All trades include pip calculations based on price difference
    - Realistic trading patterns with drawdowns and recovery periods
    - Varied currency pairs and trade setups

  3. Security
    - Only inserts data for the specific test user
    - Respects RLS policies
*/

-- Delete existing demo data for this user
DELETE FROM trades WHERE user_id = '${userId}' AND dataset IN ('A', 'B', 'C');

-- Dataset A: Consistent profitable trader
INSERT INTO trades (user_id, ticket, item, side, size, open_time, open_price, close_time, close_price, sl, tp, commission, swap, profit, pips, dataset, setup) VALUES
${tradesToSQL(tradesA, 'A', userId)};

-- Dataset B: High performance trader
INSERT INTO trades (user_id, ticket, item, side, size, open_time, open_price, close_time, close_price, sl, tp, commission, swap, profit, pips, dataset, setup) VALUES
${tradesToSQL(tradesB, 'B', userId)};

-- Dataset C: Struggling trader
INSERT INTO trades (user_id, ticket, item, side, size, open_time, open_price, close_time, close_price, sl, tp, commission, swap, profit, pips, dataset, setup) VALUES
${tradesToSQL(tradesC, 'C', userId)};
`;

const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '_');
const filename = `./supabase/migrations/${timestamp}_insert_realistic_demo_datasets.sql`;

fs.writeFileSync(filename, sqlHeader);
console.log(`\n✅ SQL migration saved to ${filename}`);
