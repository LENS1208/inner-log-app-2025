// デモデータのリスク指標を検証するスクリプト

interface Trade {
  ticket: string;
  item: string;
  type: string;
  size: number;
  open_time: string;
  open_price: number;
  close_time: string;
  close_price: number;
  profit: number;
}

function parseCsv(text: string): Trade[] {
  const lines = text.trim().split('\n');
  const trades: Trade[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('\t');
    if (parts[2] === 'balance') continue; // balance行をスキップ

    trades.push({
      ticket: parts[0],
      item: parts[1],
      type: parts[2],
      size: parseFloat(parts[3]),
      open_time: parts[4],
      open_price: parseFloat(parts[5]),
      close_time: parts[6],
      close_price: parseFloat(parts[7]),
      profit: parseFloat(parts[12])
    });
  }

  return trades;
}

function calculateMetrics(trades: Trade[], datasetName: string) {
  const profits = trades.map(t => t.profit);
  const winTrades = profits.filter(p => p > 0);
  const lossTrades = profits.filter(p => p < 0);

  const totalProfit = profits.reduce((sum, p) => sum + p, 0);
  const avgProfit = totalProfit / profits.length;
  const avgWin = winTrades.length > 0 ? winTrades.reduce((sum, p) => sum + p, 0) / winTrades.length : 0;
  const avgLoss = lossTrades.length > 0 ? lossTrades.reduce((sum, p) => sum + p, 0) / lossTrades.length : 0;

  // 標準偏差
  const variance = profits.reduce((sum, p) => sum + Math.pow(p - avgProfit, 2), 0) / (profits.length - 1);
  const stdDev = Math.sqrt(variance);

  // RRR (リスクリワード比)
  const rrr = avgLoss !== 0 ? avgWin / Math.abs(avgLoss) : 0;

  // シャープレシオ
  const sharpeRatio = stdDev !== 0 ? avgProfit / stdDev : 0;

  // ボラティリティ（修正前の計算式）
  const avgAbsProfit = profits.reduce((sum, p) => sum + Math.abs(p), 0) / profits.length;
  const volatility = avgAbsProfit > 0 ? (stdDev / avgAbsProfit) * 100 : 0;

  // ドローダウン計算
  let peak = 0;
  let cumulative = 0;
  let maxDD = 0;

  for (const trade of trades.sort((a, b) => a.open_time.localeCompare(b.open_time))) {
    cumulative += trade.profit;
    if (cumulative > peak) peak = cumulative;
    const dd = peak - cumulative;
    if (dd > maxDD) maxDD = dd;
  }

  // 運用期間（年数）
  const sortedTrades = [...trades].sort((a, b) => a.close_time.localeCompare(b.close_time));
  const firstDate = new Date(sortedTrades[0].close_time);
  const lastDate = new Date(sortedTrades[sortedTrades.length - 1].close_time);
  const daysInPeriod = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
  const yearsInPeriod = Math.max(daysInPeriod / 365, 0.01);

  // 年率リターン
  const annualReturn = totalProfit / yearsInPeriod;

  // カルマー比
  const calmarRatio = maxDD !== 0 ? annualReturn / maxDD : 0;

  console.log(`\n===== Dataset ${datasetName} =====`);
  console.log(`取引回数: ${trades.length}`);
  console.log(`総損益: ${totalProfit.toFixed(0)}円`);
  console.log(`平均損益: ${avgProfit.toFixed(0)}円`);
  console.log(`勝ち回数: ${winTrades.length} (${(winTrades.length / profits.length * 100).toFixed(1)}%)`);
  console.log(`負け回数: ${lossTrades.length} (${(lossTrades.length / profits.length * 100).toFixed(1)}%)`);
  console.log(`平均利益: ${avgWin.toFixed(0)}円`);
  console.log(`平均損失: ${avgLoss.toFixed(0)}円`);
  console.log(`---`);
  console.log(`RRR: ${rrr.toFixed(2)}`);
  console.log(`標準偏差: ${stdDev.toFixed(0)}円`);
  console.log(`シャープレシオ: ${sharpeRatio.toFixed(3)}`);
  console.log(`ボラティリティ: ${volatility.toFixed(2)}%`);
  console.log(`最大DD: ${maxDD.toFixed(0)}円`);
  console.log(`運用期間: ${daysInPeriod.toFixed(0)}日 (${yearsInPeriod.toFixed(2)}年)`);
  console.log(`年率リターン: ${annualReturn.toFixed(0)}円`);
  console.log(`カルマー比: ${calmarRatio.toFixed(2)}`);

  // 異常値チェック
  const warnings: string[] = [];

  if (volatility > 200) {
    warnings.push(`⚠️ ボラティリティが異常に高い: ${volatility.toFixed(2)}% (通常は10-50%程度)`);
  }

  if (Math.abs(calmarRatio) > 10) {
    warnings.push(`⚠️ カルマー比が異常: ${calmarRatio.toFixed(2)} (通常は-2〜5程度)`);
  }

  if (sharpeRatio < -1) {
    warnings.push(`⚠️ シャープレシオが異常に低い: ${sharpeRatio.toFixed(3)} (通常は-1〜3程度)`);
  }

  if (warnings.length > 0) {
    console.log(`\n【異常値検出】`);
    warnings.forEach(w => console.log(w));
  }
}

// メイン処理
const fs = require('fs');
const path = require('path');

const datasets = ['A', 'B', 'C'];

for (const dataset of datasets) {
  const filePath = path.join(__dirname, '../public/demo', `${dataset}.csv`);
  const text = fs.readFileSync(filePath, 'utf-8');
  const trades = parseCsv(text);
  calculateMetrics(trades, dataset);
}
