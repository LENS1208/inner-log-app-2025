import type { AiProposalData } from '../types/ai-proposal.types';
import { supabase } from '../lib/supabase';

interface GenerateProposalParams {
  prompt: string;
  pair: string;
  timeframe: string;
  period: string;
}

export async function generateAiProposal(
  params: GenerateProposalParams
): Promise<AiProposalData> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Supabase URL not configured');
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User not authenticated');
  }

  const apiUrl = `${supabaseUrl}/functions/v1/generate-ai-proposal`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: params.prompt,
      pair: params.pair,
      timeframe: params.timeframe,
      period: params.period,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    // OpenAI APIキー未設定の場合は、わかりやすいエラーメッセージを表示
    if (response.status === 500 && errorData.error?.includes('OpenAI API key')) {
      throw new Error('AI機能を使用するには、SupabaseダッシュボードでOPENAI_API_KEYを設定する必要があります。');
    }

    throw new Error(`AI API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
  }

  const proposalData: AiProposalData = await response.json();
  return proposalData;
}
