import { supabase } from './supabase';
import type { Trade } from './types';

export type DbTrade = {
  id: string;
  ticket: string;
  item: string;
  side: string;
  size: number;
  open_time: string;
  open_price: number;
  close_time: string;
  close_price: number;
  commission: number;
  swap: number;
  profit: number;
  pips: number;
  sl: number | null;
  tp: number | null;
  user_id: string | null;
  dataset: string | null;
  created_at: string;
};

export type DbDailyNote = {
  id: string;
  date_key: string;
  title: string;
  good: string;
  improve: string;
  next_promise: string;
  free: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DbTradeNote = {
  id: string;
  ticket: string;
  entry_emotion: string;
  entry_basis: string[];
  tech_set: string[];
  market_set: string[];
  fund_set: string[];
  fund_note: string;
  exit_triggers: string[];
  exit_emotion: string;
  note_right: string;
  note_wrong: string;
  note_next: string;
  note_free: string;
  tags: string[];
  images: string[];
  ai_advice: string;
  ai_advice_pinned: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DbFreeMemo = {
  id: string;
  title: string;
  content: string;
  date_key: string;
  tags: string[];
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DbNoteLink = {
  id: string;
  source_type: 'trade' | 'daily' | 'free';
  source_id: string;
  target_type: 'trade' | 'daily' | 'free';
  target_id: string;
  user_id: string | null;
  created_at: string;
};

export async function getAllTrades(dataset?: string | null): Promise<DbTrade[]> {
  const PAGE_SIZE = 1000;
  let allTrades: DbTrade[] = [];
  let currentPage = 0;
  let hasMore = true;

  while (hasMore) {
    const start = currentPage * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    let query = supabase
      .from('trades')
      .select('*')
      .order('close_time', { ascending: false });

    if (dataset !== undefined) {
      if (dataset === null) {
        query = query.is('dataset', null);
      } else {
        query = query.eq('dataset', dataset);
      }
    }

    const { data, error } = await query.range(start, end);

    if (error) throw error;

    if (data && data.length > 0) {
      allTrades = [...allTrades, ...data];
      currentPage++;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Loaded from database: ${allTrades.length} trades${dataset !== undefined ? ` (dataset: ${dataset})` : ''}`);
  return allTrades;
}

export async function getTradesCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  // Only count user-uploaded trades (dataset is null)
  const { count, error } = await supabase
    .from('trades')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('dataset', null);

  if (error) throw error;
  console.log(`📊 User-uploaded trades count: ${count || 0}`);
  return count || 0;
}

export async function deleteAllTrades(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Only delete user-uploaded trades (dataset is null), keep demo data (A, B, C)
  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('user_id', user.id)
    .is('dataset', null);

  if (error) throw error;
  console.log('🗑️ Deleted all user-uploaded trades (dataset=null)');
}

export async function getTradeByTicket(ticket: string): Promise<DbTrade | null> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('ticket', ticket)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function insertTrades(trades: Omit<DbTrade, 'id' | 'created_at' | 'user_id' | 'dataset'>[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const tradesWithUser = trades.map(trade => ({
    ...trade,
    user_id: user.id,
    dataset: null,
  }));

  const BATCH_SIZE = 1000;
  let processed = 0;

  for (let i = 0; i < tradesWithUser.length; i += BATCH_SIZE) {
    const batch = tradesWithUser.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('trades')
      .upsert(batch, {
        onConflict: 'user_id,ticket',
        ignoreDuplicates: false
      });

    if (error) throw error;

    processed += batch.length;
    console.log(`📥 Inserted batch: ${processed}/${tradesWithUser.length} trades`);
  }

  console.log(`✅ All trades inserted: ${tradesWithUser.length} total`);
}

export async function getAllDailyNotes(): Promise<DbDailyNote[]> {
  const { data, error } = await supabase
    .from('daily_notes')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getDailyNote(dateKey: string): Promise<DbDailyNote | null> {
  const { data, error } = await supabase
    .from('daily_notes')
    .select('*')
    .eq('date_key', dateKey)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveDailyNote(note: Omit<DbDailyNote, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('daily_notes')
    .upsert({
      ...note,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date_key' });

  if (error) throw error;
}

export async function getAllTradeNotes(): Promise<DbTradeNote[]> {
  const { data, error } = await supabase
    .from('trade_notes')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getTradeNote(ticket: string): Promise<DbTradeNote | null> {
  const { data, error } = await supabase
    .from('trade_notes')
    .select('*')
    .eq('ticket', ticket)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveTradeNote(note: Omit<DbTradeNote, 'id' | 'created_at' | 'updated_at' | 'user_id'>, tradeData?: Omit<DbTrade, 'id' | 'created_at' | 'user_id' | 'dataset'>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  if (tradeData) {
    const { error: tradeError } = await supabase
      .from('trades')
      .upsert({
        ...tradeData,
        user_id: user.id,
        dataset: null,
      }, { onConflict: 'user_id,ticket' });

    if (tradeError) throw tradeError;
  }

  const { error } = await supabase
    .from('trade_notes')
    .upsert({
      ...note,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,ticket' });

  if (error) throw error;
}

export async function getFreeMemo(id: string): Promise<DbFreeMemo | null> {
  const { data, error } = await supabase
    .from('free_memos')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getAllFreeMemos(): Promise<DbFreeMemo[]> {
  const { data, error } = await supabase
    .from('free_memos')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function saveFreeMemo(memo: Omit<DbFreeMemo, 'id' | 'created_at' | 'updated_at' | 'user_id'> & { id?: string }): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();

  if (memo.id) {
    const { error } = await supabase
      .from('free_memos')
      .update({
        title: memo.title,
        content: memo.content,
        date_key: memo.date_key,
        tags: memo.tags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memo.id);

    if (error) throw error;
    return memo.id;
  } else {
    const { data, error } = await supabase
      .from('free_memos')
      .insert({
        title: memo.title,
        content: memo.content,
        date_key: memo.date_key,
        tags: memo.tags,
        user_id: user?.id || null,
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }
}

export async function deleteFreeMemo(id: string): Promise<void> {
  const { error } = await supabase
    .from('free_memos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function createLink(
  sourceType: 'trade' | 'daily' | 'free',
  sourceId: string,
  targetType: 'trade' | 'daily' | 'free',
  targetId: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('note_links')
    .insert({
      source_type: sourceType,
      source_id: sourceId,
      target_type: targetType,
      target_id: targetId,
      user_id: user?.id || null,
    });

  if (error && error.code !== '23505') {
    throw error;
  }
}

export async function deleteLink(
  sourceType: 'trade' | 'daily' | 'free',
  sourceId: string,
  targetType: 'trade' | 'daily' | 'free',
  targetId: string
): Promise<void> {
  const { error } = await supabase
    .from('note_links')
    .delete()
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .eq('target_type', targetType)
    .eq('target_id', targetId);

  if (error) throw error;
}

export async function getLinksFromSource(
  sourceType: 'trade' | 'daily' | 'free',
  sourceId: string
): Promise<DbNoteLink[]> {
  const { data, error } = await supabase
    .from('note_links')
    .select('*')
    .eq('source_type', sourceType)
    .eq('source_id', sourceId);

  if (error) throw error;
  return data || [];
}

export async function getLinksToTarget(
  targetType: 'trade' | 'daily' | 'free',
  targetId: string
): Promise<DbNoteLink[]> {
  const { data, error } = await supabase
    .from('note_links')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId);

  if (error) throw error;
  return data || [];
}

export function tradeToDb(trade: Trade): Omit<DbTrade, 'id' | 'created_at'> {
  // ドット区切り形式（例: "2025.02.23 06:40:46"）をハイフン区切りに変換
  const normalizeDateTime = (dt: string | undefined): string => {
    if (!dt) return '';
    return dt.replace(/\./g, '-');
  };

  return {
    ticket: trade.ticket || trade.id,
    item: (trade.pair || trade.symbol || '').toUpperCase(),
    side: trade.side,
    size: trade.volume,
    open_time: normalizeDateTime(trade.openTime || trade.datetime),
    open_price: trade.openPrice || 0,
    close_time: normalizeDateTime(trade.datetime),
    close_price: trade.closePrice || 0,
    commission: trade.commission || 0,
    swap: trade.swap || 0,
    profit: trade.profitYen || trade.profit || 0,
    pips: trade.pips,
    sl: trade.stopPrice || null,
    tp: trade.targetPrice || null,
  };
}

export function dbToTrade(dbTrade: DbTrade): Trade {
  return {
    id: dbTrade.ticket,
    datetime: dbTrade.close_time,
    pair: dbTrade.item,
    side: dbTrade.side as Side,
    volume: dbTrade.size,
    profitYen: dbTrade.profit,
    pips: dbTrade.pips,
    openTime: dbTrade.open_time,
    openPrice: dbTrade.open_price,
    closePrice: dbTrade.close_price,
    stopPrice: dbTrade.sl || undefined,
    targetPrice: dbTrade.tp || undefined,
    commission: dbTrade.commission,
    swap: Number(dbTrade.swap) || 0,
    ticket: dbTrade.ticket,
    symbol: dbTrade.item,
    action: dbTrade.side as Side,
    profit: dbTrade.profit,
  };
}

type Side = "LONG" | "SHORT";

export type DbAccountSummary = {
  id: string;
  user_id: string;
  dataset: string;
  total_deposits: number;
  total_withdrawals: number;
  xm_points_earned: number;
  xm_points_used: number;
  total_swap: number;
  swap_positive?: number;
  swap_negative?: number;
  total_commission: number;
  total_profit: number;
  closed_pl: number;
  updated_at: string;
};

export async function getAccountSummary(dataset: string = 'default'): Promise<DbAccountSummary | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('account_summary')
    .select('*')
    .eq('user_id', user.id)
    .eq('dataset', dataset)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { data: swapData } = await supabase
    .from('account_transactions')
    .select('amount')
    .eq('user_id', user.id)
    .eq('dataset', dataset)
    .eq('transaction_type', 'swap');

  const swap_positive = swapData?.reduce((sum, t) => sum + (t.amount > 0 ? t.amount : 0), 0) || 0;
  const swap_negative = swapData?.reduce((sum, t) => sum + (t.amount < 0 ? t.amount : 0), 0) || 0;

  return {
    ...data,
    swap_positive,
    swap_negative: Math.abs(swap_negative),
  };
}

export async function upsertAccountSummary(summary: {
  dataset?: string;
  total_deposits: number;
  total_withdrawals: number;
  xm_points_earned: number;
  xm_points_used: number;
  total_swap: number;
  total_commission: number;
  total_profit: number;
  closed_pl: number;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('account_summary')
    .upsert({
      user_id: user?.id || '',
      dataset: summary.dataset || 'default',
      total_deposits: summary.total_deposits,
      total_withdrawals: summary.total_withdrawals,
      xm_points_earned: summary.xm_points_earned,
      xm_points_used: summary.xm_points_used,
      total_swap: summary.total_swap,
      total_commission: summary.total_commission,
      total_profit: summary.total_profit,
      closed_pl: summary.closed_pl,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,dataset' });

  if (error) throw error;
}

export type DbCoachingJob = {
  id: string;
  user_id: string;
  dataset: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result: any;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export async function getCoachingJob(dataset: string): Promise<DbCoachingJob | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('ai_coaching_jobs')
    .select('*')
    .eq('user_id', user.id)
    .eq('dataset', dataset)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveCoachingJob(dataset: string, result: any): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('ai_coaching_jobs')
    .upsert({
      user_id: user.id,
      dataset: dataset,
      status: 'completed',
      progress: 100,
      result: result,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,dataset' });

  if (error) throw error;
}

export async function deleteCoachingJob(dataset: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('ai_coaching_jobs')
    .delete()
    .eq('user_id', user.id)
    .eq('dataset', dataset);

  if (error) throw error;
}

export async function getUserSettings(userId: string): Promise<any> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
