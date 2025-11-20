import React from 'react';
import type { FourWeekPlanRow } from '../../services/ai-coaching/types';

interface FourWeekPlanTableProps {
  weeks: FourWeekPlanRow[];
}

export function FourWeekPlanTable({ weeks }: FourWeekPlanTableProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
      {weeks.map((week, i) => (
        <div
          key={i}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '12px',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div
              style={{
                background: 'var(--accent)',
                color: 'white',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              {week.week}
            </div>
            <div style={{ fontWeight: 700, fontSize: '17px', color: 'var(--ink)' }}>{week.theme}</div>
          </div>
          <div style={{ fontSize: '16px', color: 'var(--ink)', marginBottom: '10px', lineHeight: 1.8, fontWeight: 500 }}>
            {week.content}
          </div>
          {week.coachNote && (
            <div style={{ fontSize: '15px', color: 'var(--ink)', fontStyle: 'italic', lineHeight: 1.6, opacity: 0.8 }}>
              💡 {week.coachNote}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
