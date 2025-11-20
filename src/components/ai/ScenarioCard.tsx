import React from 'react';
import Card from '../common/Card';
import { HelpIcon } from '../common/HelpIcon';

type ScenarioCardProps = {
  scenario: {
    strong: string;
    base: string;
    weak: string;
  };
};

export default function ScenarioCard({ scenario }: ScenarioCardProps) {
  return (
    <Card>
      <h3 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        シナリオ
        <HelpIcon text="価格の想定パスを強気・中立・弱気の3パターンで表示します。" />
      </h3>
      <ul style={{ margin: '0 0 0 18px', padding: 0, lineHeight: 1.8, color: 'var(--ink)' }}>
        <li style={{ marginBottom: 4 }}><strong>強気：</strong>{scenario.strong}</li>
        <li style={{ marginBottom: 4 }}><strong>中立：</strong>{scenario.base}</li>
        <li style={{ marginBottom: 4 }}><strong>弱気：</strong>{scenario.weak}</li>
      </ul>
    </Card>
  );
}
