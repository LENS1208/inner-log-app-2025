import React, { useMemo, useEffect, useRef } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { getAccentColor, getLossColor, getWarningColor } from '../../lib/chartColors';
import { Trade } from '../../lib/types';
import { getTradeProfit, getTradePair } from '../../lib/filterTrades';

interface DDContributionDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'weekday' | 'symbol';
  key: string;
  trades: Trade[];
  avgLoss: number;
}

function parseDateTime(datetime: string | number | undefined): Date {
  if (!datetime) return new Date(NaN);
  if (typeof datetime === 'number') return new Date(datetime);
  let dt = datetime.trim().replace(/\./g, '-').replace(' ', 'T');
  return new Date(dt);
}

function getWeekday(datetime: string): string {
  const dt = parseDateTime(datetime);
  if (isNaN(dt.getTime())) return '不明';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dt.getUTCDay()];
}

function getWeekdayFull(abbr: string): string {
  const map: Record<string, string> = {
    'Mon': 'Monday',
    'Tue': 'Tuesday',
    'Wed': 'Wednesday',
    'Thu': 'Thursday',
    'Fri': 'Friday',
    'Sat': 'Saturday',
    'Sun': 'Sunday'
  };
  return map[abbr] || abbr;
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

export default function DDContributionDetailDrawer({
  isOpen,
  onClose,
  type,
  key,
  trades,
  avgLoss
}: DDContributionDetailDrawerProps) {
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

  const lossTrades = useMemo(() => {
    return trades.filter(t => getTradeProfit(t) < 0);
  }, [trades]);

  const stats = useMemo(() => {
    const totalLoss = lossTrades.reduce((sum, t) => sum + Math.abs(getTradeProfit(t)), 0);
    const avgLossValue = lossTrades.length > 0 ? totalLoss / lossTrades.length : 0;
    const maxLoss = lossTrades.length > 0
      ? Math.max(...lossTrades.map(t => Math.abs(getTradeProfit(t))))
      : 0;
    const winTrades = trades.filter(t => getTradeProfit(t) > 0);
    const winRate = trades.length > 0 ? (winTrades.length / trades.length) * 100 : 0;

    return {
      totalLoss,
      tradeCount: trades.length,
      lossTradeCount: lossTrades.length,
      avgLossValue,
      maxLoss,
      winRate
    };
  }, [trades, lossTrades]);

  const pairStats = useMemo(() => {
    if (type === 'symbol') return [];

    const map = new Map<string, { loss: number; count: number }>();

    lossTrades.forEach(t => {
      const pair = getTradePair(t);
      const current = map.get(pair) || { loss: 0, count: 0 };
      map.set(pair, {
        loss: current.loss + Math.abs(getTradeProfit(t)),
        count: current.count + 1
      });
    });

    return Array.from(map.entries())
      .map(([pair, data]) => ({ pair, ...data }))
      .sort((a, b) => b.loss - a.loss)
      .slice(0, 8);
  }, [type, lossTrades]);

  const weekdayStats = useMemo(() => {
    if (type === 'weekday') return [];

    const map = new Map<string, { loss: number; count: number }>();
    const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    lossTrades.forEach(t => {
      const day = getWeekday(t.datetime);
      const current = map.get(day) || { loss: 0, count: 0 };
      map.set(day, {
        loss: current.loss + Math.abs(getTradeProfit(t)),
        count: current.count + 1
      });
    });

    return order.map(day => ({
      day,
      loss: map.get(day)?.loss || 0,
      count: map.get(day)?.count || 0
    }));
  }, [type, lossTrades]);

  const setupStats = useMemo(() => {
    const map = new Map<string, { loss: number; count: number }>();

    lossTrades.forEach(t => {
      const setup = t.setup || '未分類';
      const current = map.get(setup) || { loss: 0, count: 0 };
      map.set(setup, {
        loss: current.loss + Math.abs(getTradeProfit(t)),
        count: current.count + 1
      });
    });

    return Array.from(map.entries())
      .map(([setup, data]) => ({ setup, ...data }))
      .sort((a, b) => b.loss - a.loss)
      .slice(0, 8);
  }, [lossTrades]);

  const timeOfDayStats = useMemo(() => {
    const map = new Map<string, { loss: number; count: number }>();
    const order = ['アジア', '欧州前場', '欧州後場', 'NY前場', 'NY後場'];

    lossTrades.forEach(t => {
      const timeSlot = getTimeOfDay(t.datetime);
      const current = map.get(timeSlot) || { loss: 0, count: 0 };
      map.set(timeSlot, {
        loss: current.loss + Math.abs(getTradeProfit(t)),
        count: current.count + 1
      });
    });

    return order.map(slot => ({
      slot,
      loss: map.get(slot)?.loss || 0,
      count: map.get(slot)?.count || 0
    }));
  }, [lossTrades]);

  const avgHoldTime = useMemo(() => {
    if (lossTrades.length === 0) return 0;
    const totalMinutes = lossTrades.reduce((sum, t) => {
      return sum + getHoldTimeMinutes(t.openTime, t.datetime);
    }, 0);
    return totalMinutes / lossTrades.length;
  }, [lossTrades]);

  const streakPattern = useMemo(() => {
    const sortedTrades = [...trades].sort((a, b) =>
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );

    let currentStreak = 0;
    const streaks: number[] = [];

    sortedTrades.forEach(t => {
      const profit = getTradeProfit(t);
      if (profit < 0) {
        currentStreak--;
      } else {
        if (currentStreak < 0) {
          streaks.push(currentStreak);
        }
        currentStreak = 0;
      }
    });

    if (currentStreak < 0) {
      streaks.push(currentStreak);
    }

    return streaks.slice(-10);
  }, [trades]);

  const aiComment = useMemo(() => {
    const title = type === 'weekday' ? getWeekdayFull(key) : key;
    let comment = '';

    if (type === 'weekday') {
      comment += `${title}のDDは`;
      if (pairStats.length > 0) {
        comment += `主に${pairStats[0].pair}`;
      }
    } else {
      comment += `${title}は全体損失の${((stats.totalLoss / (stats.totalLoss + 1)) * 100).toFixed(0)}％のDD寄与があり、`;
      if (weekdayStats.length > 0) {
        const topDay = weekdayStats.reduce((max, curr) => curr.loss > max.loss ? curr : max, weekdayStats[0]);
        if (topDay.loss > 0) {
          comment += `特に${topDay.day}`;
        }
      }
    }

    if (setupStats.length > 0 && setupStats[0].loss > stats.totalLoss * 0.3) {
      comment += `の${setupStats[0].setup}`;
    }

    const topTimeSlot = timeOfDayStats.reduce((max, curr) => curr.loss > max.loss ? curr : max, timeOfDayStats[0]);
    if (topTimeSlot.loss > stats.totalLoss * 0.3) {
      comment += `で${topTimeSlot.slot}`;
    }

    comment += 'の取引で注意が必要です。';

    return comment;
  }, [type, key, stats, pairStats, weekdayStats, setupStats, timeOfDayStats]);

  const recentLossTrades = useMemo(() => {
    return [...lossTrades]
      .sort((a, b) => Math.abs(getTradeProfit(b)) - Math.abs(getTradeProfit(a)))
      .slice(0, 20);
  }, [lossTrades]);

  const title = type === 'weekday' ? getWeekdayFull(key) : key;

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
                  {title} のDD寄与詳細
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-light)' }}>
                  この条件がドローダウンに与えた影響
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

          {/* DD関連KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, marginBottom: 24 }}>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>累計DD寄与額</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--loss)' }}>
                -{stats.totalLoss.toLocaleString()}円
              </div>
            </div>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>対象トレード数</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                {stats.tradeCount}回
              </div>
            </div>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>平均損失</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--loss)' }}>
                -{Math.round(stats.avgLossValue).toLocaleString()}円
              </div>
            </div>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>最大損失</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--loss)' }}>
                -{Math.round(stats.maxLoss).toLocaleString()}円
              </div>
            </div>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>この条件での勝率</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                {stats.winRate.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* 構造分析 */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>構造分析</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              {/* 通貨ペア別損失（weekdayの場合） */}
              {type === 'weekday' && pairStats.length > 0 && (
                <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>通貨ペア別損失</h4>
                  <div style={{ height: 150 }}>
                    <Bar
                      data={{
                        labels: pairStats.map(p => p.pair),
                        datasets: [{
                          label: '損失',
                          data: pairStats.map(p => p.loss),
                          backgroundColor: getLossColor(),
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

              {/* 曜日別損失（symbolの場合） */}
              {type === 'symbol' && weekdayStats.length > 0 && (
                <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>曜日別損失</h4>
                  <div style={{ height: 150 }}>
                    <Bar
                      data={{
                        labels: weekdayStats.map(d => d.day),
                        datasets: [{
                          label: '損失',
                          data: weekdayStats.map(d => d.loss),
                          backgroundColor: getLossColor(),
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

              {/* 戦略タグ別損失 */}
              {setupStats.length > 0 && (
                <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>戦略タグ別損失</h4>
                  <div style={{ height: 150 }}>
                    <Bar
                      data={{
                        labels: setupStats.map(s => s.setup),
                        datasets: [{
                          label: '損失',
                          data: setupStats.map(s => s.loss),
                          backgroundColor: getWarningColor(),
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
                              callback: (value) => `${(value as number).toLocaleString()}円`,
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

              {/* 時間帯別損失 */}
              <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>時間帯別損失</h4>
                <div style={{ height: 150 }}>
                  <Bar
                    data={{
                      labels: timeOfDayStats.map(t => t.slot),
                      datasets: [{
                        label: '損失',
                        data: timeOfDayStats.map(t => t.loss),
                        backgroundColor: getLossColor(),
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
                          ticks: { font: { size: 9 } }
                        }
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* パターン分析 */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>パターン分析</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              {/* DD発生前後の連敗パターン */}
              {streakPattern.length > 0 && (
                <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>連敗パターン（直近10回）</h4>
                  <div style={{ height: 150 }}>
                    <Line
                      data={{
                        labels: streakPattern.map((_, i) => `#${i + 1}`),
                        datasets: [{
                          label: '連敗数',
                          data: streakPattern,
                          borderColor: getLossColor(),
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          fill: true,
                          tension: 0.3,
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
              )}

              {/* 保有時間の傾向 */}
              <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>保有時間の傾向</h4>
                <div style={{ padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)' }}>
                    {Math.floor(avgHoldTime / 60)}h {Math.floor(avgHoldTime % 60)}m
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-light)', marginTop: 8 }}>
                    DDトレードの平均保有時間
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-light)', marginTop: 12, lineHeight: 1.5 }}>
                    {avgHoldTime < 60
                      ? '短期トレードでDDが発生しています'
                      : avgHoldTime < 240
                      ? '中期保有でのDDが目立ちます'
                      : '長期保有によるDDが多い傾向です'}
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

          {/* DD関連トレード一覧 */}
          <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
              DD関連トレード一覧（損失額上位{recentLossTrades.length}件）
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    <th style={{ padding: 8, textAlign: 'left', color: 'var(--ink-light)' }}>日時</th>
                    <th style={{ padding: 8, textAlign: 'left', color: 'var(--ink-light)' }}>曜日</th>
                    <th style={{ padding: 8, textAlign: 'left', color: 'var(--ink-light)' }}>通貨ペア</th>
                    <th style={{ padding: 8, textAlign: 'left', color: 'var(--ink-light)' }}>戦略</th>
                    <th style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>損益</th>
                    <th style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>pips</th>
                    <th style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>R値</th>
                    <th style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>保有時間</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLossTrades.map((trade, idx) => {
                    const rValue = avgLoss !== 0 ? getTradeProfit(trade) / Math.abs(avgLoss) : 0;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: 8, color: 'var(--ink)' }}>
                          {new Date(trade.datetime).toLocaleDateString('ja-JP')}
                        </td>
                        <td style={{ padding: 8, color: 'var(--ink-light)' }}>{getWeekday(trade.datetime)}</td>
                        <td style={{ padding: 8, color: 'var(--ink)' }}>{getTradePair(trade)}</td>
                        <td style={{ padding: 8, color: 'var(--ink-light)' }}>{trade.setup || '-'}</td>
                        <td style={{
                          padding: 8,
                          textAlign: 'right',
                          fontWeight: 600,
                          color: 'var(--loss)'
                        }}>
                          {Math.round(getTradeProfit(trade)).toLocaleString()}円
                        </td>
                        <td style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>
                          {(trade.pips || 0).toFixed(1)}
                        </td>
                        <td style={{
                          padding: 8,
                          textAlign: 'right',
                          fontWeight: 600,
                          color: 'var(--loss)'
                        }}>
                          {rValue.toFixed(2)}R
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
                この条件のDD関連トレードをすべて見る（取引一覧へ）→
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
