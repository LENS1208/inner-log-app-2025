import React from 'react';
import Card from '../common/Card';
import { HelpIcon } from '../common/HelpIcon';

type RiskNotesProps = {
  risks: string[];
};

export default function RiskNotes({ risks }: RiskNotesProps) {
  return (
    <Card>
      <h3 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        注意点
        <HelpIcon text="リスク要因＆無効化条件。高インパクト前後は玉軽め、サプライズで一時撤退してください。" />
      </h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {risks.map((risk, idx) => (
          <span key={idx} className="tag">
            {risk}
          </span>
        ))}
      </div>
    </Card>
  );
}
