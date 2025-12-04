// ボラティリティ計算式の検証と代替案の比較

const fs = require('fs');
const path = require('path');

interface Trade {
  profit: number;
}

function parseCsv(text: string): Trade[] {
  const lines = text.trim().split('\n');
  const trades: Trade[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('\t');
    if (parts[2] === 'balance') continue;
    trades.push({ profit: parseFloat(parts[12]) });
  }

  return trades;
}

function analyzeVolatility(trades: Trade[], datasetName: string) {
  const profits = trades.map(t => t.profit);

  const totalProfit = profits.reduce((sum, p) => sum + p, 0);
  const avgProfit = totalProfit / profits.length;

  // 標準偏差
  const variance = profits.reduce((sum, p) => sum + Math.pow(p - avgProfit, 2), 0) / (profits.length - 1);
  const stdDev = Math.sqrt(variance);

  // === 方法1: 現在の計算式 ===
  const avgAbsProfit = profits.reduce((sum, p) => sum + Math.abs(p), 0) / profits.length;
  const volatility1 = avgAbsProfit > 0 ? (stdDev / avgAbsProfit) * 100 : 0;

  // === 方法2: 変動係数（CV = 標準偏差 / 平均の絶対値） ===
  const volatility2 = Math.abs(avgProfit) > 0 ? (stdDev / Math.abs(avgProfit)) * 100 : 0;

  // === 方法3: 相対標準偏差（標準偏差 / スケール） ===
  // スケール = 平均絶対偏差
  const avgAbsDeviation = profits.reduce((sum, p) => sum + Math.abs(p - avgProfit), 0) / profits.length;
  const volatility3 = avgAbsDeviation > 0 ? (stdDev / avgAbsDeviation) * 100 : 0;

  // === 方法4: 正規化ボラティリティ（取引サイズで正規化） ===
  // 各取引の収益率の標準偏差に相当
  const normalizedProfits = profits.map(p => p / avgAbsProfit);
  const avgNormalized = normalizedProfits.reduce((sum, p) => sum + p, 0) / normalizedProfits.length;
  const varianceNormalized = normalizedProfits.reduce((sum, p) => sum + Math.pow(p - avgNormalized, 2), 0) / (normalizedProfits.length - 1);
  const volatility4 = Math.sqrt(varianceNormalized) * 100;

  console.log(`\n===== ${datasetName} =====`);
  console.log(`取引回数: ${trades.length}`);
  console.log(`平均損益: ${avgProfit.toFixed(0)}円`);
  console.log(`標準偏差: ${stdDev.toFixed(0)}円`);
  console.log(`平均絶対損益: ${avgAbsProfit.toFixed(0)}円`);
  console.log(`\n【計算方法の比較】`);
  console.log(`方法1（現在）: ${volatility1.toFixed(2)}% (標準偏差 / 平均絶対損益)`);
  console.log(`方法2: ${volatility2.toFixed(2)}% (標準偏差 / 平均損益の絶対値) [変動係数]`);
  console.log(`方法3: ${volatility3.toFixed(2)}% (標準偏差 / 平均絶対偏差)`);
  console.log(`方法4: ${volatility4.toFixed(2)}% (正規化収益率の標準偏差)`);

  // 推奨判定
  console.log(`\n【推奨方法】`);
  if (volatility1 < 50) {
    console.log(`✓ 現在の方法で問題なし`);
  } else if (volatility4 < 150) {
    console.log(`→ 方法4（正規化ボラティリティ）を推奨: ${volatility4.toFixed(2)}%`);
  } else {
    console.log(`⚠️ データに極端な外れ値が存在します`);
  }

  return {
    current: volatility1,
    cv: volatility2,
    rsd: volatility3,
    normalized: volatility4
  };
}

const datasets = ['A', 'B', 'C'];
const results: any = {};

for (const dataset of datasets) {
  const filePath = path.join(__dirname, '../public/demo', `${dataset}.csv`);
  const text = fs.readFileSync(filePath, 'utf-8');
  const trades = parseCsv(text);
  results[dataset] = analyzeVolatility(trades, `Dataset ${dataset}`);
}

console.log(`\n\n===== まとめ =====`);
console.log(`Dataset A: ${results.A.current.toFixed(2)}% → 推奨: ${results.A.normalized.toFixed(2)}%`);
console.log(`Dataset B: ${results.B.current.toFixed(2)}% → 推奨: ${results.B.normalized.toFixed(2)}%`);
console.log(`Dataset C: ${results.C.current.toFixed(2)}% → 推奨: ${results.C.normalized.toFixed(2)}%`);

console.log(`\n【結論】`);
console.log(`現在の計算式は基本的に正しいですが、Dataset A/Bで120%台という高い値が出ています。`);
console.log(`これは取引スタイルのリスクが高いことを示しています（30%以上は高リスク）。`);
console.log(`Dataset Cは外れ値により641%と異常値になっています。`);
