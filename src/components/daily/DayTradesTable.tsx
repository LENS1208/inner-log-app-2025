import React from 'react';
import type { DayTradeRow } from './types';

type DayTradesTableProps = {
  trades: DayTradeRow[];
};

export default function DayTradesTable({ trades }: DayTradesTableProps) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="trades-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--line)' }}>
            <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 13, color: 'var(--muted)', fontWeight: 600, background: 'var(--subtle-bg)' }}>決済時間</th>
            <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 13, color: 'var(--muted)', fontWeight: 600, background: 'var(--subtle-bg)' }}>通貨ペア</th>
            <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 13, color: 'var(--muted)', fontWeight: 600, background: 'var(--subtle-bg)' }}>ポジション</th>
            <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 13, color: 'var(--muted)', fontWeight: 600, background: 'var(--subtle-bg)' }}>損益</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade, idx) => (
            <tr
              key={idx}
              className="trade-row"
              style={{ borderBottom: '1px solid var(--line)', cursor: 'pointer' }}
            >
              <td style={{ padding: '14px 16px', fontSize: 13 }}>{trade.time}</td>
              <td style={{ padding: '14px 16px', fontSize: 13 }}>{trade.symbol}</td>
              <td className={trade.sideJp === '買い' ? 'side-long' : 'side-short'} style={{ padding: '14px 16px', fontSize: 13 }}>{trade.sideJp}</td>
              <td
                className={trade.pnlYen >= 0 ? 'pnl-pos' : 'pnl-neg'}
                style={{
                  padding: '14px 16px',
                  textAlign: 'right'
                }}
              >
                {trade.pnlYen >= 0 ? '+' : ''}{Math.abs(trade.pnlYen).toLocaleString('ja-JP')}円
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
