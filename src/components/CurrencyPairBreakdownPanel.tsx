import React, { useMemo } from 'react';
import { getGridLineColor, getAccentColor, getLossColor, getLongColor, getShortColor } from "../lib/chartColors";
import { Bar, Line } from 'react-chartjs-2';
import type { Trade } from '../lib/types';
import { useTheme } from '../lib/theme.context';

type TradeWithProfit = {
  profitYen?: number;
  profitJPY?: number;
  datetime?: string;
  time?: number;
  pair?: string;
  symbol?: string;
  side?: 'LONG' | 'SHORT';
  openTime?: string;
  closePrice?: number;
  openPrice?: number;
};

function getProfit(t: TradeWithProfit): number {
  return t.profitYen ?? t.profitJPY ?? 0;
}

function parseDateTime(datetime: string | number | undefined): Date {
  if (!datetime) return new Date(NaN);
  if (typeof datetime === 'number') return new Date(datetime);

  let dt = datetime.trim();
  if (!dt) return new Date(NaN);

  dt = dt.replace(/\./g, '-').replace(' ', 'T');
  return new Date(dt);
}

interface CurrencyPairBreakdownPanelProps {
  trades: TradeWithProfit[];
  pairLabel: string;
  onClose: () => void;
}

export default function CurrencyPairBreakdownPanel({ trades, pairLabel, onClose }: CurrencyPairBreakdownPanelProps) {
  const { theme } = useTheme();
  const stats = useMemo(() => {
    const winTrades = trades.filter(t => getProfit(t) > 0);
    const lossTrades = trades.filter(t => getProfit(t) <= 0);

    const totalPnL = trades.reduce((sum, t) => sum + getProfit(t), 0);
    const avgPnL = trades.length > 0 ? totalPnL / trades.length : 0;

    const winRate = trades.length > 0 ? (winTrades.length / trades.length) * 100 : 0;

    const longTrades = trades.filter(t => t.side === 'LONG');
    const shortTrades = trades.filter(t => t.side === 'SHORT');

    const longCount = longTrades.length;
    const shortCount = shortTrades.length;

    const longWinTrades = longTrades.filter(t => getProfit(t) > 0);
    const shortWinTrades = shortTrades.filter(t => getProfit(t) > 0);

    const longWinRate = longCount > 0 ? (longWinTrades.length / longCount) * 100 : 0;
    const shortWinRate = shortCount > 0 ? (shortWinTrades.length / shortCount) * 100 : 0;

    const longTotalPnL = longTrades.reduce((sum, t) => sum + getProfit(t), 0);
    const shortTotalPnL = shortTrades.reduce((sum, t) => sum + getProfit(t), 0);

    const longAvgPnL = longCount > 0 ? longTotalPnL / longCount : 0;
    const shortAvgPnL = shortCount > 0 ? shortTotalPnL / shortCount : 0;

    const longGrossProfit = longTrades.filter(t => getProfit(t) > 0).reduce((sum, t) => sum + getProfit(t), 0);
    const longGrossLoss = Math.abs(longTrades.filter(t => getProfit(t) <= 0).reduce((sum, t) => sum + getProfit(t), 0));
    const longPF = longGrossLoss > 0 ? longGrossProfit / longGrossLoss : (longGrossProfit > 0 ? Infinity : 0);

    const shortGrossProfit = shortTrades.filter(t => getProfit(t) > 0).reduce((sum, t) => sum + getProfit(t), 0);
    const shortGrossLoss = Math.abs(shortTrades.filter(t => getProfit(t) <= 0).reduce((sum, t) => sum + getProfit(t), 0));
    const shortPF = shortGrossLoss > 0 ? shortGrossProfit / shortGrossLoss : (shortGrossProfit > 0 ? Infinity : 0);

    const hourMap = new Map<number, { profit: number; count: number }>();
    for (let i = 0; i < 24; i++) {
      hourMap.set(i, { profit: 0, count: 0 });
    }

    trades.forEach(t => {
      const date = parseDateTime(t.datetime || t.time);
      if (!isNaN(date.getTime())) {
        const hour = date.getHours();
        const current = hourMap.get(hour)!;
        current.profit += getProfit(t);
        current.count += 1;
      }
    });

    const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}時`);
    const hourCounts = Array.from({ length: 24 }, (_, i) => hourMap.get(i)!.count);
    const hourProfits = Array.from({ length: 24 }, (_, i) => hourMap.get(i)!.profit);

    const weekdayMap = new Map<number, { profit: number; count: number }>();
    for (let i = 0; i < 7; i++) {
      weekdayMap.set(i, { profit: 0, count: 0 });
    }

    trades.forEach(t => {
      const date = parseDateTime(t.datetime || t.time);
      if (!isNaN(date.getTime())) {
        const day = date.getDay();
        const current = weekdayMap.get(day)!;
        current.profit += getProfit(t);
        current.count += 1;
      }
    });

    const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];
    const weekdayCounts = weekdayLabels.map((_, i) => weekdayMap.get(i)!.count);
    const weekdayProfits = weekdayLabels.map((_, i) => weekdayMap.get(i)!.profit);

    const holdingTimeRanges = [
      { label: '30分以内', min: 0, max: 30 },
      { label: '30分～1時間', min: 30, max: 60 },
      { label: '1～2時間', min: 60, max: 120 },
      { label: '2～4時間', min: 120, max: 240 },
      { label: '4～8時間', min: 240, max: 480 },
      { label: '8～24時間', min: 480, max: 1440 },
      { label: '1日以上', min: 1440, max: Infinity },
    ];

    const holdingTimeWinCounts = holdingTimeRanges.map(() => 0);
    const holdingTimeLossCounts = holdingTimeRanges.map(() => 0);

    trades.forEach(t => {
      const profit = getProfit(t);
      let holdingTimeMin = 0;

      if (typeof t.time === 'number' && (t as any).openTimeMs) {
        holdingTimeMin = (t.time - (t as any).openTimeMs) / (1000 * 60);
      } else if (t.datetime && (t as any).openTime) {
        const closeTime = parseDateTime(t.datetime).getTime();
        const openTime = parseDateTime((t as any).openTime).getTime();
        holdingTimeMin = (closeTime - openTime) / (1000 * 60);
      }

      if (Number.isFinite(holdingTimeMin) && holdingTimeMin >= 0) {
        const rangeIndex = holdingTimeRanges.findIndex(r => holdingTimeMin > r.min && holdingTimeMin <= r.max);
        if (rangeIndex >= 0) {
          if (profit > 0) {
            holdingTimeWinCounts[rangeIndex]++;
          } else {
            holdingTimeLossCounts[rangeIndex]++;
          }
        }
      }
    });

    const sortedTrades = [...trades].sort((a, b) => {
      const dateA = parseDateTime(a.datetime || a.time).getTime();
      const dateB = parseDateTime(b.datetime || b.time).getTime();
      return dateA - dateB;
    });

    const maxProfit = Math.max(...trades.map(t => getProfit(t)));
    const maxLoss = Math.min(...trades.map(t => getProfit(t)));
    const avgHoldingTime = trades.reduce((sum, t) => {
      let holdingTimeMin = 0;
      if (typeof t.time === 'number' && (t as any).openTimeMs) {
        holdingTimeMin = (t.time - (t as any).openTimeMs) / (1000 * 60);
      } else if (t.datetime && (t as any).openTime) {
        const closeTime = parseDateTime(t.datetime).getTime();
        const openTime = parseDateTime((t as any).openTime).getTime();
        holdingTimeMin = (closeTime - openTime) / (1000 * 60);
      }
      return sum + holdingTimeMin;
    }, 0) / trades.length;

    return {
      tradeCount: trades.length,
      avgPnL,
      winRate,
      longCount,
      shortCount,
      longWinRate,
      shortWinRate,
      longAvgPnL,
      shortAvgPnL,
      longPF,
      shortPF,
      longTotalPnL,
      shortTotalPnL,
      hourLabels,
      hourCounts,
      hourProfits,
      weekdayLabels,
      weekdayCounts,
      weekdayProfits,
      holdingTimeRanges,
      holdingTimeWinCounts,
      holdingTimeLossCounts,
      sortedTrades,
      maxProfit,
      maxLoss,
      avgHoldingTime,
    };
  }, [trades]);

  const hourChartData = useMemo(() => ({
    labels: stats.hourLabels,
    datasets: [{
      label: '取引回数',
      data: stats.hourCounts,
      backgroundColor: stats.hourProfits.map(p => p >= 0 ? getLongColor() : getLossColor()),
    }],
  }), [stats, theme]);

  const weekdayChartData = useMemo(() => ({
    labels: stats.weekdayLabels,
    datasets: [{
      label: '取引回数',
      data: stats.weekdayCounts,
      backgroundColor: stats.weekdayProfits.map(p => p >= 0 ? getLongColor() : getLossColor()),
    }],
  }), [stats, theme]);

  const holdingTimeChartData = useMemo(() => ({
    labels: stats.holdingTimeRanges.map(r => r.label),
    datasets: [
      {
        label: '勝ち取引',
        data: stats.holdingTimeWinCounts,
        backgroundColor: getLongColor(),
      },
      {
        label: '負け取引',
        data: stats.holdingTimeLossCounts,
        backgroundColor: getLossColor(),
      }
    ]
  }), [stats, theme]);

  const pnlTimeSeriesData = useMemo(() => ({
    labels: stats.sortedTrades.map((_, i) => i + 1),
    datasets: [{
      label: '損益',
      data: stats.sortedTrades.map(t => getProfit(t)),
      borderColor: (context: any) => {
        if (!context.raw) return getAccentColor();
        return context.raw >= 0 ? getLongColor() : getLossColor();
      },
      backgroundColor: (context: any) => {
        if (!context.raw) return getAccentColor(0.3);
        return context.raw >= 0 ? getLongColor(0.3) : getLossColor(0.3);
      },
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      segment: {
        borderColor: (ctx: any) => {
          return ctx.p1.parsed.y >= 0 ? getLongColor() : getLossColor();
        }
      }
    }]
  }), [stats, theme]);



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
          zIndex: 1000,
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '100%',
          maxWidth: 560,
          height: '100vh',
          background: 'var(--surface)',
          zIndex: 1001,
          overflowY: 'auto',
          boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.2)',
          animation: 'slideInRight 0.3s ease-out',
        }}
      >
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

        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: getAccentColor(), margin: 0 }}>
              {pairLabel} 詳細分析
            </h2>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                border: 'none',
                background: 'transparent',
                fontSize: 24,
                cursor: 'pointer',
                color: 'var(--muted)',
              }}
              aria-label="閉じる"
            >
              ✕
            </button>
          </div>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>基本統計</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>該当取引回数</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>
                  {stats.tradeCount} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>回</span>
                </div>
              </div>
              <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>
                  {stats.avgPnL >= 0 ? '平均利益' : '平均損失'}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: stats.avgPnL >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                  {Math.round(stats.avgPnL).toLocaleString('ja-JP')} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>円</span>
                </div>
              </div>
              <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>勝率</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: stats.winRate >= 50 ? 'var(--gain)' : 'var(--loss)' }}>
                  {stats.winRate.toFixed(1)} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>%</span>
                </div>
              </div>
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>通貨ペア別</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>最大利益</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gain)' }}>
                  {Math.round(stats.maxProfit).toLocaleString('ja-JP')} <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>円</span>
                </div>
              </div>
              <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>最大損失</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--loss)' }}>
                  {Math.round(stats.maxLoss).toLocaleString('ja-JP')} <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>円</span>
                </div>
              </div>
              <div style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>平均保有時間</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
                  {Math.round(stats.avgHoldingTime)} <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>分</span>
                </div>
              </div>
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>売り vs 買い</h3>
            {(stats.longCount > 0 || stats.shortCount > 0) ? (
              <div style={{
                padding: '20px',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 12
              }}>
                <div style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  marginBottom: 8,
                  textAlign: 'center'
                }}>
                  {pairLabel} ({stats.tradeCount}回)
                </div>
                <div style={{
                  height: 1,
                  background: 'var(--line)',
                  margin: '12px 0'
                }} />

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  gap: 16,
                  alignItems: 'center'
                }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: getShortColor(),
                      marginBottom: 12
                    }}>
                      売り ({stats.shortCount}回)
                    </div>
                  </div>
                  <div style={{
                    width: 1,
                    height: 180,
                    background: 'var(--line)'
                  }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: getLongColor(),
                      marginBottom: 12
                    }}>
                      買い ({stats.longCount}回)
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  gap: 16,
                  marginTop: -168
                }}>
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>勝率</div>
                      <div style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: stats.shortWinRate >= 50 ? 'var(--gain)' : 'var(--loss)',
                        textAlign: 'right'
                      }}>
                        {stats.shortWinRate.toFixed(1)}%
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>EV</div>
                      <div style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: stats.shortAvgPnL >= 0 ? 'var(--gain)' : 'var(--loss)',
                        textAlign: 'right'
                      }}>
                        {stats.shortAvgPnL >= 0 ? '+' : ''}{Math.round(stats.shortAvgPnL).toLocaleString('ja-JP')}円
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>PF</div>
                      <div style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: stats.shortPF >= 1 ? 'var(--gain)' : 'var(--loss)',
                        textAlign: 'right'
                      }}>
                        {stats.shortPF === Infinity ? '∞' : stats.shortPF.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>合計</div>
                      <div style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: stats.shortTotalPnL >= 0 ? 'var(--gain)' : 'var(--loss)',
                        textAlign: 'right'
                      }}>
                        {stats.shortTotalPnL >= 0 ? '+' : ''}{Math.round(stats.shortTotalPnL).toLocaleString('ja-JP')}円
                      </div>
                    </div>
                  </div>

                  <div style={{ width: 1 }} />

                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>勝率</div>
                      <div style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: stats.longWinRate >= 50 ? 'var(--gain)' : 'var(--loss)',
                        textAlign: 'left'
                      }}>
                        {stats.longWinRate.toFixed(1)}%
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>EV</div>
                      <div style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: stats.longAvgPnL >= 0 ? 'var(--gain)' : 'var(--loss)',
                        textAlign: 'left'
                      }}>
                        {stats.longAvgPnL >= 0 ? '+' : ''}{Math.round(stats.longAvgPnL).toLocaleString('ja-JP')}円
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>PF</div>
                      <div style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: stats.longPF >= 1 ? 'var(--gain)' : 'var(--loss)',
                        textAlign: 'left'
                      }}>
                        {stats.longPF === Infinity ? '∞' : stats.longPF.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>合計</div>
                      <div style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: stats.longTotalPnL >= 0 ? 'var(--gain)' : 'var(--loss)',
                        textAlign: 'left'
                      }}>
                        {stats.longTotalPnL >= 0 ? '+' : ''}{Math.round(stats.longTotalPnL).toLocaleString('ja-JP')}円
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  height: 1,
                  background: 'var(--line)',
                  margin: '16px 0'
                }} />

                <div style={{
                  textAlign: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  padding: '8px',
                  borderRadius: 8,
background: stats.longTotalPnL > stats.shortTotalPnL
                    ? getLongColor(0.1)
                    : stats.shortTotalPnL > stats.longTotalPnL
                    ? getShortColor(0.1)
                    : 'rgba(100, 116, 139, 0.1)',
                  color: stats.longTotalPnL > stats.shortTotalPnL
                    ? getLongColor()
                    : stats.shortTotalPnL > stats.longTotalPnL
                    ? getShortColor()
                    : 'var(--muted)'
                }}>
                  {stats.longTotalPnL > stats.shortTotalPnL
                    ? '買い優位'
                    : stats.shortTotalPnL > stats.longTotalPnL
                    ? '売り優位'
                    : '同等'}
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 32 }}>データがありません</div>
            )}
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>時間帯別</h3>
            <div style={{ height: 280 }}>
              <Bar
                data={hourChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => `取引回数: ${context.parsed.y}件`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      grid: { color: getGridLineColor() },
                      ticks: { maxRotation: 45, minRotation: 45, font: { size: 11 } }
                    },
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value: any) => `${value}件`,
                        stepSize: 1,
                      },
                      grid: { color: getGridLineColor() },
                    },
                  },
                }}
              />
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>曜日別</h3>
            <div style={{ height: 280 }}>
              <Bar
                data={weekdayChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => `取引回数: ${context.parsed.y}件`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      grid: { color: getGridLineColor() },
                    },
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value: any) => `${value}件`,
                        stepSize: 1,
                      },
                      grid: { color: getGridLineColor() },
                    },
                  },
                }}
              />
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>保有時間別</h3>
            <div style={{ height: 300 }}>
              <Bar
                data={holdingTimeChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top',
                      labels: { font: { size: 12 } }
                    },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => `${context.dataset.label}: ${context.parsed.y}件`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      stacked: false,
                      grid: { color: getGridLineColor() },
                      ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: { size: 11 }
                      }
                    },
                    y: {
                      stacked: false,
                      beginAtZero: true,
                      ticks: {
                        callback: (value: any) => `${value}件`,
                      },
                      grid: { color: getGridLineColor() },
                    },
                  },
                }}
              />
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>損益時系列</h3>
            <div style={{ height: 300 }}>
              <Line
                data={pnlTimeSeriesData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => `損益: ${Math.round(context.parsed.y).toLocaleString('ja-JP')}円`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      grid: { color: getGridLineColor() },
                      ticks: {
                        callback: (value: any) => `#${value}`,
                      },
                    },
                    y: {
                      beginAtZero: false,
                      ticks: {
                        callback: (value: any) => `${Math.round(value).toLocaleString('ja-JP')}円`,
                      },
                      grid: { color: getGridLineColor() },
                    },
                  },
                }}
              />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
