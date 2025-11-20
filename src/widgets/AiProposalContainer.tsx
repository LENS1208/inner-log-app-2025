import React, { useEffect, useState } from 'react';
import AiProposalPage from '../pages/AiProposalPage';
import {
  getProposal,
  saveProposal,
  updateProposal,
  regenerateProposal,
  mapProposalToData,
  type AiProposal,
} from '../services/aiProposal.service';
import type { AiProposalData } from '../types/ai-proposal.types';
import { showToast } from '../lib/toast';
import { supabase } from '../lib/supabase';

type AiProposalContainerProps = {
  proposalId?: string;
  onBack: () => void;
  onNavigateToTradeNote: (ideaId: string) => void;
};

const MOCK_DATA: AiProposalData = {
  hero: {
    pair: 'USD/JPY',
    bias: 'SELL',
    confidence: 72,
    nowYen: 147.25,
    buyEntry: '148.00',
    sellEntry: '147.00',
  },
  daily: {
    stance: '戻り売り優先',
    session: '東京・欧州前場',
    anchor: '147.00',
    riskNote: 'イベント待機',
  },
  scenario: {
    strong: '146.50 → 145.80 → 145.00（雇用統計ネガティブなら）',
    base: '147.20 → 146.80 → 146.20（様子見継続）',
    weak: '147.80 → 148.20 → 148.80（サプライズ高なら損切り）',
  },
  ideas: [
    {
      id: 'idea-1',
      side: '売り',
      entry: '147.00–147.20',
      slPips: -30,
      tpPips: 50,
      expected: 1.67,
      confidence: '◎',
    },
    {
      id: 'idea-2',
      side: '売り',
      entry: '147.50–147.70',
      slPips: -25,
      tpPips: 40,
      expected: 1.60,
      confidence: '○',
    },
  ],
  factors: {
    technical: [
      '4H足：147.50 レジスタンス反応',
      '日足：陰線継続、下降トレンド維持',
      'RSI：55 → やや過熱感',
    ],
    fundamental: [
      '米雇用統計・金曜発表控え',
      'FRB タカ派後退観測',
      '日銀：据え置き濃厚',
    ],
    sentiment: [
      'ポジション：円売り過多（巻き戻しリスク）',
      'ドル高一服感、材料待ち',
    ],
  },
  notes: {
    memo: [
      '147.00 で 4H足陰線確定なら売り増し検討',
      '148.00 超えは損切りライン',
      'イベント前は玉を軽めに',
    ],
  },
};

export default function AiProposalContainer({
  proposalId,
  onBack,
  onNavigateToTradeNote,
}: AiProposalContainerProps) {
  const [proposalData, setProposalData] = useState<AiProposalData>(MOCK_DATA);
  const [currentProposal, setCurrentProposal] = useState<AiProposal | null>(null);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [pair, setPair] = useState('USD/JPY');
  const [timeframe, setTimeframe] = useState('4H');
  const [rating, setRating] = useState<number | null>(null);

  useEffect(() => {
    if (proposalId) {
      loadProposal(proposalId);
    }
  }, [proposalId]);

  async function loadProposal(id: string) {
    setLoading(true);
    const proposal = await getProposal(id);
    if (proposal) {
      setCurrentProposal(proposal);
      setProposalData(mapProposalToData(proposal));
      setPrompt(proposal.prompt);
      setPair(proposal.pair);
      setTimeframe(proposal.timeframe);
      setRating(proposal.user_rating || null);
    }
    setLoading(false);
  }

  async function handleGenerate(payload: any) {
    setPrompt(payload.prompt);
    setPair(payload.pair);
    setTimeframe(payload.timeframe);

    setLoading(true);
    showToast('予想を生成中...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('ログインが必要です');
      }

      const { generateAiProposal } = await import('../services/generateAiProposal');
      const generatedData = await generateAiProposal({
        prompt: payload.prompt,
        pair: payload.pair,
        timeframe: payload.timeframe,
        period: payload.period || '本日',
      });

      console.log('AI生成データ:', generatedData);
      setProposalData(generatedData);

      const saved = await saveProposal(generatedData, payload.prompt, payload.pair, payload.timeframe);
      if (saved) {
        setCurrentProposal(saved);
        showToast('予想を生成しました');
        location.hash = `/ai-proposal/${saved.id}`;
      } else {
        showToast('保存に失敗しました');
      }
    } catch (error) {
      console.error('Error generating proposal:', error);
      showToast(error instanceof Error ? error.message : '予想の生成に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    if (!currentProposal) {
      showToast('予想が読み込まれていません');
      return;
    }

    setLoading(true);
    try {
      showToast('予想を再生成中...');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('ログインが必要です');
      }

      const { generateAiProposal } = await import('../services/generateAiProposal');
      const generatedData = await generateAiProposal({
        prompt: prompt,
        pair: pair,
        timeframe: timeframe,
        period: '本日',
      });

      const regenerated = await regenerateProposal(
        currentProposal.id,
        generatedData,
        prompt
      );

      if (regenerated) {
        showToast('予想を再生成しました');
        location.hash = `/ai-proposal/${regenerated.id}`;
      } else {
        showToast('再生成に失敗しました');
      }
    } catch (error) {
      console.error('Error regenerating proposal:', error);
      showToast(error instanceof Error ? error.message : '再生成に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function handleFix() {
    setLoading(true);
    try {
      if (currentProposal) {
        const updated = await updateProposal(currentProposal.id, proposalData);
        if (updated) {
          setCurrentProposal(updated);
          showToast('予想を更新しました');
        }
      } else {
        const saved = await saveProposal(proposalData, prompt, pair, timeframe);
        if (saved) {
          setCurrentProposal(saved);
          showToast('予想を保存しました');
        }
      }
    } catch (error) {
      showToast('保存に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function handleRatingChange(newRating: number) {
    if (!currentProposal) return;

    setRating(newRating);

    try {
      const { error } = await supabase
        .from('ai_proposals')
        .update({ user_rating: newRating })
        .eq('id', currentProposal.id);

      if (error) {
        throw error;
      }

      showToast('評価を保存しました');
    } catch (error) {
      console.error('Error saving rating:', error);
      showToast('評価の保存に失敗しました');
      setRating(currentProposal.user_rating || null);
    }
  }

  if (loading && !proposalData) {
    return (
      <div style={{ width: '100%', padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
        読み込み中...
      </div>
    );
  }

  return (
    <AiProposalPage
      hero={proposalData.hero}
      daily={proposalData.daily}
      scenario={proposalData.scenario}
      ideas={proposalData.ideas}
      factors={proposalData.factors}
      notes={proposalData.notes}
      prompt={prompt}
      pair={pair}
      timeframe={timeframe}
      targetDate={currentProposal?.created_at ? new Date(currentProposal.created_at).toISOString().split('T')[0] : undefined}
      rating={rating}
      onRatingChange={handleRatingChange}
      onBackToList={onBack}
      onGenerate={handleGenerate}
      onRegenerate={handleRegenerate}
      onFix={handleFix}
      onCreateTradeNote={onNavigateToTradeNote}
    />
  );
}
