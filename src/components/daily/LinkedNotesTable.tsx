import React from 'react';
import type { LinkedNoteRow } from './types';

type LinkedNotesTableProps = {
  notes: LinkedNoteRow[];
  onOpenNote?: (title: string) => void;
};

export default function LinkedNotesTable({ notes, onOpenNote }: LinkedNotesTableProps) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--line)' }}>
            <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>タイトル</th>
            <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>種類</th>
            <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>更新</th>
            <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {notes.map((note, idx) => (
            <tr
              key={idx}
              className="trade-row"
              style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
            >
              <td style={{ padding: '12px 8px', fontSize: 13 }}>{note.title}</td>
              <td style={{ padding: '12px 8px', fontSize: 13 }}>{note.kind}</td>
              <td style={{ padding: '12px 8px', fontSize: 13 }}>{note.updated}</td>
              <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                <button
                  onClick={() => onOpenNote?.(note.title)}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 6,
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  表示
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
