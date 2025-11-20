import React from "react";
import type { DailyKpi } from "./types";

type KpiGridProps = {
  kpi: DailyKpi;
};

export function KpiGrid({ kpi }: KpiGridProps) {
  const avgPnLClass = kpi.avgPnLPerTradeYen >= 0 ? "good" : "bad";
  const totalPipsClass = kpi.totalPips >= 0 ? "good" : "bad";

  return (
    <div className="kpi-grid-daily">
      <div className="kpi-card-daily">
        <div className="kpi-label">勝率</div>
        <div className="kpi-value">{kpi.winRate.toFixed(1)}%</div>
      </div>

      <div className="kpi-card-daily">
        <div className="kpi-label">取引回数</div>
        <div className="kpi-value">{kpi.tradeCount}回</div>
        <div className="kpi-sub">勝ち：{kpi.winCount}｜負け：{kpi.lossCount}</div>
      </div>

      <div className="kpi-card-daily">
        <div className="kpi-label">平均損益</div>
        <div className={`kpi-value ${avgPnLClass}`}>
          {kpi.avgPnLPerTradeYen >= 0 ? "+" : ""}
          {Math.round(kpi.avgPnLPerTradeYen).toLocaleString("ja-JP")}円
        </div>
        <div className="kpi-sub">1取引あたり</div>
      </div>

      <div className="kpi-card-daily">
        <div className="kpi-label">PF</div>
        <div className="kpi-value">{kpi.profitFactor.toFixed(2)}</div>
      </div>

      <div className="kpi-card-daily">
        <div className="kpi-label">総pips数</div>
        <div className={`kpi-value ${totalPipsClass}`}>
          {kpi.totalPips >= 0 ? "+" : ""}
          {kpi.totalPips.toFixed(1)}
        </div>
      </div>
    </div>
  );
}
