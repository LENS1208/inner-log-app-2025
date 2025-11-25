#!/usr/bin/env npx tsx

import { readFileSync } from 'fs';
import { resolve } from 'path';

interface Trade {
  ticket: string;
  item: string;
  type: string;
  size: number;
  open_time: string;
  open_price: number;
  close_time: string;
  close_price: number;
  sl?: number;
  tp?: number;
  commission: number;
  swap: number;
  profit: number;
  comment?: string;
}

const VALID_PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'EURJPY', 'GBPJPY', 'AUDUSD'];
const VALID_TYPES = ['buy', 'sell', 'balance', 'credit'];

function parseCsvLine(line: string): string[] {
  return line.split('\t').map(field => field.trim());
}

function parseCsvText(text: string): Trade[] {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const trades: Trade[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length < headers.length) continue;

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });

    const type = row.type?.toLowerCase() || '';

    trades.push({
      ticket: row.ticket || '',
      item: row.item || '',
      type,
      size: parseFloat(row.size) || 0,
      open_time: row.open_time || '',
      open_price: parseFloat(row.open_price) || 0,
      close_time: row.close_time || '',
      close_price: parseFloat(row.close_price) || 0,
      sl: row.s_l ? parseFloat(row.s_l) : undefined,
      tp: row.t_p ? parseFloat(row.t_p) : undefined,
      commission: parseFloat(row.commission) || 0,
      swap: parseFloat(row.swap) || 0,
      profit: parseFloat(row.profit) || 0,
      comment: row.comment || '',
    });
  }

  return trades;
}

function validateTrade(trade: Trade, index: number, dataset: string): string[] {
  const errors: string[] = [];
  const prefix = `[${dataset}] Row ${index + 2}`;

  if (!trade.ticket) {
    errors.push(`${prefix}: Missing ticket`);
  }

  if (!trade.item) {
    errors.push(`${prefix}: Missing item (currency pair)`);
  }

  if (trade.type === 'buy' || trade.type === 'sell') {
    if (!VALID_PAIRS.includes(trade.item)) {
      errors.push(`${prefix}: Invalid currency pair "${trade.item}". Must be one of: ${VALID_PAIRS.join(', ')}`);
    }

    if (trade.size <= 0) {
      errors.push(`${prefix}: Invalid size ${trade.size}. Must be greater than 0`);
    }

    if (trade.open_price <= 0) {
      errors.push(`${prefix}: Invalid open_price ${trade.open_price}. Must be greater than 0`);
    }

    if (trade.close_price <= 0) {
      errors.push(`${prefix}: Invalid close_price ${trade.close_price}. Must be greater than 0`);
    }

    if (!trade.open_time.match(/^\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}:\d{2}$/)) {
      errors.push(`${prefix}: Invalid open_time format "${trade.open_time}". Expected: YYYY.MM.DD HH:mm:ss`);
    }

    if (!trade.close_time.match(/^\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}:\d{2}$/)) {
      errors.push(`${prefix}: Invalid close_time format "${trade.close_time}". Expected: YYYY.MM.DD HH:mm:ss`);
    }

    if (trade.commission > 0) {
      errors.push(`${prefix}: Commission should be negative or zero, got ${trade.commission}`);
    }
  }

  if (!VALID_TYPES.includes(trade.type)) {
    errors.push(`${prefix}: Invalid type "${trade.type}". Must be one of: ${VALID_TYPES.join(', ')}`);
  }

  return errors;
}

function validateDataset(dataset: string): void {
  const filePath = resolve(__dirname, '..', 'public', 'demo', `${dataset}.csv`);

  console.log(`\n📊 Validating Dataset ${dataset}...`);
  console.log(`   File: ${filePath}`);

  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`❌ Failed to read file: ${error}`);
    process.exit(1);
  }

  const trades = parseCsvText(content);
  console.log(`   Total rows: ${trades.length}`);

  const balances = trades.filter(t => t.type === 'balance');
  const credits = trades.filter(t => t.type === 'credit');
  const actualTrades = trades.filter(t => t.type === 'buy' || t.type === 'sell');

  console.log(`   - Balances: ${balances.length}`);
  console.log(`   - Credits: ${credits.length}`);
  console.log(`   - Trades: ${actualTrades.length}`);

  const allErrors: string[] = [];
  trades.forEach((trade, index) => {
    const errors = validateTrade(trade, index, dataset);
    allErrors.push(...errors);
  });

  if (allErrors.length > 0) {
    console.error(`\n❌ Found ${allErrors.length} validation errors:\n`);
    allErrors.forEach(error => console.error(`   ${error}`));
    process.exit(1);
  }

  const totalProfit = actualTrades.reduce((sum, t) => sum + t.profit, 0);
  const totalSwap = actualTrades.reduce((sum, t) => sum + t.swap, 0);
  const totalCommission = actualTrades.reduce((sum, t) => sum + t.commission, 0);
  const wins = actualTrades.filter(t => t.profit > 0).length;
  const losses = actualTrades.filter(t => t.profit < 0).length;
  const winRate = actualTrades.length > 0 ? (wins / actualTrades.length * 100).toFixed(2) : '0.00';

  console.log(`\n   📈 Statistics:`);
  console.log(`      Total Profit: ${totalProfit.toLocaleString()}`);
  console.log(`      Total Swap: ${totalSwap.toLocaleString()}`);
  console.log(`      Total Commission: ${totalCommission.toLocaleString()}`);
  console.log(`      Wins: ${wins} | Losses: ${losses}`);
  console.log(`      Win Rate: ${winRate}%`);

  console.log(`\n✅ Dataset ${dataset} validation passed!`);
}

function main() {
  console.log('🔍 Demo Data Validation Tool\n');
  console.log('=' .repeat(60));

  const datasets = ['A', 'B', 'C'];

  for (const dataset of datasets) {
    validateDataset(dataset);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All datasets validated successfully!\n');
}

main();
