import React from 'react';
import type { KPIRow } from '../../services/ai-coaching/types';

interface KPITableProps {
  kpis: KPIRow[];
}

export function KPITable({ kpis }: KPITableProps) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--line)' }}>
            <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--ink)', fontSize: '16px' }}>
              指標
            </th>
            <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--ink)', fontSize: '16px' }}>
              目標値
            </th>
            <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--ink)', fontSize: '16px' }}>
              説明
            </th>
          </tr>
        </thead>
        <tbody>
          {kpis.map((kpi, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
              <td style={{ padding: '14px 12px', fontWeight: 600, color: 'var(--ink)', fontSize: '15px' }}>{kpi.metric}</td>
              <td style={{ padding: '14px 12px', color: 'var(--accent)', fontWeight: 700, fontSize: '15px' }}>{kpi.target}</td>
              <td style={{ padding: '14px 12px', color: 'var(--ink)', lineHeight: 1.7, fontSize: '15px', fontWeight: 500 }}>{kpi.coachNote}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
