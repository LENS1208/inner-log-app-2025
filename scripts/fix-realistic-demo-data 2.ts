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

const JPY_PAIRS = ['USDJPY', 'EURJPY', 'GBPJPY'];
const CRYPTO_PAIRS = ['BTCUSD', 'ETHUSD'];

function calculatePips(item: string, type: 'buy' | 'sell', openPrice: number, closePrice: number): number {
  const priceDiff = type === 'buy' ? closePrice - openPrice : openPrice - closePrice;

  if (JPY_PAIRS.includes(item)) {
    return parseFloat((priceDiff * 100).toFixed(2));
  }
  if (CRYPTO_PAIRS.includes(item)) {
    return parseFloat(priceDiff.toFixed(2));
  }
  return parseFloat((priceDiff * 10000).toFixed(2));
}

function calculateProfit(item: string, type: 'buy' | 'sell', size: number, openPrice: number, closePrice: number): number {
  const priceDiff = type === 'buy' ? closePrice - openPrice : openPrice - closePrice;

  if (JPY_PAIRS.includes(item)) {
    return Math.round(priceDiff * 100 * size * 1000);
  }
  if (CRYPTO_PAIRS.includes(item)) {
    return Math.round(priceDiff * size);
  }
  return Math.round(priceDiff * 10000 * size * 100);
}

function calculateSwap(item: string, type: 'buy' | 'sell', size: number, holdingDays: number): number {
  const rates = SWAP_RATES[item] || { long: 0, short: 0 };
  const dailySwap = type === 'buy' ? rates.long : rates.short;

  let totalSwap = dailySwap * holdingDays * size;

  if (holdingDays < 1) {
    return 0;
  }

  return parseFloat(totalSwap.toFixed(1));
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function adjustForWeekend(date: Date, item: string): Date {
  if (!CRYPTO_PAIRS.includes(item) && isWeekend(date)) {
    const day = date.getUTCDay();
    if (day === 6) {
      date.setUTCDate(date.getUTCDate() + 2);
    } else if (day === 0) {
      date.setUTCDate(date.getUTCDate() + 1);
    }
  }
  return date;
}

function parseCsvLine(line: string): Trade | null {
  const parts = line.split('\t');
  if (parts.length < 14) return null;

  const openTime = new Date(parts[4].replace(/\./g, '-').replace(' ', 'T') + 'Z');
  const closeTime = new Date(parts[6].replace(/\./g, '-').replace(' ', 'T') + 'Z');

  return {
    ticket: parts[0],
    item: parts[1],
    type: parts[2] as 'buy' | 'sell',
    size: parseFloat(parts[3]),
    openTime,
    openPrice: parseFloat(parts[5]),
    closeTime,
    closePrice: parseFloat(parts[7]),
    sl: parseFloat(parts[8]),
    tp: parseFloat(parts[9]),
    commission: parseFloat(parts[10]),
    swap: parseFloat(parts[11]),
    profit: parseFloat(parts[12]),
    comment: parts[13] || '',
  };
}

function fixTrade(trade: Trade): Trade {
  const holdingMs = trade.closeTime.getTime() - trade.openTime.getTime();
  const holdingDays = Math.floor(holdingMs / (1000 * 60 * 60 * 24));

  trade.openTime = adjustForWeekend(trade.openTime, trade.item);
  trade.closeTime = adjustForWeekend(trade.closeTime, trade.item);

  const newProfit = calculateProfit(trade.item, trade.type, trade.size, trade.openPrice, trade.closePrice);
  const newSwap = calculateSwap(trade.item, trade.type, trade.size, holdingDays);

  trade.profit = newProfit;
  trade.swap = newSwap;

  return trade;
}

function addCryptoTrades(trades: Trade[], count: number): Trade[] {
  const cryptoTrades: Trade[] = [];
  const startTicket = 102000000;

  for (let i = 0; i < count; i++) {
    const refTrade = trades[Math.floor(Math.random() * trades.length)];
    const item = Math.random() > 0.5 ? 'BTCUSD' : 'ETHUSD';
    const type: 'buy' | 'sell' = Math.random() > 0.5 ? 'buy' : 'sell';

    const openTime = new Date(refTrade.openTime);
    openTime.setUTCDate(openTime.getUTCDate() + Math.floor(Math.random() * 7));
    if (openTime.getUTCDay() >= 1 && openTime.getUTCDay() <= 5) {
      openTime.setUTCDate(openTime.getUTCDate() + (6 - openTime.getUTCDay()));
    }

    const holdingHours = 2 + Math.random() * 46;
    const closeTime = new Date(openTime.getTime() + holdingHours * 60 * 60 * 1000);

    const basePrice = item === 'BTCUSD' ? 45000 : 2500;
    const volatility = item === 'BTCUSD' ? 2000 : 100;
    const openPrice = basePrice + (Math.random() - 0.5) * volatility;

    const isWin = Math.random() > 0.5;
    const priceMove = isWin ?
      (Math.random() * 500 + 100) * (type === 'buy' ? 1 : -1) :
      (Math.random() * 400 + 50) * (type === 'buy' ? -1 : 1);
    const closePrice = openPrice + priceMove;

    const size = 0.01 + Math.random() * 0.09;
    const profit = calculateProfit(item, type, size, openPrice, closePrice);

    cryptoTrades.push({
      ticket: (startTicket + i).toString(),
      item,
      type,
      size: parseFloat(size.toFixed(2)),
      openTime,
      openPrice: parseFloat(openPrice.toFixed(2)),
      closeTime,
      closePrice: parseFloat(closePrice.toFixed(2)),
      sl: parseFloat((openPrice * (type === 'buy' ? 0.98 : 1.02)).toFixed(2)),
      tp: parseFloat((openPrice * (type === 'buy' ? 1.03 : 0.97)).toFixed(2)),
      commission: -12,
      swap: 0,
      profit,
      comment: ['Breakout', 'Range', 'Trend'][Math.floor(Math.random() * 3)],
    });
  }

  return cryptoTrades;
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
  return [
    trade.ticket,
    trade.item,
    trade.type,
    trade.size.toFixed(1),
    formatDate(trade.openTime),
    trade.openPrice.toFixed(JPY_PAIRS.includes(trade.item) ? 3 : 5),
    formatDate(trade.closeTime),
    trade.closePrice.toFixed(JPY_PAIRS.includes(trade.item) ? 3 : 5),
    trade.sl.toFixed(JPY_PAIRS.includes(trade.item) ? 3 : 5),
    trade.tp.toFixed(JPY_PAIRS.includes(trade.item) ? 3 : 5),
    trade.commission.toString(),
    trade.swap.toString(),
    trade.profit.toString(),
    trade.comment,
  ].join('\t');
}

function processFile(inputPath: string, outputPath: string, cryptoCount: number) {
  const content = fs.readFileSync(inputPath, 'utf-8');
  const lines = content.split('\n');
  const header = lines[0];

  const trades: Trade[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const trade = parseCsvLine(lines[i]);
    if (trade) {
      trades.push(fixTrade(trade));
    }
  }

  const cryptoTrades = addCryptoTrades(trades, cryptoCount);
  const allTrades = [...trades, ...cryptoTrades].sort((a, b) =>
    a.openTime.getTime() - b.openTime.getTime()
  );

  const output = [header, ...allTrades.map(tradeToCsvLine)].join('\n');
  fs.writeFileSync(outputPath, output, 'utf-8');

  console.log(`✅ Processed ${outputPath}`);
  console.log(`   - Original trades: ${trades.length}`);
  console.log(`   - Crypto trades added: ${cryptoTrades.length}`);
  console.log(`   - Total trades: ${allTrades.length}`);
}

const demoDir = path.join(process.cwd(), 'public', 'demo');

processFile(
  path.join(demoDir, 'A.csv'),
  path.join(demoDir, 'A.csv'),
  10
);

processFile(
  path.join(demoDir, 'B.csv'),
  path.join(demoDir, 'B.csv'),
  8
);

processFile(
  path.join(demoDir, 'C.csv'),
  path.join(demoDir, 'C.csv'),
  6
);

console.log('\n✅ All files processed successfully!');
