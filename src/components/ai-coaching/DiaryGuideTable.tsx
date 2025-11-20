import React from 'react';
import type { DiaryGuideRow } from '../../services/ai-coaching/types';

interface DiaryGuideTableProps {
  rows: DiaryGuideRow[];
}

export function DiaryGuideTable({ rows }: DiaryGuideTableProps) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--line)' }}>
            <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--ink)', fontSize: '16px' }}>
              記録項目
            </th>
            <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--ink)', fontSize: '16px' }}>
              記録内容
            </th>
            <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--ink)', fontSize: '16px' }}>
              活用法
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
              <td style={{ padding: '14px 12px', fontWeight: 600, color: 'var(--ink)', fontSize: '15px' }}>{row.item}</td>
              <td style={{ padding: '14px 12px', color: 'var(--ink)', lineHeight: 1.7, fontSize: '15px', fontWeight: 500 }}>{row.content}</td>
              <td style={{ padding: '14px 12px', color: 'var(--ink)', lineHeight: 1.7, fontSize: '15px', fontWeight: 500 }}>{row.coachNote}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
