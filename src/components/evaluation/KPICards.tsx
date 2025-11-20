import React from 'react';
import { getAccentColor, getLossColor } from '../../lib/chartColors';
import type { TradeMetrics, DDBasic } from '../../types/evaluation.types';
import { calculateDDPercent } from '../../utils/evaluation-metrics';

type KPICardsProps = {
  metrics: TradeMetrics;
  ddBasis: DDBasic;
  initCap: number;
};

export default function KPICards({ metrics, ddBasis, initCap }: KPICardsProps) {
  const ddPct = calculateDDPercent(metrics.maxdd, ddBasis, initCap, metrics.pnls);

  const fmtNum = (n: number | typeof Infinity) => {
    if (n === Infinity) return '∞';
    if (typeof n !== 'number' || !isFinite(n)) return '--';
    return n.toLocaleString();
  };

  return (
    <>
      <style>{`
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          min-width: 0;
        }

        @media (min-width: 768px) {
          .kpi-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .kpi-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
      <div className="kpi-grid">
        <div className="kpi">
          <div className="label">収益効率（PF）</div>
          <div className="value">{metrics.pf === Infinity ? '∞' : metrics.pf.toFixed(2)}</div>
        </div>
        <div className="kpi">
          <div className="label">勝率</div>
          <div className="value">{(metrics.winrate * 100).toFixed(1)}%</div>
        </div>
        <div className="kpi">
          <div className="label" style={{ whiteSpace: 'nowrap' }}>最大DD（%）</div>
          <div className="value">{ddPct.toFixed(1)}%</div>
        </div>
        <div className="kpi">
          <div className="label">取引回数</div>
          <div className="value">{fmtNum(metrics.trades)}</div>
        </div>
        <div className="kpi">
          <div className="label">獲得pips（合計）</div>
          <div className="value">{fmtNum(Math.round(metrics.pipsSum))}</div>
        </div>
        <div className="kpi">
          <div className="label">平均保有</div>
          <div className="value">—</div>
        </div>
      </div>
    </>
  );
}
