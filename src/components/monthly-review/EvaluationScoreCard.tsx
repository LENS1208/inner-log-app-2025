import React from 'react';
import type { MonthlyEvaluation } from '../../utils/monthly-evaluation';
import { HelpIcon } from '../common/HelpIcon';

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
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
        <h3 style={{
          margin: 0,
          fontSize: 15,
          fontWeight: 'bold',
          color: 'var(--muted)',
        }}>
          総合評価スコア
        </h3>
        <HelpIcon text="エントリー技術、ドローダウン耐性、リスクリワード力、リスク管理力、収益安定力の5つの評価軸を総合した、あなたのトレーディングスキルの総合評価です。10点満点で評価され、スコアが高いほど優れたトレーダーであることを示します。" />
      </div>

      <div style={{
        fontSize: 48,
        fontWeight: 900,
        color: 'var(--accent)',
        lineHeight: 1,
        margin: '12px 0'
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
