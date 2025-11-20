import React from "react";
import type { DailyKpi } from "./types";

type TopBarProps = {
  kpi: DailyKpi;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  onToday?: () => void;
};

export function TopBar({ kpi, onPrevDay, onNextDay, onToday }: TopBarProps) {
  const dateLabel = `${kpi.dateJst.split("-")[0]}年${kpi.dateJst.split("-")[1]}月${kpi.dateJst.split("-")[2]}日（${kpi.weekdayJp}）`;
  const dayTotalLabel = kpi.dayTotalYen >= 0 ? "+" : "";
  const dayTotalClass = kpi.dayTotalYen >= 0 ? "good" : "bad";

  return (
    <div className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <button
          className="nav-btn"
          onClick={onPrevDay}
          aria-label="前日"
        >
          ‹
        </button>
        <div className="topbar-date">{dateLabel}</div>
        <button
          className="nav-btn"
          onClick={onNextDay}
          aria-label="翌日"
        >
          ›
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>日合計</div>
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            color: kpi.dayTotalYen >= 0 ? "var(--gain)" : "var(--loss)"
          }}>
            {dayTotalLabel}{Math.round(kpi.dayTotalYen).toLocaleString("ja-JP")}円
          </div>
        </div>
        <button
          className="nav-btn"
          onClick={onToday}
          aria-label="今日"
          style={{ fontSize: 14 }}
        >
          今日
        </button>
      </div>
    </div>
  );
}
