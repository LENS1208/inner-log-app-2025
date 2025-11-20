import React, { useMemo } from 'react';
import { getGridLineColor, getAccentColor, getLossColor, getLongColor, getShortColor } from "../lib/chartColors";
import { useTheme } from '../lib/theme.context';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import type { Trade } from '../lib/types';

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

interface WeekdayBreakdownPanelProps {
  trades: TradeWithProfit[];
  rangeLabel: string;
  onClose: () => void;
}

export default function WeekdayBreakdownPanel({ trades, rangeLabel, onClose }: WeekdayBreakdownPanelProps) {
  const { theme } = useTheme();
  const stats = useMemo(() => {
    const winTrades = trades.filter(t => getProfit(t) > 0);
    const lossTrades = trades.filter(t => getProfit(t) <= 0);

    const totalPnL = trades.reduce((sum, t) => sum + getProfit(t), 0);
    const avgPnL = trades.length > 0 ? totalPnL / trades.length : 0;

    const winRate = trades.length > 0 ? (winTrades.length / trades.length) * 100 : 0;

    const pairCounts: Record<string, number> = {};
    trades.forEach(t => {
      const pair = t.pair || t.symbol || 'UNKNOWN';
      pairCounts[pair] = (pairCounts[pair] || 0) + 1;
    });

    const longCount = trades.filter(t => t.side === 'LONG').length;
    const shortCount = trades.filter(t => t.side === 'SHORT').length;

    const hourCounts = new Array(24).fill(0);
    trades.forEach(t => {
      const date = parseDateTime(t.datetime || t.time);
      if (!isNaN(date.getTime())) {
        const hour = date.getHours();
        hourCounts[hour]++;
      }
    });

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

    return {
      tradeCount: trades.length,
      avgPnL,
      winRate,
      pairCounts,
      longCount,
      shortCount,
      hourCounts,
      holdingTimeRanges,
      holdingTimeWinCounts,
      holdingTimeLossCounts,
      sortedTrades,
    };
  }, [trades]);

  const topPairs = Object.entries(stats.pairCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const pairChartData = useMemo(() => ({
    labels: topPairs.map(([pair]) => pair),
    datasets: [{
      data: topPairs.map(([, count]) => count),
      backgroundColor: [
        getAccentColor(),
        getLossColor(),
        getLongColor(),
        getShortColor(0.8),
        'rgba(139, 92, 246, 0.8)',
        'rgba(6, 182, 212, 0.8)',
        getAccentColor(),
        'rgba(236, 72, 153, 0.8)',
      ],
      borderWidth: 0,
    }],
  }), [topPairs, theme]);

  const sideChartData = useMemo(() => ({
    labels: ['売り', '買い'],
    datasets: [{
      data: [stats.shortCount, stats.longCount],
      backgroundColor: [getShortColor(), getLongColor()],
      borderWidth: 0,
    }],
  }), [stats.longCount, stats.shortCount, theme]);

  const hourChartData = useMemo(() => ({
    labels: Array.from({ length: 24 }, (_, i) => `${i}時`),
    datasets: [{
      label: '取引回数',
      data: stats.hourCounts,
      backgroundColor: getAccentColor(),
    }],
  }), [stats.hourCounts, theme]);

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
  }), [stats.holdingTimeRanges, stats.holdingTimeWinCounts, stats.holdingTimeLossCounts, theme]);

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
  }), [stats.sortedTrades, theme]);

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
              {rangeLabel} 詳細分析
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
            <div style={{ height: 180, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {topPairs.length > 0 ? (
                <Doughnut
                  data={pairChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'right' },
                      tooltip: {
                        callbacks: {
                          label: (context: any) => `${context.label}: ${context.parsed}件`,
                        },
                      },
                    },
                  }}
                />
              ) : (
                <div style={{ color: 'var(--muted)' }}>データがありません</div>
              )}
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>売り vs 買い</h3>
            <div style={{ height: 180, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {(stats.longCount > 0 || stats.shortCount > 0) ? (
                <Doughnut
                  data={sideChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'right' },
                      tooltip: {
                        callbacks: {
                          label: (context: any) => `${context.label}: ${context.parsed}件`,
                        },
                      },
                    },
                  }}
                />
              ) : (
                <div style={{ color: 'var(--muted)' }}>データがありません</div>
              )}
            </div>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'var(--muted)', marginBottom: 16 }}>
              時間帯別（日本時間）
            </h3>
            <div style={{ height: 300 }}>
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
                      ticks: {
                        callback: (value: any, index: number) => {
                          return index % 2 === 0 ? `${index}時` : '';
                        },
                        autoSkip: false,
                        maxRotation: 0,
                        minRotation: 0,
                      },
                    },
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value: any) => `${value}件`,
                        stepSize: Math.max(1, Math.ceil(Math.max(...stats.hourCounts) / 5)),
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
