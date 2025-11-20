import type { TradeRow } from '../types/evaluation.types';

export type EquityPoint = {
  index: number;
  equity: number;
  peak: number;
  dd: number;
};

export type LossStreakProb = {
  n: number;
  prob: number;
};

export function computeEquityCurve(trades: TradeRow[], initialCapital: number = 100000): EquityPoint[] {
  const curve: EquityPoint[] = [];
  let equity = initialCapital;
  let peak = initialCapital;

  trades.forEach((trade, index) => {
    const pnl = typeof trade.pnl === 'number' ? trade.pnl : parseFloat(String(trade.pnl || 0));
    equity += pnl;
    if (equity > peak) peak = equity;
    const dd = peak - equity;

    curve.push({
      index,
      equity,
      peak,
      dd,
    });
  });

  return curve;
}

export function computeLossStreakProbabilities(trades: TradeRow[]): LossStreakProb[] {
  const losses = trades.filter(t => {
    const pnl = typeof t.pnl === 'number' ? t.pnl : parseFloat(String(t.pnl || 0));
    return pnl < 0;
  });

  const lossRate = losses.length / trades.length;

  const streaks: LossStreakProb[] = [];
  for (let n = 2; n <= 8; n++) {
    const prob = Math.pow(lossRate, n) * 100;
    streaks.push({ n, prob });
  }

  return streaks;
}

export function findLongestLossStreak(trades: TradeRow[]): number {
  let maxStreak = 0;
  let currentStreak = 0;

  trades.forEach(trade => {
    const pnl = typeof trade.pnl === 'number' ? trade.pnl : parseFloat(String(trade.pnl || 0));
    if (pnl < 0) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  });

  return maxStreak;
}
