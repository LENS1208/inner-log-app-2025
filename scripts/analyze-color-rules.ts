// 現在の色分けルールの分析と推奨ルールの提案

console.log(`===== リスク指標の色分けルール検証 =====\n`);

console.log(`【現在の実装】`);
console.log(`
1. リスクリワード比（RRR）
   現在: 固定で青（accent）
   説明: 1.0以上が望ましく、2.0以上で優秀
   問題: 値に応じた色分けがない

2. シャープレシオ
   現在: 条件付き色分けあり
   - >= 1.0: 緑（良好）
   - >= 0.5: 青（普通）
   - < 0.5: 赤（要改善）
   問題: マイナス値の扱いが不明確

3. ボラティリティ
   現在: 固定で青（accent）
   説明: 10%未満が安定、30%以上が高リスク
   問題: 値に応じた色分けがない

4. カルマー比
   現在: 固定で青（accent）
   説明: 0以上が合格、1.0以上が良好
   問題: 値に応じた色分けがない
`);

console.log(`\n【推奨ルール】\n`);

console.log(`1. リスクリワード比（RRR）`);
console.log(`   >= 2.0: 緑（優秀）`);
console.log(`   >= 1.0: 青（良好）`);
console.log(`   < 1.0: 赤（要改善）`);
console.log(`   理由: 1.0未満は平均損失が平均利益を上回る状態`);

console.log(`\n2. シャープレシオ`);
console.log(`   >= 1.0: 緑（良好）`);
console.log(`   >= 0: 青（普通）`);
console.log(`   < 0: 赤（損失状態）`);
console.log(`   理由: マイナスは平均損益がマイナス（損失）`);

console.log(`\n3. ボラティリティ`);
console.log(`   < 30%: 緑（低リスク）`);
console.log(`   30-100%: 青（中リスク）`);
console.log(`   >= 100%: 赤（高リスク）`);
console.log(`   理由: 30%未満が安定、100%以上は極めて不安定`);

console.log(`\n4. カルマー比`);
console.log(`   >= 1.0: 緑（優秀）`);
console.log(`   >= 0: 青（合格）`);
console.log(`   < 0: 赤（損失状態）`);
console.log(`   理由: マイナスは年率リターンがマイナス（損失）`);

console.log(`\n\n【データセット検証】\n`);

const datasets = [
  {
    name: 'A',
    rrr: 2.33,
    sharpe: 0.170,
    volatility: 121.17,
    calmar: 2.21
  },
  {
    name: 'B',
    rrr: 1.10,
    sharpe: -0.028,
    volatility: 126.37,
    calmar: -0.29
  },
  {
    name: 'C',
    rrr: 0.26,
    sharpe: -0.071,
    volatility: 641.69,
    calmar: -0.66
  }
];

function getColor(value: number, type: string): string {
  switch (type) {
    case 'rrr':
      if (value >= 2.0) return '緑（優秀）';
      if (value >= 1.0) return '青（良好）';
      return '赤（要改善）';

    case 'sharpe':
      if (value >= 1.0) return '緑（良好）';
      if (value >= 0) return '青（普通）';
      return '赤（損失）';

    case 'volatility':
      if (value < 30) return '緑（低リスク）';
      if (value < 100) return '青（中リスク）';
      return '赤（高リスク）';

    case 'calmar':
      if (value >= 1.0) return '緑（優秀）';
      if (value >= 0) return '青（合格）';
      return '赤（損失）';

    default:
      return '青';
  }
}

datasets.forEach(ds => {
  console.log(`Dataset ${ds.name}:`);
  console.log(`  RRR: ${ds.rrr.toFixed(2)} → ${getColor(ds.rrr, 'rrr')}`);
  console.log(`  シャープレシオ: ${ds.sharpe.toFixed(3)} → ${getColor(ds.sharpe, 'sharpe')}`);
  console.log(`  ボラティリティ: ${ds.volatility.toFixed(2)}% → ${getColor(ds.volatility, 'volatility')}`);
  console.log(`  カルマー比: ${ds.calmar.toFixed(2)} → ${getColor(ds.calmar, 'calmar')}`);
  console.log('');
});

console.log(`【結論】`);
console.log(`1. Dataset A/Bのボラティリティ120%台は「赤（高リスク）」で正しい`);
console.log(`2. Dataset Cは全指標で「赤」となり、データ異常を明確に示す`);
console.log(`3. 色分けルールを統一することで、問題点が一目で分かるようになる`);
