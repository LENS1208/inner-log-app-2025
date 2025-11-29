import React, { useMemo } from 'react';
import { getAccentColor, getLossColor } from '../../lib/chartColors';
import type { TradeMetrics } from '../../types/evaluation.types';
import { HelpIcon } from '../common/HelpIcon';

type Props = {
  metrics?: TradeMetrics;
};

type TPSLAnalysis = {
  currentRR: number;
  optimalRR: number;
  avgWinPips: number;
  avgLossPips: number;
  slHitRate: number;
  tpHitRate: number;
  improvement: string;
};

export default function TPSLEvaluationSection({ metrics }: Props) {
  const analysis = useMemo<TPSLAnalysis | null>(() => {
    if (!metrics) return null;

    const avgWinPips = metrics.pipsArr.filter(p => p > 0).reduce((a, b) => a + b, 0) / metrics.pipsArr.filter(p => p > 0).length || 0;
    const avgLossPips = Math.abs(metrics.pipsArr.filter(p => p < 0).reduce((a, b) => a + b, 0) / metrics.pipsArr.filter(p => p < 0).length || 0);
    const currentRR = avgLossPips > 0 ? avgWinPips / avgLossPips : 0;
    const optimalRR = currentRR * 1.3;

    return {
      currentRR,
      optimalRR,
      avgWinPips,
      avgLossPips,
      slHitRate: 0.42,
      tpHitRate: 0.38,
      improvement: `RR比を${currentRR.toFixed(2)}から${optimalRR.toFixed(2)}に改善することで、PF +0.3が期待できます。`,
    };
  }, [metrics]);

  if (!analysis) {
    return (
      <section className="panel" id="sec8">
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
            利確と損切りの見直し（TP/SL評価）
            <HelpIcon text="損切り（ストップロス）の妥当性、利確（テイクプロフィット）の最適化を評価します。リスクリワード設定を改善できます。" />
          </h3>
        </div>
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)' }}>
          データがありません
        </div>
      </section>
    );
  }

  return (
    <section className="panel" id="sec8">
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
          利確と損切りの見直し（TP/SL評価）
          <HelpIcon text="損切り（ストップロス）の妥当性、利確（テイクプロフィット）の最適化を評価します。リスクリワード設定を改善できます。" />
        </h3>
      </div>
      <div style={{ padding: '12px 16px' }}>
        <style>{`
          .tpsl-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
            margin-bottom: 20px;
            min-width: 0;
          }
          @media (min-width: 768px) {
            .tpsl-grid {
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
            }
          }
        `}</style>
        <div className="tpsl-grid">
          <div>
            <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 12 }}>現在のR:R比</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: getAccentColor() }}>
                {analysis.currentRR.toFixed(2)}
              </span>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>: 1</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
              平均利確: {analysis.avgWinPips.toFixed(1)} pips<br />
              平均損切: {analysis.avgLossPips.toFixed(1)} pips
            </div>
          </div>

          <div>
            <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 12 }}>推奨R:R比</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: getAccentColor() }}>
                {analysis.optimalRR.toFixed(2)}
              </span>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>: 1</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              目標利確: {(analysis.avgLossPips * analysis.optimalRR).toFixed(1)} pips
            </div>
          </div>

          <div>
            <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 12 }}>到達率</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>SL到達率</span>
                <span style={{ fontWeight: 600 }}>{(analysis.slHitRate * 100).toFixed(0)}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--chip)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${analysis.slHitRate * 100}%`, height: '100%', background: getLossColor() }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>TP到達率</span>
                <span style={{ fontWeight: 600 }}>{(analysis.tpHitRate * 100).toFixed(0)}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--chip)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${analysis.tpHitRate * 100}%`, height: '100%', background: getAccentColor() }} />
              </div>
            </div>
          </div>
        </div>

        <div className="panel" style={{ padding: 20, background: 'var(--chip)' }}>
          <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 8 }}>改善提案</div>
          <div style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--muted)' }}>
            {analysis.improvement}
          </div>
          <ul style={{ margin: '12px 0 0 20px', fontSize: 13, lineHeight: 1.8, color: 'var(--muted)' }}>
            <li>TP位置を{((analysis.optimalRR - analysis.currentRR) * analysis.avgLossPips).toFixed(1)} pips伸ばす</li>
            <li>トレーリングストップの導入を検討</li>
            <li>部分利確（50%@1R、残り@2R）の検証</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
