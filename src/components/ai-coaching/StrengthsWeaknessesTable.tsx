import React from 'react';
import type { StrengthWeaknessRow, EvaluationScore } from '../../services/ai-coaching/types';
import { getAccentColor, getLossColor } from '../../lib/chartColors';

interface StrengthsWeaknessesTableProps {
  rows: StrengthWeaknessRow[];
  evaluationScore?: EvaluationScore;
  focusMode?: 'all' | 'strengths' | 'weaknesses';
}

export function StrengthsWeaknessesTable({ rows, evaluationScore, focusMode = 'all' }: StrengthsWeaknessesTableProps) {
  const fixedItems = [
    { key: 'entryTiming', label: 'エントリータイミング', aliases: ['エントリー精度', 'エントリー'] },
    { key: 'riskManagement', label: 'リスク管理', aliases: ['ロット管理', '資金管理'] },
    { key: 'exitStrategy', label: '損切り・利確', aliases: ['出口戦略', 'SL/TP'] },
    { key: 'emotionalControl', label: '感情コントロール', aliases: ['感情制御', 'メンタル管理'] },
    { key: 'consistency', label: '一貫性・再現性', aliases: ['一貫性', '再現性'] },
  ];

  const rowMap = new Map<string, StrengthWeaknessRow>();
  rows.forEach(r => {
    rowMap.set(r.item, r);
  });

  const findRow = (label: string, aliases: string[]) => {
    if (rowMap.has(label)) return rowMap.get(label);
    for (const alias of aliases) {
      if (rowMap.has(alias)) return rowMap.get(alias);
    }
    for (const [key, value] of rowMap.entries()) {
      if (key.includes(label) || label.includes(key)) return value;
      for (const alias of aliases) {
        if (key.includes(alias) || alias.includes(key)) return value;
      }
    }
    return undefined;
  };

  const displayRows = fixedItems.map(({ key, label, aliases }) => {
    const existingRow = findRow(label, aliases);
    const score = evaluationScore ? evaluationScore[key as keyof typeof evaluationScore] as number : undefined;

    return {
      item: label,
      score,
      strength: existingRow?.strength || 'データを取得できませんでした',
      improvement: existingRow?.improvement || 'データを取得できませんでした',
    };
  });

  return (
    <>
      <style>{`
        .strengths-table-desktop {
          display: none;
        }
        .strengths-cards-mobile {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        @media (min-width: 768px) {
          .strengths-table-desktop {
            display: block;
          }
          .strengths-cards-mobile {
            display: none;
          }
        }
      `}</style>

      <div className="strengths-table-desktop" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px', minWidth: focusMode === 'all' ? '700px' : '500px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--line)' }}>
              <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--ink)', fontSize: '16px' }}>
                項目
              </th>
              <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--ink)', width: '90px', fontSize: '16px' }}>
                点数
              </th>
              {(focusMode === 'all' || focusMode === 'strengths') && (
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--ink)', fontSize: '16px' }}>
                  強み
                </th>
              )}
              {(focusMode === 'all' || focusMode === 'weaknesses') && (
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--ink)', fontSize: '16px' }}>
                  改善案
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '14px 12px', fontWeight: 600, color: 'var(--ink)', fontSize: '15px' }}>{row.item}</td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                  {row.score !== undefined ? (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '15px',
                        background:
                          row.score >= 80
                            ? 'rgba(34, 197, 94, 0.1)'
                            : row.score >= 60
                            ? 'rgba(59, 130, 246, 0.1)'
                            : row.score >= 40
                            ? 'rgba(251, 191, 36, 0.1)'
                            : 'rgba(239, 68, 68, 0.1)',
                        color:
                          row.score >= 80
                            ? '#00a218'
                            : row.score >= 60
                            ? '#3b82f6'
                            : row.score >= 40
                            ? '#fbbf24'
                            : getLossColor(),
                      }}
                    >
                      {row.score}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--muted)' }}>-</span>
                  )}
                </td>
                {(focusMode === 'all' || focusMode === 'strengths') && (
                  <td style={{ padding: '14px 12px', color: 'var(--accent)', lineHeight: 1.7, fontSize: '15px', fontWeight: 500 }}>{row.strength}</td>
                )}
                {(focusMode === 'all' || focusMode === 'weaknesses') && (
                  <td style={{ padding: '14px 12px', color: getLossColor(), lineHeight: 1.7, fontSize: '15px', fontWeight: 500 }}>{row.improvement}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="strengths-cards-mobile">
        {displayRows.map((row, i) => (
          <div
            key={i}
            style={{
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '16px',
              background: 'var(--surface)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>{row.item}</h4>
              {row.score !== undefined ? (
                <span
                  style={{
                    display: 'inline-block',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '15px',
                    background:
                      row.score >= 80
                        ? 'rgba(34, 197, 94, 0.1)'
                        : row.score >= 60
                        ? 'rgba(59, 130, 246, 0.1)'
                        : row.score >= 40
                        ? 'rgba(251, 191, 36, 0.1)'
                        : 'rgba(239, 68, 68, 0.1)',
                    color:
                      row.score >= 80
                        ? '#00a218'
                        : row.score >= 60
                        ? '#3b82f6'
                        : row.score >= 40
                        ? '#fbbf24'
                        : '#ef4444',
                  }}
                >
                  {row.score}
                </span>
              ) : (
                <span style={{ color: 'var(--muted)' }}>-</span>
              )}
            </div>
            {(focusMode === 'all' || focusMode === 'strengths') && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginBottom: '4px' }}>強み</div>
                <div style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--accent)', fontWeight: 500 }}>{row.strength}</div>
              </div>
            )}
            {(focusMode === 'all' || focusMode === 'weaknesses') && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginBottom: '4px' }}>改善案</div>
                <div style={{ fontSize: '14px', lineHeight: 1.7, color: getLossColor(), fontWeight: 500 }}>{row.improvement}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
