/**
 * デモデータの完全性と整合性を検証
 */

import { readFileSync } from 'fs';

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

function isWeekend(dateStr: string): boolean {
  const date = new Date(dateStr);
  const day = date.getDay();
  return day === 0 || day === 6;
}

function analyzeDataset(name: string, dataset: Dataset) {
  console.log(`\n=== Dataset ${name} ===`);

  const totalTrades = dataset.trades.length;
  const totalTransactions = dataset.transactions.length;

  const totalProfit = dataset.trades.reduce((sum, t) => sum + t.profit, 0);
  const totalSwap = dataset.trades.reduce((sum, t) => sum + t.swap, 0);
  const totalCommission = dataset.trades.reduce((sum, t) => sum + t.commission, 0);
  const closedPL = totalProfit + totalSwap + totalCommission;

  const swapPositive = dataset.trades.filter(t => t.swap > 0).reduce((sum, t) => sum + t.swap, 0);
  const swapNegative = Math.abs(dataset.trades.filter(t => t.swap < 0).reduce((sum, t) => sum + t.swap, 0));

  // 土日の取引を確認
  const weekendTrades = dataset.trades.filter(t => isWeekend(t.open_time));
  const weekendCryptoTrades = weekendTrades.filter(t => t.item === 'BTCUSD' || t.item === 'ETHUSD');
  const weekendFxTrades = weekendTrades.filter(t => t.item !== 'BTCUSD' && t.item !== 'ETHUSD');

  // 月ごとの取引数を集計
  const tradesByMonth: Record<string, number> = {};
  dataset.trades.forEach(t => {
    const month = t.open_time.substring(0, 7); // YYYY-MM
    tradesByMonth[month] = (tradesByMonth[month] || 0) + 1;
  });

  // 入出金の集計
  const totalDeposits = dataset.transactions
    .filter(t => t.type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawals = Math.abs(dataset.transactions
    .filter(t => t.type === 'withdrawal')
    .reduce((sum, t) => sum + t.amount, 0));

  // 通貨ペアごとの取引数
  const tradesByPair: Record<string, number> = {};
  dataset.trades.forEach(t => {
    tradesByPair[t.item] = (tradesByPair[t.item] || 0) + 1;
  });

  // 勝率の計算
  const winningTrades = dataset.trades.filter(t => t.profit > 0).length;
  const losingTrades = dataset.trades.filter(t => t.profit < 0).length;
  const breakEvenTrades = dataset.trades.filter(t => t.profit === 0).length;
  const winRate = ((winningTrades / totalTrades) * 100).toFixed(1);

  console.log(`\n📊 基本統計:`);
  console.log(`  取引数: ${totalTrades}`);
  console.log(`  入出金記録: ${totalTransactions}`);
  console.log(`  勝ち: ${winningTrades}, 負け: ${losingTrades}, BE: ${breakEvenTrades}`);
  console.log(`  勝率: ${winRate}%`);

  console.log(`\n💰 損益:`);
  console.log(`  総利益: ¥${totalProfit.toLocaleString()}`);
  console.log(`  総スワップ: ¥${totalSwap.toFixed(1)} (正: ${swapPositive.toFixed(1)}, 負: ${swapNegative.toFixed(1)})`);
  console.log(`  総手数料: ¥${totalCommission.toLocaleString()}`);
  console.log(`  確定損益: ¥${closedPL.toFixed(1)}`);

  console.log(`\n💳 入出金:`);
  console.log(`  総入金: ¥${totalDeposits.toLocaleString()}`);
  console.log(`  総出金: ¥${totalWithdrawals.toLocaleString()}`);
  console.log(`  純入金: ¥${(totalDeposits - totalWithdrawals).toLocaleString()}`);

  // XMポイント情報
  if (dataset.xmPointsEarned && dataset.xmPointsEarned > 0) {
    console.log(`\n🎁 XMポイント:`);
    console.log(`  獲得ポイント: ${dataset.xmPointsEarned.toLocaleString()} XMP`);
    console.log(`  使用ポイント: ${dataset.xmPointsUsed?.toLocaleString() || 0} XMP`);
    console.log(`  残高: ${((dataset.xmPointsEarned || 0) - (dataset.xmPointsUsed || 0)).toLocaleString()} XMP`);
    const pointValue = Math.floor((dataset.xmPointsUsed || 0) * 0.33 * 150);
    console.log(`  使用価値: 約¥${pointValue.toLocaleString()}`);
  }

  console.log(`\n📅 土日の取引:`);
  console.log(`  土日の総取引数: ${weekendTrades.length}`);
  console.log(`  仮想通貨取引: ${weekendCryptoTrades.length}`);
  console.log(`  FX取引（問題）: ${weekendFxTrades.length}`);
  if (weekendFxTrades.length > 0) {
    console.log(`  ⚠️ 警告: 土日にFX取引があります！`);
    weekendFxTrades.slice(0, 5).forEach(t => {
      console.log(`    - ${t.open_time}: ${t.item} (ticket: ${t.ticket})`);
    });
  }

  console.log(`\n📈 通貨ペア別取引数:`);
  Object.entries(tradesByPair)
    .sort((a, b) => b[1] - a[1])
    .forEach(([pair, count]) => {
      console.log(`  ${pair}: ${count}`);
    });

  console.log(`\n📆 月別取引数:`);
  Object.entries(tradesByMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([month, count]) => {
      console.log(`  ${month}: ${count}`);
    });

  // スワップが0の取引（24時間未満）の割合
  const tradesWithoutSwap = dataset.trades.filter(t => t.swap === 0).length;
  const swapPercentage = ((tradesWithoutSwap / totalTrades) * 100).toFixed(1);
  console.log(`\n💱 スワップ:`);
  console.log(`  スワップなし（24h未満）: ${tradesWithoutSwap} (${swapPercentage}%)`);
  console.log(`  スワップあり（24h以上）: ${totalTrades - tradesWithoutSwap} (${(100 - parseFloat(swapPercentage)).toFixed(1)}%)`);

  // データの整合性チェック
  console.log(`\n✅ 整合性チェック:`);

  // 1. 取引時刻の妥当性
  const invalidTimeTrades = dataset.trades.filter(t =>
    new Date(t.close_time) <= new Date(t.open_time)
  );
  console.log(`  無効な取引時刻: ${invalidTimeTrades.length}`);

  // 2. 価格の妥当性
  const invalidPriceTrades = dataset.trades.filter(t =>
    t.open_price <= 0 || t.close_price <= 0
  );
  console.log(`  無効な価格: ${invalidPriceTrades.length}`);

  // 3. PIPSの妥当性（極端な値をチェック）
  const extremePipsTrades = dataset.trades.filter(t =>
    Math.abs(t.pips) > 1000
  );
  console.log(`  極端なPIPS値: ${extremePipsTrades.length}`);

  // 4. setupの妥当性
  const invalidSetupTrades = dataset.trades.filter(t =>
    !['Breakout', 'Pullback', 'Reversal', 'Trend', 'Range'].includes(t.setup)
  );
  console.log(`  無効なsetup: ${invalidSetupTrades.length}`);

  return {
    totalTrades,
    totalProfit,
    totalSwap,
    swapPositive,
    swapNegative,
    totalCommission,
    closedPL,
    totalDeposits,
    totalWithdrawals,
    winRate: parseFloat(winRate),
    weekendFxTradesCount: weekendFxTrades.length,
    xmPointsEarned: dataset.xmPointsEarned || 0,
    xmPointsUsed: dataset.xmPointsUsed || 0,
  };
}

function main() {
  console.log('=================================================');
  console.log('デモデータの完全性・整合性検証');
  console.log('=================================================');

  const jsonData = readFileSync('./generated-demo-data.json', 'utf-8');
  const data = JSON.parse(jsonData);

  const statsA = analyzeDataset('A', data.dataset_a);
  const statsB = analyzeDataset('B', data.dataset_b);
  const statsC = analyzeDataset('C', data.dataset_c);

  console.log(`\n\n=================================================`);
  console.log('総合サマリー');
  console.log('=================================================');
  console.log(`総取引数: ${statsA.totalTrades + statsB.totalTrades + statsC.totalTrades}`);
  console.log(`総確定損益: ¥${(statsA.closedPL + statsB.closedPL + statsC.closedPL).toFixed(1)}`);

  const totalWeekendFxTrades = statsA.weekendFxTradesCount + statsB.weekendFxTradesCount + statsC.weekendFxTradesCount;
  if (totalWeekendFxTrades > 0) {
    console.log(`\n⚠️ 警告: 土日のFX取引が${totalWeekendFxTrades}件見つかりました！`);
  } else {
    console.log(`\n✅ 土日の取引はすべて仮想通貨です`);
  }

  console.log(`\nGenerated at: ${data.generated_at}`);
}

main();
