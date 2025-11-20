import React from 'react';
import { getAccentColor, getLossColor } from "../lib/chartColors";
import HeroSummary from '../components/ai/HeroSummary';
import DailyActions from '../components/ai/DailyActions';
import TodaysPlanCard from '../components/ai/TodaysPlanCard';
import ScenarioCard from '../components/ai/ScenarioCard';
import TradeIdeasTable from '../components/ai/TradeIdeasTable';
import RiskNotes from '../components/ai/RiskNotes';
import FactorsCard from '../components/ai/FactorsCard';
import LinkedNotes from '../components/ai/LinkedNotes';
import AiAdvice from '../components/ai/AiAdvice';
import type { AiProposalData, AiProposalHandlers } from '../types/ai-proposal.types';
import '../styles/journal-notebook.css';

type AiProposalPageProps = AiProposalData & AiProposalHandlers & {
  prompt?: string;
  pair?: string;
  timeframe?: string;
  targetDate?: string;
  rating?: number | null;
  onRatingChange?: (rating: number) => void;
  onBackToList?: () => void;
};

export default function AiProposalPage({
  hero,
  daily,
  scenario,
  ideas,
  factors,
  notes,
  prompt,
  pair,
  timeframe,
  targetDate,
  rating,
  onRatingChange,
  onBackToList,
  onGenerate,
  onRegenerate,
  onFix,
  onCreateTradeNote,
}: AiProposalPageProps) {
  const todaysPlan = [
    '<b>戻り売り優先</b>（147.00 上で陽線包みなら短期買いも）',
    '時間帯：10:00–12:00 / 16:00–17:30 を主戦場に',
    'イベント：パウエル発言・雇用関連は一時撤退',
  ];

  const risks = ['ボラ急拡大', '介入ヘッドライン', '要人発言', '地政学'];

  return (
    <div style={{ width: '100%', padding: 16 }}>
      <HeroSummary hero={hero} rating={rating} onRatingChange={onRatingChange} />

      {prompt && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>入力プロンプト</span>
            {pair && (
              <span style={{
                padding: '2px 6px',
                background: getAccentColor(0.1),
                color: getAccentColor(),
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
              }}>
                {pair}
              </span>
            )}
            {timeframe && (
              <span style={{
                padding: '2px 6px',
                background: getAccentColor(0.1),
                color: getAccentColor(),
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
              }}>
                {timeframe}
              </span>
            )}
            {targetDate && (
              <span style={{
                padding: '2px 6px',
                background: 'rgba(107, 114, 128, 0.1)',
                color: 'rgb(107, 114, 128)',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
              }}>
                {targetDate}
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>
            {prompt}
          </p>
        </div>
      )}

      <section className="grid-ai" style={{ marginTop: 12 }}>
        <div className="list">
          <DailyActions daily={daily} />
          <TodaysPlanCard plan={todaysPlan} />
          <ScenarioCard scenario={scenario} />
          <TradeIdeasTable
            ideas={ideas}
            hero={hero}
            onCreateTradeNote={onCreateTradeNote}
          />
          <RiskNotes risks={risks} />
        </div>

        <div className="list">
          <FactorsCard factors={factors} />
          <LinkedNotes notes={notes} />
          <AiAdvice />
        </div>
      </section>
    </div>
  );
}
