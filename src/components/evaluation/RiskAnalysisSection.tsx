import React, { useMemo } from 'react';
import { getAccentColor, getLossColor } from '../../lib/chartColors';
import type { TradeRow } from '../../types/evaluation.types';
import { computeEquityCurve, computeLossStreakProbabilities, findLongestLossStreak } from '../../utils/risk-analysis';
import { HelpIcon } from '../common/HelpIcon';

type Props = {
  trades?: TradeRow[];
  initialCapital?: number;
};

export default function RiskAnalysisSection({ trades = [], initialCapital = 100000 }: Props) {
  const equityCurve = useMemo(() => {
    return trades.length > 0 ? computeEquityCurve(trades, initialCapital) : [];
  }, [trades, initialCapital]);

  const lossStreakProbs = useMemo(() => {
    return trades.length > 0 ? computeLossStreakProbabilities(trades) : [];
  }, [trades]);

  const longestStreak = useMemo(() => {
    return trades.length > 0 ? findLongestLossStreak(trades) : 0;
  }, [trades]);

  if (trades.length === 0) {
    return (
      <section className="panel" id="sec6">
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
            リスクのようす（DD/連敗）
            <HelpIcon text="エクイティカーブ、ドローダウン、連敗確率を分析します。" />
          </h3>
        </div>
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)' }}>
          データがありません
        </div>
      </section>
    );
  }

  const maxEquity = Math.max(...equityCurve.map(p => p.equity));
  const minEquity = Math.min(...equityCurve.map(p => p.equity));
  const range = maxEquity - minEquity || 1;
  const maxDD = Math.max(...equityCurve.map(p => p.dd));

  return (
    <section className="panel" id="sec6">
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
          リスクのようす（DD/連敗）
          <HelpIcon text="エクイティカーブ、ドローダウン、連敗確率を分析します。" />
        </h3>
        <div className="badge warn">最大DD: {maxDD.toLocaleString()}円</div>
      </div>
      <div style={{ padding: '12px 16px' }}>
        <style>{`
          .risk-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
            min-width: 0;
          }
          @media (min-width: 768px) {
            .risk-grid {
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }
          }
        `}</style>
        <div className="risk-grid">
          <div>
            <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 12 }}>エクイティカーブ & DD帯</div>
            <svg width="100%" height="220" viewBox="0 0 500 220">
              <defs>
                <linearGradient id="ddGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={getLossColor()} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={getLossColor()} stopOpacity="0.1" />
                </linearGradient>
              </defs>

              <line x1="40" y1="200" x2="480" y2="200" stroke="var(--line)" strokeWidth="1" />
              <line x1="40" y1="20" x2="40" y2="200" stroke="var(--line)" strokeWidth="1" />

              {equityCurve.length > 1 && (
                <>
                  <polygon
                    points={equityCurve
                      .map((p, i) => {
                        const x = 40 + (i * 440) / equityCurve.length;
                        const yPeak = 200 - ((p.peak - minEquity) / range) * 170;
                        const yEquity = 200 - ((p.equity - minEquity) / range) * 170;
                        return `${x},${yPeak} ${x},${yEquity}`;
                      })
                      .join(' ')}
                    fill="url(#ddGradient)"
                  />

                  <polyline
                    points={equityCurve
                      .map((p, i) => {
                        const x = 40 + (i * 440) / equityCurve.length;
                        const y = 200 - ((p.peak - minEquity) / range) * 170;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="var(--muted)"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />

                  <polyline
                    points={equityCurve
                      .map((p, i) => {
                        const x = 40 + (i * 440) / equityCurve.length;
                        const y = 200 - ((p.equity - minEquity) / range) * 170;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke={getAccentColor()}
                    strokeWidth="2"
                  />
                </>
              )}

              <text x="250" y="15" textAnchor="middle" fontSize="11" fill="var(--muted)">
                破線=ピーク 青=エクイティ 赤帯=DD
              </text>
            </svg>
          </div>

          <div>
            <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 12 }}>
              n連敗確率（最長: {longestStreak}連敗）
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {lossStreakProbs.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ minWidth: 60, fontSize: 13 }}>{d.n}連敗</div>
                  <div style={{ flex: 1, height: 24, background: 'var(--chip)', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(d.prob, 100)}%`,
                        height: '100%',
                        background: d.prob > 5 ? getLossColor() : getAccentColor(),
                      }}
                    />
                  </div>
                  <div style={{ minWidth: 50, textAlign: 'right', fontSize: 13, fontWeight: 600 }}>
                    {d.prob.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, padding: 12, background: 'var(--chip)', borderRadius: 8, fontSize: 12, color: 'var(--muted)' }}>
              負けトレードの確率を基に計算。実際の連敗リスクを事前に把握することでメンタル管理に役立ちます。
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
