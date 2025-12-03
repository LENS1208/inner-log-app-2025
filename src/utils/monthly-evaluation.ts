import type { Trade } from '../lib/types';

export interface EvaluationScore {
  overall: number;
  entry_skill: number;
  drawdown_control: number;
  risk_reward: number;
  risk_management: number;
  profit_stability: number;
}

export interface EvaluationDetails {
  entry_skill: {
    win_rate: number;
    session_match_rate: number;
    overall_rating: string;
  };
  drawdown_control: {
    max_dd: number;
    dd_ratio: number;
    recovery: string;
  };
  risk_reward: {
    rr_ratio: number;
    avg_profit: number;
    avg_loss: number;
  };
  risk_management: {
    loss_cut_rate: number;
    max_loss: number;
    risk_rating: string;
  };
  profit_stability: {
    monthly_positive_rate: number;
    avg_monthly_profit: number;
    positive_months_ratio: number;
  };
}

export interface MonthlyEvaluation {
  scores: EvaluationScore;
  details: EvaluationDetails;
  level: string;
}

function calculateWinRate(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  const wins = trades.filter(t => (t.profit || 0) > 0).length;
  return (wins / trades.length) * 100;
}

function calculateMaxDrawdown(trades: Trade[]): { amount: number; ratio: number } {
  let peak = 0;
  let maxDD = 0;
  let runningProfit = 0;

  for (const trade of trades) {
    runningProfit += trade.profit || 0;
    if (runningProfit > peak) {
      peak = runningProfit;
    }
    const dd = peak - runningProfit;
    if (dd > maxDD) {
      maxDD = dd;
    }
  }

  const totalProfit = trades.reduce((sum, t) => sum + Math.abs(t.profit || 0), 0);
  const ddRatio = totalProfit > 0 ? (maxDD / totalProfit) * 100 : 0;

  return { amount: maxDD, ratio: ddRatio };
}

function calculateRiskReward(trades: Trade[]): { ratio: number; avgWin: number; avgLoss: number } {
  const wins = trades.filter(t => (t.profit || 0) > 0);
  const losses = trades.filter(t => (t.profit || 0) < 0);

  const totalWin = wins.reduce((sum, t) => sum + (t.profit || 0), 0);
  const totalLoss = Math.abs(losses.reduce((sum, t) => sum + (t.profit || 0), 0));

  const avgWin = wins.length > 0 ? totalWin / wins.length : 0;
  const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;
  const ratio = avgLoss > 0 ? avgWin / avgLoss : 0;

  return { ratio, avgWin, avgLoss };
}

function calculateLossCutRate(trades: Trade[]): number {
  const losses = trades.filter(t => (t.profit || 0) < 0);
  const largeLosses = losses.filter(t => {
    const avgLoss = losses.reduce((sum, l) => sum + Math.abs(l.profit || 0), 0) / losses.length;
    return Math.abs(t.profit || 0) <= avgLoss * 1.5;
  });

  if (losses.length === 0) return 100;
  return (largeLosses.length / losses.length) * 100;
}

function getSessionMatchRate(trades: Trade[]): number {
  // Simplified: assume trades during good time frames
  // In reality, this should check against profitable time slots
  const goodTimes = trades.filter(t => {
    const hour = new Date(t.open_time).getHours();
    return hour >= 9 && hour <= 16; // Example: European session
  });

  return trades.length > 0 ? (goodTimes.length / trades.length) * 100 : 0;
}

function getRating(score: number): string {
  if (score >= 9) return '優秀';
  if (score >= 7) return '良好';
  if (score >= 5) return '普通';
  return '要改善';
}

/**
 * 総合評価スコアに基づいてトレーダーのレベルを判定
 *
 * 評価基準（0-10点）：
 * - S級（9.0+）：プロトレーダー - 完璧に近いパフォーマンス
 * - A級（7.5-8.9）：上級トレーダー - 優秀で安定した成績
 * - B級（6.0-7.4）：中級トレーダー - 基本を習得、改善の余地あり
 * - C級（4.0-5.9）：初級トレーダー - 発展途上、学習段階
 * - D級（-4.0）：入門トレーダー - 基礎習得が必要
 */
function getLevel(overallScore: number): string {
  if (overallScore >= 9.0) return 'S級：プロトレーダー';
  if (overallScore >= 7.5) return 'A級：上級トレーダー';
  if (overallScore >= 6.0) return 'B級：中級トレーダー';
  if (overallScore >= 4.0) return 'C級：初級トレーダー';
  return 'D級：入門トレーダー';
}

export function calculateMonthlyEvaluation(
  currentTrades: Trade[],
  allTrades: Trade[]
): MonthlyEvaluation {
  if (currentTrades.length === 0) {
    // Return default scores if no trades
    return {
      scores: {
        overall: 0,
        entry_skill: 0,
        drawdown_control: 0,
        risk_reward: 0,
        risk_management: 0,
        profit_stability: 0,
      },
      details: {
        entry_skill: {
          win_rate: 0,
          session_match_rate: 0,
          overall_rating: '要改善',
        },
        drawdown_control: {
          max_dd: 0,
          dd_ratio: 0,
          recovery: '要改善',
        },
        risk_reward: {
          rr_ratio: 0,
          avg_profit: 0,
          avg_loss: 0,
        },
        risk_management: {
          loss_cut_rate: 0,
          max_loss: 0,
          risk_rating: '要改善',
        },
        profit_stability: {
          monthly_positive_rate: 0,
          avg_monthly_profit: 0,
          positive_months_ratio: 0,
        },
      },
      level: 'D級：入門トレーダー',
    };
  }

  const winRate = calculateWinRate(currentTrades);
  const sessionMatchRate = getSessionMatchRate(currentTrades);
  const { amount: maxDD, ratio: ddRatio } = calculateMaxDrawdown(currentTrades);
  const { ratio: rrRatio, avgWin, avgLoss } = calculateRiskReward(currentTrades);
  const lossCutRate = calculateLossCutRate(currentTrades);

  const maxLoss = Math.max(...currentTrades.map(t => Math.abs(t.profit || 0)));
  const totalProfit = currentTrades.reduce((sum, t) => sum + (t.profit || 0), 0);

  // Calculate monthly stats from all trades
  const monthlyProfits = new Map<string, number>();
  allTrades.forEach(t => {
    const month = t.close_time.substring(0, 7);
    const current = monthlyProfits.get(month) || 0;
    monthlyProfits.set(month, current + (t.profit || 0));
  });

  const positiveMonths = Array.from(monthlyProfits.values()).filter(p => p > 0).length;
  const totalMonths = monthlyProfits.size;
  const avgMonthlyProfit = totalMonths > 0
    ? Array.from(monthlyProfits.values()).reduce((sum, p) => sum + p, 0) / totalMonths
    : 0;

  // Score calculations (0-10 scale)
  const entryScore = Math.min(10, (winRate / 10) + (sessionMatchRate / 20));
  const drawdownScore = Math.min(10, 10 - (ddRatio / 2));
  const rrScore = Math.min(10, rrRatio * 3);
  const riskMgmtScore = Math.min(10, (lossCutRate / 10));
  const stabilityScore = totalMonths > 0 ? Math.min(10, (positiveMonths / totalMonths) * 10) : 0;

  const overallScore = (entryScore + drawdownScore + rrScore + riskMgmtScore + stabilityScore) / 5;

  return {
    scores: {
      overall: Math.round(overallScore * 10) / 10,
      entry_skill: Math.round(entryScore * 10) / 10,
      drawdown_control: Math.round(drawdownScore * 10) / 10,
      risk_reward: Math.round(rrScore * 10) / 10,
      risk_management: Math.round(riskMgmtScore * 10) / 10,
      profit_stability: Math.round(stabilityScore * 10) / 10,
    },
    details: {
      entry_skill: {
        win_rate: Math.round(winRate * 10) / 10,
        session_match_rate: Math.round(sessionMatchRate),
        overall_rating: getRating(entryScore),
      },
      drawdown_control: {
        max_dd: Math.round(maxDD),
        dd_ratio: Math.round(ddRatio * 10) / 10,
        recovery: getRating(drawdownScore),
      },
      risk_reward: {
        rr_ratio: Math.round(rrRatio * 100) / 100,
        avg_profit: Math.round(avgWin),
        avg_loss: Math.round(avgLoss),
      },
      risk_management: {
        loss_cut_rate: Math.round(lossCutRate * 10) / 10,
        max_loss: Math.round(maxLoss),
        risk_rating: getRating(riskMgmtScore),
      },
      profit_stability: {
        monthly_positive_rate: totalMonths > 0 ? Math.round((positiveMonths / totalMonths) * 1000) / 10 : 0,
        avg_monthly_profit: Math.round(avgMonthlyProfit),
        positive_months_ratio: totalMonths > 0 ? Math.round((positiveMonths / totalMonths) * 1000) / 10 : 0,
      },
    },
    level: getLevel(overallScore),
  };
}
