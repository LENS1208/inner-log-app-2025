import React, { useState, useMemo } from 'react';
import { getAccentColor, getLossColor } from '../../lib/chartColors';
import type { TradeMetrics } from '../../types/evaluation.types';
import { generateRecommendations } from '../../utils/recommendations';
import { HelpIcon } from '../common/HelpIcon';

type Props = {
  metrics?: TradeMetrics;
};

export default function RecommendedActionsSection({ metrics }: Props) {
  const [expanded, setExpanded] = useState(false);

  const actions = useMemo(() => {
    return metrics ? generateRecommendations(metrics) : [];
  }, [metrics]);

  const displayActions = expanded ? actions : actions.slice(0, 3);

  const difficultyColor = (difficulty: string) => {
    if (difficulty === 'Low') return getAccentColor();
    if (difficulty === 'Mid') return getAccentColor();
    return getLossColor();
  };

  if (!metrics || actions.length === 0) {
    return (
      <section className="panel" id="sec9">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
            おすすめ行動（3件＋理由）
            <HelpIcon text="優先度付き施策リストです。" />
          </h3>
        </div>
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)' }}>
          データがありません
        </div>
      </section>
    );
  }

  return (
    <section className="panel" id="sec9">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
          おすすめ行動（3件＋理由）
          <HelpIcon text="優先度付き施策リストです。" />
        </h3>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: 10, borderBottom: '2px solid var(--line)', textAlign: 'left' }}>施策</th>
                <th style={{ padding: 10, borderBottom: '2px solid var(--line)', textAlign: 'left' }}>期待改善</th>
                <th style={{ padding: 10, borderBottom: '2px solid var(--line)', textAlign: 'left' }}>難易度</th>
                <th style={{ padding: 10, borderBottom: '2px solid var(--line)', textAlign: 'center' }}>優先度</th>
                <th style={{ padding: 10, borderBottom: '2px solid var(--line)', textAlign: 'left' }}>理由</th>
              </tr>
            </thead>
            <tbody>
              {displayActions.map((action, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? 'var(--surface)' : 'var(--chip)' }}>
                  <td style={{ padding: 10, borderBottom: '1px solid var(--line)' }}>{action.action}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid var(--line)', fontWeight: 600 }}>{action.expectedImprovement}</td>
                  <td style={{ padding: 10, borderBottom: '1px solid var(--line)' }}>
                    <span style={{ color: difficultyColor(action.difficulty), fontWeight: 600 }}>{action.difficulty}</span>
                  </td>
                  <td style={{ padding: 10, borderBottom: '1px solid var(--line)', textAlign: 'center', fontWeight: 700 }}>
                    {action.priority}
                  </td>
                  <td style={{ padding: 10, borderBottom: '1px solid var(--line)', fontSize: 12, color: 'var(--muted)' }}>
                    {action.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {actions.length > 3 && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {expanded ? '折りたたむ' : 'もっと見る'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
