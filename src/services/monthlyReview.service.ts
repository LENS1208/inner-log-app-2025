import { supabase } from '../lib/supabase';
import type { Trade } from '../lib/types';
import { calculateMonthlyEvaluation, type MonthlyEvaluation } from '../utils/monthly-evaluation';

export interface MonthlyReviewData {
  id?: string;
  user_id: string;
  month: string;
  summary_profit: number;
  summary_pf: number;
  summary_win_rate: number;
  summary_trade_count: number;
  strengths: string[];
  weaknesses: string[];
  next_focus: string;
  ai_comment_kizuki: string;
  ai_comment_chuui: string;
  ai_comment_next_itte: string;
  coach_avatar: 'teacher' | 'beginner' | 'strategist';
  is_early_month: boolean;
  evaluation?: MonthlyEvaluation;
  created_at?: string;
  updated_at?: string;
}

interface MonthlyStats {
  totalProfit: number;
  pf: number;
  winRate: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  avgWin: number;
  avgLoss: number;
  bestPair: string;
  worstPair: string;
  bestTimeframe: string;
  bestSetup: string;
}

export class MonthlyReviewService {
  private static calculateMonthlyStats(trades: Trade[]): MonthlyStats {
    const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const wins = trades.filter(t => (t.profit || 0) > 0);
    const losses = trades.filter(t => (t.profit || 0) < 0);

    const totalWin = wins.reduce((sum, t) => sum + (t.profit || 0), 0);
    const totalLoss = Math.abs(losses.reduce((sum, t) => sum + (t.profit || 0), 0));

    const pf = totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? 999 : 0;
    const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;

    const pairStats = new Map<string, number>();
    trades.forEach(t => {
      const curr = pairStats.get(t.item) || 0;
      pairStats.set(t.item, curr + (t.profit || 0));
    });
    const sortedPairs = Array.from(pairStats.entries()).sort((a, b) => b[1] - a[1]);

    const timeStats = new Map<string, number>();
    trades.forEach(t => {
      if (t.open_time) {
        const hour = new Date(t.open_time).getHours();
        const timeframe = hour < 9 ? 'アジア' : hour < 16 ? 'ロンドン' : 'NY';
        const curr = timeStats.get(timeframe) || 0;
        timeStats.set(timeframe, curr + (t.profit || 0));
      }
    });
    const sortedTimes = Array.from(timeStats.entries()).sort((a, b) => b[1] - a[1]);

    const setupStats = new Map<string, number>();
    trades.forEach(t => {
      if (t.setup) {
        const curr = setupStats.get(t.setup) || 0;
        setupStats.set(t.setup, curr + (t.profit || 0));
      }
    });
    const sortedSetups = Array.from(setupStats.entries()).sort((a, b) => b[1] - a[1]);

    return {
      totalProfit,
      pf,
      winRate,
      tradeCount: trades.length,
      winCount: wins.length,
      lossCount: losses.length,
      avgWin: wins.length > 0 ? totalWin / wins.length : 0,
      avgLoss: losses.length > 0 ? totalLoss / losses.length : 0,
      bestPair: sortedPairs[0]?.[0] || '',
      worstPair: sortedPairs[sortedPairs.length - 1]?.[0] || '',
      bestTimeframe: sortedTimes[0]?.[0] || '',
      bestSetup: sortedSetups[0]?.[0] || '',
    };
  }

  private static generateAIComments(
    stats: MonthlyStats,
    prevStats: MonthlyStats | null,
    coachAvatar: 'teacher' | 'beginner' | 'strategist',
    isEarlyMonth: boolean
  ): { kizuki: string; chuui: string; next_itte: string } {
    if (isEarlyMonth && prevStats) {
      return this.generateEarlyMonthComments(prevStats, coachAvatar);
    }

    switch (coachAvatar) {
      case 'teacher':
        return this.generateTeacherComments(stats, prevStats);
      case 'beginner':
        return this.generateBeginnerComments(stats, prevStats);
      case 'strategist':
        return this.generateStrategistComments(stats, prevStats);
      default:
        return this.generateTeacherComments(stats, prevStats);
    }
  }

  private static generateEarlyMonthComments(
    prevStats: MonthlyStats,
    coachAvatar: string
  ): { kizuki: string; chuui: string; next_itte: string } {
    if (coachAvatar === 'beginner') {
      return {
        kizuki: '今月はまだトレード数が少ないので、先月の結果を参考に進めましょう。焦らず、一歩ずつ進めていけば大丈夫です。',
        chuui: `先月は${prevStats.bestPair}で良い結果が出ていました。一方で、損失を出しやすい場面もありましたので、慎重に取引を重ねていきましょう。`,
        next_itte: '今月は先月の良かったパターンを意識しながら、無理のない範囲でトレードを続けていきましょう。',
      };
    } else if (coachAvatar === 'strategist') {
      return {
        kizuki: `今月は初動段階。先月のPF${prevStats.pf.toFixed(2)}、勝率${prevStats.winRate.toFixed(1)}%を基準に戦略を調整中です。`,
        chuui: `前月の${prevStats.bestTimeframe}時間帯で優位性を確認。ただし${prevStats.worstPair}でのパフォーマンスが課題でした。`,
        next_itte: `今月は${prevStats.bestSetup}戦略を軸に、サンプル数を増やしながらエッジの再確認を行いましょう。`,
      };
    } else {
      return {
        kizuki: '今月はまだデータが少ないため、先月の傾向を基準に判断しています。',
        chuui: `先月は${prevStats.bestTimeframe}時間帯で良い成績でしたが、一部の通貨ペアでは注意が必要でした。`,
        next_itte: '今月は先月の強みを活かしながら、安定したパターンを中心に進めましょう。',
      };
    }
  }

  private static generateTeacherComments(
    stats: MonthlyStats,
    prevStats: MonthlyStats | null
  ): { kizuki: string; chuui: string; next_itte: string } {
    const profitChange = prevStats ? stats.totalProfit - prevStats.totalProfit : 0;
    const pfChange = prevStats ? stats.pf - prevStats.pf : 0;

    return {
      kizuki: `今月は${stats.tradeCount}回の取引を行い、${stats.totalProfit >= 0 ? '+' : ''}${Math.round(stats.totalProfit).toLocaleString()}円の結果となりました。${stats.bestTimeframe}時間帯と${stats.bestPair}での取引が好調でした。`,
      chuui: `勝率は${stats.winRate.toFixed(1)}%で、PFは${stats.pf.toFixed(2)}です。${stats.avgLoss > stats.avgWin * 2 ? '損失が大きくなる傾向がありますので、損切りの徹底を心がけましょう。' : '損益バランスは概ね良好です。'}`,
      next_itte: `来月は${stats.bestSetup || stats.bestTimeframe}でのパターンを継続しつつ、${stats.worstPair}での取引を見直すことで、さらなる改善が期待できます。`,
    };
  }

  private static generateBeginnerComments(
    stats: MonthlyStats,
    prevStats: MonthlyStats | null
  ): { kizuki: string; chuui: string; next_itte: string } {
    return {
      kizuki: `今月は${stats.tradeCount}回トレードしましたね！${stats.totalProfit >= 0 ? '利益が出ています' : '少し損失が出ました'}が、経験を積むことができました。${stats.bestPair}が得意なペアのようです。`,
      chuui: `勝率は${stats.winRate.toFixed(0)}%でした。${stats.winRate < 40 ? '少し低めなので、エントリーのタイミングを見直してみましょう' : '良いペースです'}。損切りはしっかりできていますか？`,
      next_itte: `来月は${stats.bestTimeframe}の時間帯を中心に、焦らずゆっくり取引を重ねていきましょう。一歩ずつ成長していけば大丈夫です！`,
    };
  }

  private static generateStrategistComments(
    stats: MonthlyStats,
    prevStats: MonthlyStats | null
  ): { kizuki: string; chuui: string; next_itte: string } {
    const rr = stats.avgLoss > 0 ? stats.avgWin / stats.avgLoss : 0;

    return {
      kizuki: `月間PF ${stats.pf.toFixed(2)}、勝率${stats.winRate.toFixed(1)}%、R倍率${rr.toFixed(2)}。${stats.bestPair}と${stats.bestTimeframe}時間帯で優位性を確認。総取引数${stats.tradeCount}件。`,
      chuui: `${stats.avgLoss > stats.avgWin * 2 ? 'リスクリワード比が不均衡。損切り幅の最適化が必要。' : 'リスク管理は適正範囲。'}${stats.winRate < 45 ? '勝率改善のためエントリー基準の厳格化を推奨。' : ''}`,
      next_itte: `戦略の軸：${stats.bestSetup || stats.bestTimeframe}をコアに、${stats.worstPair}の除外または条件追加。サンプル数を増やしエッジの統計的検証を継続。`,
    };
  }

  private static generateStrengths(stats: MonthlyStats): string[] {
    const strengths: string[] = [];

    if (stats.winRate >= 50) {
      strengths.push(`勝率${stats.winRate.toFixed(1)}%で安定した成績を維持`);
    }

    if (stats.bestTimeframe) {
      strengths.push(`${stats.bestTimeframe}時間帯での取引が好調`);
    }

    if (stats.bestSetup) {
      strengths.push(`${stats.bestSetup}戦略でのエッジを確認`);
    }

    if (stats.pf >= 1.5) {
      strengths.push(`PF ${stats.pf.toFixed(2)}で優れたリスクリワード比を達成`);
    }

    if (stats.bestPair) {
      strengths.push(`${stats.bestPair}で良好なパフォーマンス`);
    }

    return strengths.slice(0, 3);
  }

  private static generateWeaknesses(stats: MonthlyStats): string[] {
    const weaknesses: string[] = [];

    if (stats.avgLoss > stats.avgWin * 2) {
      weaknesses.push('損失が大きくなる傾向があり、損切りの改善が必要');
    }

    if (stats.winRate < 40) {
      weaknesses.push('勝率が低く、エントリー基準の見直しが必要');
    }

    if (stats.worstPair) {
      weaknesses.push(`${stats.worstPair}での取引パフォーマンスが課題`);
    }

    if (stats.pf < 1.0) {
      weaknesses.push('PFが1.0未満で、トータルで損失が発生');
    }

    return weaknesses.slice(0, 2);
  }

  private static generateNextFocus(stats: MonthlyStats, weaknesses: string[]): string {
    if (weaknesses.length > 0) {
      if (weaknesses[0].includes('損切り')) {
        return '損切りルールの明確化と徹底';
      }
      if (weaknesses[0].includes('勝率')) {
        return 'エントリー条件の厳格化と優位性の高い場面に絞る';
      }
      if (weaknesses[0].includes(stats.worstPair)) {
        return `${stats.worstPair}の取引を控え、得意な${stats.bestPair}に集中`;
      }
    }

    if (stats.bestSetup) {
      return `${stats.bestSetup}戦略の精度向上と再現性の確保`;
    }

    return `${stats.bestTimeframe}時間帯での安定したパターンの継続`;
  }

  static async getTradesForMonth(userId: string, month: string): Promise<Trade[]> {
    const [year, monthNum] = month.split('-');
    const startDate = `${year}-${monthNum}-01`;
    const endMonth = parseInt(monthNum) === 12 ? '01' : String(parseInt(monthNum) + 1).padStart(2, '0');
    const endYear = parseInt(monthNum) === 12 ? String(parseInt(year) + 1) : year;
    const endDate = `${endYear}-${endMonth}-01`;

    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .gte('close_time', startDate)
      .lt('close_time', endDate)
      .order('close_time', { ascending: true });

    if (error) {
      console.error('Error fetching trades:', error);
      return [];
    }

    return data || [];
  }

  static async generateMonthlyReview(
    userId: string,
    month: string,
    coachAvatar: 'teacher' | 'beginner' | 'strategist' = 'teacher'
  ): Promise<MonthlyReviewData | null> {
    console.log('📊 MonthlyReviewService.generateMonthlyReview called');
    console.log('  - userId:', userId);
    console.log('  - month:', month);
    console.log('  - coachAvatar:', coachAvatar);

    const trades = await this.getTradesForMonth(userId, month);
    console.log('📈 Trades fetched:', trades.length);

    // If no trades at all, return null
    if (trades.length === 0) {
      console.warn('⚠️ No trades found for this month, cannot generate review');
      return null;
    }

    const dayOfMonth = new Date().getDate();
    const isEarlyMonth = dayOfMonth <= 5 || trades.length < 10;
    console.log('📅 Is early month:', isEarlyMonth, '(day:', dayOfMonth, ', trades:', trades.length, ')');

    let prevStats: MonthlyStats | null = null;
    if (isEarlyMonth) {
      const [year, monthNum] = month.split('-');
      const prevMonth = parseInt(monthNum) === 1 ? 12 : parseInt(monthNum) - 1;
      const prevYear = parseInt(monthNum) === 1 ? String(parseInt(year) - 1) : year;
      const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
      const prevTrades = await this.getTradesForMonth(userId, prevMonthStr);

      if (prevTrades.length > 0) {
        prevStats = this.calculateMonthlyStats(prevTrades);
      }
    }

    const stats = this.calculateMonthlyStats(trades);
    const comments = this.generateAIComments(stats, prevStats, coachAvatar, isEarlyMonth);
    const strengths = this.generateStrengths(stats);
    const weaknesses = this.generateWeaknesses(stats);
    const nextFocus = this.generateNextFocus(stats, weaknesses);

    const { data: allTrades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('close_time', { ascending: true });

    const evaluation = calculateMonthlyEvaluation(trades, allTrades || []);

    return {
      user_id: userId,
      month,
      summary_profit: stats.totalProfit,
      summary_pf: stats.pf,
      summary_win_rate: stats.winRate,
      summary_trade_count: stats.tradeCount,
      strengths,
      weaknesses,
      next_focus: nextFocus,
      ai_comment_kizuki: comments.kizuki,
      ai_comment_chuui: comments.chuui,
      ai_comment_next_itte: comments.next_itte,
      coach_avatar: coachAvatar,
      is_early_month: isEarlyMonth,
      evaluation,
    };
  }

  static async saveMonthlyReview(review: MonthlyReviewData): Promise<boolean> {
    const { error } = await supabase
      .from('reviews_monthly')
      .upsert(review, { onConflict: 'user_id,month' });

    if (error) {
      console.error('Error saving monthly review:', error);
      return false;
    }

    return true;
  }

  static async getMonthlyReview(userId: string, month: string): Promise<MonthlyReviewData | null> {
    const { data, error } = await supabase
      .from('reviews_monthly')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .maybeSingle();

    if (error) {
      console.error('Error fetching monthly review:', error);
      return null;
    }

    return data;
  }

  static async getAllMonthlyReviews(userId: string): Promise<MonthlyReviewData[]> {
    const { data, error } = await supabase
      .from('reviews_monthly')
      .select('*')
      .eq('user_id', userId)
      .order('month', { ascending: false });

    if (error) {
      console.error('Error fetching all monthly reviews:', error);
      return [];
    }

    return data || [];
  }

  static getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  static async getAvailableMonths(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('trades')
      .select('close_time')
      .eq('user_id', userId)
      .order('close_time', { ascending: false });

    if (error || !data || data.length === 0) {
      return [];
    }

    const monthsSet = new Set<string>();
    data.forEach(trade => {
      if (trade.close_time) {
        const date = new Date(trade.close_time);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        monthsSet.add(`${year}-${month}`);
      }
    });

    return Array.from(monthsSet).sort().reverse();
  }
}
