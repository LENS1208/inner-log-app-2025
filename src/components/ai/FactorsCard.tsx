import React from 'react';
import Card from '../common/Card';
import { HelpIcon } from '../common/HelpIcon';
import type { Factors } from '../../types/ai-proposal.types';

type FactorsCardProps = {
  factors: Factors;
};

export default function FactorsCard({ factors }: FactorsCardProps) {
  return (
    <Card>
      <h3 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        分析要因
        <HelpIcon text="根拠の内訳をテクニカル、ファンダメンタルズ、センチメントの3軸で表示します。" />
      </h3>
      <div className="analysis-vertical">
        <div>
          <h5 style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>テクニカル（チャートの動き）</h5>
          <ul style={{ margin: '0 0 0 18px', padding: 0, lineHeight: 1.8, color: 'var(--ink)' }}>
            {factors.technical.map((item, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h5 style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>ファンダメンタルズ（経済の材料）</h5>
          <ul style={{ margin: '0 0 0 18px', padding: 0, lineHeight: 1.8, color: 'var(--ink)' }}>
            {factors.fundamental.map((item, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h5 style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>センチメント（市場の雰囲気）</h5>
          <ul style={{ margin: '0 0 0 18px', padding: 0, lineHeight: 1.8, color: 'var(--ink)' }}>
            {factors.sentiment.map((item, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
