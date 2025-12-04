// Dataset C の詳細分析

const fs = require('fs');
const path = require('path');

interface Trade {
  profit: number;
}

function analyzeCsv(filePath: string, datasetName: string) {
  const text = fs.readFileSync(filePath, 'utf-8');
  const lines = text.trim().split('\n');

  const profits: number[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('\t');
    if (parts[2] === 'balance') continue;
    const profit = parseFloat(parts[12]);
    profits.push(profit);
  }

  // 統計
  const wins = profits.filter(p => p > 0);
  const losses = profits.filter(p => p < 0);

  const maxWin = Math.max(...wins);
  const minWin = Math.min(...wins);
  const maxLoss = Math.min(...losses);
  const minLoss = Math.max(...losses);

  const avgWin = wins.reduce((s, p) => s + p, 0) / wins.length;
  const avgLoss = losses.reduce((s, p) => s + p, 0) / losses.length;

  const totalProfit = profits.reduce((s, p) => s + p, 0);
  const avgProfit = totalProfit / profits.length;

  // 平均絶対損益
  const avgAbsProfit = profits.reduce((s, p) => s + Math.abs(p), 0) / profits.length;

  // 標準偏差
  const variance = profits.reduce((s, p) => s + Math.pow(p - avgProfit, 2), 0) / (profits.length - 1);
  const stdDev = Math.sqrt(variance);

  console.log(`\n===== ${datasetName} 詳細分析 =====`);
  console.log(`\n【取引数】`);
  console.log(`勝ちトレード: ${wins.length}回 (${(wins.length / profits.length * 100).toFixed(1)}%)`);
  console.log(`負けトレード: ${losses.length}回 (${(losses.length / profits.length * 100).toFixed(1)}%)`);

  console.log(`\n【利益の範囲】`);
  console.log(`最大利益: ${maxWin.toFixed(0)}円`);
  console.log(`最小利益: ${minWin.toFixed(0)}円`);
  console.log(`平均利益: ${avgWin.toFixed(0)}円`);

  console.log(`\n【損失の範囲】`);
  console.log(`最大損失: ${maxLoss.toFixed(0)}円`);
  console.log(`最小損失: ${minLoss.toFixed(0)}円 (0に近い損失)`);
  console.log(`平均損失: ${avgLoss.toFixed(0)}円`);

  console.log(`\n【統計値】`);
  console.log(`平均損益: ${avgProfit.toFixed(0)}円`);
  console.log(`平均絶対損益: ${avgAbsProfit.toFixed(0)}円`);
  console.log(`標準偏差: ${stdDev.toFixed(0)}円`);
  console.log(`標準偏差 / 平均絶対損益: ${(stdDev / avgAbsProfit).toFixed(2)}`);
  console.log(`ボラティリティ: ${((stdDev / avgAbsProfit) * 100).toFixed(2)}%`);

  console.log(`\n【問題点分析】`);
  console.log(`平均利益 ${avgWin.toFixed(0)}円 vs 平均損失 ${Math.abs(avgLoss).toFixed(0)}円`);
  console.log(`損失の大きさは利益の ${(Math.abs(avgLoss) / avgWin).toFixed(2)}倍`);
  console.log(`→ 小さく勝って大きく負ける「コツコツドカン」パターン`);

  // 利益分布
  console.log(`\n【利益分布】`);
  const ranges = [
    { label: '1-5k', min: 1, max: 5000 },
    { label: '5-10k', min: 5000, max: 10000 },
    { label: '10-20k', min: 10000, max: 20000 },
    { label: '20k+', min: 20000, max: Infinity }
  ];

  ranges.forEach(r => {
    const count = wins.filter(p => p >= r.min && p < r.max).length;
    console.log(`${r.label}: ${count}回`);
  });

  console.log(`\n【損失分布】`);
  const lossRanges = [
    { label: '0-5k', min: -5000, max: 0 },
    { label: '-5k~-10k', min: -10000, max: -5000 },
    { label: '-10k~-20k', min: -20000, max: -10000 },
    { label: '-20k以下', min: -Infinity, max: -20000 }
  ];

  lossRanges.forEach(r => {
    const count = losses.filter(p => p > r.min && p <= r.max).length;
    console.log(`${r.label}: ${count}回`);
  });
}

const datasets = [
  { name: 'Dataset A', file: 'A.csv' },
  { name: 'Dataset B', file: 'B.csv' },
  { name: 'Dataset C', file: 'C.csv' }
];

datasets.forEach(ds => {
  const filePath = path.join(__dirname, '../public/demo', ds.file);
  analyzeCsv(filePath, ds.name);
});
