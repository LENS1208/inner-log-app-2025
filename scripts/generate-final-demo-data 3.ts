/**
 * 最終的なリアルなデモデータ生成スクリプト
 *
 * 改善点：
 * 1. 土日の取引は仮想通貨（BTCUSD）のみ
 * 2. スワップは取引日数と通貨ペアに応じて変動
 * 3. 入出金額は取引実績に基づいて設定
 * 4. 月次カレンダーと実際の取引件数が一致
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
  type: 'deposit' | 'withdrawal';
  category: string;
  description: string;
  amount: number;
}

const FX_PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'EURJPY', 'GBPJPY', 'AUDUSD'];
const CRYPTO_PAIRS = ['BTCUSD', 'ETHUSD'];
const SETUPS = ['Breakout', 'Pullback', 'Reversal', 'Trend', 'Range'];

// 日付が土日かチェック
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0=日曜, 6=土曜
}

// ランダムな値を生成
function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(random(min, max));
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 通貨ペアのPIP値を計算
function calculatePips(item: string, openPrice: number, closePrice: number, side: 'buy' | 'sell'): number {
  const priceDiff = side === 'buy' ? closePrice - openPrice : openPrice - closePrice;

  if (item.includes('JPY')) {
    return priceDiff * 100; // JPYペアは100倍
  } else if (item.includes('BTC') || item.includes('ETH')) {
    return priceDiff; // 仮想通貨はそのまま
  } else {
    return priceDiff * 10000; // その他は10000倍
  }
}

// スワップを計算（保有時間と通貨ペアに基づく）
function calculateSwap(item: string, side: 'buy' | 'sell', size: number, holdingHours: number): number {
  // 仮想通貨はスワップなし
  if (CRYPTO_PAIRS.includes(item)) {
    return 0;
  }

  // 24時間未満はスワップなし
  if (holdingHours < 24) {
    return 0;
  }

  const days = Math.floor(holdingHours / 24);

  // 通貨ペアごとのスワップレート（日次）
  const swapRates: Record<string, { buy: number; sell: number }> = {
    'EURUSD': { buy: -0.5, sell: 0.3 },
    'GBPUSD': { buy: -0.6, sell: 0.4 },
    'USDJPY': { buy: 0.8, sell: -1.2 },
    'EURJPY': { buy: 0.6, sell: -0.9 },
    'GBPJPY': { buy: 0.9, sell: -1.4 },
    'AUDUSD': { buy: -0.3, sell: 0.2 },
  };

  const rate = swapRates[item]?.[side] || 0;
  return Number((rate * size * days).toFixed(1));
}

// Dataset A: 安定した収益トレーダー（勝率65%、平均R:R 1:1.5）
function generateDatasetA(): { trades: Trade[]; transactions: Transaction[] } {
  const trades: Trade[] = [];
  let ticketNum = 101000001;

  // 2024年6月から2025年11月まで（18ヶ月）
  const startDate = new Date('2024-06-01T00:00:00Z');
  const endDate = new Date('2025-11-30T23:59:59Z');

  const currentDate = new Date(startDate);
  let totalProfit = 0;
  let totalSwap = 0;

  // 月平均10-15取引
  while (currentDate <= endDate) {
    const monthlyTrades = randomInt(10, 16);

    for (let i = 0; i < monthlyTrades; i++) {
      // ランダムな日時を生成
      const tradeDate = new Date(currentDate);
      tradeDate.setDate(randomInt(1, 28));
      tradeDate.setHours(randomInt(0, 23), randomInt(0, 59), 0);

      // 土日なら仮想通貨、平日ならFX
      const isWeekendTrade = isWeekend(tradeDate);
      const item = isWeekendTrade ? randomChoice(CRYPTO_PAIRS) : randomChoice(FX_PAIRS);
      const side = Math.random() > 0.5 ? 'buy' : 'sell';
      const size = Number((random(0.5, 3.5)).toFixed(1));

      // 価格設定
      let openPrice: number, closePrice: number;
      if (item === 'BTCUSD') {
        openPrice = random(30000, 70000);
        const isWin = Math.random() < 0.65;
        const priceChange = random(100, 2000);
        closePrice = isWin
          ? (side === 'buy' ? openPrice + priceChange : openPrice - priceChange)
          : (side === 'buy' ? openPrice - priceChange * 0.7 : openPrice + priceChange * 0.7);
      } else if (item === 'ETHUSD') {
        openPrice = random(1500, 4000);
        const isWin = Math.random() < 0.65;
        const priceChange = random(10, 150);
        closePrice = isWin
          ? (side === 'buy' ? openPrice + priceChange : openPrice - priceChange)
          : (side === 'buy' ? openPrice - priceChange * 0.7 : openPrice + priceChange * 0.7);
      } else if (item.includes('JPY')) {
        openPrice = random(item === 'USDJPY' ? 145 : 160, item === 'USDJPY' ? 155 : 200);
        const isWin = Math.random() < 0.65;
        const pipTarget = random(30, 80) / 100;
        closePrice = isWin
          ? (side === 'buy' ? openPrice + pipTarget : openPrice - pipTarget)
          : (side === 'buy' ? openPrice - pipTarget * 0.7 : openPrice + pipTarget * 0.7);
      } else {
        openPrice = random(item === 'EURUSD' ? 1.05 : item === 'GBPUSD' ? 1.25 : 0.64,
                          item === 'EURUSD' ? 1.12 : item === 'GBPUSD' ? 1.32 : 0.69);
        const isWin = Math.random() < 0.65;
        const pipTarget = random(25, 60) / 10000;
        closePrice = isWin
          ? (side === 'buy' ? openPrice + pipTarget : openPrice - pipTarget)
          : (side === 'buy' ? openPrice - pipTarget * 0.7 : openPrice + pipTarget * 0.7);
      }

      // 決済時刻（1-72時間後、30%の確率で24時間以上）
      const closeDate = new Date(tradeDate);
      const holdingHours = Math.random() < 0.3 ? randomInt(24, 73) : randomInt(1, 24);
      closeDate.setHours(closeDate.getHours() + holdingHours);

      // SL/TP設定
      const slDistance = Math.abs(closePrice - openPrice) * 0.7;
      const tpDistance = Math.abs(closePrice - openPrice) * 1.5;
      const sl = side === 'buy' ? openPrice - slDistance : openPrice + slDistance;
      const tp = side === 'buy' ? openPrice + tpDistance : openPrice - tpDistance;

      // PIPSと損益計算
      const pips = calculatePips(item, openPrice, closePrice, side);
      const pipValue = item.includes('JPY') ? 10 : item.includes('BTC') ? 1 : item.includes('ETH') ? 0.1 : 10;
      const profit = Number((pips * pipValue * size).toFixed(0));

      // スワップ計算
      const swap = calculateSwap(item, side, size, holdingHours);

      totalProfit += profit;
      totalSwap += swap;

      trades.push({
        ticket: (ticketNum++).toString(),
        item,
        side,
        size,
        open_time: tradeDate.toISOString(),
        open_price: Number(openPrice.toFixed(item.includes('BTC') ? 2 : item.includes('ETH') ? 2 : item.includes('JPY') ? 3 : 5)),
        close_time: closeDate.toISOString(),
        close_price: Number(closePrice.toFixed(item.includes('BTC') ? 2 : item.includes('ETH') ? 2 : item.includes('JPY') ? 3 : 5)),
        sl: Number(sl.toFixed(item.includes('JPY') ? 3 : 5)),
        tp: Number(tp.toFixed(item.includes('JPY') ? 3 : 5)),
        commission: -12,
        swap,
        profit,
        pips: Number(pips.toFixed(1)),
        setup: randomChoice(SETUPS),
      });
    }

    // 次の月へ
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // 取引実績に基づいた入出金
  const transactions: Transaction[] = [
    {
      date: '2024-05-27T08:00:00Z',
      type: 'deposit',
      category: 'balance',
      description: '初回入金',
      amount: 1000000,
    },
  ];

  // 利益が出たら追加入金と出金を追加
  if (totalProfit > 50000) {
    transactions.push({
      date: '2024-11-15T10:00:00Z',
      type: 'deposit',
      category: 'balance',
      description: '追加入金',
      amount: 500000,
    });
  }

  if (totalProfit > 300000) {
    transactions.push({
      date: '2025-05-20T14:00:00Z',
      type: 'deposit',
      category: 'balance',
      description: '追加入金',
      amount: 300000,
    });
    transactions.push({
      date: '2025-09-10T12:00:00Z',
      type: 'withdrawal',
      category: 'balance',
      description: '利益出金',
      amount: -1000000,
    });
  }

  console.log(`Dataset A: ${trades.length} trades, Total Profit: ¥${totalProfit.toLocaleString()}, Total Swap: ¥${totalSwap.toFixed(1)}`);

  return { trades, transactions, xmPointsEarned: 0, xmPointsUsed: 0 };
}

// Dataset B: 高パフォーマンストレーダー（勝率58%、平均R:R 1:2）
function generateDatasetB(): { trades: Trade[]; transactions: Transaction[] } {
  const trades: Trade[] = [];
  let ticketNum = 201000001;

  const startDate = new Date('2024-07-01T00:00:00Z');
  const endDate = new Date('2025-11-30T23:59:59Z');

  const currentDate = new Date(startDate);
  let totalProfit = 0;
  let totalSwap = 0;

  // 月平均12-18取引
  while (currentDate <= endDate) {
    const monthlyTrades = randomInt(12, 19);

    for (let i = 0; i < monthlyTrades; i++) {
      const tradeDate = new Date(currentDate);
      tradeDate.setDate(randomInt(1, 28));
      tradeDate.setHours(randomInt(0, 23), randomInt(0, 59), 0);

      const isWeekendTrade = isWeekend(tradeDate);
      const item = isWeekendTrade ? randomChoice(CRYPTO_PAIRS) : randomChoice(FX_PAIRS);
      const side = Math.random() > 0.5 ? 'buy' : 'sell';
      const size = Number((random(1.0, 4.0)).toFixed(1));

      let openPrice: number, closePrice: number;
      if (item === 'BTCUSD') {
        openPrice = random(30000, 70000);
        const isWin = Math.random() < 0.58;
        const priceChange = random(200, 3000);
        closePrice = isWin
          ? (side === 'buy' ? openPrice + priceChange : openPrice - priceChange)
          : (side === 'buy' ? openPrice - priceChange * 0.5 : openPrice + priceChange * 0.5);
      } else if (item === 'ETHUSD') {
        openPrice = random(1500, 4000);
        const isWin = Math.random() < 0.58;
        const priceChange = random(20, 200);
        closePrice = isWin
          ? (side === 'buy' ? openPrice + priceChange : openPrice - priceChange)
          : (side === 'buy' ? openPrice - priceChange * 0.5 : openPrice + priceChange * 0.5);
      } else if (item.includes('JPY')) {
        openPrice = random(item === 'USDJPY' ? 145 : 160, item === 'USDJPY' ? 155 : 200);
        const isWin = Math.random() < 0.58;
        const pipTarget = random(40, 100) / 100;
        closePrice = isWin
          ? (side === 'buy' ? openPrice + pipTarget : openPrice - pipTarget)
          : (side === 'buy' ? openPrice - pipTarget * 0.5 : openPrice + pipTarget * 0.5);
      } else {
        openPrice = random(item === 'EURUSD' ? 1.05 : item === 'GBPUSD' ? 1.25 : 0.64,
                          item === 'EURUSD' ? 1.12 : item === 'GBPUSD' ? 1.32 : 0.69);
        const isWin = Math.random() < 0.58;
        const pipTarget = random(30, 70) / 10000;
        closePrice = isWin
          ? (side === 'buy' ? openPrice + pipTarget : openPrice - pipTarget)
          : (side === 'buy' ? openPrice - pipTarget * 0.5 : openPrice + pipTarget * 0.5);
      }

      const closeDate = new Date(tradeDate);
      const holdingHours = Math.random() < 0.35 ? randomInt(24, 73) : randomInt(2, 24);
      closeDate.setHours(closeDate.getHours() + holdingHours);

      const slDistance = Math.abs(closePrice - openPrice) * 0.5;
      const tpDistance = Math.abs(closePrice - openPrice) * 2;
      const sl = side === 'buy' ? openPrice - slDistance : openPrice + slDistance;
      const tp = side === 'buy' ? openPrice + tpDistance : openPrice - tpDistance;

      const pips = calculatePips(item, openPrice, closePrice, side);
      const pipValue = item.includes('JPY') ? 10 : item.includes('BTC') ? 1 : item.includes('ETH') ? 0.1 : 10;
      const profit = Number((pips * pipValue * size).toFixed(0));

      const swap = calculateSwap(item, side, size, holdingHours);

      totalProfit += profit;
      totalSwap += swap;

      trades.push({
        ticket: (ticketNum++).toString(),
        item,
        side,
        size,
        open_time: tradeDate.toISOString(),
        open_price: Number(openPrice.toFixed(item.includes('BTC') ? 2 : item.includes('ETH') ? 2 : item.includes('JPY') ? 3 : 5)),
        close_time: closeDate.toISOString(),
        close_price: Number(closePrice.toFixed(item.includes('BTC') ? 2 : item.includes('ETH') ? 2 : item.includes('JPY') ? 3 : 5)),
        sl: Number(sl.toFixed(item.includes('JPY') ? 3 : 5)),
        tp: Number(tp.toFixed(item.includes('JPY') ? 3 : 5)),
        commission: -12,
        swap,
        profit,
        pips: Number(pips.toFixed(1)),
        setup: randomChoice(SETUPS),
      });
    }

    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  const transactions: Transaction[] = [
    {
      date: '2024-06-25T08:00:00Z',
      type: 'deposit',
      category: 'balance',
      description: '初回入金',
      amount: 3000000,
    },
  ];

  if (totalProfit > 80000) {
    transactions.push({
      date: '2025-02-10T10:00:00Z',
      type: 'deposit',
      category: 'balance',
      description: '追加入金',
      amount: 2000000,
    });
  }

  if (totalProfit > 500000) {
    transactions.push({
      date: '2025-07-30T14:00:00Z',
      type: 'withdrawal',
      category: 'balance',
      description: '利益出金',
      amount: -1500000,
    });
  }

  console.log(`Dataset B: ${trades.length} trades, Total Profit: ¥${totalProfit.toLocaleString()}, Total Swap: ¥${totalSwap.toFixed(1)}`);

  return { trades, transactions, xmPointsEarned: 0, xmPointsUsed: 0 };
}

// Dataset C: 苦戦トレーダー（勝率45%、FOMO問題）
function generateDatasetC(): { trades: Trade[]; transactions: Transaction[] } {
  const trades: Trade[] = [];
  let ticketNum = 301000001;

  const startDate = new Date('2024-12-01T00:00:00Z');
  const endDate = new Date('2025-11-30T23:59:59Z');

  const currentDate = new Date(startDate);
  let totalProfit = 0;
  let totalSwap = 0;

  // 月平均8-14取引（不規則）
  while (currentDate <= endDate) {
    const monthlyTrades = randomInt(8, 15);

    for (let i = 0; i < monthlyTrades; i++) {
      const tradeDate = new Date(currentDate);
      tradeDate.setDate(randomInt(1, 28));
      tradeDate.setHours(randomInt(0, 23), randomInt(0, 59), 0);

      const isWeekendTrade = isWeekend(tradeDate);
      const item = isWeekendTrade ? randomChoice(CRYPTO_PAIRS) : randomChoice(FX_PAIRS);
      const side = Math.random() > 0.5 ? 'buy' : 'sell';
      const size = Number((random(0.3, 2.5)).toFixed(1));

      let openPrice: number, closePrice: number;
      if (item === 'BTCUSD') {
        openPrice = random(30000, 70000);
        const isWin = Math.random() < 0.45;
        const priceChange = random(100, 2500);
        closePrice = isWin
          ? (side === 'buy' ? openPrice + priceChange : openPrice - priceChange)
          : (side === 'buy' ? openPrice - priceChange * 1.2 : openPrice + priceChange * 1.2);
      } else if (item === 'ETHUSD') {
        openPrice = random(1500, 4000);
        const isWin = Math.random() < 0.45;
        const priceChange = random(10, 180);
        closePrice = isWin
          ? (side === 'buy' ? openPrice + priceChange : openPrice - priceChange)
          : (side === 'buy' ? openPrice - priceChange * 1.2 : openPrice + priceChange * 1.2);
      } else if (item.includes('JPY')) {
        openPrice = random(item === 'USDJPY' ? 145 : 160, item === 'USDJPY' ? 155 : 200);
        const isWin = Math.random() < 0.45;
        const pipTarget = random(20, 60) / 100;
        closePrice = isWin
          ? (side === 'buy' ? openPrice + pipTarget : openPrice - pipTarget)
          : (side === 'buy' ? openPrice - pipTarget * 1.3 : openPrice + pipTarget * 1.3);
      } else {
        openPrice = random(item === 'EURUSD' ? 1.05 : item === 'GBPUSD' ? 1.25 : 0.64,
                          item === 'EURUSD' ? 1.12 : item === 'GBPUSD' ? 1.32 : 0.69);
        const isWin = Math.random() < 0.45;
        const pipTarget = random(15, 50) / 10000;
        closePrice = isWin
          ? (side === 'buy' ? openPrice + pipTarget : openPrice - pipTarget)
          : (side === 'buy' ? openPrice - pipTarget * 1.3 : openPrice + pipTarget * 1.3);
      }

      const closeDate = new Date(tradeDate);
      const holdingHours = Math.random() < 0.25 ? randomInt(24, 49) : randomInt(1, 18);
      closeDate.setHours(closeDate.getHours() + holdingHours);

      const slDistance = Math.abs(closePrice - openPrice) * 1.3;
      const tpDistance = Math.abs(closePrice - openPrice) * 0.8;
      const sl = side === 'buy' ? openPrice - slDistance : openPrice + slDistance;
      const tp = side === 'buy' ? openPrice + tpDistance : openPrice - tpDistance;

      const pips = calculatePips(item, openPrice, closePrice, side);
      const pipValue = item.includes('JPY') ? 10 : item.includes('BTC') ? 1 : item.includes('ETH') ? 0.1 : 10;
      const profit = Number((pips * pipValue * size).toFixed(0));

      const swap = calculateSwap(item, side, size, holdingHours);

      totalProfit += profit;
      totalSwap += swap;

      trades.push({
        ticket: (ticketNum++).toString(),
        item,
        side,
        size,
        open_time: tradeDate.toISOString(),
        open_price: Number(openPrice.toFixed(item.includes('BTC') ? 2 : item.includes('ETH') ? 2 : item.includes('JPY') ? 3 : 5)),
        close_time: closeDate.toISOString(),
        close_price: Number(closePrice.toFixed(item.includes('BTC') ? 2 : item.includes('ETH') ? 2 : item.includes('JPY') ? 3 : 5)),
        sl: Number(sl.toFixed(item.includes('JPY') ? 3 : 5)),
        tp: Number(tp.toFixed(item.includes('JPY') ? 3 : 5)),
        commission: -12,
        swap,
        profit,
        pips: Number(pips.toFixed(1)),
        setup: randomChoice(SETUPS),
      });
    }

    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  const transactions: Transaction[] = [
    {
      date: '2024-11-25T08:00:00Z',
      type: 'deposit',
      category: 'balance',
      description: '初回入金',
      amount: 800000,
    },
  ];

  // 損失があるので追加入金
  if (totalProfit < -10000) {
    transactions.push({
      date: '2025-05-10T10:00:00Z',
      type: 'deposit',
      category: 'balance',
      description: '追加入金（損失補填）',
      amount: 500000,
    });
  }

  if (totalProfit < -50000) {
    transactions.push({
      date: '2025-08-20T10:00:00Z',
      type: 'deposit',
      category: 'balance',
      description: '追加入金（損失補填）',
      amount: 300000,
    });
  }

  // XMポイントの計算（取引量に基づく）
  // 1 standard lot (size 1.0) = 約15 XMポイント
  const totalLots = trades.reduce((sum, t) => sum + t.size, 0);
  const xmPointsEarned = Math.floor(totalLots * 15); // 取引量に応じて獲得
  const xmPointsUsed = Math.floor(xmPointsEarned * 0.4); // 40%を使用

  // XMポイント利用の取引を追加
  if (xmPointsUsed > 0) {
    transactions.push({
      date: '2025-07-15T10:00:00Z',
      type: 'deposit',
      category: 'credit',
      description: `XMポイント利用（${xmPointsUsed}ポイント）`,
      amount: Math.floor(xmPointsUsed * 0.33 * 150), // 1ポイント ≈ $0.33 ≈ ¥50
    });
  }

  console.log(`Dataset C: ${trades.length} trades, Total Profit: ¥${totalProfit.toLocaleString()}, Total Swap: ¥${totalSwap.toFixed(1)}, XM Points: ${xmPointsEarned} earned, ${xmPointsUsed} used`);

  return { trades, transactions, xmPointsEarned, xmPointsUsed };
}

// メイン処理
function main() {
  console.log('Generating realistic demo data...\n');

  const datasetA = generateDatasetA();
  const datasetB = generateDatasetB();
  const datasetC = generateDatasetC();

  // JSON形式で保存
  const output = {
    dataset_a: datasetA,
    dataset_b: datasetB,
    dataset_c: datasetC,
    generated_at: new Date().toISOString(),
  };

  writeFileSync(
    './generated-demo-data.json',
    JSON.stringify(output, null, 2)
  );

  console.log('\n✅ Demo data generated successfully!');
  console.log('📁 Output: ./generated-demo-data.json');
}

main();
