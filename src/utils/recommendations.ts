import type { TradeMetrics } from '../types/evaluation.types';

export type Action = {
  action: string;
  expectedImprovement: string;
  difficulty: 'Low' | 'Mid' | 'High';
  priority: number;
  reason: string;
};

export function generateRecommendations(metrics: TradeMetrics): Action[] {
  const actions: Action[] = [];

  if (metrics.pf < 1.5) {
    actions.push({
      action: 'TP/SL比率を1.6に調整',
      expectedImprovement: 'PF +0.3',
      difficulty: 'Low',
      priority: 9,
      reason: '現在のPFが低い。利確比率の調整で改善が期待できる。',
    });
  }

  if (metrics.maxdd > 15) {
    actions.push({
      action: '1Rを初期資金の1.5%に制限',
      expectedImprovement: 'DD -3%',
      difficulty: 'Mid',
      priority: 8,
      reason: '最大DDが大きい。ポジションサイズの見直しが必要。',
    });
  }

  if (metrics.winrate < 0.5) {
    actions.push({
      action: '時間帯フィルターの導入',
      expectedImprovement: '勝率 +5%',
      difficulty: 'Low',
      priority: 7,
      reason: '勝率が低い。特定の時間帯を避けることで改善可能。',
    });
  }

  actions.push({
    action: '損切りを厳格化',
    expectedImprovement: 'PF +0.15',
    difficulty: 'Mid',
    priority: 6,
    reason: '損失の平均が大きい傾向。損切りルールの見直しが有効。',
  });

  actions.push({
    action: '3連敗後は1日休む',
    expectedImprovement: 'メンタル改善',
    difficulty: 'High',
    priority: 5,
    reason: '連敗後のリベンジトレードで損失拡大傾向あり。',
  });

  return actions.sort((a, b) => b.priority - a.priority);
}

export type Alert = {
  type: 'warning' | 'danger';
  message: string;
};

export function generateAlerts(metrics: TradeMetrics, maxDailyDD: number = 5): Alert[] {
  const alerts: Alert[] = [];

  if (maxDailyDD > 5) {
    alerts.push({
      type: 'danger',
      message: `日次DDが-${maxDailyDD.toFixed(1)}%を超えています`,
    });
  }

  if (metrics.pf < 1.0) {
    alerts.push({
      type: 'danger',
      message: 'PFが1.0未満です。戦略の見直しが必要です。',
    });
  }

  if (metrics.winrate < 0.4) {
    alerts.push({
      type: 'warning',
      message: '勝率が40%未満です。エントリー条件の見直しを推奨。',
    });
  }

  return alerts;
}
