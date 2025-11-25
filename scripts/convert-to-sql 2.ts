/**
 * 生成されたJSONデータをSQLマイグレーションファイルに変換
 */

import { readFileSync, writeFileSync } from 'fs';

interface Trade {
  ticket: string;
  item: string;
  side: 'buy' | 'sell';
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
  pips: number;
  setup: string;
}

interface Transaction {
  date: string;
  type: 'deposit' | 'withdrawal';
  category: string;
  description: string;
  amount: number;
}

interface Dataset {
  trades: Trade[];
  transactions: Transaction[];
  xmPointsEarned?: number;
  xmPointsUsed?: number;
}

interface DemoData {
  dataset_a: Dataset;
  dataset_b: Dataset;
  dataset_c: Dataset;
  generated_at: string;
}

const TEST_USER_ID = 'cbcc1f55-2f10-41a5-96c4-c2d316ab1fd2';

function escapeString(str: string): string {
  return str.replace(/'/g, "''");
}

function generateTradeInserts(trades: Trade[], dataset: string): string {
  const values = trades.map(t => {
    return `('${TEST_USER_ID}', '${t.ticket}', '${t.item}', '${t.side}', ${t.size}, '${t.open_time}', ${t.open_price}, '${t.close_time}', ${t.close_price}, ${t.sl}, ${t.tp}, ${t.commission}, ${t.swap}, ${t.profit}, ${t.pips}, '${dataset}', '${t.setup}')`;
  }).join(',\n');

  return `-- Insert trades for Dataset ${dataset}
INSERT INTO trades (user_id, ticket, item, side, size, open_time, open_price, close_time, close_price, sl, tp, commission, swap, profit, pips, dataset, setup) VALUES
${values};`;
}

function generateTransactionInserts(transactions: Transaction[], dataset: string): string {
  const values = transactions.map(t => {
    return `('${TEST_USER_ID}', '${dataset}', NULL, '${t.date}', '${t.type}', '${t.category}', '${escapeString(t.description)}', ${t.amount})`;
  }).join(',\n');

  return `-- Insert transactions for Dataset ${dataset}
INSERT INTO account_transactions (user_id, dataset, ticket, transaction_date, transaction_type, category, description, amount) VALUES
${values};`;
}

function calculateSummary(trades: Trade[], transactions: Transaction[]): {
  totalDeposits: number;
  totalWithdrawals: number;
  totalSwap: number;
  swapPositive: number;
  swapNegative: number;
  totalCommission: number;
  totalProfit: number;
  closedPL: number;
} {
  const totalDeposits = transactions
    .filter(t => t.type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawals = Math.abs(transactions
    .filter(t => t.type === 'withdrawal')
    .reduce((sum, t) => sum + t.amount, 0));

  const totalSwap = trades.reduce((sum, t) => sum + t.swap, 0);
  const swapPositive = trades.filter(t => t.swap > 0).reduce((sum, t) => sum + t.swap, 0);
  const swapNegative = Math.abs(trades.filter(t => t.swap < 0).reduce((sum, t) => sum + t.swap, 0));

  const totalCommission = trades.reduce((sum, t) => sum + t.commission, 0);
  const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
  const closedPL = totalProfit + totalSwap + totalCommission;

  return {
    totalDeposits,
    totalWithdrawals,
    totalSwap: Number(totalSwap.toFixed(1)),
    swapPositive: Number(swapPositive.toFixed(1)),
    swapNegative: Number(swapNegative.toFixed(1)),
    totalCommission,
    totalProfit,
    closedPL: Number(closedPL.toFixed(1)),
  };
}

function generateSummaryInsert(trades: Trade[], transactions: Transaction[], dataset: string, xmPointsEarned: number = 0, xmPointsUsed: number = 0): string {
  const summary = calculateSummary(trades, transactions);

  return `-- Insert account summary for Dataset ${dataset}
INSERT INTO account_summary (user_id, dataset, total_deposits, total_withdrawals, xm_points_earned, xm_points_used, total_swap, swap_positive, swap_negative, total_commission, total_profit, closed_pl)
VALUES ('${TEST_USER_ID}', '${dataset}', ${summary.totalDeposits}, ${summary.totalWithdrawals}, ${xmPointsEarned}, ${xmPointsUsed}, ${summary.totalSwap}, ${summary.swapPositive}, ${summary.swapNegative}, ${summary.totalCommission}, ${summary.totalProfit}, ${summary.closedPL});`;
}

function main() {
  console.log('Converting JSON to SQL migration...\n');

  // JSONファイルを読み込み
  const jsonData = readFileSync('./generated-demo-data.json', 'utf-8');
  const data: DemoData = JSON.parse(jsonData);

  console.log(`Dataset A: ${data.dataset_a.trades.length} trades, ${data.dataset_a.transactions.length} transactions`);
  console.log(`Dataset B: ${data.dataset_b.trades.length} trades, ${data.dataset_b.transactions.length} transactions`);
  console.log(`Dataset C: ${data.dataset_c.trades.length} trades, ${data.dataset_c.transactions.length} transactions\n`);

  // SQLファイルを生成
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const filename = `${timestamp}_insert_final_realistic_demo_data.sql`;

  const sql = `/*
  # Insert Final Realistic Demo Data

  1. Purpose
    - Insert realistic demo trading data for test user
    - Three datasets with different characteristics:
      - Dataset A: ${data.dataset_a.trades.length} trades, consistent profitable trader (win rate ~65%)
      - Dataset B: ${data.dataset_b.trades.length} trades, high performance trader (win rate ~58%)
      - Dataset C: ${data.dataset_c.trades.length} trades, struggling trader (win rate ~45%), includes XM Points

  2. Key Improvements
    - Weekend trades use crypto pairs (BTCUSD, ETHUSD) only
    - Swap calculated based on holding time and currency pair
    - Deposits/withdrawals reflect actual trading performance
    - Trade counts match monthly calendar display
    - Dataset C includes XM Points earned (based on trading volume) and used

  3. Security
    - Only inserts data for the test user (${TEST_USER_ID})
    - Respects RLS policies

  Generated: ${data.generated_at}
*/

-- Delete existing demo data for this user
DELETE FROM trades WHERE user_id = '${TEST_USER_ID}' AND dataset IN ('A', 'B', 'C');
DELETE FROM account_transactions WHERE user_id = '${TEST_USER_ID}' AND dataset IN ('A', 'B', 'C');
DELETE FROM account_summary WHERE user_id = '${TEST_USER_ID}' AND dataset IN ('A', 'B', 'C');

${generateTradeInserts(data.dataset_a.trades, 'A')}

${generateTradeInserts(data.dataset_b.trades, 'B')}

${generateTradeInserts(data.dataset_c.trades, 'C')}

${generateTransactionInserts(data.dataset_a.transactions, 'A')}

${generateTransactionInserts(data.dataset_b.transactions, 'B')}

${generateTransactionInserts(data.dataset_c.transactions, 'C')}

${generateSummaryInsert(data.dataset_a.trades, data.dataset_a.transactions, 'A', data.dataset_a.xmPointsEarned || 0, data.dataset_a.xmPointsUsed || 0)}

${generateSummaryInsert(data.dataset_b.trades, data.dataset_b.transactions, 'B', data.dataset_b.xmPointsEarned || 0, data.dataset_b.xmPointsUsed || 0)}

${generateSummaryInsert(data.dataset_c.trades, data.dataset_c.transactions, 'C', data.dataset_c.xmPointsEarned || 0, data.dataset_c.xmPointsUsed || 0)}
`;

  writeFileSync(`./supabase/migrations/${filename}`, sql);

  console.log('✅ SQL migration file generated successfully!');
  console.log(`📁 Output: ./supabase/migrations/${filename}`);
}

main();
