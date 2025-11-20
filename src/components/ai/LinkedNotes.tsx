import React from 'react';
import Card from '../common/Card';
import { HelpIcon } from '../common/HelpIcon';

type LinkedNotesProps = {
  notes: {
    memo: string[];
  };
};

export default function LinkedNotes({ notes }: LinkedNotesProps) {
  return (
    <Card>
      <h3 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        メモ
        <HelpIcon text="なぜそう考えるか、根拠の要点をメモとして記録します。" />
      </h3>
      <ul style={{ margin: '0 0 0 18px', padding: 0, lineHeight: 1.8, color: 'var(--ink)' }}>
        {notes.memo.map((item, idx) => (
          <li key={idx} style={{ marginBottom: 4 }}>{item}</li>
        ))}
      </ul>
    </Card>
  );
}
