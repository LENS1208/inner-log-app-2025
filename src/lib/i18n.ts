export const UI_TEXT = {
  trade: '取引',
  trades: '取引',
  profit: '損益',
  totalProfit: '総損益',
  cumulativeProfit: '累積損益',
  averageProfit: '平均損益',
  netProfit: '損益合計',
  grossProfit: '総利益',
  grossLoss: '総損失',
  profitBreakdown: '損益の内訳',
  profitHistogram: '損益ヒストグラム',
  win: '勝ち',
  loss: '負け',
  winRate: '勝率',
  winLossBreakdown: '勝敗内訳',
  profitFactor: 'プロフィットファクター',
  profitFactorShort: 'PF',
  expectancy: '期待値',
  drawdown: 'ドローダウン',
  maxDrawdown: '最大ドローダウン',
  tradeList: '取引一覧',
  tradeDetail: '取引の詳細',
  tradeDiary: '取引日記',
  winOnly: '勝ちのみ',
  lossOnly: '負けのみ',
  noTrades: '取引なし',
  count: '件',
  times: '回',
  currency: '円',
  weeklyProfit: '週ごとの損益',
  monthlyTotal: '月合計',
  cost: 'コスト',
  side: 'ポジション',
  symbol: '通貨ペア',
  position: 'ポジション',
  long: '買い',
  short: '売り',
} as const;

export function formatCurrency(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${Math.round(value).toLocaleString('ja-JP')}円`;
}

export function formatCurrencySimple(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${Math.round(value).toLocaleString('ja-JP')}円`;
}

export function formatWinRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export function formatCount(count: number, unit: keyof typeof UI_TEXT = 'count'): string {
  return `${count.toLocaleString('ja-JP')}${UI_TEXT[unit]}`;
}
