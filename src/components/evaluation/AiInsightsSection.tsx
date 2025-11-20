import React, { useMemo } from 'react';
import { getAccentColor, getLossColor } from '../../lib/chartColors';
import { HelpIcon } from '../common/HelpIcon';

type Feature = {
  name: string;
  value: number;
};

type AiInsightsProps = {
  topFeatures?: Feature[];
  clusters?: string[];
};

export default function AiInsightsSection({ topFeatures, clusters }: AiInsightsProps) {
  const demoFeatures: Feature[] = useMemo(() => topFeatures || [
    { name: 'トレンド追従', value: 0.82 },
    { name: '時間帯選択', value: 0.71 },
    { name: '損切り遵守', value: 0.68 },
    { name: 'エントリータイミング', value: 0.59 },
    { name: 'リスク管理', value: 0.54 },
  ], [topFeatures]);

  const demoClusters = useMemo(() => clusters || [
    'トレンドフォロー（欧州時間）',
    'レンジ逆張り（アジア時間）',
    'ブレイクアウト（米国時間）',
  ], [clusters]);

  const maxValue = Math.max(...demoFeatures.map(f => f.value));

  return (
    <section className="panel" id="sec3">
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
          AIの気づき（要点）
          <HelpIcon text="戦略クラスタ、勝率の源泉、改善提案をAIが分析します。" />
        </h3>
      </div>
      <div style={{ padding: '12px 16px' }}>
        <style>{`
          .ai-insights-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
            margin-bottom: 20px;
            min-width: 0;
          }
          @media (min-width: 768px) {
            .ai-insights-grid {
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }
          }
          @media (min-width: 1024px) {
            .ai-insights-grid {
              grid-template-columns: repeat(4, 1fr);
            }
          }
        `}</style>
        <div className="ai-insights-grid">
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 8 }}>戦略クラスタ</div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.8, color: 'var(--ink)' }}>
              {demoClusters.map((cluster, idx) => (
                <li key={idx}>{cluster}</li>
              ))}
            </ul>
          </div>

          <div className="panel" style={{ padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 8 }}>勝率の源泉</div>
            <div style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--ink)' }}>
              トレンド方向と時間帯選択が勝率に大きく寄与。特に欧州時間のトレンドフォローが効果的。
            </div>
          </div>

          <div className="panel" style={{ padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 8 }}>改善提案</div>
            <div style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--ink)' }}>
              アジア時間のレンジ相場でのエントリー精度向上。損切り位置の見直しでPF改善の余地あり。
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 12 }}>重要特徴 Top5</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {demoFeatures.map((feature, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ minWidth: 140, fontSize: 13, color: 'var(--ink)' }}>{feature.name}</div>
                <div style={{ flex: 1, height: 24, background: 'var(--chip)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(feature.value / maxValue) * 100}%`,
                      background: 'var(--accent)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <div style={{ minWidth: 40, textAlign: 'right', fontSize: 13, fontWeight: 600 }}>
                  {(feature.value * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
