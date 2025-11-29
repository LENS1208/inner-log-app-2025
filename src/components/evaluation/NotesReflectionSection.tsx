import React, { useState } from 'react';
import { getAccentColor, getLossColor } from '../../lib/chartColors';
import { HelpIcon } from '../common/HelpIcon';

type Bias = {
  name: string;
  description: string;
  severity: 'Low' | 'Mid' | 'High';
};

export default function NotesReflectionSection() {
  const [reflection, setReflection] = useState('');

  const emotionTrend = [
    { date: '12/15', emotion: '冷静', score: 8 },
    { date: '12/16', emotion: '焦り', score: 3 },
    { date: '12/17', emotion: '冷静', score: 7 },
    { date: '12/18', emotion: '興奮', score: 5 },
    { date: '12/19', emotion: '冷静', score: 8 },
  ];

  const detectedBiases: Bias[] = [
    {
      name: 'リベンジトレード',
      description: '連敗後に無理なエントリーをする傾向が見られます',
      severity: 'High',
    },
    {
      name: '利小損大',
      description: '勝ちトレードを早く切り、負けトレードを引っ張る傾向',
      severity: 'Mid',
    },
    {
      name: '過信バイアス',
      description: '連勝後にロットサイズを上げる傾向',
      severity: 'Low',
    },
  ];

  const severityColor = (severity: string) => {
    if (severity === 'High') return getLossColor();
    if (severity === 'Mid') return '#f59e0b';
    return getAccentColor();
  };

  return (
    <section className="panel" id="sec12">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
          メモ・ふり返り
          <HelpIcon text="取引日記から感情の傾向、行動パターン、心理的バイアスを分析します。メンタル面の課題を発見できます。" />
        </h3>
      </div>
      <div style={{ padding: '12px 16px' }}>
        <style>{`
          .notes-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
            margin-bottom: 20px;
            min-width: 0;
          }
          @media (min-width: 768px) {
            .notes-grid {
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }
          }
          .bias-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
          }
          @media (min-width: 768px) {
            .bias-grid {
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
            }
          }
        `}</style>
        <div className="notes-grid">
          <div>
            <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 12 }}>感情トレンド（直近5日）</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 120 }}>
              {emotionTrend.map((day, idx) => (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${day.score * 10}%`,
                      background: day.score >= 7 ? getAccentColor() : day.score >= 5 ? getAccentColor() : getLossColor(),
                      borderRadius: 4,
                    }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{day.date}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{day.emotion}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 12 }}>検出された行動バイアス</div>
            <div className="bias-grid">
              {detectedBiases.map((bias, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 12,
                    border: `1px solid ${severityColor(bias.severity)}`,
                    borderRadius: 8,
                    background: 'var(--surface)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{bias.name}</span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        background: severityColor(bias.severity),
                        color: '#fff',
                      }}
                    >
                      {bias.severity}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{bias.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 12 }}>ふり返りメモ</div>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="今週の振り返り、気づいたこと、改善点などを記録..."
            style={{
              width: '100%',
              minHeight: 120,
              padding: 12,
              border: '1px solid var(--line)',
              borderRadius: 8,
              fontSize: 13,
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
            定期的なふり返りは成長の鍵です。感情、行動パターン、改善点を記録しましょう。
          </div>
        </div>
      </div>
    </section>
  );
}
