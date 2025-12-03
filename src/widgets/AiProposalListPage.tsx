import React, { useEffect, useState } from 'react';
import { getGridLineColor, getAccentColor, getLossColor } from "../lib/chartColors";
import { getAllProposals, deleteProposal, saveProposal, createInitialSampleProposal, type AiProposal } from '../services/aiProposal.service';
import { showToast } from '../lib/toast';
import type { AiProposalData } from '../types/ai-proposal.types';
import { supabase } from '../lib/supabase';
import StarRating from '../components/ai/StarRating';
import { HelpIcon } from '../components/common/HelpIcon';

type AiProposalListPageProps = {
  onSelectProposal: (id: string) => void;
};

const MOCK_PROPOSAL_DATA: AiProposalData = {
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

export default function AiProposalListPage({ onSelectProposal }: AiProposalListPageProps) {
  const [proposals, setProposals] = useState<AiProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState({ pair: 'all', bias: 'all' });

  const [prompt, setPrompt] = useState('');
  const [pair, setPair] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [period, setPeriod] = useState('');

  useEffect(() => {
    initializeAndLoadProposals();
  }, []);

  async function initializeAndLoadProposals() {
    setLoading(true);

    // 初回アクセス時にサンプル予想を自動生成
    const sampleProposal = await createInitialSampleProposal();
    if (sampleProposal) {
      console.log('Initial USDJPY sample proposal created');
    }

    // 予想一覧を読み込み
    const data = await getAllProposals();
    setProposals(data);
    setLoading(false);
  }

  async function loadProposals() {
    setLoading(true);
    const data = await getAllProposals();
    setProposals(data);
    setLoading(false);
  }

  async function handleGenerate() {
    if (!prompt.trim()) {
      showToast('予想内容を入力してください');
      return;
    }
    if (!pair) {
      showToast('銘柄を選択してください');
      return;
    }
    if (!timeframe) {
      showToast('分析足を選択してください');
      return;
    }
    if (!period) {
      showToast('予想期間を選択してください');
      return;
    }

    setGenerating(true);
    try {
      showToast('予想を生成中...');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('ログインが必要です');
      }

      console.log('🔥 AI生成開始:', { prompt, pair, timeframe, period });

      const { generateAiProposal } = await import('../services/generateAiProposal');
      const proposalData = await generateAiProposal({
        prompt,
        pair,
        timeframe,
        period,
      });

      console.log('✅ AI生成データを受信:', proposalData);
      const newProposal = await saveProposal(proposalData, prompt, pair, timeframe);

      if (newProposal) {
        showToast('予想を生成しました');
        setPrompt('');
        setPair('');
        setTimeframe('');
        setPeriod('');
        await loadProposals();
        onSelectProposal(newProposal.id);
      } else {
        showToast('予想の生成に失敗しました');
      }
    } catch (error) {
      console.error('Error generating proposal:', error);
      showToast('予想の生成に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'));
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('この予想を削除しますか？')) return;

    const success = await deleteProposal(id);
    if (success) {
      showToast('予想を削除しました');
      loadProposals();
    } else {
      showToast('削除に失敗しました');
    }
  }

  async function handleRatingChange(id: string, newRating: number) {
    try {
      const { error } = await supabase
        .from('ai_proposals')
        .update({ user_rating: newRating })
        .eq('id', id);

      if (error) {
        throw error;
      }

      setProposals((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, user_rating: newRating } : p
        )
      );

      showToast('評価を保存しました');
    } catch (error) {
      console.error('Error saving rating:', error);
      showToast('評価の保存に失敗しました');
    }
  }

  const filteredProposals = proposals.filter((p) => {
    if (filter.pair !== 'all' && p.pair !== filter.pair) return false;
    if (filter.bias !== 'all' && p.bias !== filter.bias) return false;
    return true;
  });

  const uniquePairs = Array.from(new Set(proposals.map((p) => p.pair)));

  const groupedProposals = filteredProposals.reduce((groups, proposal) => {
    const date = new Date(proposal.created_at).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(proposal);
    return groups;
  }, {} as Record<string, AiProposal[]>);

  const sortedDates = Object.keys(groupedProposals).sort((a, b) => {
    const dateA = new Date(groupedProposals[a][0].created_at);
    const dateB = new Date(groupedProposals[b][0].created_at);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div style={{ display: 'flex', gap: 16, padding: 16, alignItems: 'flex-start' }}>
      <div style={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column' }}>
        <section
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 32,
            padding: 40,
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 16,
          }}
        >
        <div>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            新しい予想を生成
            <HelpIcon text="相場状況やトレードアイデアを入力してAIに分析を依頼できます。銘柄・分析足・予想期間を選択して生成してください。" />
          </h3>
        </div>

        <div style={{ display: 'grid', gap: 24 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>
              分析内容・トレードアイデア
            </label>
            <textarea
              className="btn"
              style={{
                width: '100%',
                minHeight: 120,
                boxSizing: 'border-box',
                resize: 'vertical',
                fontFamily: 'inherit',
                fontSize: 14,
                lineHeight: 1.6,
                padding: 14,
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                borderRadius: 8,
              }}
              placeholder="例）USDJPY、イベント控えでボラが低い。147.00近辺でレジスタンス確認。戻り売りのシナリオを検討したい。"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={generating}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>
                銘柄
              </label>
              <select
                className="btn"
                value={pair}
                onChange={(e) => setPair(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '14px 14px',
                  fontSize: 14,
                  lineHeight: '1.5',
                  height: '48px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                }}
                disabled={generating}
              >
                <option value="" disabled>選択してください</option>
                <optgroup label="主要通貨ペア">
                  <option>USD/JPY</option>
                  <option>EUR/USD</option>
                  <option>GBP/USD</option>
                  <option>USD/CHF</option>
                  <option>AUD/USD</option>
                  <option>NZD/USD</option>
                  <option>USD/CAD</option>
                </optgroup>
                <optgroup label="クロス円">
                  <option>EUR/JPY</option>
                  <option>GBP/JPY</option>
                  <option>AUD/JPY</option>
                  <option>CHF/JPY</option>
                  <option>CAD/JPY</option>
                </optgroup>
                <optgroup label="ユーロクロス">
                  <option>EUR/GBP</option>
                  <option>EUR/AUD</option>
                  <option>EUR/CHF</option>
                </optgroup>
                <optgroup label="貴金属">
                  <option>Gold (XAU/USD)</option>
                  <option>Silver (XAG/USD)</option>
                </optgroup>
                <optgroup label="仮想通貨">
                  <option>BTC/USD</option>
                  <option>ETH/USD</option>
                </optgroup>
                <optgroup label="株価指数">
                  <option>US30 (Dow)</option>
                  <option>NAS100 (Nasdaq)</option>
                  <option>SPX500 (S&P500)</option>
                  <option>JP225 (Nikkei)</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>
                分析期間
              </label>
              <div style={{ display: 'flex', flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
                {['1時間', '4時間', '1日', '1週間', '1ヶ月'].map((option) => (
                  <label
                    key={option}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: generating ? 'not-allowed' : 'pointer',
                      fontSize: 14,
                      color: 'var(--ink)',
                    }}
                  >
                    <input
                      type="radio"
                      name="timeframe"
                      value={option}
                      checked={timeframe === option}
                      onChange={(e) => setTimeframe(e.target.value)}
                      disabled={generating}
                      style={{ cursor: generating ? 'not-allowed' : 'pointer' }}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>
                予想期間
              </label>
              <div style={{ display: 'flex', flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
                {[
                  { value: '短期', label: '短期（24時間）' },
                  { value: '中期', label: '中期（1週間）' },
                  { value: '長期', label: '長期（1ヶ月）' }
                ].map((option) => (
                  <label
                    key={option.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: generating ? 'not-allowed' : 'pointer',
                      fontSize: 14,
                      color: 'var(--ink)',
                    }}
                  >
                    <input
                      type="radio"
                      name="period"
                      value={option.value}
                      checked={period === option.value}
                      onChange={(e) => setPeriod(e.target.value)}
                      disabled={generating}
                      style={{ cursor: generating ? 'not-allowed' : 'pointer' }}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          className="btn"
          onClick={handleGenerate}
          disabled={generating}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: generating ? 'var(--muted)' : 'var(--accent)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 15,
            borderRadius: 8,
            border: 'none',
            cursor: generating ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {generating ? '生成中...' : 'AIに予想を生成してもらう'}
        </button>
      </section>
      </div>

      <div style={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          className="btn"
          value={filter.pair}
          onChange={(e) => setFilter({ ...filter, pair: e.target.value })}
          style={{
            fontSize: 14,
            padding: '8px 12px',
            background: 'var(--input-bg)',
            border: '1px solid var(--line)',
            borderRadius: 8,
          }}
        >
          <option value="all">全通貨ペア</option>
          {uniquePairs.map((pair) => (
            <option key={pair} value={pair}>{pair}</option>
          ))}
        </select>

        <select
          className="btn"
          value={filter.bias}
          onChange={(e) => setFilter({ ...filter, bias: e.target.value })}
          style={{
            fontSize: 14,
            padding: '8px 12px',
            background: 'var(--input-bg)',
            border: '1px solid var(--line)',
            borderRadius: 8,
          }}
        >
          <option value="all">全バイアス</option>
          <option value="BUY">買い</option>
          <option value="SELL">売り</option>
          <option value="NEUTRAL">中立</option>
        </select>
      </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>読み込み中...</div>
          ) : filteredProposals.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: 60,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 16
            }}>
              <p style={{ fontSize: 16, color: 'var(--muted)', marginBottom: 0 }}>
                まだ予想がありません。左のフォームから最初の予想を生成してください。
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {sortedDates.map((date) => (
                <div key={date}>
                  <h3 style={{
                    margin: '0 0 12px 0',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--muted)',
                    paddingLeft: 4,
                  }}>
                    {date}
                  </h3>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {groupedProposals[date].map((proposal) => (
                      <div
                        key={proposal.id}
                        onClick={() => onSelectProposal(proposal.id)}
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--line)',
                          borderRadius: 16,
                          padding: 16,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--line)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold', color: 'var(--ink)' }}>
                                {proposal.pair} / {proposal.timeframe}
                              </h3>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  background: proposal.bias === 'BUY' ? 'rgba(0, 162, 24, 0.1)' :
                                             proposal.bias === 'SELL' ? getLossColor(0.1) :
                                             'rgba(107, 114, 128, 0.1)',
                                  color: proposal.bias === 'BUY' ? 'rgb(0, 162, 24)' :
                                         proposal.bias === 'SELL' ? getLossColor() :
                                         'rgb(107, 114, 128)',
                                }}
                              >
                                {proposal.bias === 'BUY' ? '買い' : proposal.bias === 'SELL' ? '売り' : '中立'}
                              </span>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  background: getAccentColor(0.1),
                                  color: getAccentColor(),
                                }}
                              >
                                信頼度 {proposal.confidence}%
                              </span>
                              <div
                                style={{
                                  marginLeft: 'auto',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 12,
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div style={{ fontSize: 14 }}>
                                  <StarRating
                                    rating={proposal.user_rating || null}
                                    onChange={(rating) => handleRatingChange(proposal.id, rating)}
                                    showLabel={false}
                                  />
                                </div>
                                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                                  {new Date(proposal.created_at).toLocaleTimeString('ja-JP', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </div>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                              {proposal.prompt || '予想を生成しました'}
                            </p>
                          </div>
                          <button
                            className="btn"
                            onClick={(e) => handleDelete(proposal.id, e)}
                            style={{
                              fontSize: 12,
                              padding: '4px 12px',
                              background: getLossColor(0.1),
                              color: getLossColor(),
                              marginLeft: 12,
                            }}
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
