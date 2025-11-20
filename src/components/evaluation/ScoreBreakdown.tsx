import React from 'react';
import type { EvaluationScore } from '../../services/ai-coaching/types';

type ScoreBreakdownProps = {
  score: EvaluationScore;
};

export function ScoreBreakdown({ score }: ScoreBreakdownProps) {
  const items = [
    { label: 'リスク管理', value: score.riskManagement, icon: '🛡️' },
    { label: 'エントリー精度', value: score.entryTiming, icon: '🎯' },
    { label: '出口戦略', value: score.exitStrategy, icon: '🚪' },
    { label: '感情制御', value: score.emotionalControl, icon: '🧠' },
    { label: '一貫性', value: score.consistency, icon: '📊' },
  ];

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            background: 'var(--surface)',
            borderRadius: '8px',
            border: '1px solid var(--line)',
          }}
        >
          <div style={{ fontSize: '20px' }}>{item.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
              {item.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  flex: 1,
                  height: '6px',
                  background: 'var(--chip)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${item.value}%`,
                    height: '100%',
                    background: getScoreColor(item.value),
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: getScoreColor(item.value),
                  minWidth: '40px',
                  textAlign: 'right',
                }}
              >
                {item.value}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function getScoreColor(value: number): string {
  if (value >= 80) return '#10b981';
  if (value >= 70) return '#3b82f6';
  if (value >= 60) return '#f59e0b';
  if (value >= 50) return getLossColor();
  return '#991b1b';
}
