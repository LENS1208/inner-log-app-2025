import React, { useMemo, useEffect, useRef } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { getAccentColor, getLossColor, getLongColor, getShortColor } from '../../lib/chartColors';
import { Trade } from '../../lib/types';
import { getTradeProfit, getTradeSide, getTradePair } from '../../lib/filterTrades';

interface RMultipleDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rangeLabel: string;
  minR: number;
  maxR: number;
  trades: Trade[];
  avgLoss: number;
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

function getHoldTimeMinutes(openTime: string, closeTime: string): number {
  const open = parseDateTime(openTime);
  const close = parseDateTime(closeTime);
  if (isNaN(open.getTime()) || isNaN(close.getTime())) return 0;
  return Math.floor((close.getTime() - open.getTime()) / 60000);
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

export default function RMultipleDetailDrawer({ isOpen, onClose, rangeLabel, minR, maxR, trades, avgLoss }: RMultipleDetailDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && drawerRef.current) {
      drawerRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape, true);
      return () => document.removeEventListener('keydown', handleEscape, true);
    }
  }, [isOpen, onClose]);

  const stats = useMemo(() => {
    const totalProfit = trades.reduce((sum, t) => sum + getTradeProfit(t), 0);
    const winTrades = trades.filter(t => getTradeProfit(t) > 0);
    const winRate = trades.length > 0 ? (winTrades.length / trades.length) * 100 : 0;
    const avgProfit = trades.length > 0 ? totalProfit / trades.length : 0;
    const avgPips = trades.length > 0
      ? trades.reduce((sum, t) => sum + Math.abs(t.pips || 0), 0) / trades.length
      : 0;

    const avgR = trades.length > 0 && avgLoss !== 0
      ? trades.reduce((sum, t) => sum + (getTradeProfit(t) / Math.abs(avgLoss)), 0) / trades.length
      : 0;

    return {
      totalProfit,
      tradeCount: trades.length,
      winRate,
      avgProfit,
      avgPips,
      avgR
    };
  }, [trades, avgLoss]);

  const pairStats = useMemo(() => {
    const map = new Map<string, { profit: number; count: number }>();

    trades.forEach(t => {
      const pair = getTradePair(t);
      const current = map.get(pair) || { profit: 0, count: 0 };
      map.set(pair, {
        profit: current.profit + getTradeProfit(t),
        count: current.count + 1
      });
    });

    return Array.from(map.entries())
      .map(([pair, data]) => ({ pair, ...data }))
      .sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit))
      .slice(0, 8);
  }, [trades]);

  const setupStats = useMemo(() => {
    const map = new Map<string, { count: number; profit: number }>();

    trades.forEach(t => {
      const setup = t.setup || '未分類';
      const current = map.get(setup) || { count: 0, profit: 0 };
      map.set(setup, {
        count: current.count + 1,
        profit: current.profit + getTradeProfit(t)
      });
    });

    return Array.from(map.entries())
      .map(([setup, data]) => ({ setup, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [trades]);

  const directionStats = useMemo(() => {
    const longTrades = trades.filter(t => getTradeSide(t) === 'LONG');
    const shortTrades = trades.filter(t => getTradeSide(t) === 'SHORT');

    return {
      long: { count: longTrades.length },
      short: { count: shortTrades.length }
    };
  }, [trades]);

  const timeOfDayStats = useMemo(() => {
    const map = new Map<string, { count: number; profit: number }>();
    const order = ['アジア', '欧州前場', '欧州後場', 'NY前場', 'NY後場'];

    trades.forEach(t => {
      const timeSlot = getTimeOfDay(t.datetime);
      const current = map.get(timeSlot) || { count: 0, profit: 0 };
      map.set(timeSlot, {
        count: current.count + 1,
        profit: current.profit + getTradeProfit(t)
      });
    });

    return order.map(slot => ({
      slot,
      count: map.get(slot)?.count || 0,
      profit: map.get(slot)?.profit || 0
    }));
  }, [trades]);

  const holdTimeStats = useMemo(() => {
    const ranges = [
      { label: '〜30分', min: 0, max: 30 },
      { label: '30分〜2時間', min: 30, max: 120 },
      { label: '2〜8時間', min: 120, max: 480 },
      { label: '8時間〜1日', min: 480, max: 1440 },
      { label: '1日以上', min: 1440, max: Infinity }
    ];

    return ranges.map(range => {
      const rangeTrades = trades.filter(t => {
        const minutes = getHoldTimeMinutes(t.openTime, t.datetime);
        return minutes >= range.min && minutes < range.max;
      });

      return { label: range.label, count: rangeTrades.length };
    });
  }, [trades]);

  const aiComment = useMemo(() => {
    const topPair = pairStats[0];
    const topSetup = setupStats[0];
    const topTimeSlot = timeOfDayStats.reduce((max, curr) =>
      curr.count > max.count ? curr : max
    , timeOfDayStats[0]);
    const longHoldTrades = trades.filter(t => getHoldTimeMinutes(t.openTime, t.datetime) > 60);

    let comment = '';

    if (minR < 0) {
      comment += `${rangeLabel}の損失は`;
    } else {
      comment += `${rangeLabel}の利益は`;
    }

    if (topPair) {
      comment += `主に${topPair.pair}`;
    }

    if (topSetup) {
      comment += `の${topSetup.setup}`;
    }

    comment += 'で';

    if (topTimeSlot && topTimeSlot.count > trades.length * 0.3) {
      comment += `${topTimeSlot.slot}に`;
    }

    comment += '発生しています。';

    if (minR < -2) {
      comment += 'このレンジの損失を抑えると全体DDが大幅に改善します。';
    } else if (maxR > 2) {
      comment += 'この大きな利益を再現できると収益性が飛躍的に向上します。';
    } else if (longHoldTrades.length > trades.length * 0.5) {
      comment += '保有時間が長い傾向にあります。';
    }

    return comment;
  }, [rangeLabel, minR, maxR, pairStats, setupStats, timeOfDayStats, trades]);

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
        ref={drawerRef}
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '50%',
          minWidth: 800,
          outline: 'none',
          maxWidth: 1000,
          background: 'var(--surface)',
          zIndex: 9999,
          overflowY: 'auto',
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.3)',
          animation: 'slideInRight 0.3s ease-out',
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <div style={{ padding: 24 }}>
          {/* ヘッダー */}
          <div style={{ marginBottom: 24, borderBottom: '1px solid var(--line)', paddingBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
                  Rレンジ：{rangeLabel} の詳細分析
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-light)' }}>
                  このRレンジのトレード傾向
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'var(--chip)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: 'var(--ink)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--line)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--chip)';
                }}
              >
                閉じる
              </button>
            </div>
          </div>

          {/* 基本KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, marginBottom: 24 }}>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>取引回数</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                {stats.tradeCount}回
              </div>
            </div>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>勝率</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{stats.winRate.toFixed(1)}%</div>
            </div>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>平均R</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: stats.avgR >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                {stats.avgR >= 0 ? '+' : ''}{stats.avgR.toFixed(2)}R
              </div>
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
          </div>

          {/* 構成分析 */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>構成分析</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              {/* 通貨ペア別損益 */}
              {pairStats.length > 0 && (
                <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>通貨ペア別損益</h4>
                  <div style={{ height: 150 }}>
                    <Bar
                      data={{
                        labels: pairStats.map(p => p.pair),
                        datasets: [{
                          label: '損益',
                          data: pairStats.map(p => p.profit),
                          backgroundColor: pairStats.map(p => p.profit >= 0 ? getAccentColor() : getLossColor()),
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
                              font: { size: 10 }
                            },
                          },
                          x: {
                            ticks: { font: { size: 10 } }
                          }
                        },
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 戦略タグ別件数 */}
              {setupStats.length > 0 && (
                <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>戦略タグ別件数</h4>
                  <div style={{ height: 150 }}>
                    <Bar
                      data={{
                        labels: setupStats.map(s => s.setup),
                        datasets: [{
                          label: '件数',
                          data: setupStats.map(s => s.count),
                          backgroundColor: getAccentColor(),
                        }],
                      }}
                      options={{
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          x: {
                            ticks: {
                              callback: (value) => `${value}回`,
                              font: { size: 10 }
                            },
                          },
                          y: {
                            ticks: { font: { size: 10 } }
                          }
                        },
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 売り vs 買い構成 */}
              {(directionStats.long.count + directionStats.short.count > 0) && (
                <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>売り vs 買い構成</h4>
                  <div style={{ height: 150 }}>
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
                          legend: { position: 'bottom' as const, labels: { font: { size: 11 } } },
                        },
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rの背景要因 */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Rの背景要因</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              {/* 保有時間分布 */}
              <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>保有時間分布</h4>
                <div style={{ height: 150 }}>
                  <Bar
                    data={{
                      labels: holdTimeStats.map(h => h.label),
                      datasets: [{
                        label: '件数',
                        data: holdTimeStats.map(h => h.count),
                        backgroundColor: getAccentColor(),
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: {
                          ticks: {
                            callback: (value) => `${value}回`,
                            font: { size: 10 }
                          },
                        },
                        x: {
                          ticks: { font: { size: 9 } }
                        }
                      },
                    }}
                  />
                </div>
              </div>

              {/* 時間帯別件数 */}
              <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>時間帯別件数</h4>
                <div style={{ height: 150 }}>
                  <Bar
                    data={{
                      labels: timeOfDayStats.map(t => t.slot),
                      datasets: [{
                        label: '件数',
                        data: timeOfDayStats.map(t => t.count),
                        backgroundColor: getAccentColor(),
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: {
                          ticks: {
                            callback: (value) => `${value}回`,
                            font: { size: 10 }
                          },
                        },
                        x: {
                          ticks: { font: { size: 9 } }
                        }
                      },
                    }}
                  />
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
              該当トレード一覧（{recentTrades.length}件）
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    <th style={{ padding: 8, textAlign: 'left', color: 'var(--ink-light)' }}>日時</th>
                    <th style={{ padding: 8, textAlign: 'left', color: 'var(--ink-light)' }}>通貨ペア</th>
                    <th style={{ padding: 8, textAlign: 'left', color: 'var(--ink-light)' }}>売買</th>
                    <th style={{ padding: 8, textAlign: 'left', color: 'var(--ink-light)' }}>戦略</th>
                    <th style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>損益</th>
                    <th style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>pips</th>
                    <th style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>R値</th>
                    <th style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>保有時間</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((trade, idx) => {
                    const rValue = avgLoss !== 0 ? getTradeProfit(trade) / Math.abs(avgLoss) : 0;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: 8, color: 'var(--ink)' }}>
                          {new Date(trade.datetime).toLocaleDateString('ja-JP')}
                        </td>
                        <td style={{ padding: 8, color: 'var(--ink)' }}>{getTradePair(trade)}</td>
                        <td style={{ padding: 8, color: 'var(--ink-light)' }}>{getTradeSide(trade)}</td>
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
                        <td style={{
                          padding: 8,
                          textAlign: 'right',
                          fontWeight: 600,
                          color: rValue >= 0 ? 'var(--gain)' : 'var(--loss)'
                        }}>
                          {rValue >= 0 ? '+' : ''}{rValue.toFixed(2)}R
                        </td>
                        <td style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>
                          {formatHoldTime(trade.openTime, trade.datetime)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <a
                href="#/trades"
                style={{
                  fontSize: 13,
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                このRレンジの全トレードを見る（取引一覧へ）→
              </a>
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
