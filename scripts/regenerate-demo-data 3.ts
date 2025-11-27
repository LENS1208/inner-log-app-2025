import * as fs from 'fs';
import * as path from 'path';

type Trade = {
  ticket: string;
  item: string;
  type: 'buy' | 'sell';
  size: number;
  openTime: Date;
  openPrice: number;
  closeTime: Date;
  closePrice: number;
  sl: number;
  tp: number;
  commission: number;
  swap: number;
  profit: number;
  comment: string;
};

const SWAP_RATES: Record<string, { long: number; short: number }> = {
  'USDJPY': { long: 120, short: -180 },
  'EURJPY': { long: 80, short: -150 },
  'GBPJPY': { long: 100, short: -200 },
  'EURUSD': { long: -50, short: -30 },
  'GBPUSD': { long: -40, short: -20 },
  'AUDUSD': { long: -20, short: -10 },
  'BTCUSD': { long: 0, short: 0 },
  'ETHUSD': { long: 0, short: 0 },
};

const FX_PAIRS = ['USDJPY', 'EURJPY', 'GBPJPY', 'EURUSD', 'GBPUSD', 'AUDUSD'];
const CRYPTO_PAIRS = ['BTCUSD', 'ETHUSD'];
const SETUPS = ['Breakout', 'Range', 'Trend', 'Pullback', 'Reversal'];

function isWeekday(date: Date): boolean {
  const day = date.getUTCDay();
  return day >= 1 && day <= 5;
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function getNextWeekday(date: Date): Date {
  const newDate = new Date(date);
  while (!isWeekday(newDate)) {
    newDate.setUTCDate(newDate.getUTCDate() + 1);
  }
  return newDate;
}

function getNextWeekend(date: Date): Date {
  const newDate = new Date(date);
  while (!isWeekend(newDate)) {
    newDate.setUTCDate(newDate.getUTCDate() + 1);
  }
  return newDate;
}

function calculateProfit(item: string, type: 'buy' | 'sell', size: number, openPrice: number, closePrice: number): number {
  const priceDiff = type === 'buy' ? closePrice - openPrice : openPrice - closePrice;

  if (['USDJPY', 'EURJPY', 'GBPJPY'].includes(item)) {
    return Math.round(priceDiff * 100 * size * 1000);
  }
  if (CRYPTO_PAIRS.includes(item)) {
    return Math.round(priceDiff * size);
  }
  return Math.round(priceDiff * 10000 * size * 100);
}

function calculateSwap(item: string, type: 'buy' | 'sell', size: number, holdingDays: number): number {
  if (holdingDays < 1) return 0;

  const rates = SWAP_RATES[item] || { long: 0, short: 0 };
  const dailySwap = type === 'buy' ? rates.long : rates.short;
  return parseFloat((dailySwap * holdingDays * size).toFixed(1));
}

function generateTrade(
  ticket: number,
  closeDate: Date,
  winRate: number,
  avgWin: number,
  avgLoss: number,
  isWeekendTrade: boolean = false
): Trade {
  const item = isWeekendTrade
    ? CRYPTO_PAIRS[Math.floor(Math.random() * CRYPTO_PAIRS.length)]
    : FX_PAIRS[Math.floor(Math.random() * FX_PAIRS.length)];

  const type: 'buy' | 'sell' = Math.random() > 0.5 ? 'buy' : 'sell';
  const size = parseFloat((isWeekendTrade ? 0.05 + Math.random() * 0.15 : 0.5 + Math.random() * 2.5).toFixed(1));

  const holdingHours = isWeekendTrade ? 2 + Math.random() * 46 : 0.5 + Math.random() * 12;

  const closeTime = new Date(closeDate);
  closeTime.setUTCHours(8 + Math.floor(Math.random() * 14));
  closeTime.setUTCMinutes(Math.floor(Math.random() * 60));
  closeTime.setUTCSeconds(Math.floor(Math.random() * 60));

  const openTime = new Date(closeTime.getTime() - holdingHours * 60 * 60 * 1000);

  if (!isWeekendTrade) {
    if (!isWeekday(closeTime)) {
      closeTime.setTime(getNextWeekday(closeTime).getTime());
      openTime.setTime(closeTime.getTime() - holdingHours * 60 * 60 * 1000);
    }
    if (!isWeekday(openTime)) {
      const daysBefore = Math.ceil(holdingHours / 24);
      let tempDate = new Date(closeTime);
      tempDate.setUTCDate(tempDate.getUTCDate() - daysBefore - 2);
      tempDate = getNextWeekday(tempDate);
      openTime.setTime(tempDate.getTime());
    }
  } else {
    if (!isWeekend(closeTime)) {
      closeTime.setTime(getNextWeekend(closeTime).getTime());
      openTime.setTime(closeTime.getTime() - holdingHours * 60 * 60 * 1000);
    }
    if (!isWeekend(openTime)) {
      openTime.setTime(getNextWeekend(openTime).getTime());
    }
  }

  let basePrice: number;
  let volatility: number;

  if (item === 'USDJPY') {
    basePrice = 145 + Math.random() * 10;
    volatility = 2;
  } else if (item === 'EURJPY') {
    basePrice = 160 + Math.random() * 10;
    volatility = 2;
  } else if (item === 'GBPJPY') {
    basePrice = 190 + Math.random() * 10;
    volatility = 2;
  } else if (item === 'EURUSD') {
    basePrice = 1.05 + Math.random() * 0.1;
    volatility = 0.02;
  } else if (item === 'GBPUSD') {
    basePrice = 1.25 + Math.random() * 0.1;
    volatility = 0.02;
  } else if (item === 'AUDUSD') {
    basePrice = 0.65 + Math.random() * 0.05;
    volatility = 0.01;
  } else if (item === 'BTCUSD') {
    basePrice = 40000 + Math.random() * 10000;
    volatility = 2000;
  } else {
    basePrice = 2000 + Math.random() * 1000;
    volatility = 150;
  }

  const openPrice = basePrice + (Math.random() - 0.5) * volatility;

  const isWin = Math.random() < winRate;
  const targetProfit = isWin ? avgWin + (Math.random() - 0.5) * avgWin * 0.5 : -(avgLoss + (Math.random() - 0.5) * avgLoss * 0.5);

  let closePrice: number;
  if (['USDJPY', 'EURJPY', 'GBPJPY'].includes(item)) {
    const pips = targetProfit / (Math.max(size, 0.1) * 1000);
    closePrice = type === 'buy' ? openPrice + pips / 100 : openPrice - pips / 100;
  } else if (CRYPTO_PAIRS.includes(item)) {
    const priceDiff = targetProfit / Math.max(size, 0.01);
    closePrice = type === 'buy' ? openPrice + priceDiff : openPrice - priceDiff;
  } else {
    const pips = targetProfit / (Math.max(size, 0.1) * 100);
    closePrice = type === 'buy' ? openPrice + pips / 10000 : openPrice - pips / 10000;
  }

  if (!isFinite(closePrice) || closePrice <= 0 || Math.abs(closePrice - openPrice) / openPrice > 0.2) {
    const reasonableMove = isWin ? 0.015 : -0.01;
    closePrice = type === 'buy' ? openPrice * (1 + reasonableMove) : openPrice * (1 - reasonableMove);
  }

  const profit = calculateProfit(item, type, size, openPrice, closePrice);

  if (!isFinite(profit) || Math.abs(profit) > 500000) {
    const fallbackMove = isWin ? 0.01 : -0.005;
    closePrice = type === 'buy' ? openPrice * (1 + fallbackMove) : openPrice * (1 - fallbackMove);
  }

  const holdingMs = closeTime.getTime() - openTime.getTime();
  const holdingDays = Math.floor(holdingMs / (1000 * 60 * 60 * 24));
  const swap = calculateSwap(item, type, size, holdingDays);

  const sl = parseFloat((type === 'buy' ? openPrice * 0.98 : openPrice * 1.02).toFixed(['USDJPY', 'EURJPY', 'GBPJPY'].includes(item) ? 3 : 5));
  const tp = parseFloat((type === 'buy' ? openPrice * 1.03 : openPrice * 0.97).toFixed(['USDJPY', 'EURJPY', 'GBPJPY'].includes(item) ? 3 : 5));

  return {
    ticket: ticket.toString(),
    item,
    type,
    size,
    openTime,
    openPrice: parseFloat(openPrice.toFixed(['USDJPY', 'EURJPY', 'GBPJPY'].includes(item) ? 3 : 5)),
    closeTime,
    closePrice: parseFloat(closePrice.toFixed(['USDJPY', 'EURJPY', 'GBPJPY'].includes(item) ? 3 : 5)),
    sl,
    tp,
    commission: -12,
    swap,
    profit,
    comment: SETUPS[Math.floor(Math.random() * SETUPS.length)],
  };
}

function generateDataset(
  startDate: Date,
  endDate: Date,
  totalTrades: number,
  winRate: number,
  avgWin: number,
  avgLoss: number,
  cryptoRatio: number
): Trade[] {
  const trades: Trade[] = [];
  const fxTrades = Math.floor(totalTrades * (1 - cryptoRatio));
  const cryptoTrades = totalTrades - fxTrades;

  const weekdays: Date[] = [];
  const weekends: Date[] = [];

  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    if (isWeekday(currentDate)) {
      weekdays.push(new Date(currentDate));
    } else {
      weekends.push(new Date(currentDate));
    }
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  let ticketNumber = 101000001;
  let fxAdded = 0;

  while (fxAdded < fxTrades) {
    const dayIndex = Math.floor(Math.random() * weekdays.length);
    const closeDate = weekdays[dayIndex];
    trades.push(generateTrade(ticketNumber++, new Date(closeDate), winRate, avgWin, avgLoss, false));
    fxAdded++;
  }

  let cryptoAdded = 0;
  while (cryptoAdded < cryptoTrades) {
    const dayIndex = Math.floor(Math.random() * weekends.length);
    const closeDate = weekends[dayIndex];
    trades.push(generateTrade(102000000 + cryptoAdded++, new Date(closeDate), winRate, avgWin, avgLoss, true));
  }

  return trades.sort((a, b) => a.closeTime.getTime() - b.closeTime.getTime());
}

function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
}

function tradeToCsvLine(trade: Trade): string {
  const isJPY = ['USDJPY', 'EURJPY', 'GBPJPY'].includes(trade.item);
  return [
    trade.ticket,
    trade.item,
    trade.type,
    trade.size.toFixed(1),
    formatDate(trade.openTime),
    trade.openPrice.toFixed(isJPY ? 3 : 5),
    formatDate(trade.closeTime),
    trade.closePrice.toFixed(isJPY ? 3 : 5),
    trade.sl.toFixed(isJPY ? 3 : 5),
    trade.tp.toFixed(isJPY ? 3 : 5),
    trade.commission.toString(),
    trade.swap.toString(),
    trade.profit.toString(),
    trade.comment,
  ].join('\t');
}

function generateAndSave(filename: string, config: any) {
  const trades = generateDataset(
    config.startDate,
    config.endDate,
    config.totalTrades,
    config.winRate,
    config.avgWin,
    config.avgLoss,
    config.cryptoRatio
  );

  const header = 'Ticket\tItem\tType\tSize\tOpen Time\tOpen Price\tClose Time\tClose Price\tS/L\tT/P\tCommission\tSwap\tProfit\tComment';
  const output = [header, ...trades.map(tradeToCsvLine)].join('\n');

  const demoDir = path.join(process.cwd(), 'public', 'demo');
  const filepath = path.join(demoDir, filename);
  fs.writeFileSync(filepath, output, 'utf-8');

  const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
  const wins = trades.filter(t => t.profit > 0).length;
  const actualWinRate = (wins / trades.length * 100).toFixed(1);

  console.log(`✅ Generated ${filename}`);
  console.log(`   - Total trades: ${trades.length}`);
  console.log(`   - FX trades: ${trades.filter(t => !CRYPTO_PAIRS.includes(t.item)).length}`);
  console.log(`   - Crypto trades: ${trades.filter(t => CRYPTO_PAIRS.includes(t.item)).length}`);
  console.log(`   - Win rate: ${actualWinRate}%`);
  console.log(`   - Total profit: ${totalProfit.toLocaleString()}円`);
}

const startDate = new Date('2024-06-01T00:00:00Z');
const endDate = new Date('2025-11-30T23:59:59Z');

generateAndSave('A.csv', {
  startDate,
  endDate,
  totalTrades: 250,
  winRate: 0.58,
  avgWin: 30000,
  avgLoss: 20000,
  cryptoRatio: 0.04,
});

generateAndSave('B.csv', {
  startDate,
  endDate,
  totalTrades: 200,
  winRate: 0.42,
  avgWin: 25000,
  avgLoss: 30000,
  cryptoRatio: 0.04,
});

generateAndSave('C.csv', {
  startDate,
  endDate,
  totalTrades: 140,
  winRate: 0.48,
  avgWin: 20000,
  avgLoss: 22000,
  cryptoRatio: 0.04,
});

console.log('\n✅ All datasets generated successfully!');
