import React from 'react';
import type { RuleRow } from '../../services/ai-coaching/types';

interface RulesTableProps {
  rules: RuleRow[];
}

export function RulesTable({ rules }: RulesTableProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: '12px'
    }}>
      {rules.map((rule, i) => (
        <div
          key={i}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div
              style={{
                background: 'var(--accent)',
                color: 'white',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div style={{ fontWeight: 700, fontSize: '17px', color: 'var(--ink)' }}>{rule.title}</div>
          </div>
          <div style={{ fontSize: '16px', color: 'var(--ink)', lineHeight: 1.8, fontWeight: 500 }}>
            {rule.content}
          </div>
        </div>
      ))}
    </div>
  );
}
