import React from "react";
import type { DayTradeRow } from "./types";

type DayTradesTableProps = {
  trades: DayTradeRow[];
  onOpenTradesList?: () => void;
};

export function DayTradesTable({ trades, onOpenTradesList }: DayTradesTableProps) {
  return (
    <div className="section-block">
      <div className="section-header">
        <h3 className="section-title">この日の取引</h3>
        <button className="link-btn" onClick={onOpenTradesList}>
          取引一覧を開く
        </button>
      </div>

      {trades.length === 0 ? (
        <div className="empty-state">この日の取引はありません</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>決済時間</th>
              <th style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>通貨ペア</th>
              <th style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>ポジション</th>
              <th className="text-right" style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>損益</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade, idx) => {
              const pnlClass = trade.pnlYen >= 0 ? "good" : "bad";
              const pnlSign = trade.pnlYen >= 0 ? "+" : "-";
              return (
                <tr
                  key={idx}
                  className={trade.ticket ? "clickable" : ""}
                  style={{ cursor: trade.ticket ? "pointer" : "default" }}
                  onClick={() => {
                    if (trade.ticket) {
                      location.hash = `/notebook/${trade.ticket}`;
                    }
                  }}
                >
                  <td>{trade.time}</td>
                  <td>{trade.symbol}</td>
                  <td className={trade.sideJp === "買い" ? "side-long" : "side-short"}>{trade.sideJp}</td>
                  <td className={`text-right ${pnlClass}`}>
                    {pnlSign}{Math.round(Math.abs(trade.pnlYen)).toLocaleString("ja-JP")}円
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
