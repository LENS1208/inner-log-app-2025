import React from 'react';
import Card from '../common/Card';
import { HelpIcon } from '../common/HelpIcon';

type TodaysPlanCardProps = {
  plan: string[];
};

export default function TodaysPlanCard({ plan }: TodaysPlanCardProps) {
  return (
    <Card>
      <h3 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        今日の見立て
        <HelpIcon text="まず短く「どうするか」。その次に理由を3点。" />
      </h3>
      <ul style={{ margin: '0 0 0 18px', padding: 0, lineHeight: 1.8, color: 'var(--ink)' }}>
        {plan.map((item, idx) => (
          <li key={idx} style={{ marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: item }} />
        ))}
      </ul>
    </Card>
  );
}
