import React from 'react';
import { getAccentColor, getLossColor } from '../../lib/chartColors';

type OverallScoreProps = {
  score: number;
  rank: string;
};

export default function OverallScore({ score, rank }: OverallScoreProps) {
  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '16px 8px'
    }}>
      <div
        style={{
          fontSize: 64,
          fontWeight: 900,
          lineHeight: 1,
          color: 'var(--ink)',
        }}
      >
        {score.toFixed(1)}
      </div>
    </div>
  );
}
