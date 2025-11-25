/**
 * リアルなFX取引データ生成スクリプト
 *
 * 要件:
 * 1. FX通貨ペアのみ（EURUSD, GBPUSD, USDJPY, EURJPY, GBPJPY, AUDUSD）
 * 2. 正確な損益計算（通貨ペアごとのルールに準拠）
 * 3. 正確なスワップポイント計算（XMの実レート使用）
 * 4. リアルな価格レート（2024-2025年の実際の相場に基づく）
 */

import { writeFileSync } from 'fs';

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
  type: 'deposit' | 'withdrawal' | 'credit';
  category: string;
  description: string;
  amount: number;
}

// FX通貨ペアのみ
const FX_PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'EURJPY', 'GBPJPY', 'AUDUSD'];
const SETUPS = ['Breakout', 'Pullback', 'Reversal', 'Trend', 'Range'];

// 2024-2025年の実際の価格レンジ
const PRICE_RANGES: Record<string, { min: number; max: number; decimals: number }> = {
  'EURUSD': { min: 1.0500, max: 1.1200, decimals: 5 },
  'GBPUSD': { min: 1.2400, max: 1.3200, decimals: 5 },
  'USDJPY': { min: 140.00, max: 156.00, decimals: 3 },
  'EURJPY': { min: 155.00, max: 172.00, decimals: 3 },
  'GBPJPY': { min: 175.00, max: 198.00, decimals: 3 },
  'AUDUSD': { min: 0.6300, max: 0.6900, decimals: 5 },
};

// XMのスワップレート（1ロットあたり/日）
const SWAP_RATES: Record<string, { buy: number; sell: number }> = {
  'EURUSD': { buy: -10.96, sell: 4.64 },
  'GBPUSD': { buy: -4.1, sell: -3.3 },
  'USDJPY': { buy: 3.53, sell: -29.17 },
  'EURJPY': { buy: 2.1, sell: -14.5 },
  'GBPJPY': { buy: 3.17, sell: -38.03 },
  'AUDUSD': { buy: -2.69, sell: -0.99 },
};

function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(random(min, max));
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// リアルな価格を生成
function generatePrice(item: string): number {
  const range = PRICE_RANGES[item];
  const price = random(range.min, range.max);
  return Number(price.toFixed(range.decimals));
}

// 価格差を生成（win/loseに応じて）
function generatePriceDiff(item: string, isWin: boolean): number {
  const range = PRICE_RANGES[item];
  const pipValue = item.includes('JPY') ? 0.01 : 0.0001;

  if (isWin) {
    // 勝ちトレード: 5-40 pips（より現実的な範囲）
    const pips = random(5, 40);
    return Number((pips * pipValue).toFixed(range.decimals));
  } else {
    // 負けトレード: -5～-30 pips
    const pips = random(5, 30);
    return Number((-pips * pipValue).toFixed(range.decimals));
  }
}

// 正確な損益計算
function calculateProfit(
  item: string,
  side: 'buy' | 'sell',
  size: number,
  openPrice: number,
  closePrice: number
): number {
  const priceDiff = side === 'buy' ? (closePrice - openPrice) : (openPrice - closePrice);

  if (item === 'USDJPY' || item === 'EURJPY' || item === 'GBPJPY') {
    // JPYペア: 1ロット = 100,000通貨、損益は円建て
    return Math.round(priceDiff * 100000 * size);
  } else {
    // USDクロス: 1ロット = 100,000通貨、損益はUSD建て → JPY換算
    const usdProfit = priceDiff * 100000 * size;
    const usdJpyRate = 150; // USD/JPY = 150として換算
    return Math.round(usdProfit * usdJpyRate);
  }
}

// PIP値計算
function calculatePips(item: string, openPrice: number, closePrice: number, side: 'buy' | 'sell'): number {
  const priceDiff = side === 'buy' ? closePrice - openPrice : openPrice - closePrice;

  if (item.includes('JPY')) {
    return Number((priceDiff * 100).toFixed(1)); // JPYペアは100倍
  } else {
    return Number((priceDiff * 10000).toFixed(1)); // その他は10000倍
  }
}

// スワップ計算
function calculateSwap(item: string, side: 'buy' | 'sell', size: number, holdingHours: number): number {
  const days = Math.floor(holdingHours / 24);
  if (days === 0) return 0;

  const rate = SWAP_RATES[item][side];
  return Number((rate * size * days).toFixed(1));
}

// SL/TP価格を生成
function generateSLTP(openPrice: number, side: 'buy' | 'sell', item: string): { sl: number; tp: number } {
  const range = PRICE_RANGES[item];
  const pipValue = item.includes('JPY') ? 0.01 : 0.0001;
  const slPips = random(30, 50);
  const tpPips = random(50, 100);

  if (side === 'buy') {
    const sl = openPrice - slPips * pipValue;
    const tp = openPrice + tpPips * pipValue;
    return {
      sl: Number(sl.toFixed(range.decimals)),
      tp: Number(tp.toFixed(range.decimals))
    };
  } else {
    const sl = openPrice + slPips * pipValue;
    const tp = openPrice - tpPips * pipValue;
    return {
      sl: Number(sl.toFixed(range.decimals)),
      tp: Number(tp.toFixed(range.decimals))
    };
  }
}

// 取引を生成
function generateTrade(
  ticketNumber: number,
  baseDate: Date,
  winRate: number
): Trade {
  const item = randomChoice(FX_PAIRS);
  const side = Math.random() < 0.5 ? 'buy' : 'sell';
  const size = Number((random(0.1, 1.5)).toFixed(1)); // より小さいロット数
  const isWin = Math.random() < winRate;

  // 取引時間を生成（平日のみ）
  const openTime = new Date(baseDate);
  openTime.setHours(randomInt(0, 23), randomInt(0, 59), 0, 0);

  // 保有時間: 1時間～5日
  const holdingHours = randomInt(1, 120);
  const closeTime = new Date(openTime.getTime() + holdingHours * 60 * 60 * 1000);

  const openPrice = generatePrice(item);
  const priceDiff = generatePriceDiff(item, isWin);
  const closePrice = side === 'buy'
    ? Number((openPrice + priceDiff).toFixed(PRICE_RANGES[item].decimals))
    : Number((openPrice - priceDiff).toFixed(PRICE_RANGES[item].decimals));

  const { sl, tp } = generateSLTP(openPrice, side, item);
  const profit = calculateProfit(item, side, size, openPrice, closePrice);
  const pips = calculatePips(item, openPrice, closePrice, side);
  const swap = calculateSwap(item, side, size, holdingHours);

  return {
    ticket: `${101000000 + ticketNumber}`,
    item,
    side,
    size,
    open_time: openTime.toISOString(),
    open_price: openPrice,
    close_time: closeTime.toISOString(),
    close_price: closePrice,
    sl,
    tp,
    commission: -12,
    swap,
    profit,
    pips,
    setup: randomChoice(SETUPS)
  };
}

// データセットを生成
function generateDataset(
  name: string,
  startDate: Date,
  tradeCount: number,
  winRate: number,
  deposits: Transaction[]
): { trades: Trade[]; transactions: Transaction[] } {
  console.log(`Generating ${name}: ${tradeCount} trades, win rate ${(winRate * 100).toFixed(0)}%`);

  const trades: Trade[] = [];
  const daySpan = 540; // 18 months

  for (let i = 0; i < tradeCount; i++) {
    const dayOffset = Math.floor((i / tradeCount) * daySpan);
    const tradeDate = new Date(startDate);
    tradeDate.setDate(tradeDate.getDate() + dayOffset);

    // Skip weekends
    while (tradeDate.getDay() === 0 || tradeDate.getDay() === 6) {
      tradeDate.setDate(tradeDate.getDate() + 1);
    }

    const trade = generateTrade(i + 1, tradeDate, winRate);
    trades.push(trade);
  }

  // Calculate summary
  const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
  const totalSwap = trades.reduce((sum, t) => sum + t.swap, 0);
  const totalCommission = trades.reduce((sum, t) => sum + t.commission, 0);

  console.log(`  Total Profit: ¥${totalProfit}, Total Swap: ¥${totalSwap.toFixed(1)}`);

  return { trades, transactions: deposits };
}

// メイン処理
const datasets = {
  dataset_a: generateDataset(
    'Dataset A',
    new Date('2024-05-27'),
    222,
    0.65,
    [
      { date: '2024-05-27T08:00:00Z', type: 'deposit', category: 'balance', description: '初回入金', amount: 1000000 },
      { date: '2024-11-15T10:00:00Z', type: 'deposit', category: 'balance', description: '追加入金', amount: 500000 }
    ]
  ),
  dataset_b: generateDataset(
    'Dataset B',
    new Date('2024-06-25'),
    251,
    0.60,
    [
      { date: '2024-06-25T08:00:00Z', type: 'deposit', category: 'balance', description: '初回入金', amount: 3000000 },
      { date: '2025-02-10T10:00:00Z', type: 'deposit', category: 'balance', description: '追加入金', amount: 2000000 }
    ]
  ),
  dataset_c: generateDataset(
    'Dataset C',
    new Date('2024-11-25'),
    128,
    0.52,
    [
      { date: '2024-11-25T08:00:00Z', type: 'deposit', category: 'balance', description: '初回入金', amount: 800000 },
      { date: '2025-07-15T10:00:00Z', type: 'credit', category: 'credit', description: 'XMポイント利用（970ポイント）', amount: 48015 }
    ]
  )
};

// JSONファイルに出力
writeFileSync('generated-demo-data.json', JSON.stringify(datasets, null, 2));
console.log('\n✅ Demo data generated successfully!');
console.log('📁 Output: ./generated-demo-data.json');
