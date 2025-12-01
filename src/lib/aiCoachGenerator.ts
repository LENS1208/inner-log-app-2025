import type { AiCoachComment } from '../components/common/AiCoachMessage';

export type CoachAvatarType = 'teacher' | 'beginner' | 'advanced';

interface MetricsData {
  gross?: number;
  winRate?: number;
  profitFactor?: number;
  maxDD?: number;
  avgWin?: number;
  avgLoss?: number;
  totalTrades?: number;
  wins?: number;
  losses?: number;
  avgPips?: number;
  [key: string]: any;
}

/**
 * アバタータイプに応じたテキストスタイルを適用
 */
function applyCoachStyle(
  baseText: string,
  coachType: CoachAvatarType
): string {
  switch (coachType) {
    case 'teacher':
      // 丁寧語、形式的
      return baseText;

    case 'beginner':
      // 優しく、専門用語を避ける
      return baseText
        .replace(/プロフィットファクター|PF/g, '利益効率')
        .replace(/ドローダウン|DD/g, '最大下落幅')
        .replace(/推奨します/g, 'おすすめします')
        .replace(/です。/g, 'ですよ。')
        .replace(/ます。/g, 'ましょう。');

    case 'advanced':
      // 戦略的、専門用語OK
      return baseText
        .replace(/利益が出ています/g, '優位性があります')
        .replace(/安定しています/g, 'エッジを保っています')
        .replace(/控えることを推奨/g, 'エクスポージャーを削減');

    default:
      return baseText;
  }
}

/**
 * ダッシュボード用のAIコメント生成
 */
export function generateDashboardComment(
  metrics: MetricsData,
  coachType: CoachAvatarType = 'teacher'
): AiCoachComment {
  const { gross = 0, winRate = 0, profitFactor = 0, maxDD = 0, totalTrades = 0 } = metrics;

  let insight = '';
  let attention = '';
  let nextAction = '';

  // Insight
  if (gross > 0) {
    insight = `合計損益が${Math.round(gross).toLocaleString('ja-JP')}円とプラスを維持しています。勝率${(winRate * 100).toFixed(1)}%、PF${profitFactor.toFixed(2)}で安定した成績です。`;
  } else {
    insight = `現在、合計損益は${Math.round(gross).toLocaleString('ja-JP')}円です。${totalTrades}回の取引データから改善ポイントを分析しています。`;
  }

  // Attention
  if (maxDD > Math.abs(gross) * 0.5) {
    attention = `最大ドローダウンが${Math.round(maxDD).toLocaleString('ja-JP')}円と大きめです。リスク管理の見直しが必要です。`;
  } else if (winRate < 0.4) {
    attention = `勝率が${(winRate * 100).toFixed(1)}%とやや低めです。損小利大を意識したトレードを心がけましょう。`;
  } else if (profitFactor < 1.2) {
    attention = `プロフィットファクターが${profitFactor.toFixed(2)}です。利益を伸ばす工夫が求められます。`;
  } else {
    attention = '現在の成績は安定しています。このペースを維持していきましょう。';
  }

  // Next Action
  if (gross > 0) {
    nextAction = '得意な時間帯・通貨ペアをレポートで確認し、そこに集中することから始めましょう。';
  } else {
    nextAction = 'まずは時間軸・通貨ペア別のレポートで勝ちパターンを見つけることに注力しましょう。';
  }

  return {
    insight: applyCoachStyle(insight, coachType),
    attention: applyCoachStyle(attention, coachType),
    nextAction: applyCoachStyle(nextAction, coachType),
  };
}

/**
 * 資金管理ページ用のAIコメント生成
 */
export function generateBalanceComment(
  metrics: MetricsData,
  coachType: CoachAvatarType = 'teacher'
): AiCoachComment {
  const { gross = 0, maxDD = 0, profitFactor = 0 } = metrics;

  let insight = '資金推移は入出金を含めた口座残高の全体像を示しています。';
  let attention = '';
  let nextAction = '';

  if (gross > 0 && maxDD < gross * 0.3) {
    insight = `累積損益は${Math.round(gross).toLocaleString('ja-JP')}円で、DDも${Math.round(maxDD).toLocaleString('ja-JP')}円と抑えられています。資金管理は良好です。`;
    attention = 'この調子を維持しながら、さらなる利益の積み上げを目指しましょう。';
    nextAction = '勝ちパターンの通貨ペア・時間帯に集中し、ロットサイズの最適化を検討してください。';
  } else if (maxDD > Math.abs(gross)) {
    insight = `最大DDが${Math.round(maxDD).toLocaleString('ja-JP')}円と累積損益を上回っています。`;
    attention = 'リスク管理の改善が急務です。1トレードあたりのリスクを見直してください。';
    nextAction = 'まずは損切り幅を口座資金の1〜2%以内に抑えることから始めましょう。';
  } else {
    insight = `現在の累積損益は${Math.round(gross).toLocaleString('ja-JP')}円です。`;
    attention = 'DDが発生している期間や要因を分析し、同じミスを繰り返さないようにしましょう。';
    nextAction = 'DD発生時の取引パターンを確認し、そのパターンを避ける戦略を立てましょう。';
  }

  return {
    insight: applyCoachStyle(insight, coachType),
    attention: applyCoachStyle(attention, coachType),
    nextAction: applyCoachStyle(nextAction, coachType),
  };
}

/**
 * 時間軸分析用のAIコメント生成
 */
export function generateTimeAxisComment(
  metrics: MetricsData,
  coachType: CoachAvatarType = 'teacher'
): AiCoachComment {
  const { bestTime = '', worstTime = '', bestTimeProfit = 0, worstTimeProfit = 0 } = metrics;

  let insight = '時間帯別の分析結果から、あなたの得意な時間帯が見えてきました。';
  let attention = '';
  let nextAction = '';

  if (bestTime && bestTimeProfit > 0) {
    insight = `${bestTime}の時間帯で最も良い成績（+${Math.round(bestTimeProfit).toLocaleString('ja-JP')}円）を出しています。`;
    attention = worstTime && worstTimeProfit < 0
      ? `一方、${worstTime}では${Math.round(worstTimeProfit).toLocaleString('ja-JP')}円の損失が出ています。`
      : '他の時間帯でも同様のパターンを探してみましょう。';
    nextAction = `当面は${bestTime}に集中し、${worstTime ? worstTime + 'は監視のみに切り替える' : '得意時間の取引を増やす'}ことを推奨します。`;
  } else {
    insight = '時間帯別のデータがまだ少ないため、もう少しトレードを重ねて傾向を見ていきましょう。';
    attention = '各時間帯で最低10回以上のトレードがあると、より正確な分析が可能になります。';
    nextAction = '様々な時間帯でトレードを試し、自分に合った時間帯を見つけましょう。';
  }

  return {
    insight: applyCoachStyle(insight, coachType),
    attention: applyCoachStyle(attention, coachType),
    nextAction: applyCoachStyle(nextAction, coachType),
  };
}

/**
 * 通貨ペア分析用のAIコメント生成
 */
export function generateCurrencyPairComment(
  metrics: MetricsData,
  coachType: CoachAvatarType = 'teacher'
): AiCoachComment {
  const { bestPair = '', worstPair = '', bestPairProfit = 0, worstPairProfit = 0 } = metrics;

  let insight = '通貨ペア別の成績から、得意な通貨ペアが明確になってきました。';
  let attention = '';
  let nextAction = '';

  if (bestPair && bestPairProfit > 0) {
    insight = `${bestPair}で最も良い成績（+${Math.round(bestPairProfit).toLocaleString('ja-JP')}円）を出しています。`;

    if (coachType === 'advanced') {
      insight += ` この通貨ペアの高ボラティリティ環境で優位性を発揮しています。`;
    }

    attention = worstPair && worstPairProfit < 0
      ? `${worstPair}では${Math.round(worstPairProfit).toLocaleString('ja-JP')}円の損失が発生しています。`
      : 'その他の通貨ペアでも同様のパターンが使えるか検証してみましょう。';

    nextAction = `${bestPair}での取引を中心に据え、${worstPair ? worstPair + 'は当面控える' : '他のペアへの展開を慎重に'}ことを推奨します。`;
  } else {
    insight = '通貨ペア別のデータがまだ少ないため、各ペアの特性を理解するためにさらにデータを蓄積しましょう。';
    attention = '各通貨ペアには独自のボラティリティや動きの特徴があります。';
    nextAction = 'まずは1〜2つの通貨ペアに絞り、その特性を深く理解することから始めましょう。';
  }

  return {
    insight: applyCoachStyle(insight, coachType),
    attention: applyCoachStyle(attention, coachType),
    nextAction: applyCoachStyle(nextAction, coachType),
  };
}

/**
 * リスク管理用のAIコメント生成
 */
export function generateRiskManagementComment(
  metrics: MetricsData,
  coachType: CoachAvatarType = 'teacher'
): AiCoachComment {
  const { maxDD = 0, avgLoss = 0, avgWin = 0, riskReward = 0 } = metrics;

  let insight = 'リスク管理指標から、あなたの取引のリスクプロファイルを分析しました。';
  let attention = '';
  let nextAction = '';

  const rr = avgWin && avgLoss ? Math.abs(avgWin / avgLoss) : 0;

  if (rr > 1.5) {
    insight = `平均勝ちが${Math.round(avgWin).toLocaleString('ja-JP')}円、平均負けが${Math.round(avgLoss).toLocaleString('ja-JP')}円で、リスクリワード比は${rr.toFixed(2)}と良好です。`;
    attention = 'この比率を維持しながら、勝率を少しずつ上げていくことで成績が安定します。';
    nextAction = '利確を早めすぎていないか、定期的にトレードを振り返りましょう。';
  } else if (rr < 1.0) {
    insight = `現在、平均勝ちが${Math.round(avgWin).toLocaleString('ja-JP')}円、平均負けが${Math.round(Math.abs(avgLoss)).toLocaleString('ja-JP')}円です。`;
    attention = 'リスクリワード比が1.0未満のため、高い勝率が必要になります。損小利大を目指しましょう。';
    nextAction = '損切りを早く、利確を遅くする訓練を意識的に行いましょう。';
  } else {
    insight = `リスクリワード比は${rr.toFixed(2)}程度です。`;
    attention = 'バランスは悪くありませんが、さらに改善の余地があります。';
    nextAction = '利確ポイントを見直し、トレンドが続く場合は利を伸ばす工夫をしてみましょう。';
  }

  return {
    insight: applyCoachStyle(insight, coachType),
    attention: applyCoachStyle(attention, coachType),
    nextAction: applyCoachStyle(nextAction, coachType),
  };
}

/**
 * トレード戦略用のAIコメント生成
 */
export function generateStrategyComment(
  metrics: MetricsData,
  coachType: CoachAvatarType = 'teacher'
): AiCoachComment {
  const { bestStrategy = '', worstStrategy = '', bestStrategyProfit = 0, worstStrategyProfit = 0 } = metrics;

  let insight = '戦略タグ別の分析から、効果的な戦略が見えてきました。';
  let attention = '';
  let nextAction = '';

  if (bestStrategy && bestStrategyProfit > 0) {
    insight = `${bestStrategy}戦略で最も良い成績（+${Math.round(bestStrategyProfit).toLocaleString('ja-JP')}円）を記録しています。`;
    attention = worstStrategy && worstStrategyProfit < 0
      ? `一方、${worstStrategy}戦略では${Math.round(worstStrategyProfit).toLocaleString('ja-JP')}円の損失です。`
      : 'この戦略をさらに洗練させていきましょう。';
    nextAction = `${bestStrategy}戦略に集中し、エントリー・決済のルールを文書化して再現性を高めましょう。`;
  } else {
    insight = '戦略別のデータが蓄積中です。各戦略の有効性を見極めるため、継続的に記録しましょう。';
    attention = '戦略タグを一貫して記録することで、より正確な分析が可能になります。';
    nextAction = 'トレード時に必ず戦略タグを付け、どの戦略が機能しているかを追跡しましょう。';
  }

  return {
    insight: applyCoachStyle(insight, coachType),
    attention: applyCoachStyle(attention, coachType),
    nextAction: applyCoachStyle(nextAction, coachType),
  };
}

/**
 * Drawer専用：日別取引詳細
 */
export function generateDayDetailComment(
  metrics: MetricsData,
  coachType: CoachAvatarType = 'teacher'
): AiCoachComment {
  const { dayProfit = 0, wins = 0, losses = 0, dateStr = '' } = metrics;

  let insight = '';
  let attention = '';
  let nextAction = '';

  if (dayProfit > 0) {
    insight = `${dateStr}は+${Math.round(dayProfit).toLocaleString('ja-JP')}円の利益日でした。勝ち${wins}回、負け${losses}回です。`;
    attention = 'この日の勝ちパターン（時間帯・通貨ペア・戦略）を記録しておきましょう。';
    nextAction = '成功したトレードの共通点をノートに書き出し、再現性を高めましょう。';
  } else if (dayProfit < 0) {
    insight = `${dateStr}は${Math.round(dayProfit).toLocaleString('ja-JP')}円の損失日でした。`;
    attention = '損失の原因（エントリータイミング・損切りの遅れなど）を振り返りましょう。';
    nextAction = '同じミスを繰り返さないよう、この日の教訓をメモしておきましょう。';
  } else {
    insight = `${dateStr}はプラスマイナスゼロの日でした。`;
    attention = '利益を出せなかった要因を分析し、次に活かしましょう。';
    nextAction = 'エントリー条件を見直し、より確度の高い場面だけに絞りましょう。';
  }

  return {
    insight: applyCoachStyle(insight, coachType),
    attention: applyCoachStyle(attention, coachType),
    nextAction: applyCoachStyle(nextAction, coachType),
  };
}

/**
 * Drawer専用：DDイベント詳細
 */
export function generateDDEventComment(
  metrics: MetricsData,
  coachType: CoachAvatarType = 'teacher'
): AiCoachComment {
  const { ddAmount = 0, duration = 0, tradeCount = 0, topPair = '', topStrategy = '' } = metrics;

  let insight = `このDDは${Math.round(ddAmount).toLocaleString('ja-JP')}円、期間${duration}日、関与取引${tradeCount}件です。`;
  let attention = '';
  let nextAction = '';

  if (topPair && topStrategy) {
    insight += ` 主に${topPair}での${topStrategy}戦略による損失です。`;
    attention = 'この通貨ペアと戦略の組み合わせは現在の相場環境に合っていない可能性があります。';
    nextAction = `${topPair}での${topStrategy}は一時休止し、他の通貨ペア・戦略で様子を見ましょう。`;
  } else {
    attention = 'DD発生時は複数の要因が重なっているケースが多いです。';
    nextAction = 'この期間のトレード日誌を見返し、共通するミスや相場環境の変化を確認しましょう。';
  }

  return {
    insight: applyCoachStyle(insight, coachType),
    attention: applyCoachStyle(attention, coachType),
    nextAction: applyCoachStyle(nextAction, coachType),
  };
}

/**
 * Drawer専用：勝ち/負け詳細
 */
export function generateWinLossDrawerComment(
  kind: 'WIN' | 'LOSS',
  metrics: MetricsData,
  coachType: CoachAvatarType = 'teacher'
): AiCoachComment {
  const { count = 0, totalAmount = 0, avgAmount = 0, avgPips = 0 } = metrics;

  let insight = '';
  let attention = '';
  let nextAction = '';

  if (kind === 'WIN') {
    insight = `勝ちトレードは${count}回、合計+${Math.round(totalAmount).toLocaleString('ja-JP')}円、平均+${Math.round(avgAmount).toLocaleString('ja-JP')}円です。`;
    attention = '勝ちパターンの共通点（通貨ペア・時間帯・戦略）を見つけることが重要です。';
    nextAction = 'この勝ちパターンをルール化し、再現性を高める工夫をしましょう。';
  } else {
    insight = `負けトレードは${count}回、合計${Math.round(totalAmount).toLocaleString('ja-JP')}円、平均${Math.round(avgAmount).toLocaleString('ja-JP')}円です。`;
    attention = '損切りが遅れていないか、ルールを守れているかを振り返りましょう。';
    nextAction = '負けトレードの共通点を洗い出し、同じミスを繰り返さないようにしましょう。';
  }

  return {
    insight: applyCoachStyle(insight, coachType),
    attention: applyCoachStyle(attention, coachType),
    nextAction: applyCoachStyle(nextAction, coachType),
  };
}

interface TimeSlotLossStreakData {
  timeSlotName: string;
  totalTrades: number;
  sequenceCount: number;
  maxStreak: number;
  totalLoss: number;
  topPair: string;
  topStrategy: string;
  topWeekday: string;
}

export function generateTimeSlotLossStreakComment(
  data: TimeSlotLossStreakData,
  coachType: CoachAvatarType = 'teacher'
): { insight: string; warning: string; nextStep: string } {
  const { timeSlotName, sequenceCount, maxStreak, totalLoss, topPair, topStrategy, topWeekday } = data;

  let insight = '';
  let warning = '';
  let nextStep = '';

  if (sequenceCount === 0) {
    insight = `${timeSlotName}では連敗シーケンスが発生していません。この時間帯は比較的安定しているようです。`;
    warning = '今後もこの時間帯の優位性を維持できるよう、トレード記録を続けましょう。';
    nextStep = 'この時間帯の勝ちパターンを分析し、他の時間帯にも応用できないか検討してください。';
  } else if (maxStreak <= 3) {
    insight = `${timeSlotName}では${sequenceCount}回の連敗シーケンスが発生しており、最大${maxStreak}連敗です。小規模な連敗が散発的に起きています。`;
    warning = topPair ? `特に${topPair}での連敗が目立ちます。この通貨ペアの特性を再確認しましょう。` : '通貨ペアごとの傾向を確認し、相性の悪いペアを避けることを検討してください。';
    nextStep = topStrategy ? `${topStrategy}戦略での連敗が多いため、この時間帯での有効性を見直しましょう。` : 'エントリー条件を厳格化し、質の高いセットアップのみでトレードすることを推奨します。';
  } else if (maxStreak <= 6) {
    insight = `${timeSlotName}では${sequenceCount}回の連敗シーケンスがあり、最大${maxStreak}連敗と中程度のリスクがあります。合計${Math.abs(totalLoss).toLocaleString()}円の損失が発生しています。`;
    warning = topWeekday ? `${topWeekday}曜日 × ${timeSlotName}の組み合わせで連敗が集中しています。この条件下では特に慎重になりましょう。` : 'この時間帯での取引条件を見直す必要があります。';
    nextStep = 'ロットサイズを一時的に縮小するか、この時間帯の取引回数を減らすことを検討してください。連敗が続く場合は一旦取引を控えることも選択肢です。';
  } else {
    insight = `${timeSlotName}では${sequenceCount}回の連敗シーケンスがあり、最大${maxStreak}連敗と深刻な問題があります。合計${Math.abs(totalLoss).toLocaleString()}円の大きな損失が発生しています。`;
    warning = `この時間帯は現在のアプローチと相性が悪い可能性が高いです。${topPair}、${topStrategy}での連敗が顕著です。`;
    nextStep = 'この時間帯での取引を一時的に停止し、トレード記録を徹底的に分析してください。市場環境の変化や自身のトレードスタイルとの不一致を見極めましょう。';
  }

  return {
    insight: applyCoachStyle(insight, coachType),
    warning: applyCoachStyle(warning, coachType),
    nextStep: applyCoachStyle(nextStep, coachType),
  };
}
