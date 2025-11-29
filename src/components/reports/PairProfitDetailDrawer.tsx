import React, { useMemo, useEffect } from 'react';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { getAccentColor, getLossColor, getLongColor, getShortColor } from '../../lib/chartColors';
import { Trade } from '../../lib/types';
import { getTradeProfit, getTradeSide } from '../../lib/filterTrades';

interface PairProfitDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  trades: Trade[];
}

function parseDateTime(datetime: string | number | undefined): Date {
  if (!datetime) return new Date(NaN);
  if (typeof datetime === 'number') return new Date(datetime);
  let dt = datetime.trim().replace(/\./g, '-').replace(' ', 'T');
  return new Date(dt);
}

function getTimeOfDay(datetime: string): string {
  const dt = parseDateTime(datetime);
  if (isNaN(dt.getTime())) return '不明';
  const hour = dt.getUTCHours();

  if (hour >= 0 && hour < 9) return 'アジア';
  if (hour >= 9 && hour < 13) return '欧州前場';
  if (hour >= 13 && hour < 17) return '欧州後場';
  if (hour >= 17 && hour < 21) return 'NY前場';
  return 'NY後場';
}

function getWeekday(datetime: string): string {
  const dt = parseDateTime(datetime);
  if (isNaN(dt.getTime())) return '不明';
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[dt.getDay()];
}

function formatHoldTime(openTime: string, closeTime: string): string {
  const open = parseDateTime(openTime);
  const close = parseDateTime(closeTime);
  if (isNaN(open.getTime()) || isNaN(close.getTime())) return '-';

  const minutes = Math.floor((close.getTime() - open.getTime()) / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) return `${hours}時間${mins}分`;
  return `${mins}分`;
}

export default function PairProfitDetailDrawer({ isOpen, onClose, symbol, trades }: PairProfitDetailDrawerProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const stats = useMemo(() => {
    const totalProfit = trades.reduce((sum, t) => sum + getTradeProfit(t), 0);
    const winTrades = trades.filter(t => getTradeProfit(t) > 0);
    const lossTrades = trades.filter(t => getTradeProfit(t) <= 0);
    const winRate = trades.length > 0 ? (winTrades.length / trades.length) * 100 : 0;
    const avgProfit = trades.length > 0 ? totalProfit / trades.length : 0;
    const avgPips = trades.length > 0
      ? trades.reduce((sum, t) => sum + Math.abs(t.pips || 0), 0) / trades.length
      : 0;

    const grossProfit = winTrades.reduce((sum, t) => sum + getTradeProfit(t), 0);
    const grossLoss = Math.abs(lossTrades.reduce((sum, t) => sum + getTradeProfit(t), 0));
    const pf = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 999 : 0);

    return {
      totalProfit,
      winRate,
      avgProfit,
      avgPips,
      pf,
      tradeCount: trades.length
    };
  }, [trades]);

  const equityData = useMemo(() => {
    const sorted = [...trades].sort((a, b) =>
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );

    let cumulative = 0;
    const points = sorted.map(t => {
      cumulative += getTradeProfit(t);
      return {
        date: new Date(t.datetime).toLocaleDateString('ja-JP'),
        equity: cumulative
      };
    });

    return points;
  }, [trades]);

  const setupStats = useMemo(() => {
    const map = new Map<string, { profit: number; count: number }>();

    trades.forEach(t => {
      const setup = t.setup || '未分類';
      const current = map.get(setup) || { profit: 0, count: 0 };
      map.set(setup, {
        profit: current.profit + getTradeProfit(t),
        count: current.count + 1
      });
    });

    return Array.from(map.entries())
      .map(([setup, data]) => ({ setup, ...data }))
      .sort((a, b) => b.profit - a.profit);
  }, [trades]);

  const timeOfDayStats = useMemo(() => {
    const map = new Map<string, number>();
    const order = ['アジア', '欧州前場', '欧州後場', 'NY前場', 'NY後場'];

    trades.forEach(t => {
      const timeSlot = getTimeOfDay(t.datetime);
      map.set(timeSlot, (map.get(timeSlot) || 0) + getTradeProfit(t));
    });

    return order.map(slot => ({
      slot,
      profit: map.get(slot) || 0
    }));
  }, [trades]);

  const weekdayStats = useMemo(() => {
    const map = new Map<string, number>();
    const order = ['月', '火', '水', '木', '金'];

    trades.forEach(t => {
      const day = getWeekday(t.datetime);
      if (day !== '土' && day !== '日') {
        map.set(day, (map.get(day) || 0) + getTradeProfit(t));
      }
    });

    return order.map(day => ({
      day,
      profit: map.get(day) || 0
    }));
  }, [trades]);

  const directionStats = useMemo(() => {
    const longTrades = trades.filter(t => getTradeSide(t) === 'LONG');
    const shortTrades = trades.filter(t => getTradeSide(t) === 'SHORT');

    const longProfit = longTrades.reduce((sum, t) => sum + getTradeProfit(t), 0);
    const shortProfit = shortTrades.reduce((sum, t) => sum + getTradeProfit(t), 0);

    const longWins = longTrades.filter(t => getTradeProfit(t) > 0).length;
    const shortWins = shortTrades.filter(t => getTradeProfit(t) > 0).length;

    const longWinRate = longTrades.length > 0 ? (longWins / longTrades.length) * 100 : 0;
    const shortWinRate = shortTrades.length > 0 ? (shortWins / shortTrades.length) * 100 : 0;

    const longEV = longTrades.length > 0 ? longProfit / longTrades.length : 0;
    const shortEV = shortTrades.length > 0 ? shortProfit / shortTrades.length : 0;

    return {
      long: { count: longTrades.length, profit: longProfit, winRate: longWinRate, ev: longEV },
      short: { count: shortTrades.length, profit: shortProfit, winRate: shortWinRate, ev: shortEV }
    };
  }, [trades]);

  const aiComment = useMemo(() => {
    const bestTimeSlot = timeOfDayStats.reduce((max, curr) =>
      curr.profit > max.profit ? curr : max
    , timeOfDayStats[0]);

    const worstTimeSlot = timeOfDayStats.reduce((min, curr) =>
      curr.profit < min.profit ? curr : min
    , timeOfDayStats[0]);

    const bestSetup = setupStats[0];
    const worstSetup = setupStats[setupStats.length - 1];

    let comment = `${symbol} は`;

    if (bestSetup && bestSetup.profit > 0) {
      comment += `${bestSetup.setup}戦略`;
      if (bestTimeSlot && bestTimeSlot.profit > 0) {
        comment += `と${bestTimeSlot.slot}時間帯`;
      }
      comment += 'が主な利益源で、';
    }

    if (worstSetup && worstSetup.profit < 0) {
      comment += `一方で${worstSetup.setup}`;
      if (worstTimeSlot && worstTimeSlot.profit < 0) {
        comment += `や${worstTimeSlot.slot}`;
      }
      comment += 'で損失が出やすい傾向があります。';
    } else {
      comment += '安定した利益構造を持っています。';
    }

    return comment;
  }, [symbol, timeOfDayStats, setupStats]);

  const recentTrades = useMemo(() => {
    return [...trades]
      .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
      .slice(0, 20);
  }, [trades]);

  if (!isOpen) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '40%',
          minWidth: 600,
          maxWidth: 800,
          background: 'var(--surface)',
          zIndex: 9999,
          overflowY: 'auto',
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.3)',
          animation: 'slideInRight 0.3s ease-out',
        }}
      >
        <div style={{ padding: 24 }}>
          {/* ヘッダー */}
          <div style={{ marginBottom: 24, borderBottom: '1px solid var(--line)', paddingBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
                  {symbol} 詳細損益分析
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-light)' }}>
                  この銘柄の損益構造と特徴
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: 'var(--ink-light)',
                  padding: 0,
                  width: 32,
                  height: 32,
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* 基本KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, marginBottom: 24 }}>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>合計損益</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: stats.totalProfit >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                {stats.totalProfit >= 0 ? '+' : ''}{Math.round(stats.totalProfit).toLocaleString()}円
              </div>
            </div>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>勝率</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{stats.winRate.toFixed(1)}%</div>
            </div>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>平均損益</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: stats.avgProfit >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                {stats.avgProfit >= 0 ? '+' : ''}{Math.round(stats.avgProfit).toLocaleString()}円
              </div>
            </div>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>平均pips</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{stats.avgPips.toFixed(1)}</div>
            </div>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>PF</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                {stats.pf >= 999 ? '∞' : stats.pf.toFixed(2)}
              </div>
            </div>
          </div>

          {/* 損益推移 */}
          <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>損益推移</h3>
            <div style={{ height: 150 }}>
              <Line
                data={{
                  labels: equityData.map(p => p.date),
                  datasets: [{
                    label: '累積損益',
                    data: equityData.map(p => p.equity),
                    borderColor: getAccentColor(),
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.1,
                    pointRadius: 2,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    x: { display: false },
                    y: {
                      ticks: {
                        callback: (value) => `${(value as number).toLocaleString()}円`,
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* 損益構造 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
            {/* 戦略別損益 */}
            {setupStats.length > 0 && (
              <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>戦略別損益</h3>
                <div style={{ height: 150 }}>
                  <Bar
                    data={{
                      labels: setupStats.map(s => s.setup),
                      datasets: [{
                        label: '損益',
                        data: setupStats.map(s => s.profit),
                        backgroundColor: setupStats.map(s => s.profit >= 0 ? getAccentColor() : getLossColor()),
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: {
                          ticks: {
                            callback: (value) => `${(value as number).toLocaleString()}円`,
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            )}

            {/* 時間帯別損益 */}
            <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>時間帯別損益</h3>
              <div style={{ height: 150 }}>
                <Bar
                  data={{
                    labels: timeOfDayStats.map(t => t.slot),
                    datasets: [{
                      label: '損益',
                      data: timeOfDayStats.map(t => t.profit),
                      backgroundColor: timeOfDayStats.map(t => t.profit >= 0 ? getAccentColor() : getLossColor()),
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        ticks: {
                          callback: (value) => `${(value as number).toLocaleString()}円`,
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* 曜日別損益 */}
            <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>曜日別損益</h3>
              <div style={{ height: 150 }}>
                <Bar
                  data={{
                    labels: weekdayStats.map(w => w.day),
                    datasets: [{
                      label: '損益',
                      data: weekdayStats.map(w => w.profit),
                      backgroundColor: weekdayStats.map(w => w.profit >= 0 ? getAccentColor() : getLossColor()),
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        ticks: {
                          callback: (value) => `${(value as number).toLocaleString()}円`,
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* 売り vs 買い比較 */}
          <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>売り vs 買い比較</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16 }}>
              <div style={{ height: 150 }}>
                {(directionStats.long.count + directionStats.short.count > 0) && (
                  <Pie
                    data={{
                      labels: ['買い', '売り'],
                      datasets: [{
                        data: [directionStats.long.count, directionStats.short.count],
                        backgroundColor: [getLongColor(), getShortColor()],
                        borderWidth: 0,
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom' as const },
                      },
                    }}
                  />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-light)', marginBottom: 4 }}>買い取引</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                    勝率 {directionStats.long.winRate.toFixed(1)}% / EV {directionStats.long.ev >= 0 ? '+' : ''}{Math.round(directionStats.long.ev).toLocaleString()}円
                  </div>
                </div>
                <div style={{ padding: 12, background: 'var(--surface)', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-light)', marginBottom: 4 }}>売り取引</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                    勝率 {directionStats.short.winRate.toFixed(1)}% / EV {directionStats.short.ev >= 0 ? '+' : ''}{Math.round(directionStats.short.ev).toLocaleString()}円
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AIコメント */}
          <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>AIコメント</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>
              {aiComment}
            </p>
          </div>

          {/* トレード一覧 */}
          <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
              直近のトレード（{recentTrades.length}件）
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    <th style={{ padding: 8, textAlign: 'left', color: 'var(--ink-light)' }}>日時</th>
                    <th style={{ padding: 8, textAlign: 'center', color: 'var(--ink-light)' }}>方向</th>
                    <th style={{ padding: 8, textAlign: 'left', color: 'var(--ink-light)' }}>戦略</th>
                    <th style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>損益</th>
                    <th style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>pips</th>
                    <th style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>ロット</th>
                    <th style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>保有時間</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((trade, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: 8, color: 'var(--ink)' }}>
                        {new Date(trade.datetime).toLocaleDateString('ja-JP')}
                      </td>
                      <td style={{ padding: 8, textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          background: getTradeSide(trade) === 'LONG' ? 'rgba(0, 162, 24, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                          color: getTradeSide(trade) === 'LONG' ? 'var(--gain)' : 'var(--warning)'
                        }}>
                          {getTradeSide(trade) === 'LONG' ? '買' : '売'}
                        </span>
                      </td>
                      <td style={{ padding: 8, color: 'var(--ink-light)' }}>{trade.setup || '-'}</td>
                      <td style={{
                        padding: 8,
                        textAlign: 'right',
                        fontWeight: 600,
                        color: getTradeProfit(trade) >= 0 ? 'var(--gain)' : 'var(--loss)'
                      }}>
                        {getTradeProfit(trade) >= 0 ? '+' : ''}{Math.round(getTradeProfit(trade)).toLocaleString()}円
                      </td>
                      <td style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>
                        {(trade.pips || 0).toFixed(1)}
                      </td>
                      <td style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>
                        {(trade.volume || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>
                        {formatHoldTime(trade.openTime, trade.datetime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* フッター */}
          <div style={{ textAlign: 'center', paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 24px',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
