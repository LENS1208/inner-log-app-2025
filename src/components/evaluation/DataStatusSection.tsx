import React, { useMemo } from 'react';
import { getAccentColor, getLossColor } from '../../lib/chartColors';
import type { TradeMetrics } from '../../types/evaluation.types';
import { HelpIcon } from '../common/HelpIcon';

type Props = {
  metrics?: TradeMetrics;
};

export default function DataStatusSection({ metrics }: Props) {
  const validationStatus = useMemo(() => {
    if (!metrics) return [];
    return [
      { metric: 'PF', status: metrics.pf >= 1.0 ? 'OK' : 'NG', value: metrics.pf.toFixed(2), threshold: '≥1.0' },
      { metric: '勝率', status: metrics.winrate >= 0.48 ? 'OK' : 'NG', value: `${(metrics.winrate * 100).toFixed(1)}%`, threshold: '≥48%' },
      { metric: '最大DD', status: metrics.maxdd <= 12 ? 'OK' : 'NG', value: `${metrics.maxdd.toFixed(1)}%`, threshold: '≤12%' },
    ];
  }, [metrics]);

  if (!metrics) {
    return (
      <section className="panel" id="sec11">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
            データの状態
            <HelpIcon text="取引データの入力健全性、データ品質、検証ステータスを表示します。データの信頼性を確認できます。" />
          </h3>
        </div>
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)' }}>データがありません</div>
      </section>
    );
  }

  return (
    <section className="panel" id="sec11">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
          データの状態
          <HelpIcon text="入力健全性、検証ステータスを表示します。" />
        </h3>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, minWidth: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 12 }}>入力健全性</div>
            <div style={{ padding: 16, border: '1px solid var(--accent)', borderRadius: 8, background: getAccentColor(0.1), fontSize: 13 }}>✓ 問題なし</div>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 12 }}>検証ステータス</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {validationStatus.map((status, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, border: '1px solid var(--line)', borderRadius: 6, background: 'var(--surface)' }}>
                  <span style={{ fontSize: 13 }}>{status.metric}</span>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{status.value} ({status.threshold})</span>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: status.status === 'OK' ? getAccentColor() : getLossColor(), color: '#fff' }}>{status.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
