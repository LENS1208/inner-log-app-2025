/**
 * ユーザーのトレードデータからプロファイル特性を分析
 */

export interface UserProfile {
  primaryIssue: 'risk_management' | 'entry_timing' | 'exit_strategy' | 'emotional_control' | 'consistency' | 'balanced';
  tradeStyle: 'high_frequency' | 'selective' | 'balanced';
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  strengthAreas: string[];
  weaknessAreas: string[];
  hasWinningPattern: boolean;
  hasLosingPattern: boolean;
  needsRiskFocus: boolean;
  needsMentalFocus: boolean;
}

export interface CategoryRecommendation {
  categories: string[];
  categoryDescriptions: Record<string, string>;
  rationale: string;
}

export function analyzeUserProfile(tradesData: any): UserProfile {
  const trades = tradesData.trades || [];
  const summary = tradesData.summary || {};
  const totalTrades = summary.totalTrades || trades.length;
  const winRate = summary.winRate || 0;
  const avgWin = summary.avgWin || 0;
  const avgLoss = summary.avgLoss || 0;
  const maxLotSize = summary.maxLotSize || 0;
  const avgLotSize = summary.avgLotSize || 0;
  const maxDrawdown = summary.maxDrawdown || 0;

  // 取引回数による経験レベル判定
  const experienceLevel = totalTrades < 20 ? 'beginner'
    : totalTrades < 100 ? 'intermediate'
    : 'advanced';

  // 取引スタイル判定
  const tradesPerDay = totalTrades / 30; // 概算
  const tradeStyle = tradesPerDay > 3 ? 'high_frequency'
    : tradesPerDay < 1 ? 'selective'
    : 'balanced';

  // 強み・弱点の分析
  const strengthAreas: string[] = [];
  const weaknessAreas: string[] = [];

  // エントリータイミングの評価
  if (winRate >= 0.55) {
    strengthAreas.push('entry_timing');
  } else if (winRate < 0.45) {
    weaknessAreas.push('entry_timing');
  }

  // 出口戦略の評価（R/R比）
  const rrRatio = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;
  if (rrRatio >= 1.5) {
    strengthAreas.push('exit_strategy');
  } else if (rrRatio < 1.0) {
    weaknessAreas.push('exit_strategy');
  }

  // リスク管理の評価
  const lotVariation = maxLotSize / (avgLotSize || 1);
  const needsRiskFocus = lotVariation > 2.5 || maxDrawdown > 0.15;
  if (lotVariation <= 1.5 && maxDrawdown <= 0.10) {
    strengthAreas.push('risk_management');
  } else if (needsRiskFocus) {
    weaknessAreas.push('risk_management');
  }

  // 感情コントロールの評価（連敗後のロット増加パターン）
  const streakPatterns = summary.streakPatterns || {};
  const afterLossStreak = streakPatterns.afterLossStreak || {};
  const lotIncreaseAfterLoss = afterLossStreak.avgLotIncrease || 0;
  const needsMentalFocus = lotIncreaseAfterLoss > 0.5;

  if (lotIncreaseAfterLoss <= 0.1) {
    strengthAreas.push('emotional_control');
  } else if (needsMentalFocus) {
    weaknessAreas.push('emotional_control');
  }

  // 一貫性の評価（セットアップ別の取引分布）
  const bySetup = summary.bySetup || {};
  const setupCount = Object.keys(bySetup).length;
  const hasWinningPattern = Object.values(bySetup as any).some((s: any) =>
    s.count >= 5 && s.winRate >= 0.6
  );
  const hasLosingPattern = Object.values(bySetup as any).some((s: any) =>
    s.count >= 3 && s.winRate <= 0.3
  );

  if (setupCount <= 3 && hasWinningPattern) {
    strengthAreas.push('consistency');
  } else if (setupCount > 5 || !hasWinningPattern) {
    weaknessAreas.push('consistency');
  }

  // 主要課題の判定
  let primaryIssue: UserProfile['primaryIssue'] = 'balanced';
  if (needsRiskFocus) {
    primaryIssue = 'risk_management';
  } else if (needsMentalFocus) {
    primaryIssue = 'emotional_control';
  } else if (weaknessAreas.includes('exit_strategy')) {
    primaryIssue = 'exit_strategy';
  } else if (weaknessAreas.includes('entry_timing')) {
    primaryIssue = 'entry_timing';
  } else if (weaknessAreas.includes('consistency')) {
    primaryIssue = 'consistency';
  }

  return {
    primaryIssue,
    tradeStyle,
    experienceLevel,
    strengthAreas,
    weaknessAreas,
    hasWinningPattern,
    hasLosingPattern,
    needsRiskFocus,
    needsMentalFocus
  };
}

export function recommendCategories(profile: UserProfile): CategoryRecommendation {
  const categories: string[] = [];
  const categoryDescriptions: Record<string, string> = {
    '全体像': '期間、取引回数、総損益、勝率の概要',
    '勝ちパターン': '成功しているセットアップ・通貨ペア・時間帯の分析',
    '負けパターン': '避けるべき状況やパターンの特定',
    'エントリー精度': 'タイミング、セットアップ選択の評価',
    '出口戦略': '利確・損切りの実行状況と改善点',
    'リスク管理': 'ロットサイズ、資金管理、最大DDの評価',
    'メンタル・規律': '感情制御、連敗後の行動、ルール遵守状況',
    '一貫性': 'トレードの安定性、再現性の評価',
    '伸びしろ': '最も改善余地が大きい領域と具体的な改善策'
  };

  // 必ず全体像から始める
  categories.push('全体像');

  let rationale = '';

  // 経験レベルと主要課題に基づいてカテゴリーを選択
  if (profile.experienceLevel === 'beginner') {
    // 初心者：基礎固め重視
    categories.push('エントリー精度', 'リスク管理', 'メンタル・規律');
    rationale = '取引経験が浅いため、基礎的な要素（エントリー、リスク管理、メンタル）を重点的に確認します。';
  } else if (profile.primaryIssue === 'risk_management') {
    // リスク管理に課題：リスク最優先
    categories.push('リスク管理', '勝ちパターン', '伸びしろ');
    rationale = 'ロットサイズの変動が大きいため、リスク管理を最優先で確認し、安定した勝ちパターンの構築を目指します。';
  } else if (profile.primaryIssue === 'exit_strategy') {
    // 出口戦略に課題：エントリーの強みと出口の改善
    if (profile.strengthAreas.includes('entry_timing')) {
      categories.push('エントリー精度', '出口戦略', '伸びしろ');
      rationale = 'エントリーは良好ですが、利確・損切りに改善の余地があります。出口戦略の最適化に焦点を当てます。';
    } else {
      categories.push('出口戦略', 'エントリー精度', '伸びしろ');
      rationale = '利確・損切りの実行に課題があるため、出口戦略の改善を優先します。';
    }
  } else if (profile.primaryIssue === 'emotional_control') {
    // メンタルに課題：感情パターン分析
    categories.push('メンタル・規律', '勝ちパターン', '伸びしろ');
    rationale = '連敗後のロット増加など感情的な取引が見られるため、メンタル面の強化と冷静な判断を重視します。';
  } else if (profile.hasWinningPattern && profile.strengthAreas.length >= 3) {
    // 安定期：最適化フェーズ
    categories.push('勝ちパターン', '一貫性', '伸びしろ');
    rationale = '基本は安定しているため、勝ちパターンの深堀りと更なる効率化・最適化を目指します。';
  } else if (profile.hasLosingPattern) {
    // 負けパターンが明確：パターン分析重視
    categories.push('負けパターン', profile.needsRiskFocus ? 'リスク管理' : 'メンタル・規律', '伸びしろ');
    rationale = '避けるべきパターンが明確に見えるため、負けパターンの特定と回避策の構築を優先します。';
  } else {
    // バランス型：全体的な改善
    categories.push('勝ちパターン', '出口戦略', '伸びしろ');
    rationale = '全体的にバランスの取れたトレードですが、勝ちパターンの強化と出口戦略の最適化で更なる向上を目指します。';
  }

  return {
    categories,
    categoryDescriptions,
    rationale
  };
}
