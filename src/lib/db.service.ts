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
  console.log(`📥 Loading trades from database, dataset: ${dataset}`);

  // 認証状態を確認（dataset=nullの場合は必須）
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error('❌ Auth error in getAllTrades:', authError);
    throw authError;
  }

  if (dataset === null && !user) {
    console.warn('⚠️ No user authenticated, cannot load user-uploaded trades (dataset=null)');
    return [];
  }

  console.log(`🔐 Loading trades for ${user ? `user ${user.id}` : 'anonymous'}, dataset: ${dataset}`);

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
        // User-uploaded trades: must have user_id and dataset=null
        if (user) {
          query = query.eq('user_id', user.id).is('dataset', null);
        }
      } else {
        // Demo data: dataset='A','B','C'
        query = query.eq('dataset', dataset);
      }
    }

    const { data, error } = await query.range(start, end);

    if (error) {
      console.error('❌ Error loading trades:', error);
      throw error;
    }

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
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error('❌ Auth error in getTradesCount:', authError);
    return 0;
  }

  if (!user) {
    console.log('⚠️ No user in getTradesCount, returning 0');
    return 0;
  }

  // Only count user-uploaded trades (dataset is null)
  const { count, error } = await supabase
    .from('trades')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('dataset', null);

  if (error) {
    console.error('❌ Error counting trades:', error);
    return 0;
  }

  console.log(`📊 User-uploaded trades count: ${count || 0} for user ${user.id}`);
  return count || 0;
}

export async function deleteAllTrades(): Promise<void> {
  // 認証なしでも動作するように修正（publicポリシーで保護）
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // ユーザーがいない場合は、user_idがnullのレコードを削除
    console.warn('⚠️ No user authenticated, deleting records with null user_id');
    const { error, count } = await supabase
      .from('trades')
      .delete({ count: 'exact' })
      .is('user_id', null)
      .is('dataset', null);

    if (error) {
      console.error('❌ Error deleting trades without user:', error);
      throw error;
    }
    console.log(`🗑️ Deleted ${count || 0} trades without user`);
    return;
  }

  // Only delete user-uploaded trades (dataset is null), keep demo data (A, B, C)
  console.log(`🗑️ Deleting trades for user ${user.id} with dataset=null`);
  const { error, count } = await supabase
    .from('trades')
    .delete({ count: 'exact' })
    .eq('user_id', user.id)
    .is('dataset', null);

  if (error) {
    console.error('❌ Error deleting user trades:', error);
    throw error;
  }
  console.log(`🗑️ Deleted ${count || 0} user-uploaded trades (dataset=null)`);
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
  // 認証なしでも動作するように修正
  const { data: { user } } = await supabase.auth.getUser();

  const tradesWithUser = trades.map(trade => ({
    ...trade,
    user_id: user?.id || null, // 認証なしの場合はnull
    dataset: null,
  }));

  const BATCH_SIZE = 1000;
  let processed = 0;

  for (let i = 0; i < tradesWithUser.length; i += BATCH_SIZE) {
    const batch = tradesWithUser.slice(i, i + BATCH_SIZE);

    // insertを使用し、重複は無視（ticketが既存の場合はスキップ）
    const { error } = await supabase
      .from('trades')
      .insert(batch, {
        ignoreDuplicates: true
      });

    if (error) {
      console.error('❌ Error inserting batch:', error);
      throw error;
    }

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

  const { error } = await supabase
    .from('daily_notes')
    .upsert({
      ...note,
      user_id: user?.id || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: user ? 'user_id,date_key' : 'date_key' });

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

  if (tradeData) {
    const { error: tradeError } = await supabase
      .from('trades')
      .upsert({
        ...tradeData,
        user_id: user?.id || null,
        dataset: null,
      }, { onConflict: user ? 'user_id,ticket' : 'ticket' });

    if (tradeError) throw tradeError;
  }

  const { error } = await supabase
    .from('trade_notes')
    .upsert({
      ...note,
      user_id: user?.id || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: user ? 'user_id,ticket' : 'ticket' });

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

  // 必須フィールドのバリデーション
  const openTime = normalizeDateTime(trade.openTime || trade.datetime);
  const closeTime = normalizeDateTime(trade.datetime);

  if (!openTime || !closeTime) {
    console.error('Invalid trade: missing time data', trade);
    throw new Error(`Invalid trade: missing time data for ticket ${trade.ticket || trade.id}`);
  }

  if (!trade.ticket && !trade.id) {
    console.error('Invalid trade: missing ticket/id', trade);
    throw new Error('Invalid trade: missing ticket or id');
  }

  return {
    ticket: trade.ticket || trade.id,
    item: (trade.pair || trade.symbol || '').toUpperCase() || 'UNKNOWN',
    side: trade.side || 'LONG',
    size: trade.volume || 0,
    open_time: openTime,
    open_price: trade.openPrice || 0,
    close_time: closeTime,
    close_price: trade.closePrice || 0,
    commission: trade.commission || 0,
    swap: trade.swap || 0,
    profit: trade.profitYen || trade.profit || 0,
    pips: trade.pips || 0,
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
  dataset?: string;
  balance?: number;
  equity?: number;
  profit?: number;
  deposit?: number;
  withdraw?: number;
  commission?: number;
  swap?: number;
  swap_long?: number;
  swap_short?: number;
  swap_positive?: number;
  swap_negative?: number;
  bonus_credit?: number;
  xm_points_earned?: number;
  xm_points_used?: number;
  total_deposits?: number;
  total_withdrawals?: number;
  total_swap?: number;
  total_commission?: number;
  total_profit?: number;
  closed_pl?: number;
  updated_at: string;
};

export async function getAccountSummary(dataset: string = 'default'): Promise<DbAccountSummary | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('account_summary')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { data: swapData } = await supabase
    .from('account_transactions')
    .select('amount')
    .eq('user_id', user.id)
    .eq('type', 'swap');

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
  balance?: number;
  equity?: number;
  profit?: number;
  deposit?: number;
  withdraw?: number;
  commission?: number;
  swap?: number;
  swap_long?: number;
  swap_short?: number;
  total_deposits?: number;
  total_withdrawals?: number;
  xm_points_earned?: number;
  xm_points_used?: number;
  total_swap?: number;
  total_commission?: number;
  total_profit?: number;
  closed_pl?: number;
  bonus_credit?: number;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || null;

  if (!userId) {
    console.warn('⚠️ No authenticated user, skipping account_summary upsert');
    return;
  }

  const { data: existing } = await supabase
    .from('account_summary')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const updateData: any = {
    user_id: userId,
    dataset: summary.dataset || existing?.dataset || 'default',
    updated_at: new Date().toISOString(),
  };

  // データベースに実際に存在するカラムのみを更新
  if (summary.total_deposits !== undefined) updateData.total_deposits = summary.total_deposits;
  else if (summary.deposit !== undefined) updateData.total_deposits = summary.deposit;
  else if (existing?.total_deposits !== undefined) updateData.total_deposits = existing.total_deposits;
  else updateData.total_deposits = 0;

  if (summary.total_withdrawals !== undefined) updateData.total_withdrawals = summary.total_withdrawals;
  else if (summary.withdraw !== undefined) updateData.total_withdrawals = summary.withdraw;
  else if (existing?.total_withdrawals !== undefined) updateData.total_withdrawals = existing.total_withdrawals;
  else updateData.total_withdrawals = 0;

  if (summary.total_swap !== undefined) updateData.total_swap = summary.total_swap;
  else if (summary.swap !== undefined) updateData.total_swap = summary.swap;
  else if (existing?.total_swap !== undefined) updateData.total_swap = existing.total_swap;
  else updateData.total_swap = 0;

  if (summary.total_commission !== undefined) updateData.total_commission = summary.total_commission;
  else if (summary.commission !== undefined) updateData.total_commission = summary.commission;
  else if (existing?.total_commission !== undefined) updateData.total_commission = existing.total_commission;
  else updateData.total_commission = 0;

  if (summary.total_profit !== undefined) updateData.total_profit = summary.total_profit;
  else if (summary.profit !== undefined) updateData.total_profit = summary.profit;
  else if (existing?.total_profit !== undefined) updateData.total_profit = existing.total_profit;
  else updateData.total_profit = 0;

  if (summary.closed_pl !== undefined) updateData.closed_pl = summary.closed_pl;
  else if (existing?.closed_pl !== undefined) updateData.closed_pl = existing.closed_pl;
  else updateData.closed_pl = 0;

  if (summary.xm_points_earned !== undefined) updateData.xm_points_earned = summary.xm_points_earned;
  else if (existing?.xm_points_earned !== undefined) updateData.xm_points_earned = existing.xm_points_earned;
  else updateData.xm_points_earned = 0;

  if (summary.xm_points_used !== undefined) updateData.xm_points_used = summary.xm_points_used;
  else if (existing?.xm_points_used !== undefined) updateData.xm_points_used = existing.xm_points_used;
  else updateData.xm_points_used = 0;

  const { error } = await supabase
    .from('account_summary')
    .upsert(updateData, { onConflict: 'user_id,dataset' });

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

  let query = supabase
    .from('ai_coaching_jobs')
    .select('*')
    .eq('dataset', dataset);

  if (user) {
    query = query.eq('user_id', user.id);
  } else {
    query = query.is('user_id', null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveCoachingJob(dataset: string, result: any): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('ai_coaching_jobs')
    .upsert({
      user_id: user?.id || null,
      dataset: dataset,
      status: 'completed',
      progress: 100,
      result: result,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: user ? 'user_id,dataset' : 'dataset' });

  if (error) throw error;
}

export async function deleteCoachingJob(dataset: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('ai_coaching_jobs')
    .delete()
    .eq('dataset', dataset);

  if (user) {
    query = query.eq('user_id', user.id);
  } else {
    query = query.is('user_id', null);
  }

  const { error } = await query;

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
