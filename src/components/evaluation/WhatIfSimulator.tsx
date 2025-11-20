import React, { useState, useMemo, useCallback } from 'react';
import { getAccentColor, getLossColor } from '../../lib/chartColors';
import type { TradeMetrics, TPSLParams, DDBasic, Recommendation } from '../../types/evaluation.types';
import { applyTPSL, recomputeFromPnls, calculateDDPercent, recommendTPSL } from '../../utils/evaluation-metrics';

type WhatIfSimulatorProps = {
  baseMetrics: TradeMetrics;
  ddBasis: DDBasic;
  initCap: number;
};

export default function WhatIfSimulator({ baseMetrics, ddBasis, initCap }: WhatIfSimulatorProps) {
  const [tpSlRatio, setTpSlRatio] = useState(1.6);
  const [trailing, setTrailing] = useState(true);
  const [breakEven, setBreakEven] = useState(false);

  const recommendation = useMemo<Recommendation | null>(() => {
    return recommendTPSL(baseMetrics, ddBasis, initCap);
  }, [baseMetrics, ddBasis, initCap]);

  const whatIfMetrics = useMemo(() => {
    const params: TPSLParams = { ratio: tpSlRatio, trailing, be: breakEven };
    const adj = applyTPSL(baseMetrics.pnls, baseMetrics.pipsArr, params);
    return recomputeFromPnls(adj.pnls, adj.pips);
  }, [baseMetrics, tpSlRatio, trailing, breakEven]);

  const baseDDPct = useMemo(
    () => calculateDDPercent(baseMetrics.maxdd, ddBasis, initCap, baseMetrics.pnls),
    [baseMetrics, ddBasis, initCap]
  );

  const whatDDPct = useMemo(
    () => calculateDDPercent(whatIfMetrics.maxdd, ddBasis, initCap, whatIfMetrics.pnls),
    [whatIfMetrics, ddBasis, initCap]
  );

  const handleRatioChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTpSlRatio(parseFloat(e.target.value));
  }, []);

  const fmt = (x: number | typeof Infinity, d = 2) => {
    if (x === Infinity) return '∞';
    if (typeof x !== 'number') return String(x);
    return x.toFixed(d);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      {recommendation && (
        <div className="badge ok" style={{ marginBottom: 8 }}>
          おすすめ設定：TP/SL ≈ {recommendation.ratio.toFixed(1)}（PF{' '}
          {recommendation.pf === Infinity ? '∞' : recommendation.pf.toFixed(2)}、勝率{' '}
          {(recommendation.wr * 100).toFixed(1)}%、最大DD {recommendation.dd.toFixed(1)}%）
        </div>
      )}
      {!recommendation && (
        <div className="badge warn" style={{ marginBottom: 8 }}>
          おすすめ設定：データ不足のため提案できません
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 12 }}>
            TP/SL シナリオ
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>TP/SL 比</span>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={tpSlRatio}
                onChange={handleRatioChange}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                現在: {tpSlRatio.toFixed(1)} 倍
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={trailing} onChange={(e) => setTrailing(e.target.checked)} />
              トレーリング
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={breakEven} onChange={(e) => setBreakEven(e.target.checked)} />
              建値に戻したら決済（BE）
            </label>
          </div>
          <style>{`
            .whatif-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 12px;
              min-width: 0;
            }

            @media (min-width: 480px) {
              .whatif-grid {
                grid-template-columns: repeat(2, 1fr);
              }
            }
          `}</style>
          <div style={{ height: 8 }} />
          <div className="whatif-grid">
            <div className="kpi" style={{ minWidth: 0 }}>
              <div className="label">PF（元→試算）</div>
              <div className="value" style={{ fontSize: '18px', whiteSpace: 'nowrap' }}>
                {fmt(baseMetrics.pf)} → {fmt(whatIfMetrics.pf)}
              </div>
            </div>
            <div className="kpi" style={{ minWidth: 0 }}>
              <div className="label">勝率（元→試算）</div>
              <div className="value" style={{ fontSize: '18px', whiteSpace: 'nowrap' }}>
                {(baseMetrics.winrate * 100).toFixed(1)}% → {(whatIfMetrics.winrate * 100).toFixed(1)}%
              </div>
            </div>
            <div className="kpi" style={{ minWidth: 0 }}>
              <div className="label">最大DD%（元→試算）</div>
              <div className="value" style={{ fontSize: '18px', whiteSpace: 'nowrap' }}>
                {baseDDPct.toFixed(1)}% → {whatDDPct.toFixed(1)}%
              </div>
            </div>
            <div className="kpi" style={{ minWidth: 0 }}>
              <div className="label">獲得pips（元→試算）</div>
              <div className="value" style={{ fontSize: '18px', whiteSpace: 'nowrap' }}>
                {Math.round(baseMetrics.pipsSum).toLocaleString()} →{' '}
                {Math.round(whatIfMetrics.pipsSum).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
