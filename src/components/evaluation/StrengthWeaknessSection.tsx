import React, { useMemo } from 'react';
import { getAccentColor, getLossColor } from '../../lib/chartColors';
import type { TradeRow } from '../../types/evaluation.types';
import { computePairTimeHeatmap, computeDayTimeHeatmap } from '../../utils/heatmap-data';
import { HelpIcon } from '../common/HelpIcon';

type Props = {
  trades?: TradeRow[];
};

export default function StrengthWeaknessSection({ trades = [] }: Props) {
  const pairTimeData = useMemo(() => {
    return trades.length > 0 ? computePairTimeHeatmap(trades) : [];
  }, [trades]);

  const dayTimeData = useMemo(() => {
    return trades.length > 0 ? computeDayTimeHeatmap(trades) : [];
  }, [trades]);

  const getColor = (value: number) => {
    if (value > 0.7) return getAccentColor();
    if (value > 0.5) return getAccentColor();
    if (value > 0.3) return '#f59e0b';
    return getLossColor();
  };

  const pairs = ['USD/JPY', 'EUR/USD', 'GBP/JPY', 'AUD/USD', 'EUR/JPY'];
  const times = ['0〜3', '3〜6', '6〜9', '9〜12', '12〜15', '15〜18', '18〜21', '21〜24'];
  const days = ['日', '月', '火', '水', '木', '金', '土'];

  if (trades.length === 0) {
    return (
      <section className="panel" id="sec7">
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
            得意・苦手（ヒートマップ）
            <HelpIcon text="通貨×時間帯、曜日×時間帯のパフォーマンスを分析します。" />
          </h3>
        </div>
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)' }}>
          データがありません
        </div>
      </section>
    );
  }

  return (
    <section className="panel" id="sec7">
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
          得意・苦手（ヒートマップ）
          <HelpIcon text="通貨×時間帯、曜日×時間帯のパフォーマンスを分析します。" />
        </h3>
      </div>
      <div style={{ padding: 16, minWidth: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, minWidth: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 12 }}>通貨×時間帯（PF）</div>
            <div style={{ overflowX: 'auto', minWidth: 0, width: '100%' }}>
              <table style={{ minWidth: '600px', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ padding: 4, border: '1px solid var(--line)', background: 'var(--chip)' }}></th>
                    {times.map(t => (
                      <th key={t} style={{ padding: 4, border: '1px solid var(--line)', background: 'var(--chip)' }}>
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pairs.map(pair => (
                    <tr key={pair}>
                      <td style={{ padding: 4, border: '1px solid var(--line)', background: 'var(--chip)', fontWeight: 600, fontSize: 10 }}>
                        {pair}
                      </td>
                      {times.map(time => {
                        const cell = pairTimeData.find(c => c.row === pair && c.col === time);
                        const value = cell?.value ?? 0.5;
                        const count = cell?.count ?? 0;
                        return (
                          <td
                            key={time}
                            style={{
                              padding: 8,
                              border: '1px solid var(--line)',
                              background: getColor(value),
                              color: '#fff',
                              textAlign: 'center',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title={`${count}件`}
                          >
                            {value.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 11 }}>
              <span><span style={{ display: 'inline-block', width: 12, height: 12, background: getAccentColor(), marginRight: 4 }} />良い</span>
              <span><span style={{ display: 'inline-block', width: 12, height: 12, background: getAccentColor(), marginRight: 4 }} />普通</span>
              <span><span style={{ display: 'inline-block', width: 12, height: 12, background: getLossColor(), marginRight: 4 }} />注意</span>
            </div>
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 12 }}>曜日×時間帯（勝率）</div>
            <div style={{ overflowX: 'auto', minWidth: 0, width: '100%' }}>
              <table style={{ minWidth: '600px', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ padding: 4, border: '1px solid var(--line)', background: 'var(--chip)' }}></th>
                    {times.map(t => (
                      <th key={t} style={{ padding: 4, border: '1px solid var(--line)', background: 'var(--chip)' }}>
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {days.map(day => (
                    <tr key={day}>
                      <td style={{ padding: 4, border: '1px solid var(--line)', background: 'var(--chip)', fontWeight: 600 }}>
                        {day}
                      </td>
                      {times.map(time => {
                        const cell = dayTimeData.find(c => c.row === day && c.col === time);
                        const value = cell?.value ?? 0.5;
                        const count = cell?.count ?? 0;
                        return (
                          <td
                            key={time}
                            style={{
                              padding: 8,
                              border: '1px solid var(--line)',
                              background: getColor(value),
                              color: '#fff',
                              textAlign: 'center',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title={`${count}件`}
                          >
                            {(value * 100).toFixed(0)}%
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
