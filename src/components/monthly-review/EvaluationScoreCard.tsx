import React from 'react';
import type { MonthlyEvaluation } from '../../utils/monthly-evaluation';

interface EvaluationScoreCardProps {
  evaluation: MonthlyEvaluation;
}

export const EvaluationScoreCard: React.FC<EvaluationScoreCardProps> = ({ evaluation }) => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(0, 132, 199, 0.05) 0%, rgba(0, 132, 199, 0.02) 100%)',
      border: '2px solid var(--accent)',
      borderRadius: 10,
      padding: 20,
      textAlign: 'center',
    }}>
      <h3 style={{
        margin: '0 0 4px 0',
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        総合評価スコア（全期間）
      </h3>

      <div style={{
        fontSize: 48,
        fontWeight: 900,
        color: 'var(--accent)',
        lineHeight: 1,
        margin: '10px 0'
      }}>
        {evaluation.scores.overall.toFixed(1)}
      </div>

      <div style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--ink)',
        opacity: 0.8
      }}>
        {evaluation.level}
      </div>
    </div>
  );
};
