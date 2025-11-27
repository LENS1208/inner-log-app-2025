import { supabase } from '../lib/supabase';
import type { AiProposalData } from '../types/ai-proposal.types';

export type AiProposal = {
  id: string;
  user_id: string | null;
  pair: string;
  timeframe: string;
  bias: string;
  confidence: number;
  hero_data: any;
  daily_actions: any;
  scenario: any;
  ideas: any[];
  factors: any;
  notes: any;
  is_fixed: boolean;
  prompt: string;
  parent_id: string | null;
  version: number;
  user_rating: number | null;
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

  const { data, error } = await supabase
    .from('ai_proposals')
    .insert({
      user_id: user?.id || null,
      pair,
      timeframe,
      bias: proposalData.hero.bias,
      confidence: proposalData.hero.confidence,
      hero_data: proposalData.hero,
      daily_actions: proposalData.daily,
      scenario: proposalData.scenario,
      ideas: proposalData.ideas,
      factors: proposalData.factors,
      notes: proposalData.notes,
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
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (proposalData.hero) {
    updateData.hero_data = proposalData.hero;
    updateData.bias = proposalData.hero.bias;
    updateData.confidence = proposalData.hero.confidence;
  }
  if (proposalData.daily) updateData.daily_actions = proposalData.daily;
  if (proposalData.scenario) updateData.scenario = proposalData.scenario;
  if (proposalData.ideas) updateData.ideas = proposalData.ideas;
  if (proposalData.factors) updateData.factors = proposalData.factors;
  if (proposalData.notes) updateData.notes = proposalData.notes;

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

  const parent = await getProposal(parentId);
  if (!parent) {
    console.error('Parent proposal not found');
    return null;
  }

  const { data, error } = await supabase
    .from('ai_proposals')
    .insert({
      user_id: user?.id || null,
      pair: parent.pair,
      timeframe: parent.timeframe,
      bias: proposalData.hero.bias,
      confidence: proposalData.hero.confidence,
      hero_data: proposalData.hero,
      daily_actions: proposalData.daily,
      scenario: proposalData.scenario,
      ideas: proposalData.ideas,
      factors: proposalData.factors,
      notes: proposalData.notes,
      is_fixed: true,
      prompt: prompt || parent.prompt,
      parent_id: parentId,
      version: parent.version + 1,
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
  return {
    hero: proposal.hero_data,
    daily: proposal.daily_actions,
    scenario: proposal.scenario,
    ideas: proposal.ideas,
    factors: proposal.factors,
    notes: proposal.notes,
  };
}
