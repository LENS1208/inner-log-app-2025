import { supabase } from '../lib/supabase';
import type { AiProposalData } from '../types/ai-proposal.types';

export type AiProposal = {
  id: string;
  user_id: string;
  pair: string;
  timeframe: string;
  period?: string;
  title?: string;
  proposal_data: any;
  bias: string;
  confidence: number;
  user_rating: number | null;
  is_fixed: boolean;
  prompt: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function saveProposal(
  proposalData: AiProposalData,
  prompt: string,
  pair: string,
  timeframe: string
): Promise<AiProposal | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('User not authenticated');
    return null;
  }

  const { data, error } = await supabase
    .from('ai_proposals')
    .insert({
      user_id: user.id,
      pair,
      timeframe,
      bias: proposalData.hero.bias,
      confidence: proposalData.hero.confidence,
      proposal_data: {
        hero: proposalData.hero,
        daily: proposalData.daily,
        scenario: proposalData.scenario,
        ideas: proposalData.ideas,
        factors: proposalData.factors,
        notes: proposalData.notes,
      },
      is_fixed: true,
      prompt,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving proposal:', error);
    return null;
  }

  return data;
}

export async function updateProposal(
  id: string,
  proposalData: Partial<AiProposalData>
): Promise<AiProposal | null> {
  const proposal = await getProposal(id);
  if (!proposal) {
    console.error('Proposal not found');
    return null;
  }

  const currentData = proposal.proposal_data || {};
  const newData = {
    hero: proposalData.hero || currentData.hero,
    daily: proposalData.daily || currentData.daily,
    scenario: proposalData.scenario || currentData.scenario,
    ideas: proposalData.ideas || currentData.ideas,
    factors: proposalData.factors || currentData.factors,
    notes: proposalData.notes || currentData.notes,
  };

  const updateData: any = {
    updated_at: new Date().toISOString(),
    proposal_data: newData,
  };

  if (proposalData.hero) {
    updateData.bias = proposalData.hero.bias;
    updateData.confidence = proposalData.hero.confidence;
  }

  const { data, error } = await supabase
    .from('ai_proposals')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating proposal:', error);
    return null;
  }

  return data;
}

export async function getProposal(id: string): Promise<AiProposal | null> {
  const { data, error } = await supabase
    .from('ai_proposals')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching proposal:', error);
    return null;
  }

  return data;
}

export async function getAllProposals(): Promise<AiProposal[]> {
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('ai_proposals')
    .select('*');

  if (user) {
    query = query.eq('user_id', user.id);
  } else {
    query = query.is('user_id', null);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching proposals:', error);
    return [];
  }

  return data || [];
}

export async function deleteProposal(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('ai_proposals')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting proposal:', error);
    return false;
  }

  return true;
}

export async function regenerateProposal(
  parentId: string,
  proposalData: AiProposalData,
  prompt: string
): Promise<AiProposal | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('User not authenticated');
    return null;
  }

  const parent = await getProposal(parentId);
  if (!parent) {
    console.error('Parent proposal not found');
    return null;
  }

  const { data, error } = await supabase
    .from('ai_proposals')
    .insert({
      user_id: user.id,
      pair: parent.pair,
      timeframe: parent.timeframe,
      bias: proposalData.hero.bias,
      confidence: proposalData.hero.confidence,
      proposal_data: {
        hero: proposalData.hero,
        daily: proposalData.daily,
        scenario: proposalData.scenario,
        ideas: proposalData.ideas,
        factors: proposalData.factors,
        notes: proposalData.notes,
      },
      is_fixed: true,
      prompt: prompt || parent.prompt,
      parent_id: parentId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error regenerating proposal:', error);
    return null;
  }

  return data;
}

export async function getProposalHistory(proposalId: string): Promise<AiProposal[]> {
  const { data: { user } } = await supabase.auth.getUser();

  const proposal = await getProposal(proposalId);
  if (!proposal) return [];

  const rootId = proposal.parent_id || proposalId;

  let query = supabase
    .from('ai_proposals')
    .select('*')
    .or(`id.eq.${rootId},parent_id.eq.${rootId}`);

  if (user) {
    query = query.eq('user_id', user.id);
  } else {
    query = query.is('user_id', null);
  }

  const { data, error } = await query.order('version', { ascending: true });

  if (error) {
    console.error('Error fetching proposal history:', error);
    return [];
  }

  return data || [];
}

export function mapProposalToData(proposal: AiProposal): AiProposalData {
  const data = proposal.proposal_data || {};
  return {
    hero: data.hero || {},
    daily: data.daily || {},
    scenario: data.scenario || {},
    ideas: data.ideas || [],
    factors: data.factors || {},
    notes: data.notes || {},
  };
}

// 現在のUSDJPYレートを取得
async function getCurrentUSDJPYRate(): Promise<number> {
  try {
    // exchangerate-apiを使用（無料・APIキー不要）
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await response.json();

    if (data.rates && data.rates.JPY) {
      const rate = data.rates.JPY;
      console.log('Current USDJPY rate fetched:', rate);
      return Math.round(rate * 100) / 100; // 小数点2桁に丸める
    }
  } catch (error) {
    console.warn('Failed to fetch USDJPY rate, using fallback:', error);
  }

  // フォールバック: API失敗時は150.00を使用
  return 150.00;
}

// サンプルUSDJPY予想データを動的に生成
async function createSampleUSDJPYData(): Promise<AiProposalData> {
  const currentRate = await getCurrentUSDJPYRate();

  // 現在レートを基準に各価格を計算
  const buyEntry = (currentRate + 0.70).toFixed(2);
  const sellEntry = (currentRate - 0.70).toFixed(2);
  const anchor = currentRate.toFixed(2);

  // シナリオ用の価格帯を計算
  const strongHigh = (currentRate + 1.00).toFixed(2);
  const strongMid = (currentRate + 1.70).toFixed(2);
  const strongTop = (currentRate + 2.50).toFixed(2);

  const baseLow = (currentRate - 0.50).toFixed(2);
  const baseMid = currentRate.toFixed(2);
  const baseHigh = (currentRate + 0.50).toFixed(2);

  const weakHigh = (currentRate - 0.50).toFixed(2);
  const weakMid = (currentRate - 1.00).toFixed(2);
  const weakLow = (currentRate - 1.80).toFixed(2);

  // レンジ帯を計算
  const rangeLow = (currentRate - 0.50).toFixed(2);
  const rangeHigh = (currentRate + 1.00).toFixed(2);

  // エントリー価格帯
  const buyEntryLow = (currentRate - 0.70).toFixed(2);
  const buyEntryHigh = (currentRate - 0.50).toFixed(2);
  const sellEntryLow = (currentRate + 0.70).toFixed(2);
  const sellEntryHigh = (currentRate + 0.90).toFixed(2);

  // サポート・レジスタンス
  const supportLow = buyEntryLow;
  const supportHigh = buyEntryHigh;
  const resistanceLow = sellEntryLow;
  const resistanceHigh = rangeHigh;

  return {
    hero: {
      pair: 'USD/JPY',
      bias: 'NEUTRAL',
      confidence: 65,
      nowYen: currentRate,
      buyEntry,
      sellEntry,
    },
    daily: {
      stance: '様子見・レンジ想定',
      session: '東京・ロンドン',
      anchor,
      riskNote: '経済指標・要人発言に注意',
    },
    scenario: {
      strong: `${strongHigh} → ${strongMid} → ${strongTop}（ドル高材料が重なれば）`,
      base: `${baseLow} → ${baseMid} → ${baseHigh}（レンジ継続）`,
      weak: `${weakHigh} → ${weakMid} → ${weakLow}（円高進行なら）`,
    },
    ideas: [
      {
        id: 'sample-idea-1',
        side: '買い',
        entry: `${buyEntryLow}–${buyEntryHigh}`,
        slPips: -25,
        tpPips: 50,
        expected: 2.0,
        confidence: '○',
      },
      {
        id: 'sample-idea-2',
        side: '売り',
        entry: `${sellEntryLow}–${sellEntryHigh}`,
        slPips: -30,
        tpPips: 50,
        expected: 1.67,
        confidence: '○',
      },
    ],
    factors: {
      technical: [
        `日足：${rangeLow}～${rangeHigh}のレンジ形成中`,
        '4H足：方向感なし、RSI 50付近',
        'MA：20MA・50MA が収束中',
      ],
      fundamental: [
        '米雇用統計発表待ち',
        'FRB：政策金利据え置き観測',
        '日銀：政策変更の可能性低',
      ],
      sentiment: [
        'ポジション：中立的',
        '材料待ちムード強い',
        'ボラティリティ低下中',
      ],
    },
    notes: {
      memo: [
        `イベント通過後でボラティリティが落ち着きつつあるUSDJPYについて、短期的な押し目買い・戻り売りの両方のシナリオを検討します。（現在レート: ${anchor}円付近）`,
        `サポート帯：${supportLow}〜${supportHigh}、レジスタンス：${resistanceLow}〜${resistanceHigh} を意識。`,
        'レンジブレイク時は順張りで追随する準備も。',
      ],
    },
  };
}

// 初回アクセス時にUSDJPYサンプル予想を自動生成
export async function createInitialSampleProposal(): Promise<AiProposal | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('User not authenticated');
    return null;
  }

  // 既に予想が存在するかチェック
  const existingProposals = await getAllProposals();
  if (existingProposals.length > 0) {
    return null; // 既に予想があれば生成しない
  }

  // user_settingsのmarket_scan_initializedフラグをチェック
  const { data: settings } = await supabase
    .from('user_settings')
    .select('market_scan_initialized')
    .eq('user_id', user.id)
    .single();

  if (settings?.market_scan_initialized) {
    return null; // 既に初期化済み
  }

  // サンプル予想を生成（現在レートを取得して生成）
  const sampleData = await createSampleUSDJPYData();
  const proposal = await saveProposal(
    sampleData,
    'これは初回アクセス時に自動生成されたUSDJPYのサンプル予想です。現在のレートを基準に生成されています。編集・削除が可能です。',
    'USDJPY',
    '1日'
  );

  // フラグを更新
  if (proposal) {
    await supabase
      .from('user_settings')
      .update({ market_scan_initialized: true })
      .eq('user_id', user.id);
  }

  return proposal;
}
