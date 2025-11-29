import React, { useMemo, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { getAccentColor, getLossColor } from '../../lib/chartColors';
import { Trade } from '../../lib/types';
import { getTradeProfit, getTradePair } from '../../lib/filterTrades';

interface SetupDirectionDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  setupTag: string;
  direction: 'BUY' | 'SELL';
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

function getTimeOfDay(datetime: string): string {
  const dt = parseDateTime(datetime);
  if (isNaN(dt.getTime())) return '不明';
  const hour = dt.getUTCHours();

  if (hour >= 0 && hour < 9) return 'アジア朝';
  if (hour >= 9 && hour < 13) return '欧州前場';
  if (hour >= 13 && hour < 17) return '欧州後場';
  if (hour >= 17 && hour < 21) return 'NY前場';
  if (hour >= 21 && hour < 24) return 'NY後場';
  return 'アジア深夜';
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

export default function SetupDirectionDetailDrawer({
  isOpen,
  onClose,
  setupTag,
  direction,
  trades,
  avgLoss
}: SetupDirectionDetailDrawerProps) {
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

  const directionLabel = direction === 'BUY' ? '買い' : '売り';

  const stats = useMemo(() => {
    const totalProfit = trades.reduce((sum, t) => sum + getTradeProfit(t), 0);
    const winTrades = trades.filter(t => getTradeProfit(t) > 0);
    const lossTrades = trades.filter(t => getTradeProfit(t) < 0);
    const winRate = trades.length > 0 ? (winTrades.length / trades.length) * 100 : 0;
    const avgProfit = trades.length > 0 ? totalProfit / trades.length : 0;

    const totalWin = winTrades.reduce((sum, t) => sum + getTradeProfit(t), 0);
    const totalLoss = Math.abs(lossTrades.reduce((sum, t) => sum + getTradeProfit(t), 0));
    const pf = totalLoss > 0 ? totalWin / totalLoss : 0;

    return {
      totalProfit,
      tradeCount: trades.length,
      winRate,
      avgProfit,
      pf
    };
  }, [trades]);

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
      .slice(0, 6);
  }, [trades]);

  const timeOfDayStats = useMemo(() => {
    const map = new Map<string, { profit: number; count: number }>();
    const order = ['アジア朝', '欧州前場', '欧州後場', 'NY前場', 'NY後場', 'アジア深夜'];

    trades.forEach(t => {
      const timeSlot = getTimeOfDay(t.datetime);
      const current = map.get(timeSlot) || { profit: 0, count: 0 };
      map.set(timeSlot, {
        profit: current.profit + getTradeProfit(t),
        count: current.count + 1
      });
    });

    return order.map(slot => ({
      slot,
      profit: map.get(slot)?.profit || 0,
      count: map.get(slot)?.count || 0
    }));
  }, [trades]);

  const weekdayStats = useMemo(() => {
    const map = new Map<string, { profit: number; count: number }>();
    const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    trades.forEach(t => {
      const day = getWeekday(t.datetime);
      const current = map.get(day) || { profit: 0, count: 0 };
      map.set(day, {
        profit: current.profit + getTradeProfit(t),
        count: current.count + 1
      });
    });

    return order.map(day => ({
      day,
      profit: map.get(day)?.profit || 0,
      count: map.get(day)?.count || 0
    }));
  }, [trades]);

  const avgHoldTime = useMemo(() => {
    if (trades.length === 0) return 0;
    const totalMinutes = trades.reduce((sum, t) => {
      return sum + getHoldTimeMinutes(t.openTime, t.datetime);
    }, 0);
    return totalMinutes / trades.length;
  }, [trades]);

  const rDistribution = useMemo(() => {
    const absAvgLoss = Math.abs(avgLoss);
    if (absAvgLoss === 0) return { winR: 0, lossR: 0 };

    const winTrades = trades.filter(t => getTradeProfit(t) > 0);
    const lossTrades = trades.filter(t => getTradeProfit(t) < 0);

    const avgWinR = winTrades.length > 0
      ? winTrades.reduce((sum, t) => sum + (getTradeProfit(t) / absAvgLoss), 0) / winTrades.length
      : 0;

    const avgLossR = lossTrades.length > 0
      ? lossTrades.reduce((sum, t) => sum + (getTradeProfit(t) / absAvgLoss), 0) / lossTrades.length
      : 0;

    return { winR: avgWinR, lossR: avgLossR };
  }, [trades, avgLoss]);

  const aiComment = useMemo(() => {
    let comment = `${setupTag}戦略の${directionLabel}ポジションは`;

    if (stats.winRate > 60) {
      comment += '高い勝率を維持しており、';
    } else if (stats.winRate < 40) {
      comment += '勝率が低めですが、';
    } else {
      comment += '標準的な勝率で、';
    }

    if (stats.pf > 1.5) {
      comment += 'PFが優秀で収益性が高いです。';
    } else if (stats.pf < 1.0) {
      comment += 'PFが1.0未満なので改善が必要です。';
    } else {
      comment += 'バランスの取れた結果です。';
    }

    const topPair = pairStats[0];
    if (topPair && topPair.count > trades.length * 0.3) {
      comment += `${topPair.pair}が中心で`;
      if (topPair.profit > 0) {
        comment += '利益に貢献しています。';
      } else {
        comment += '損失が大きくなっています。';
      }
    }

    const topTimeSlot = timeOfDayStats.reduce((max, curr) =>
      Math.abs(curr.profit) > Math.abs(max.profit) ? curr : max
    , timeOfDayStats[0]);

    if (topTimeSlot && topTimeSlot.count > trades.length * 0.25) {
      comment += `${topTimeSlot.slot}の取引が効果的です。`;
    }

    return comment;
  }, [setupTag, directionLabel, stats, pairStats, timeOfDayStats, trades.length]);

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
                  {setupTag} × {directionLabel} の詳細分析
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-light)' }}>
                  この組み合わせのトレード傾向
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
              <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>合計損益</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: stats.totalProfit >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                {stats.totalProfit >= 0 ? '+' : ''}{Math.round(stats.totalProfit).toLocaleString()}円
              </div>
            </div>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>平均損益</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: stats.avgProfit >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                {stats.avgProfit >= 0 ? '+' : ''}{Math.round(stats.avgProfit).toLocaleString()}円
              </div>
            </div>
            <div style={{ padding: 12, background: 'var(--chip)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>PF</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: stats.pf >= 1 ? 'var(--gain)' : 'var(--loss)' }}>
                {stats.pf.toFixed(2)}
              </div>
            </div>
          </div>

          {/* 構造分析 */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>構造分析</h3>
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

              {/* 時間帯別損益 */}
              <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>時間帯別損益</h4>
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

              {/* 曜日別損益 */}
              <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>曜日別損益</h4>
                <div style={{ height: 150 }}>
                  <Bar
                    data={{
                      labels: weekdayStats.map(d => d.day),
                      datasets: [{
                        label: '損益',
                        data: weekdayStats.map(d => d.profit),
                        backgroundColor: weekdayStats.map(d => d.profit >= 0 ? getAccentColor() : getLossColor()),
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
            </div>
          </div>

          {/* R・保有時間 */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>R・保有時間</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {/* R-multiple簡易分布 */}
              <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>R-multiple簡易分布</h4>
                <div style={{ padding: 20 }}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>平均勝ちR</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--gain)' }}>
                      +{rDistribution.winR.toFixed(2)}R
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 4 }}>平均負けR</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--loss)' }}>
                      {rDistribution.lossR.toFixed(2)}R
                    </div>
                  </div>
                </div>
              </div>

              {/* 平均保有時間 */}
              <div style={{ background: 'var(--chip)', padding: 16, borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>平均保有時間</h4>
                <div style={{ padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--ink)' }}>
                    {Math.floor(avgHoldTime / 60)}h {Math.floor(avgHoldTime % 60)}m
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-light)', marginTop: 8 }}>
                    この組み合わせの平均保有時間
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-light)', marginTop: 12 }}>
                    {avgHoldTime < 60
                      ? 'スキャルピング型'
                      : avgHoldTime < 240
                      ? 'デイトレード型'
                      : 'スイング型'}
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
              トレード一覧（{recentTrades.length}件）
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    <th style={{ padding: 8, textAlign: 'left', color: 'var(--ink-light)' }}>日時</th>
                    <th style={{ padding: 8, textAlign: 'left', color: 'var(--ink-light)' }}>通貨ペア</th>
                    <th style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>損益</th>
                    <th style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>pips</th>
                    <th style={{ padding: 8, textAlign: 'right', color: 'var(--ink-light)' }}>R</th>
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
                この組み合わせの全トレードを見る（取引一覧へ）→
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
