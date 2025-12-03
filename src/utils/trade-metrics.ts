import type { Trade } from '../lib/types';

export interface TradeMetrics {
  entryEfficiency: number | null;
  exitEfficiency: number | null;
  missedPotential: number | null;
  stopEfficiency: number | null;
  timeEfficiency: number | null;
  opportunityScore: number | null;
  rValue: number | null;
}

export interface TradeMetricsDisplay {
  entryEfficiency: string;
  exitEfficiency: string;
  missedPotential: string;
  stopEfficiency: string;
  timeEfficiency: string;
  opportunityScore: string;
  rValue: string;
}

/**
 * トレード1件の7項目の数値評価を計算
 */
export function computeTradeMetrics(trade: Trade): TradeMetrics {
  const pips = trade.pips || 0;
  const isWinning = pips > 0;
  const isLosing = pips < 0;

  // (1) エントリー効率
  let entryEfficiency: number | null = null;
  if (isWinning && trade.mfe_pips && trade.mfe_pips > 0) {
    entryEfficiency = (pips / trade.mfe_pips) * 100;
  }

  // (2) エグジット効率
  let exitEfficiency: number | null = null;
  if (isWinning && trade.max_possible_gain_pips && trade.max_possible_gain_pips > 0) {
    exitEfficiency = (pips / trade.max_possible_gain_pips) * 100;
  }

  // (3) もったいない指数
  let missedPotential: number | null = null;
  if (isWinning && trade.mfe_pips && trade.mfe_pips > 0) {
    missedPotential = ((trade.mfe_pips - pips) / trade.mfe_pips) * 100;
  }

  // (4) 損切り効率
  let stopEfficiency: number | null = null;
  if (isLosing && trade.mae_pips && trade.mae_pips < 0) {
    stopEfficiency = (Math.abs(pips) / Math.abs(trade.mae_pips)) * 100;
  }

  // (5) 時間効率
  let timeEfficiency: number | null = null;
  if (trade.openTime && trade.closeTime) {
    const openMs = new Date(trade.openTime).getTime();
    const closeMs = new Date(trade.closeTime).getTime();
    const holdMs = closeMs - openMs;
    const holdHours = holdMs / (1000 * 60 * 60);
    if (holdHours > 0) {
      timeEfficiency = pips / holdHours;
    }
  } else if (trade.holdTimeMin && trade.holdTimeMin > 0) {
    const holdHours = trade.holdTimeMin / 60;
    timeEfficiency = pips / holdHours;
  }

  // (6) 機会獲得率
  let opportunityScore: number | null = null;
  if (isWinning && trade.planned_tp_pips && trade.planned_tp_pips > 0) {
    opportunityScore = (pips / trade.planned_tp_pips) * 100;
  }

  // (7) R値
  let rValue: number | null = null;
  if (trade.sl && trade.openPrice) {
    const riskPips = Math.abs(trade.openPrice - trade.sl);
    if (riskPips > 0) {
      // pipsをriskPipsで割る（通貨ペアによる調整は省略、簡易版）
      rValue = pips / riskPips;
    }
  }

  return {
    entryEfficiency,
    exitEfficiency,
    missedPotential,
    stopEfficiency,
    timeEfficiency,
    opportunityScore,
    rValue,
  };
}

/**
 * 計算結果を表示用文字列に変換
 */
export function formatTradeMetrics(
  metrics: TradeMetrics,
  trade: Trade
): TradeMetricsDisplay {
  const pips = trade.pips || 0;
  const isWinning = pips > 0;
  const isLosing = pips < 0;

  // (1) エントリー効率
  let entryEfficiency = '対象外';
  if (isWinning && metrics.entryEfficiency !== null) {
    entryEfficiency = `${metrics.entryEfficiency.toFixed(1)}%`;
    if (metrics.entryEfficiency >= 80) {
      entryEfficiency += '（完璧なエントリー）';
    } else if (metrics.entryEfficiency >= 60) {
      entryEfficiency += '（良好なエントリー）';
    } else if (metrics.entryEfficiency >= 40) {
      entryEfficiency += '（エントリーは悪くないが、伸びの半分弱だけ）';
    } else {
      entryEfficiency += '（エントリータイミングに改善余地あり）';
    }
  } else if (isWinning) {
    entryEfficiency = 'データ不足';
  }

  // (2) エグジット効率
  let exitEfficiency = '対象外';
  if (isWinning && metrics.exitEfficiency !== null) {
    exitEfficiency = `${metrics.exitEfficiency.toFixed(1)}%`;
    if (metrics.exitEfficiency >= 80) {
      exitEfficiency += '（ほぼ理想的な利確）';
    } else if (metrics.exitEfficiency >= 50) {
      exitEfficiency += '（まずまずの利確）';
    } else if (metrics.exitEfficiency >= 30) {
      exitEfficiency += '（理論最大値の3割程度で利確）';
    } else {
      exitEfficiency += '（早すぎる利確）';
    }
  } else if (isWinning) {
    exitEfficiency = 'データ不足';
  }

  // (3) もったいない指数
  let missedPotential = '対象外';
  if (isWinning && metrics.missedPotential !== null) {
    missedPotential = `${metrics.missedPotential.toFixed(1)}%`;
    if (metrics.missedPotential >= 60) {
      missedPotential += '（伸びの大半を取り逃し）';
    } else if (metrics.missedPotential >= 40) {
      missedPotential += '（伸びの半分以上を取り逃し）';
    } else if (metrics.missedPotential >= 20) {
      missedPotential += '（まずまずの取得率）';
    } else {
      missedPotential += '（ほぼ最大値を取得）';
    }
  } else if (isWinning) {
    missedPotential = 'データ不足';
  }

  // (4) 損切り効率
  let stopEfficiency = '対象外';
  if (isLosing && metrics.stopEfficiency !== null) {
    stopEfficiency = `${metrics.stopEfficiency.toFixed(1)}%`;
    if (metrics.stopEfficiency <= 30) {
      stopEfficiency += '（素早い損切り）';
    } else if (metrics.stopEfficiency <= 50) {
      stopEfficiency += '（最悪よりマシだが、まだ早く切れた余地あり）';
    } else if (metrics.stopEfficiency <= 80) {
      stopEfficiency += '（損切りが遅い）';
    } else {
      stopEfficiency += '（ほぼ最悪の位置で損切り）';
    }
  } else if (isLosing) {
    stopEfficiency = 'データ不足';
  }

  // (5) 時間効率
  let timeEfficiency = '計算不可';
  if (metrics.timeEfficiency !== null) {
    timeEfficiency = `${metrics.timeEfficiency.toFixed(1)} pips/時間`;
  }

  // (6) 機会獲得率
  let opportunityScore = '計画なし';
  if (isWinning && metrics.opportunityScore !== null) {
    opportunityScore = `${metrics.opportunityScore.toFixed(1)}%`;
    if (metrics.opportunityScore >= 100) {
      opportunityScore += '（計画TP達成）';
    } else if (metrics.opportunityScore >= 80) {
      opportunityScore += '（計画のほぼ全て達成）';
    } else if (metrics.opportunityScore >= 50) {
      opportunityScore += '（計画TPの半分で決済）';
    } else {
      opportunityScore += '（計画の半分以下で決済）';
    }
  } else if (isWinning && trade.planned_tp_pips) {
    opportunityScore = 'データ不足';
  }

  // (7) R値
  let rValue = 'SL未設定';
  if (metrics.rValue !== null) {
    const sign = metrics.rValue >= 0 ? '+' : '';
    rValue = `${sign}${metrics.rValue.toFixed(2)}R`;
  }

  return {
    entryEfficiency,
    exitEfficiency,
    missedPotential,
    stopEfficiency,
    timeEfficiency,
    opportunityScore,
    rValue,
  };
}
